import { jsonrepair } from "jsonrepair";
import { runLlm } from "./llm";
import type { CryptoGlobalStats } from "../trading/coingecko";
import type { FearGreedSnapshot } from "../trading/fear-greed";
import type { TickerAnalysis } from "../trading/signals";

export interface WatchlistPick {
  symbol: string;
  display_name: string;
  stance: "看多" | "看空" | "中性";
  rationale: string;
}

export interface TradingCommentary {
  market_overview: string;
  watchlist: WatchlistPick[];
  risk_caveat: string;
}

export interface TradingCommentaryInput {
  tickers: TickerAnalysis[];
  cryptoFearGreed?: FearGreedSnapshot;
  cryptoGlobal?: CryptoGlobalStats;
}

const SYSTEM_PROMPT = `你是一名专业、克制、中性的中文交易策略分析师。基于当日各资产的技术指标摘要，给读者写一份每日市场技术分析。

**严格规则**：
1. 你只描述当前的技术状态和潜在的机会/风险，**不发表"买入/卖出"的明确建议**。
2. 必须使用专业术语：金叉/死叉/MACD 红柱/绿柱/超买/超卖/突破/支撑/动量/趋势/背离 等。
3. 所有结论必须**基于输入的实际数字**（价格、SMA、RSI、MACD、信号、近期 % 变化等）。
4. watchlist 必须**多空两面**，不能全看涨或全看空——必须反映输入数据的真实分布。
5. market_overview 要覆盖 4 类资产（美股/加密/中概/商品外汇）的技术面整体感觉。
6. risk_caveat 必须包含「过去走势不代表未来表现」与「仅供参考、非投资建议」的明确声明。

输入：JSON 数组，每个元素是某 ticker 的技术分析对象，字段包括 symbol、displayName、group、currentPrice、pct1Day、pct5Day、pct52WeekHigh、pct52WeekLow、sma20/sma50/sma200、rsi14、macd/macdSignal/macdHistogram、trend、rsiState、signals。

输出严格 JSON 对象（不要 markdown、不要任何前后缀），三个字段都**必填且非空**：
{
  "market_overview": "<300-400 字段落，不能省略>",
  "watchlist": [
    { "symbol": "<必须从输入精确复制>", "display_name": "<中文+(英文代码) 或 仅中文>", "stance": "看多" | "看空" | "中性", "rationale": "<80-150 字，必须引用具体技术指标数字>" },
    ...
  ],   // **必须正好 3-5 个 ticker。如果你认为不应该选股，仍然给出 3 个最显著的标的并配「中性」stance + 解释为何中性；绝不能返回空数组。**
  "risk_caveat": "<60-100 字，必须包含「过去走势不代表未来表现」与「仅供参考、非投资建议」>"
}

**引号规则（重要！）**：JSON 字符串内的中文引用一律使用全角引号「」或""，**绝不**使用英文双引号——否则 JSON 解析失败。

**输出顺序建议**：在你的回复里先生成 watchlist 数组（最重要、最容易遗漏），再生成 market_overview，最后 risk_caveat。这样即使输出被截断也保留了 picks。`;

