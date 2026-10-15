"use client";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react";
import { Download, Flag, History, ListTree, Plus, RotateCcw, Settings2, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildGraph, validateGraph } from "@/lib/graph";
import { defaultEdges, defaultNodes, SAMPLE_INPUT } from "@/lib/default-graph";
import {
  cleanGraph,
  loadGraph,
  loadHistory,
  loadInput,
  normalizeGraph,
  saveGraph,
  saveHistory,
  saveInput,
} from "@/lib/storage";
import type { Answer, FlowEdge, FlowNode, FlowNodeData, NodeStatus, RunState } from "@/lib/types";

import DecisionNode from "./DecisionNode";
import OutcomeNode from "./OutcomeNode";
import { NoEdge, YesEdge } from "./edges";
import NodeInspector from "./NodeInspector";
import RunPanel from "./RunPanel";
import HistoryPanel from "./HistoryPanel";

// Defined outside the component so React Flow doesn't re-register them every render.
const nodeTypes = { decision: DecisionNode, outcome: OutcomeNode };
const edgeTypes = { yes: YesEdge, no: NoEdge };

type Tab = "node" | "run" | "history";

function Editor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(defaultEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("node");
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [run, setRun] = useState<RunState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RunState[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  /* ---------- Load / autosave (localStorage) ---------- */
  useEffect(() => {
    const g = loadGraph();
    if (g) {
      setNodes(g.nodes);
      setEdges(g.edges);
    }
    setHistory(loadHistory());
    const savedInput = loadInput();
    if (savedInput !== null) setInput(savedInput);
    setHydrated(true);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => saveGraph(cleanGraph(nodes, edges)), 250);
    return () => clearTimeout(t);
  }, [nodes, edges, hydrated]);

  useEffect(() => {
    if (hydrated) saveHistory(history);
  }, [history, hydrated]);

  useEffect(() => {
    if (hydrated) saveInput(input);
  }, [input, hydrated]);

  /* ---------- Graph editing ---------- */
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      const handle = c.sourceHandle === "no" ? "no" : "yes";
      const answer: Answer = handle === "yes" ? "YES" : "NO";
      setEdges((eds) => [
        // one outgoing edge per YES / NO handle
        ...eds.filter((e) => !(e.source === c.source && e.sourceHandle === handle)),
        { id: `e-${c.source}-${handle}-${c.target}`, source: c.source!, target: c.target!, sourceHandle: handle, type: handle, data: { answer } },
      ]);
    },
    [setEdges],
  );

  const addNode = (type: "decision" | "outcome") => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const jitter = (nodes.length % 5) * 28;
    const position = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2 - 100 + jitter, y: rect.top + rect.height / 2 - 60 + jitter })
      : { x: 100, y: 100 };
    const id = `n${Date.now().toString(36)}`;
    const node: FlowNode =
      type === "decision"
        ? { id, type, position, data: { label: "New decision", prompt: "" } }
        : { id, type, position, data: { label: "New outcome" } };
    setNodes((ns) => [...ns, node]);
    setSelectedId(id);
    setTab("node");
  };

  const updateNode = (id: string, patch: Partial<FlowNodeData>) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));

  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  const onNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedId(node.id);
    setTab("node");
  };

  /* ---------- JSON export / import ---------- */
  const exportJson = () => {
    const data = { version: 1, ...cleanGraph(nodes, edges) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const g = normalizeGraph(JSON.parse(await file.text()));
      if (!g) throw new Error("Not a valid workflow file");
      setNodes(g.nodes);
      setEdges(g.edges);
      setRun(null);
      setSelectedId(null);
      setError(null);
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    } catch (e) {
      setError(`Import failed: ${e instanceof Error ? e.message : "invalid JSON"}`);
      setTab("run");
    }
  };

  const resetExample = () => {
    if (!confirm("Replace the current workflow with the example?")) return;
    setNodes(defaultNodes);
    setEdges(defaultEdges);
    setRun(null);
    setSelectedId(null);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  };

  /* ---------- Execution via Inngest (start run, then poll) ---------- */
  const poll = (runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let ticks = 0;
    const tick = async () => {
      ticks++;
      try {
        const r = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status === 404 ? "Run not found (did the server restart?)" : "Polling failed");
        const s: RunState = await r.json();
        setRun(s);
        if (s.status === "queued" && ticks === 25) {
          setError("Still queued after ~15s — is the Inngest dev server running? (npm run inngest)");
        }
        if (s.status === "completed" || s.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setRunning(false);
          setHistory((h) => [s, ...h.filter((x) => x.id !== s.id)].slice(0, 20));
          if (s.status === "completed") setError(null);
        }
      } catch (e) {
        if (pollRef.current) clearInterval(pollRef.current);
        setRunning(false);
        setError(e instanceof Error ? e.message : "Polling failed");
      }
    };
    tick();
    pollRef.current = setInterval(tick, 600);
  };

  const startRun = async () => {
    setError(null);
    const graph = buildGraph(nodes, edges);
    const problem = graph ? validateGraph(graph) : "Add at least one decision node.";
    if (!graph || problem) {
      setError(problem);
      setTab("run");
      return;
    }
    setRunning(true);
    setRun(null);
    setTab("run");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph, input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start run");
      poll(data.runId);
    } catch (e) {
      setRunning(false);
      setError(e instanceof Error ? e.message : "Failed to start run");
    }
  };

  /* ---------- Derived visual execution state ---------- */
  const displayNodes = useMemo<FlowNode[]>(() => {
    if (!run) return nodes;
    const byNode = new Map(run.steps.map((s) => [s.nodeId, s]));
    return nodes.map((n) => {
      const s = byNode.get(n.id);
      let status: NodeStatus = "idle";
      if (s) status = s.error ? "error" : "done";
      else if (run.currentNodeId === n.id && (run.status === "running" || run.status === "queued")) status = "running";
      return { ...n, data: { ...n.data, status, answer: s?.answer, order: s ? s.index + 1 : undefined } };
    });
  }, [nodes, run]);

  const displayEdges = useMemo<FlowEdge[]>(() => {
    return edges.map((e) => {
      const answer: Answer = e.sourceHandle === "no" ? "NO" : "YES";
      let state: "idle" | "taken" | "active" = "idle";
      if (run) {
        const taken = run.steps.some((s) => s.nodeId === e.source && s.answer === answer && s.nextNodeId === e.target);
        if (taken) {
          const live = run.status === "running" || run.status === "queued";
          state = live && run.currentNodeId === e.target ? "active" : "taken";
        }
      }
      return { ...e, type: e.sourceHandle === "no" ? "no" : "yes", data: { answer, state } };
    });
  }, [edges, run]);

  const selectedNode = nodes.find((n) => n.id === selectedId);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "node", label: "Node", icon: <Settings2 className="h-4 w-4" /> },
    { id: "run", label: "Run", icon: <ListTree className="h-4 w-4" /> },
    { id: "history", label: `History (${history.length})`, icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <div className="mr-2 flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5" /> AI Workflow Builder
        </div>
        <Button variant="outline" size="sm" onClick={() => addNode("decision")}>
          <Plus /> Decision
        </Button>
        <Button variant="outline" size="sm" onClick={() => addNode("outcome")}>
          <Flag /> Outcome
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={exportJson}>
          <Download /> Export
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload /> Import
        </Button>
        <Button variant="ghost" size="sm" onClick={resetExample}>
          <RotateCcw /> Reset
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
        <div className="ml-auto text-xs text-muted-foreground">Autosaved locally</div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div ref={canvasRef} className="relative min-w-0 flex-1 bg-slate-50">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} />
            <Controls />
            <MiniMap pannable zoomable className="!bg-white" />
          </ReactFlow>
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col border-l bg-background">
          <div className="flex border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium",
                  tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {tab === "node" && <NodeInspector node={selectedNode} onChange={updateNode} onDelete={deleteNode} />}
            {tab === "run" && <RunPanel input={input} onInput={setInput} running={running} onRun={startRun} run={run} error={error} />}
            {tab === "history" && (
              <HistoryPanel
                history={history}
                activeId={run?.id}
                onSelect={(r) => {
                  setRun(r);
                  setTab("run");
                }}
                onClear={() => setHistory([])}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function FlowEditor() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
