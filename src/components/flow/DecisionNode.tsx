"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FlowNode } from "@/lib/types";

const STATUS_STYLE = {
  idle: "border-border",
  running: "border-blue-500 shadow-blue-200 shadow-lg animate-pulse",
  done: "border-emerald-500",
  error: "border-red-500",
} as const;

export default function DecisionNode({ data, selected }: NodeProps<FlowNode>) {
  const status = data.status ?? "idle";
  return (
    <div
      className={cn(
        "w-64 rounded-xl border-2 bg-card text-card-foreground shadow-sm transition-all",
        STATUS_STYLE[status],
        selected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-slate-500" />

      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" /> AI decision
        </span>
        <span className="flex items-center gap-1.5">
          {data.order !== undefined && <Badge variant="secondary">#{data.order}</Badge>}
          {status === "running" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          {status === "done" && data.answer && <Badge variant={data.answer === "YES" ? "yes" : "no"}>{data.answer}</Badge>}
          {status === "done" && !data.answer && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
        </span>
      </div>

      <div className="space-y-1 px-3 pb-7 pt-2">
        <div className="text-sm font-semibold leading-snug">{data.label}</div>
        <p className="line-clamp-3 text-xs text-muted-foreground">{data.prompt || "No prompt yet…"}</p>
      </div>

      <span className="pointer-events-none absolute bottom-1 left-[28%] -translate-x-1/2 text-[10px] font-bold text-emerald-600">YES</span>
      <span className="pointer-events-none absolute bottom-1 left-[72%] -translate-x-1/2 text-[10px] font-bold text-red-600">NO</span>
      <Handle id="yes" type="source" position={Position.Bottom} style={{ left: "28%" }} className="!h-3 !w-3 !bg-emerald-500" />
      <Handle id="no" type="source" position={Position.Bottom} style={{ left: "72%" }} className="!h-3 !w-3 !bg-red-500" />
    </div>
  );
}
