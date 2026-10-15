# AI Workflow Builder

A visual workflow editor where **every node is an AI decision step that answers `YES` or `NO`**.
The graph is drawn with **React Flow**, executed durably with **Inngest** (one Inngest step per node),
and each decision is made by an **OpenAI** model that is constrained to reply with only `YES` or `NO`.

```
 "Is this a support request?"
        ├── YES ──▶ Support Node
        └── NO  ──▶ "Is this a sales inquiry?"
                        ├── YES ──▶ Sales Node
                        └── NO  ──▶ General Inbox
```

## Stack

Next.js 14 (App Router, TypeScript) · React Flow (`@xyflow/react`) · Inngest · OpenAI SDK · Tailwind + shadcn/ui components

## Quick start

```bash
npm install
cp .env.example .env.local      # add OPENAI_API_KEY (optional, see below)
npm run dev:all                 # Next.js on :3000 + Inngest Dev Server on :8288
```

Or run them in two terminals:

```bash
npm run dev        # http://localhost:3000
npm run inngest    # http://localhost:8288  (Inngest dev dashboard)
```

Open http://localhost:3000, go to the **Run** tab and press **Run workflow**.
Open http://localhost:8288 to see each node execute as an Inngest step.

> **No OpenAI key?** Leave `OPENAI_API_KEY` empty and the app uses a deterministic keyword-based
> *mock decider* so you can test the whole flow. Mock answers are labelled `mock` in the logs.

### Environment variables

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI key. Empty = mock mode |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `INNGEST_DEV` | `1` = use the local Inngest Dev Server |

### Initialize the git repo

```bash
git init
git add .
git commit -m "Initial commit: AI workflow builder"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## How it works

| Piece | File |
| --- | --- |
| Flow editor (canvas, toolbar, side panels) | `src/components/flow/FlowEditor.tsx` |
| Decision / outcome nodes | `src/components/flow/DecisionNode.tsx`, `OutcomeNode.tsx` |
| YES / NO edge types | `src/components/flow/edges.tsx` |
| Graph → executable JSON, validation | `src/lib/graph.ts` |
| LLM call, strict `YES`/`NO` parsing | `src/lib/llm.ts` |
| Inngest client + workflow function | `src/inngest/client.ts`, `src/inngest/functions.ts` |
| Inngest HTTP endpoint | `src/app/api/inngest/route.ts` |
| Start a run / poll a run | `src/app/api/run/route.ts`, `src/app/api/runs/[id]/route.ts` |
| Run tracking store (in-memory) | `src/lib/run-store.ts` |

**Execution flow**

1. The UI converts the React Flow state into a plain graph and `POST`s it to `/api/run`.
2. The route emits the `workflow/run` event to Inngest and returns a `runId`.
3. The Inngest function walks the graph starting at the start node (the node with no incoming edge).
   Each node is one `step.run(...)`: decision nodes call the LLM, outcome nodes end the flow.
4. The model's reply must be exactly `YES` or `NO` (temperature 0, `max_tokens: 3`, one corrective retry);
   the matching YES/NO edge decides the next node.
5. The UI polls `/api/runs/:id` and highlights nodes/edges live.

## Phase checklist

- **Phase 1 – Setup:** Next.js + React Flow + Inngest + OpenAI SDK + shadcn-style UI, env config, project structure, README.
- **Phase 2 – Foundations:** React Flow canvas, add/connect/delete nodes, editable prompts, `YES` / `NO` edge types, graph stored in `localStorage`.
- **Phase 3 – Core:** one Inngest step per node, LLM returns only YES/NO, dynamic traversal by selected edge, execution order tracked (`#1, #2…`).
- **Phase 4 – Polish (6 of the options implemented):**
  - Visual execution state (running / done / error nodes, YES/NO answer badges, order badges)
  - Animated active edges
  - Execution logs panel
  - Execution history (last 20 runs, click to replay on the canvas)
  - JSON export / import
  - Error handling + automatic retries (Inngest `retries: 3`, failed run shows the failing node, **Retry run** button)

## Notes & limitations

- Run state lives in an **in-memory store** (`src/lib/run-store.ts`) – perfect for local dev, but on
  serverless / multi-instance hosting replace it with Redis or a database (same function signatures).
- For production, remove `INNGEST_DEV` and set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` (see Inngest docs).
- Cycles are allowed but execution stops after 25 steps.
- Prompts and run input are sent to OpenAI – don't put secrets in them.

## Adding more shadcn components

`components.json` is included, so `npx shadcn@latest add <component>` works.
