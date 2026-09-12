import "server-only";
import { NextResponse } from "next/server";

import { runMapAnalysis } from "@/lib/agent/runMapAnalysis";
import { runSecurityAnalysis } from "@/lib/agent/runSecurityAnalysis";
import { runFurtherImprovements } from "@/lib/agent/runFurtherImprovements";

export const maxDuration = 180;

export async function POST() {
  const [mapResult, securityResult, improvementsResult] = await Promise.allSettled([
    runMapAnalysis(),
    runSecurityAnalysis(),
    runFurtherImprovements(),
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
    improvements:
      improvementsResult.status === "fulfilled"
        ? { data: improvementsResult.value }
        : { error: improvementsResult.reason?.message ?? "Improvements analysis failed" },
  });
}