import "server-only";
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";

import { reasoningModel } from "@/lib/agent/model";
import { getFullCodebaseContext } from "@/lib/agent/context";
import { checkAnalyzeAuth } from "@/lib/agent/auth";

export const maxDuration = 120;

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
});

export async function POST(request: Request) {
  if (!checkAnalyzeAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const codebase = await getFullCodebaseContext();

    const { object } = await generateObject({
      model: reasoningModel,
      schema: mapSchema,
      prompt: `You are onboarding a new developer to this codebase.

Produce:
1. A 2-3 sentence "overview" of what this app does and how it's structured.
2. "techStack": the key libraries/frameworks actually used (infer from imports/config, don't guess).
3. "flowSteps": an ordered, numbered walkthrough of how a request/user flows through the app start to finish (e.g. entry point → routing → auth → data layer → render), each tied to a specific file.

CODEBASE:
${codebase}`,
    });

    return NextResponse.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}