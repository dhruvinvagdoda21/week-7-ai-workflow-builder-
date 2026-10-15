import type { FlowEdge, FlowNode, RunState } from "./types";

const GRAPH_KEY = "ai-workflow:graph:v1";
const HISTORY_KEY = "ai-workflow:history:v1";
const INPUT_KEY = "ai-workflow:input:v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable */
  }
}

export type StoredGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

/** Strip transient React Flow fields so the stored graph stays small and clean. */
export function cleanGraph(nodes: FlowNode[], edges: FlowEdge[]): StoredGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.data.label, prompt: n.data.prompt },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      type: e.sourceHandle === "no" ? "no" : "yes",
      data: { answer: e.sourceHandle === "no" ? "NO" : "YES" },
    })),
  };
}

/** Validate + normalize unknown JSON (import / localStorage). Returns null if unusable. */
export function normalizeGraph(raw: unknown): StoredGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges)) return null;
  try {
    const nodes: FlowNode[] = r.nodes.map((n: any) => {
      if (typeof n.id !== "string") throw new Error("bad node");
      return {
        id: n.id,
        type: n.type === "outcome" ? "outcome" : "decision",
        position: { x: Number(n.position?.x) || 0, y: Number(n.position?.y) || 0 },
        data: { label: String(n.data?.label ?? "Untitled"), prompt: n.data?.prompt ? String(n.data.prompt) : undefined },
      };
    });
    const ids = new Set(nodes.map((n) => n.id));
    const edges: FlowEdge[] = r.edges
      .filter((e: any) => ids.has(e.source) && ids.has(e.target) && (e.sourceHandle === "yes" || e.sourceHandle === "no"))
      .map((e: any) => ({
        id: String(e.id ?? `e-${e.source}-${e.sourceHandle}-${e.target}`),
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        type: e.sourceHandle,
        data: { answer: e.sourceHandle === "yes" ? "YES" : "NO" },
      }));
    return { nodes, edges };
  } catch {
    return null;
  }
}

export const loadGraph = () => normalizeGraph(read(GRAPH_KEY));
export const saveGraph = (g: StoredGraph) => write(GRAPH_KEY, g);
export const loadHistory = () => read<RunState[]>(HISTORY_KEY) ?? [];
export const saveHistory = (h: RunState[]) => write(HISTORY_KEY, h);
export const loadInput = () => read<string>(INPUT_KEY);
export const saveInput = (s: string) => write(INPUT_KEY, s);
