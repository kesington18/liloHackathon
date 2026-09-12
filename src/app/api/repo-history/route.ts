import "server-only";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("repo_history")
    .select("repo, branch, files_scanned, chunks_ingested, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const recent = [];
  for (const row of data ?? []) {
    if (seen.has(row.repo)) continue;
    seen.add(row.repo);
    recent.push(row);
    if (recent.length >= 6) break;
  }

  return NextResponse.json({ recent });
}