import "server-only";
import { NextResponse } from "next/server";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";

import { createServiceClient } from "@/lib/supabase/service";
import { chunkFileContent, type CodeChunk } from "@/lib/ingestion/chunk";
import {
  CHUNK_LINES,
  CHUNK_OVERLAP_LINES,
  EMBED_BATCH_SIZE,
  EMBEDDING_MODEL,
  INCLUDED_EXTENSIONS,
  IGNORED_DIRS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/ingestion/config";
import {
  parseRepoInput,
  getDefaultBranch,
  listRepoFiles,
  fetchFileContentsConcurrently,
} from "@/lib/ingestion/github";

export const maxDuration = 280;

// Caps runtime + GitHub rate-limit exposure for a hackathon-scale demo.
const MAX_REMOTE_FILES = 60;

function isIncluded(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((seg) => IGNORED_DIRS.has(seg))) return false;
  const ext = "." + (path.split(".").pop() ?? "");
  return INCLUDED_EXTENSIONS.includes(ext);
}

export async function POST(request: Request) {
  let body: { repoUrl?: string; githubToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  try {
    const { owner, repo } = parseRepoInput(body.repoUrl);
    const token = body.githubToken || process.env.GITHUB_TOKEN;

    const branch = await getDefaultBranch(owner, repo, token);
    const allFiles = await listRepoFiles(owner, repo, branch, token);

    const candidates = allFiles
      .filter((f) => isIncluded(f.path) && f.size > 0 && f.size <= MAX_FILE_SIZE_BYTES)
      .slice(0, MAX_REMOTE_FILES);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No matching files found (check extensions/size limits)." },
        { status: 404 },
      );
    }

    const contentMap = await fetchFileContentsConcurrently(
      owner,
      repo,
      candidates.map((f) => f.path),
      branch,
      token,
    );

    const allChunks: CodeChunk[] = [];
    for (const file of candidates) {
      const content = contentMap.get(file.path);
      if (!content) continue;
      allChunks.push(
        ...chunkFileContent(file.path, content, CHUNK_LINES, CHUNK_OVERLAP_LINES),
      );
    }

    if (allChunks.length === 0) {
      return NextResponse.json({ error: "Could not fetch any file contents." }, { status: 500 });
    }

    const supabase = createServiceClient();

    // Single-active-repo model: clear the previous ingestion so analysis
    // always reflects exactly the repo just loaded, not a mix of two.
    const { error: clearError } = await supabase.from("code_embeddings").delete().neq("id", 0);
    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    let ingested = 0;
    for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);

      const { embeddings } = await embedMany({
        model: google.embeddingModel(EMBEDDING_MODEL),
        values: batch.map((c) => c.content),
        providerOptions: { google: { outputDimensionality: 768 } },
      });

      const rows = batch.map((chunk, idx) => ({
        file_path: chunk.filePath,
        chunk_index: chunk.chunkIndex,
        start_line: chunk.startLine,
        end_line: chunk.endLine,
        content: chunk.content,
        embedding: embeddings[idx],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("code_embeddings")
        .upsert(rows, { onConflict: "file_path,chunk_index" });

      if (error) {
        return NextResponse.json(
          { error: error.message, ingestedBeforeFailure: ingested },
          { status: 500 },
        );
      }
      ingested += rows.length;
    }

    await supabase.from("repo_history").insert({
      repo: `${owner}/${repo}`,
      branch,
      files_scanned: candidates.length,
      chunks_ingested: ingested,
    });

    return NextResponse.json({
      repo: `${owner}/${repo}`,
      branch,
      filesScanned: candidates.length,
      chunksIngested: ingested,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}