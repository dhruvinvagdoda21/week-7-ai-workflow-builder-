import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { askYesNo } from "@/lib/llm";
import { addLog, beginNode, completeRun, failRun, markRunning, recordStep } from "@/lib/run-store";
import type { RunEventData, WorkflowNode } from "@/lib/types";

const MAX_STEPS = 25; // guards against cycles in the graph

export const runWorkflow = inngest.createFunction(
  {
    id: "run-workflow",
    retries: 3, // every failed node (API error, bad answer…) is retried by Inngest
    onFailure: async ({ error, event }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (event.data as any)?.event?.data as RunEventData | undefined;
      if (data?.runId) failRun(data.runId, error?.message ?? "Workflow failed");
    },
  },
  { event: "workflow/run" },
  async ({ event, step }) => {
    const { runId, graph, input } = event.data as RunEventData;
    const nodes = new Map<string, WorkflowNode>(graph.nodes.map((n) => [n.id, n]));

    markRunning(runId);

    let currentId: string | undefined = graph.startNodeId;
    let i = 0;

    while (currentId) {
      if (i >= MAX_STEPS) throw new NonRetriableError(`Stopped after ${MAX_STEPS} steps (cycle in the graph?)`);
      const node = nodes.get(currentId);
      if (!node) throw new NonRetriableError(`Node ${currentId} does not exist`);

      beginNode(runId, node, i);

      // ---- Terminal / outcome node: still a durable Inngest step, no LLM call
      if (node.type === "outcome") {
        await step.run(`outcome-${i}-${node.id}`, async () => ({ reached: node.label }));
        recordStep(runId, {
          index: i,
          nodeId: node.id,
          label: node.label,
          kind: "outcome",
          durationMs: 0,
          at: new Date().toISOString(),
        });
        break;
      }

      // ---- Decision node: one Inngest step that asks the LLM for YES / NO
      const result = await step.run(`decide-${i}-${node.id}`, async () => {
        const started = Date.now();
        try {
          const d = await askYesNo(node.prompt ?? "", input);
          return { answer: d.answer, mock: d.mock, durationMs: Date.now() - started };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          addLog(runId, "warn", `"${node.label}" attempt failed: ${msg}`);
          throw err; // let Inngest retry this step
        }
      });

      // Follow the edge that matches the answer
      const edge = graph.edges.find((e) => e.source === node.id && e.answer === result.answer);
      recordStep(runId, {
        index: i,
        nodeId: node.id,
        label: node.label,
        kind: "decision",
        prompt: node.prompt,
        answer: result.answer,
        nextNodeId: edge?.target,
        durationMs: result.durationMs,
        mock: result.mock,
        at: new Date().toISOString(),
      });

      currentId = edge?.target;
      i++;
    }

    completeRun(runId);
    return { runId, steps: i + 1 };
  },
);
