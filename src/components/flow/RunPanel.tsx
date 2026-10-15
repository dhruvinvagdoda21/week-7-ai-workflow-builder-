"use client";
import { AlertTriangle, CheckCircle2, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RunState } from "@/lib/types";

type Props = {
  input: string;
  onInput: (v: string) => void;
  running: boolean;
  onRun: () => void;
  run: RunState | null;
  error: string | null;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString();

export function StatusBadge({ status }: { status: RunState["status"] }) {
  const map = {
    queued: { v: "secondary" as const, t: "Queued" },
    running: { v: "default" as const, t: "Running" },
    completed: { v: "yes" as const, t: "Completed" },
    failed: { v: "no" as const, t: "Failed" },
  }[status];
  return <Badge variant={map.v}>{map.t}</Badge>;
}

export default function RunPanel({ input, onInput, running, onRun, run, error }: Props) {
  const failedStep = run?.steps.find((s) => s.error);
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="run-input">Workflow input</Label>
        <Textarea id="run-input" rows={4} value={input} onChange={(e) => onInput(e.target.value)} placeholder="Paste a message to classify…" />
      </div>

      <Button className="w-full" onClick={onRun} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : run?.status === "failed" ? <RotateCcw /> : <Play />}
        {running ? "Running…" : run?.status === "failed" ? "Retry run" : "Run workflow"}
      </Button>

      {error && (
        <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {run && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Execution</span>
            <StatusBadge status={run.status} />
          </div>

          {run.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {failedStep ? `Failed at "${failedStep.label}": ` : ""}
              {run.error}
            </div>
          )}

          <ol className="space-y-2">
            {run.steps.map((s) => (
              <li key={s.index} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                {s.error ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {s.index + 1}. {s.label}
                  </div>
                  <div className="text-muted-foreground">
                    {s.kind === "outcome" ? "Outcome reached" : `${s.durationMs}ms${s.mock ? " · mock" : ""}`}
                  </div>
                </div>
                {s.answer && <Badge variant={s.answer === "YES" ? "yes" : "no"}>{s.answer}</Badge>}
              </li>
            ))}
            {running && (
              <li className="flex items-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Waiting for next step…
              </li>
            )}
          </ol>

          <div>
            <div className="mb-1.5 text-sm font-semibold">Logs</div>
            <div className="max-h-56 space-y-1 overflow-auto rounded-md bg-slate-950 p-2 font-mono text-[11px] leading-relaxed">
              {run.logs.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-slate-300",
                    l.level === "warn" && "text-amber-300",
                    l.level === "error" && "text-red-400",
                  )}
                >
                  <span className="text-slate-500">{time(l.at)}</span> {l.message}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
