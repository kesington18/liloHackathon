import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

import { reasoningModel } from "@/lib/agent/model";
import { getFullCodebaseContext } from "@/lib/agent/context";

const improvementSchema = z.object({
  improvements: z.array(
    z.object({
      title: z.string(),
      category: z.enum([
        "performance",
        "code_quality",
        "missing_feature",
        "developer_experience",
        "other",
      ]),
      file: z
        .string()
        .nullable()
        .describe("Relevant file path, or null if this is a suggested new feature not tied to an existing file."),
      description: z.string(),
      suggestedFix: z
        .string()
        .nullable()
        .describe("A short code snippet showing the improvement, if applicable. Null for high-level feature suggestions."),
    }),
  ),
});

export async function runFurtherImprovements() {
  const codebase = await getFullCodebaseContext();

  const { object } = await generateObject({
    model: reasoningModel,
    schema: improvementSchema,
    prompt: `You are a senior engineer reviewing a codebase for improvement opportunities — separate from security issues.

Look for:
- Performance bottlenecks (inefficient loops, missing memoization, N+1 queries, missing DB indexes)
- Code quality improvements (duplication, unclear naming, missing error handling)
- Missing features that would meaningfully improve the product given what already exists (e.g. if there's a notification-related table but no push notification logic, suggest adding it)
- Developer experience improvements (missing types, tests, docs)

Give a short code snippet for concrete fixes where relevant. For high-level feature suggestions, set suggestedFix and file to null.

Keep suggestions concrete and grounded in the actual code below — don't give generic advice unrelated to this specific codebase.

CODEBASE:
${codebase}`,
  });

  return object;
}