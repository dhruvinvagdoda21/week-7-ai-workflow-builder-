"use client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./RunPanel";
import { cn } from "@/lib/utils";
import type { RunState } from "@/lib/types";

type Props = {
  history: RunState[];
  activeId?: string;
  onSelect: (run: RunState) => void;
  onClear: () => void;
};

export default function HistoryPanel({ history, activeId, onSelect, onClear }: Props) {
  if (history.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No runs yet. Finished runs are saved here (in your browser).</div>;
  }
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Last {history.length} runs</span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 /> Clear
        </Button>
      </div>
      {history.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className={cn("w-full rounded-md border p-2 text-left text-xs hover:bg-accent", r.id === activeId && "border-primary bg-accent")}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</span>
            <StatusBadge status={r.status} />
          </div>
          <div className="line-clamp-2">{r.input || "(empty input)"}</div>
          <div className="mt-1 text-muted-foreground">
            Path: {r.steps.map((s) => s.answer ?? "●").join(" → ") || "—"}
          </div>
        </button>
      ))}
    </div>
  );
}