function extractJson(raw: string): string {
  let text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text);
  if (fence) text = fence[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

export async function generateTradingCommentary(
  input: TradingCommentaryInput,
): Promise<TradingCommentary> {
  const { tickers, cryptoFearGreed, cryptoGlobal } = input;
  // Slim payload — drop fields that don't help the model (no need to send
  // exchangeName/currency etc. — those are display-only)
  const payload = tickers.map((a) => ({
    symbol: a.symbol,
    displayName: a.displayName,
    group: a.group,
    currentPrice: round(a.currentPrice),
    pct1Day: round(a.pct1Day, 2),
    pct5Day: round(a.pct5Day, 2),
    pct52WeekHigh: round(a.pct52WeekHigh, 2),
    pct52WeekLow: round(a.pct52WeekLow, 2),
    sma20: roundNullable(a.sma20),
    sma50: roundNullable(a.sma50),
    sma200: roundNullable(a.sma200),
    rsi14: roundNullable(a.rsi14, 1),
    macd: roundNullable(a.macd, 4),
    macdSignal: roundNullable(a.macdSignal, 4),
    trend: a.trend,
    rsiState: a.rsiState,
    signals: a.signals.map((s) => s.label),
  }));

  // Compact context sidecars — Sonnet should weave these into the
  // market_overview when relevant (e.g. "VIX 14 + DXY 走弱 + 加密
  // F&G 43 → risk-on 偏温和").
  const contextLines: string[] = [];
  if (cryptoFearGreed) {
    contextLines.push(
      `加密恐慌贪婪指数 = ${cryptoFearGreed.value}（${cryptoFearGreed.classificationCn}）`,
    );
  }
  if (cryptoGlobal) {
    contextLines.push(
      `加密总市值 = ${(cryptoGlobal.totalMarketCapUsd / 1e12).toFixed(2)}T USD (24h ${round(cryptoGlobal.marketCapChangePct24h, 2)}%) · BTC 主导率 ${round(cryptoGlobal.btcDominance, 1)}% · ETH ${round(cryptoGlobal.ethDominance, 1)}%`,
    );
  }

  const userPrompt = [
    contextLines.length > 0
      ? `辅助背景（**必须在 market_overview 里至少引用一项**）：\n${contextLines.map((l) => `  - ${l}`).join("\n")}\n`
      : "",
    `候选资产（共 ${payload.length} 个，JSON 数组）：`,
    JSON.stringify(payload),
    "",
    `请输出符合 system prompt 中 schema 的 JSON 对象。`,
  ]
    .filter(Boolean)
    .join("\n");

  const fallback: TradingCommentary = {
    market_overview: "",
    watchlist: [],
    risk_caveat:
      "以上内容基于公开行情数据的技术指标计算与文本摘要，不构成任何投资建议。过去走势不代表未来表现，市场风险自负。",
  };

  try {
    return await callOnce(userPrompt, fallback);
  } catch (firstErr) {
    // eslint-disable-next-line no-console
    console.warn(
      `[trading-commentary] first call failed, retrying: ${
        firstErr instanceof Error ? firstErr.message : String(firstErr)
      }`,
    );
    try {
      return await callOnce(userPrompt, fallback);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.warn(`[trading-commentary] retry also failed: ${msg}`);
      return fallback;
    }
  }
}

async function callOnce(
  userPrompt: string,
  fallback: TradingCommentary,
): Promise<TradingCommentary> {
  const { text } = await runLlm({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    timeoutMs: 240_000,
  });
  const cleaned = extractJson(text);
  let parsed: Partial<TradingCommentary>;
  try {
    parsed = JSON.parse(cleaned);
  } catch (strictErr) {
    try {
      parsed = JSON.parse(jsonrepair(cleaned));
      // eslint-disable-next-line no-console
      console.warn("[trading-commentary] JSON.parse failed, jsonrepair recovered");
    } catch {
      // Dump raw output for postmortem — symmetric to pipeline.ts logging.
      try {
        const fs = await import("node:fs");
        fs.mkdirSync("logs", { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        fs.writeFileSync(`logs/trading-raw-${ts}.txt`, text, "utf8");
        fs.writeFileSync(`logs/trading-cleaned-${ts}.txt`, cleaned, "utf8");
        // eslint-disable-next-line no-console
        console.warn(
          `[trading-commentary] both JSON.parse and jsonrepair failed; raw at logs/trading-raw-${ts}.txt`,
        );
      } catch {
        // best-effort
      }
      throw strictErr;
    }
  }
  // Validate critical fields are populated. Empty watchlist or missing
  // overview means Sonnet truncated / ignored part of the schema —
  // treat as failure so the outer retry kicks in.
  const overview = parsed.market_overview ?? "";
  const picks = parsed.watchlist ?? [];
  if (overview.length < 100) {
    throw new Error(`market_overview too short (${overview.length} chars)`);
  }
  if (picks.length < 2) {
    throw new Error(`watchlist too short (${picks.length} picks)`);
  }
  return {
    market_overview: overview,
    watchlist: picks,
    risk_caveat: parsed.risk_caveat ?? fallback.risk_caveat,
  };
}

function round(n: number, dp = 2): number {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}
function roundNullable(n: number | null, dp = 2): number | null {
  return n == null ? null : round(n, dp);
}
