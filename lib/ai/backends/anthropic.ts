import Anthropic from "@anthropic-ai/sdk";
import { classifyError, logLlmCall } from "../log";
import type { LlmRunOptions, LlmRunResult } from "../llm";

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required for LLM_BACKEND=anthropic. Set it in .env.local.",
    );
  }
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  cachedClient = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
  return cachedClient;
}

export function anthropicModel(): string {
  return process.env.LLM_MODEL ?? ANTHROPIC_DEFAULT_MODEL;
}

export async function runAnthropic({
  systemPrompt,
  userPrompt,
  timeoutMs = 180_000,
}: LlmRunOptions): Promise<LlmRunResult> {
  const client = getClient();
  const model = anthropicModel();
  const started = Date.now();
  const inputChars = systemPrompt.length + userPrompt.length;

  try {
    const resp = await client.messages.create(
      {
        model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      { timeout: timeoutMs },
    );
    const text = resp.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    const durationMs = Date.now() - started;
    logLlmCall({
      ts: new Date(started).toISOString(),
      backend: "anthropic",
      model,
      durationMs,
      success: true,
      inputChars,
      outputChars: text.length,
      errorCategory: null,
      errorSnippet: null,
    });
    return { text, durationMs };
  } catch (err) {
    const durationMs = Date.now() - started;
    const msg = err instanceof Error ? err.message : String(err);
    logLlmCall({
      ts: new Date(started).toISOString(),
      backend: "anthropic",
      model,
      durationMs,
      success: false,
      inputChars,
      outputChars: 0,
      errorCategory: classifyError(msg),
      errorSnippet: msg.slice(0, 200),
    });
    throw err;
  }
}
