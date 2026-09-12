import "server-only";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";

import { createServiceClient } from "@/lib/supabase/service";
import { walkRepoFiles } from "@/lib/ingestion/walk";
import { chunkFileContent, type CodeChunk } from "@/lib/ingestion/chunk";
import {
  CHUNK_LINES,
  CHUNK_OVERLAP_LINES,
  EMBED_BATCH_SIZE,
  EMBEDDING_MODEL,
  INGEST_ROOT,
} from "@/lib/ingestion/config";

export const maxDuration = 300; // this can take a while for larger repos

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-ingest-secret");
  if (
    !process.env.INGEST_SECRET ||
    providedSecret !== process.env.INGEST_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filePaths = await walkRepoFiles();

  const allChunks: CodeChunk[] = [];
  for (const filePath of filePaths) {
    const content = await readFile(filePath, "utf-8").catch(() => null);
    if (content === null) continue;

    const relativePath = path.relative(INGEST_ROOT, filePath);
    const chunks = chunkFileContent(
      relativePath,
      content,
      CHUNK_LINES,
      CHUNK_OVERLAP_LINES,
    );
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return NextResponse.json({ filesScanned: filePaths.length, chunksIngested: 0 });
  }

  const supabase = createServiceClient();
  let ingested = 0;

  for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);

    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      values: batch.map((c) => c.content),
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

  return NextResponse.json({
    filesScanned: filePaths.length,
    chunksIngested: ingested,
  });
}