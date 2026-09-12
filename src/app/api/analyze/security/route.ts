import "server-only";
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";

import { reasoningModel } from "@/lib/agent/model";
import { getFullCodebaseContext } from "@/lib/agent/context";
import { checkAnalyzeAuth } from "@/lib/agent/auth";

export const maxDuration = 120;

const findingSchema = z.object({
  findings: z.array(
    z.object({
      file: z.string(),
      approxLine: z.number().nullable(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      category: z.enum([
        "hardcoded_secret",
        "exposed_env_var",
        "insecure_auth",
        "missing_validation",
        "sql_injection_risk",
        "xss_risk",
        "other",
      ]),
      description: z.string(),
      recommendation: z.string(),
    }),
  ),
});

export async function POST(request: Request) {
  if (!checkAnalyzeAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const codebase = await getFullCodebaseContext();

    const { object } = await generateObject({
      model: reasoningModel,
      schema: findingSchema,
      prompt: `You are a senior security engineer reviewing a codebase.

Scan the following code for:
- Hardcoded secrets, API keys, tokens, or passwords committed in source
- Exposed environment variables reaching the client (e.g. non-NEXT_PUBLIC_ secrets used client-side)
- Insecure authentication/authorization patterns
- Missing input validation
- SQL injection risk (raw string interpolation into queries)
- XSS risk (unsanitized HTML rendering)

Only report real, concrete findings tied to specific files. Do not invent issues that aren't in the code below.

CODEBASE:
${codebase}`,
    });

    return NextResponse.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}