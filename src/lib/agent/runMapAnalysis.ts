import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

import { reasoningModel } from "@/lib/agent/model";
import { getFullCodebaseContext } from "@/lib/agent/context";

const mapSchema = z.object({
  overview: z.string(),
  techStack: z.array(z.string()),
  flowSteps: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      file: z.string(),
      description: z.string(),
    }),
  ),
  diagram: z
    .string()
    .describe(
      "Valid Mermaid.js syntax starting with 'flowchart TD' representing the system architecture and data flow between the major components identified above. Use short, simple node labels (letters/numbers/spaces only, no special characters that could break Mermaid parsing). Keep it to 6-12 nodes max.",
    ),
});

export async function runMapAnalysis(codebase?: string) {
  const ctx = codebase ?? (await getFullCodebaseContext());

  const { object } = await generateObject({
    model: reasoningModel,
    schema: mapSchema,
    prompt: `You are onboarding a new developer to this codebase.

Produce:
1. A 2-3 sentence "overview" of what this app does and how it's structured.
2. "techStack": the key libraries/frameworks actually used (infer from imports/config, don't guess).
3. "flowSteps": an ordered, numbered walkthrough of how a request/user flows through the app start to finish, each tied to a specific file.
4. "diagram": a Mermaid.js flowchart (starting with "flowchart TD") showing the major components/layers (e.g. client, routes, middleware, database, external services) and how data flows between them. Keep node labels short and simple.

CODEBASE:
${ctx}`,
  });

  return object;
}