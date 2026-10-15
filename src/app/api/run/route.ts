import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { inngest } from "@/inngest/client";
import { createRun, failRun } from "@/lib/run-store";
import { validateGraph } from "@/lib/graph";
import type { WorkflowGraph } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { graph?: WorkflowGraph; input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { graph, input = "" } = body;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return NextResponse.json({ error: "Missing graph" }, { status: 400 });
  }
  if (typeof input !== "string" || input.length > 8000) {
    return NextResponse.json({ error: "Input must be a string (max 8000 chars)" }, { status: 400 });
  }
  const problem = validateGraph(graph);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const runId = randomUUID();
  createRun(runId, input);

  try {
    await inngest.send({ name: "workflow/run", data: { runId, graph, input } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failRun(runId, `Could not reach Inngest: ${msg}`);
    return NextResponse.json(
      { error: "Could not send event to Inngest. Is the dev server running? (npm run inngest)" },
      { status: 502 },
    );
  }

  return NextResponse.json({ runId });
}
