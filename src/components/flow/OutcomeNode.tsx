"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FlowNode } from "@/lib/types";

const STATUS_STYLE = {
  idle: "border-border bg-card",
  running: "border-blue-500 bg-blue-50 animate-pulse",
  done: "border-emerald-500 bg-emerald-50",
  error: "border-red-500 bg-red-50",
} as const;

export default function OutcomeNode({ data, selected }: NodeProps<FlowNode>) {
  const status = data.status ?? "idle";
  return (
    <div
      className={cn(
        "flex w-52 items-center gap-2 rounded-xl border-2 px-3 py-3 shadow-sm transition-all",
        STATUS_STYLE[status],
        selected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-slate-500" />
      <Flag className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outcome</div>
        <div className="truncate text-sm font-semibold">{data.label}</div>
      </div>
      {data.order !== undefined && <Badge variant="secondary">#{data.order}</Badge>}
      {status === "running" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
    </div>
  );
}
