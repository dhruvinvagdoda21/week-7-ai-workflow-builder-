"use client";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { Answer, FlowEdge } from "@/lib/types";

const COLORS: Record<Answer, string> = { YES: "#10b981", NO: "#ef4444" };

function AnswerEdge({ answer, ...p }: EdgeProps<FlowEdge> & { answer: Answer }) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX: p.sourceX,
    sourceY: p.sourceY,
    sourcePosition: p.sourcePosition,
    targetX: p.targetX,
    targetY: p.targetY,
    targetPosition: p.targetPosition,
  });
  const state = p.data?.state ?? "idle";
  const color = COLORS[answer];
  const dim = state === "idle";

  return (
    <>
      <BaseEdge
        id={p.id}
        path={path}
        markerEnd={p.markerEnd}
        className={state === "active" ? "edge-active" : undefined}
        style={{
          stroke: color,
          strokeWidth: state === "idle" ? 2 : 3.5,
          opacity: dim ? 0.75 : 1,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{ background: color, transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {answer}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const YesEdge = (props: EdgeProps<FlowEdge>) => <AnswerEdge {...props} answer="YES" />;
export const NoEdge = (props: EdgeProps<FlowEdge>) => <AnswerEdge {...props} answer="NO" />;
