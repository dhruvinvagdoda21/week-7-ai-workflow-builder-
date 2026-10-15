import type { FlowEdge, FlowNode, WorkflowGraph } from "./types";

/** Convert React Flow state to the serializable graph used for execution. */
export function buildGraph(nodes: FlowNode[], edges: FlowEdge[]): WorkflowGraph | null {
  if (nodes.length === 0) return null;
  const incoming = new Set(edges.map((e) => e.target));
  // Start node = a node with no incoming edge; prefer decisions, then top-left-most.
  const candidates = nodes
    .filter((n) => !incoming.has(n.id))
    .sort((a, b) => {
      const kind = Number(a.type !== "decision") - Number(b.type !== "decision");
      return kind || a.position.y - b.position.y || a.position.x - b.position.x;
    });
  const start = candidates[0] ?? nodes[0];

  return {
    startNodeId: start.id,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type === "outcome" ? "outcome" : "decision",
      label: n.data.label,
      prompt: n.data.prompt,
    })),
    edges: edges
      .filter((e) => e.sourceHandle === "yes" || e.sourceHandle === "no")
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        answer: e.sourceHandle === "yes" ? ("YES" as const) : ("NO" as const),
      })),
  };
}

/** Returns an error message, or null when the graph is runnable. */
export function validateGraph(g: WorkflowGraph): string | null {
  if (!g.nodes.length) return "The workflow has no nodes.";
  if (!g.nodes.some((n) => n.id === g.startNodeId)) return "Start node not found.";
  if (g.nodes.length > 50) return "Too many nodes (max 50).";
  const start = g.nodes.find((n) => n.id === g.startNodeId)!;
  if (start.type !== "decision") return "The first node must be a decision node.";
  for (const n of g.nodes) {
    if (n.type === "decision" && !n.prompt?.trim()) return `Node "${n.label}" has an empty prompt.`;
    if (n.prompt && n.prompt.length > 2000) return `Prompt of "${n.label}" is too long (max 2000 chars).`;
  }
  return null;
}
