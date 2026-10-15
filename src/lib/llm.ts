import OpenAI from "openai";
import type { Answer } from "./types";

const SYSTEM_PROMPT =
  "You are a strict binary classifier inside an automated workflow. " +
  "You receive a QUESTION and an INPUT. Answer the QUESTION about the INPUT. " +
  "Respond with exactly one word: YES or NO. No punctuation, no explanation.";

export type Decision = { answer: Answer; mock: boolean; raw: string };

/** Parse a model reply into YES / NO, or null if it is anything else. */
export function parseAnswer(raw: string): Answer | null {
  const t = raw.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (t === "YES" || t === "NO") return t;
  return null;
}

const STOP = new Set(["this", "that", "with", "from", "have", "does", "about", "request", "message", "which", "their", "there", "what", "whether"]);

/** Deterministic keyword fallback used when OPENAI_API_KEY is not set. */
function mockDecide(prompt: string, input: string): Answer {
  const text = input.toLowerCase();
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP.has(w));
  const stems = words.map((w) => w.slice(0, Math.max(4, w.length - 2)));
  return stems.some((s) => text.includes(s)) ? "YES" : "NO";
}

export async function askYesNo(prompt: string, input: string): Promise<Decision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const answer = mockDecide(prompt, input);
    return { answer, mock: true, raw: answer };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  let lastRaw = "";

  // One corrective retry if the model does not obey the YES/NO contract.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `QUESTION: ${prompt}\n\nINPUT:\n${input}\n\nAnswer (YES or NO):` },
      ],
    });
    lastRaw = res.choices[0]?.message?.content ?? "";
    const answer = parseAnswer(lastRaw);
    if (answer) return { answer, mock: false, raw: lastRaw };
  }
  throw new Error(`Model did not return YES or NO (got "${lastRaw.slice(0, 40)}")`);
}
