import "server-only";
import { NextResponse } from "next/server";
import { runMapAnalysis } from "@/lib/agent/runMapAnalysis";
import { runSecurityAnalysis } from "@/lib/agent/runSecurityAnalysis";

export const maxDuration = 120;

export async function POST() {
  const [mapResult, securityResult] = await Promise.allSettled([
    runMapAnalysis(),
    runSecurityAnalysis(),
  ]);

  return NextResponse.json({
    map:
      mapResult.status === "fulfilled"
        ? { data: mapResult.value }
        : { error: mapResult.reason?.message ?? "Map analysis failed" },
    security:
      securityResult.status === "fulfilled"
        ? { data: securityResult.value }
        : { error: securityResult.reason?.message ?? "Security analysis failed" },
  });
}