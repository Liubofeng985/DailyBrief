/**
 * LLM backend dispatcher.
 *
 * All call sites (pipeline / enrich / trading-commentary) import `runLlm`
 * from this module instead of binding to a specific backend. The actual
 * backend is selected at runtime by the LLM_BACKEND environment variable:
 *
 *   LLM_BACKEND=claude-cli   (default; uses local Claude Code CLI, Max billing)
 *   LLM_BACKEND=anthropic    (Anthropic Messages API)
 *   LLM_BACKEND=openai       (OpenAI Chat Completions)
 *   LLM_BACKEND=deepseek     (DeepSeek, OpenAI-compatible)
 *   LLM_BACKEND=minimax      (MiniMax, OpenAI-compatible)
 *
 * Per-backend config (API keys, models, base URLs) lives in .env.local.
 * See .env.example for the full list.
 */

import { CLAUDE_MODEL, runClaudeCli } from "./backends/claude-cli";
import {
  ANTHROPIC_DEFAULT_MODEL,
  anthropicModel,
  runAnthropic,
} from "./backends/anthropic";
import {
  PRESETS,
  openaiCompatModel,
  runOpenAICompat,
} from "./backends/openai-compat";

export interface LlmRunOptions {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

export interface LlmRunResult {
  text: string;
  durationMs: number;
}

export type LlmBackendId =
  | "claude-cli"
  | "anthropic"
  | "openai"
  | "deepseek"
  | "minimax";

const VALID_BACKENDS: ReadonlySet<LlmBackendId> = new Set([
  "claude-cli",
  "anthropic",
  "openai",
  "deepseek",
  "minimax",
]);

export function getBackend(): LlmBackendId {
  const raw = (process.env.LLM_BACKEND ?? "claude-cli").trim().toLowerCase();
  if (!VALID_BACKENDS.has(raw as LlmBackendId)) {
    throw new Error(
      `Unknown LLM_BACKEND='${raw}'. Valid values: ${[...VALID_BACKENDS].join(", ")}`,
    );
  }
  return raw as LlmBackendId;
}

/**
 * Returns the active model name for the configured backend, useful for
 * stamping a MODEL_TAG into report metadata.
 */
export function getActiveModel(): string {
  const backend = getBackend();
  switch (backend) {
    case "claude-cli":
      return CLAUDE_MODEL;
    case "anthropic":
      return anthropicModel();
    case "openai":
    case "deepseek":
    case "minimax":
      return openaiCompatModel(PRESETS[backend]);
  }
}

/** A short tag suitable for embedding in report JSON: "<backend>-<model>" */
export function getModelTag(): string {
  return `${getBackend()}-${getActiveModel()}`;
}

export async function runLlm(opts: LlmRunOptions): Promise<LlmRunResult> {
  const backend = getBackend();
  switch (backend) {
    case "claude-cli":
      return runClaudeCli(opts);
    case "anthropic":
      return runAnthropic(opts);
    case "openai":
    case "deepseek":
    case "minimax":
      return runOpenAICompat(opts, PRESETS[backend]);
  }
}

// Re-export type so callers don't have to fish through backend files.
export { ANTHROPIC_DEFAULT_MODEL };
