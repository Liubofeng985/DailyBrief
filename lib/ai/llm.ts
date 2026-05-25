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
 *   LLM_BACKEND=zhipu        (Zhipu AI / 智谱, Anthropic-compatible)
 *
 * Per-backend config (API keys, models, base URLs) lives in .env.local.
 * See .env.example for the full list.
 */

import { CLAUDE_MODEL, runClaudeCli } from "./backends/claude-cli";
import {
  PRESETS as ANTHROPIC_PRESETS,
  anthropicCompatModel,
  runAnthropicCompat,
} from "./backends/anthropic-compat";
import {
  PRESETS as OPENAI_PRESETS,
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
  | "minimax"
  | "zhipu";

const VALID_BACKENDS: ReadonlySet<LlmBackendId> = new Set([
  "claude-cli",
  "anthropic",
  "openai",
  "deepseek",
  "minimax",
  "zhipu",
]);

export function getBackend(): LlmBackendId {
  const raw = (process.env.LLM_BACKEND?.trim() || "claude-cli").toLowerCase();
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
function getActiveModel(backend: LlmBackendId): string {
  switch (backend) {
    case "claude-cli":
      return CLAUDE_MODEL;
    case "anthropic":
    case "zhipu":
      return anthropicCompatModel(ANTHROPIC_PRESETS[backend]);
    case "openai":
    case "deepseek":
    case "minimax":
      return openaiCompatModel(OPENAI_PRESETS[backend]);
  }
}

export function getModelTag(): string {
  const backend = getBackend();
  return `${backend}-${getActiveModel(backend)}`;
}

export async function runLlm(opts: LlmRunOptions): Promise<LlmRunResult> {
  const backend = getBackend();
  switch (backend) {
    case "claude-cli":
      return runClaudeCli(opts);
    case "anthropic":
    case "zhipu":
      return runAnthropicCompat(opts, ANTHROPIC_PRESETS[backend]);
    case "openai":
    case "deepseek":
    case "minimax":
      return runOpenAICompat(opts, OPENAI_PRESETS[backend]);
  }
}
