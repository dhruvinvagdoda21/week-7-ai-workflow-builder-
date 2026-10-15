import type { FlowEdge, FlowNode } from "./types";

export const SAMPLE_INPUT = "Hi, my dashboard is broken since yesterday and I need support to fix this issue.";

export const defaultNodes: FlowNode[] = [
  {
    id: "n1",
    type: "decision",
    position: { x: 260, y: 0 },
    data: {
      label: "Is this a support request?",
      prompt: "Is the message a customer support request (a problem, bug, or help request about an existing product)?",
    },
  },
  { id: "n2", type: "outcome", position: { x: 20, y: 260 }, data: { label: "Support Node" } },
  {
    id: "n3",
    type: "decision",
    position: { x: 460, y: 240 },
    data: {
      label: "Is this a sales inquiry?",
      prompt: "Is the message a sales inquiry (pricing, demo, quote, or buying our product)?",
    },
  },
  { id: "n4", type: "outcome", position: { x: 380, y: 500 }, data: { label: "Sales Node" } },
  { id: "n5", type: "outcome", position: { x: 640, y: 500 }, data: { label: "General Inbox" } },
];

export const defaultEdges: FlowEdge[] = [
  { id: "e1", source: "n1", target: "n2", sourceHandle: "yes", type: "yes", data: { answer: "YES" } },
  { id: "e2", source: "n1", target: "n3", sourceHandle: "no", type: "no", data: { answer: "NO" } },
  { id: "e3", source: "n3", target: "n4", sourceHandle: "yes", type: "yes", data: { answer: "YES" } },
  { id: "e4", source: "n3", target: "n5", sourceHandle: "no", type: "no", data: { answer: "NO" } },
];
