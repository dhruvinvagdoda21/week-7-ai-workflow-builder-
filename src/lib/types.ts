import type { Edge, Node } from "@xyflow/react";

export type Answer = "YES" | "NO";
export type NodeKind = "decision" | "outcome";
export type NodeStatus = "idle" | "running" | "done" | "error";

/** Data stored on every React Flow node. */
export type FlowNodeData = {
  label: string;
  prompt?: string;
  // Derived at render time from the active run (never persisted):
  status?: NodeStatus;
  answer?: Answer;
  order?: number;
};
export type FlowNode = Node<FlowNodeData>;

/** Data stored on every React Flow edge. `answer` is what the YES / NO handle means. */
export type EdgeData = {
  answer: Answer;
  state?: "idle" | "taken" | "active";
};
export type FlowEdge = Edge<EdgeData>;

/* ---------- Serializable graph that is sent to the server / Inngest ---------- */
export type WorkflowNode = { id: string; type: NodeKind; label: string; prompt?: string };
export type WorkflowEdge = { id: string; source: string; target: string; answer: Answer };
export type WorkflowGraph = { startNodeId: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] };

/* ---------- Run tracking ---------- */
export type StepRecord = {
  index: number;
  nodeId: string;
  label: string;
  kind: NodeKind;
  prompt?: string;
  answer?: Answer;
  nextNodeId?: string;
  durationMs: number;
  mock?: boolean;
  error?: string;
  at: string;
};

export type LogEntry = { at: string; level: "info" | "warn" | "error"; message: string };
export type RunStatus = "queued" | "running" | "completed" | "failed";

export type RunState = {
  id: string;
  status: RunStatus;
  input: string;
  startedAt: string;
  finishedAt?: string;
  currentNodeId?: string;
  lastBegun: number;
  steps: StepRecord[];
  logs: LogEntry[];
  error?: string;
};

export type RunEventData = { runId: string; graph: WorkflowGraph; input: string };
