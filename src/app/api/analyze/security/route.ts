import "server-only";
import { NextResponse } from "next/server";

import { checkAnalyzeAuth } from "@/lib/agent/auth";
import { runSecurityAnalysis } from "@/lib/agent/runSecurityAnalysis";

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!checkAnalyzeAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSecurityAnalysis();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}