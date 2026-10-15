"use client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FlowNode, FlowNodeData } from "@/lib/types";

type Props = {
  node: FlowNode | undefined;
  onChange: (id: string, patch: Partial<FlowNodeData>) => void;
  onDelete: (id: string) => void;
};

export default function NodeInspector({ node, onChange, onDelete }: Props) {
  if (!node) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a node to edit it.
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs">
          <li>Drag from the green <b>YES</b> / red <b>NO</b> handle of a decision node to another node.</li>
          <li>Each handle can have one outgoing edge.</li>
          <li>The start node is the node with no incoming edge.</li>
        </ul>
      </div>
    );
  }

  const isDecision = node.type !== "outcome";
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="node-label">Title</Label>
        <Input id="node-label" value={node.data.label} onChange={(e) => onChange(node.id, { label: e.target.value })} />
      </div>

      {isDecision && (
        <div className="space-y-1.5">
          <Label htmlFor="node-prompt">Prompt (must be answerable with YES or NO)</Label>
          <Textarea
            id="node-prompt"
            rows={7}
            value={node.data.prompt ?? ""}
            onChange={(e) => onChange(node.id, { prompt: e.target.value })}
            placeholder="Is the message a customer support request?"
          />
          <p className="text-xs text-muted-foreground">
            The model receives this question plus the run input and is forced to reply with exactly YES or NO.
          </p>
        </div>
      )}

      <Button variant="destructive" size="sm" onClick={() => onDelete(node.id)}>
        <Trash2 /> Delete node
      </Button>
    </div>
  );
}
