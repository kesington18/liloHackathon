import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

import { reasoningModel } from "@/lib/agent/model";
import { getFullCodebaseContext } from "@/lib/agent/context";

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
      suggestedFix: z
        .string()
        .nullable()
        .describe(
          "A short corrected code snippet demonstrating the fix, if it's a code change. Null if the fix is a dashboard/config change (e.g. an RLS policy edit) rather than a code edit.",
        ),
    }),
  ),
});

export async function runSecurityAnalysis() {
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

For each finding, also provide "suggestedFix": a short corrected code snippet showing exactly how to fix it, if it's a code-level fix. If the fix is a config/dashboard change instead (e.g. changing an RLS policy in the Supabase dashboard), set suggestedFix to null and rely on "recommendation" to explain it.

CODEBASE:
${codebase}`,
  });

  return object;
}