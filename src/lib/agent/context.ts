import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_CONTEXT_CHARS = 500_000; // rough safety cap

export async function getFullCodebaseContext(): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("code_embeddings")
    .select("file_path, chunk_index, start_line, end_line, content")
    .order("file_path", { ascending: true })
    .order("chunk_index", { ascending: true });

  if (error) throw new Error(`Failed to load context: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("No ingested chunks found — run /api/ingest first.");
  }

  let context = "";
  let currentFile = "";

  for (const row of data) {
    if (row.file_path !== currentFile) {
      currentFile = row.file_path;
      context += `\n\n// ===== FILE: ${row.file_path} =====\n`;
    }
    context += `\n// lines ${row.start_line}-${row.end_line}\n${row.content}\n`;

    if (context.length > MAX_CONTEXT_CHARS) {
      context += "\n\n// ...context truncated, repo too large for full-context mode...";
      break;
    }
  }

  return context;
}