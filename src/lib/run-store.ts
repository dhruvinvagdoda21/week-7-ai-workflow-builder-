/**
 * In-memory run store.
 *
 * Inngest executes the workflow in the Next.js server process (via /api/inngest),
 * and the UI polls /api/runs/[id]. For local development an in-memory Map shared
 * through globalThis is enough. For production / serverless swap this file for
 * Redis, Postgres, etc. (same function signatures).
 */
import type { Answer, LogEntry, RunState, StepRecord, WorkflowNode } from "./types";

const g = globalThis as unknown as { __aiWorkflowRuns?: Map<string, RunState> };
const runs: Map<string, RunState> = (g.__aiWorkflowRuns ??= new Map());

const now = () => new Date().toISOString();

function pushLog(run: RunState, level: LogEntry["level"], message: string) {
  run.logs.push({ at: now(), level, message });
}

export function createRun(id: string, input: string): RunState {
  const run: RunState = {
    id,
    status: "queued",
    input,
    startedAt: now(),
    lastBegun: -1,
    steps: [],
    logs: [],
  };
  pushLog(run, "info", "Run queued — waiting for Inngest to pick it up");
  runs.set(id, run);
  if (runs.size > 200) runs.delete(runs.keys().next().value as string);
  return run;
}

export const getRun = (id: string) => runs.get(id);

export function markRunning(id: string) {
  const run = runs.get(id);
  if (!run || run.status !== "queued") return;
  run.status = "running";
  pushLog(run, "info", "Workflow started");
}

/** Idempotent: Inngest replays the function body for every step. */
export function beginNode(id: string, node: WorkflowNode, index: number) {
  const run = runs.get(id);
  if (!run) return;
  if (index > run.lastBegun) {
    run.lastBegun = index;
    run.currentNodeId = node.id;
    pushLog(run, "info", `Step ${index + 1}: ${node.type === "decision" ? "asking AI" : "reached outcome"} — "${node.label}"`);
  }
}

/** Idempotent by step index. */
export function recordStep(id: string, rec: StepRecord) {
  const run = runs.get(id);
  if (!run || run.steps.some((s) => s.index === rec.index)) return;
  run.steps.push(rec);
  if (rec.kind === "decision") {
    pushLog(
      run,
      "info",
      `"${rec.label}" → ${rec.answer}${rec.mock ? " (mock)" : ""} in ${rec.durationMs}ms` +
        (rec.nextNodeId ? "" : " — no edge for this answer, stopping"),
    );
  }
}

export function addLog(id: string, level: LogEntry["level"], message: string) {
  const run = runs.get(id);
  if (run) pushLog(run, level, message);
}

export function completeRun(id: string) {
  const run = runs.get(id);
  if (!run || run.status === "failed") return;
  run.status = "completed";
  run.currentNodeId = undefined;
  run.finishedAt = now();
  pushLog(run, "info", "Workflow completed");
}

export function failRun(id: string, message: string) {
  const run = runs.get(id);
  if (!run) return;
  run.status = "failed";
  run.error = message;
  run.finishedAt = now();
  if (run.currentNodeId && !run.steps.some((s) => s.nodeId === run.currentNodeId)) {
    run.steps.push({
      index: run.steps.length,
      nodeId: run.currentNodeId,
      label: "Failed node",
      kind: "decision",
      durationMs: 0,
      error: message,
      at: now(),
    });
  }
  pushLog(run, "error", `Workflow failed: ${message}`);
}

export type { Answer };
