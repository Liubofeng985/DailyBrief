# daily-brief · 每日 AI/科技/财经/时政简报

每天自动生成一份单文件 HTML 报告，覆盖：

- **技术动态** — GitHub Trending 热榜、AI 资讯（OpenAI/DeepMind/Hugging Face/TLDR AI/Smol AI/Latent Space/MIT Tech Review）、X 推文（attentionvc 维度）
- **市场行情** — 21 个 ticker 的技术指标（SMA / RSI / MACD）+ 加密恐慌贪婪指数 + LLM 中文交易点评
- **时政观察** — BBC / Guardian / NYT / NPR / DW / Al Jazeera / The Diplomat 国际要闻
- **财经要点** — Bloomberg / WSJ / FT / BBC / Economist 全球财经
- **社区讨论** — V2EX / LinuxDo 中文社区热议

英文源附 LLM 生成的中文摘要。报告以 `daily_reports/<UTC日期>.html` 落盘，单文件、CSS+JS 全内联。

## 设计要点

- **本地驱动**：系统自带调度器触发（Windows Task Scheduler / macOS launchd / Linux cron），不依赖任何云服务
- **数据源零 API key**：所有数据源走免费公开端点（RSS / 公开 JSON）
- **LLM 后端可插拔**：默认走本地 [claude CLI](https://github.com/anthropics/claude-code) 扣 **Max 订阅额度**；也可一行配置切到 Anthropic / OpenAI / DeepSeek / MiniMax 任一 API（按 token 计费）—— 见 [LLM 后端配置](#llm-后端配置)
- **错误隔离**：单源失败不阻断全流程，单次 LLM 失败有 1-shot 重试 + 兜底渲染
- **可观测**：每次任务运行写 `logs/daily-<日期>.log`，每次 LLM 调用写 `logs/llm-calls.jsonl`，`npm run quota-report` 按 backend 汇总热度

## 前置要求

- **Node.js 20+** + **npm**
- **Windows 10/11** / **macOS 12+** / **Linux**（任一平台都支持，定时机制自动适配）
- **一个能跑的 LLM**：
  - 默认方案：[Claude Code CLI](https://docs.claude.com/en/docs/claude-code/quickstart) 已登录（Max 订阅最划算）
  - 或：Anthropic / OpenAI / DeepSeek / MiniMax 任一家的 API key（详见 [LLM 后端配置](#llm-后端配置)）
- **git**

## 给 AI Agent 一句话装

如果你正在用 Claude Code / Cursor / Codex 之类的 AI Agent，直接把下面这段发给它：

> 帮我装这个开源项目，跑 `node scripts/install.mjs --global` 完成全局安装，装好后告诉我下次自动触发的时间：
> https://github.com/leiting-eric/DailyBrief

Agent 会自动 `git clone` → `npm install` → 注册系统调度器 → 链接全局 skill → 跑一次 `npm run dry-run` 烟测。完成后任意目录打开 Claude Code 都能用 `/run-daily`、`/check-daily`，描述问题（"日报又挂了"）也能触发 `daily-brief` skill 自动加载。

> ⚠️ 默认使用 **claude CLI** 跑 LLM（扣 Max 订阅而非 token）。Agent 替不了它的 OAuth 登录（必须本人在浏览器点同意）。如果还没登录过，先跑一次：
> ```bash
> echo "hi" | claude --print --model sonnet
> ```
> 会引导你登录，登录一次永久生效。**没有 Max 订阅的用户**可以改用 OpenAI / Anthropic / DeepSeek / MiniMax API，见 [LLM 后端配置](#llm-后端配置)。

## 一键安装（自己跑）

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node

# Windows PowerShell
irm https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node -
```

这条命令会：
1. 检查 Node / git / claude CLI 是否就位
2. `git clone` 到 `~/daily-brief`（Windows: `%USERPROFILE%\daily-brief`）
3. `npm install`
4. 注册系统定时（Windows Task Scheduler / macOS launchd / Linux cron，默认 16:00）
5. 写 `~/.daily-brief-config` 记录项目路径
6. 在 `~/.claude/` 建符号链接让 skill 和 slash command 全局可用
7. 跑一次 `npm run dry-run` 烟测

装完后**任意目录**打开 Claude Code 都能 `/run-daily`、`/check-daily`，描述问题也能触发 `daily-brief` skill 自动加载。

自定义安装位置或触发时间：

```bash
node bootstrap.mjs --target /custom/path --at 07:30
```

## 手动安装

```bash
# 1. clone + 依赖
git clone https://github.com/leiting-eric/DailyBrief.git
cd DailyBrief
npm install

# 2. 配置 LLM 后端
#    默认 claude CLI（如果没登录会引导你登录）：
echo "say hi in Chinese" | claude --print --model sonnet
#    或用其他 backend：cp .env.example .env.local 编辑 LLM_BACKEND 和对应 API key
#    详见下文 LLM 后端配置 章节

# 3. 注册定时 + 启用全局 skill
node scripts/install.mjs --global
# 也可指定时间：node scripts/install.mjs --at 07:30 --global
# 不带 --global 只装本地（只有在本目录打开的 Claude Code session 能用 /run-daily）

# 4. 立即触发一次测试
# Windows:  Start-ScheduledTask -TaskName DailyBrief
# macOS:    launchctl start com.daily-brief
# Linux:    node scripts/run-daily.mjs  (cron 不能手动 trigger)
```

下次触发时机：
- **Windows** — 系统会自动唤醒电脑（如在睡眠），跑完再回睡
- **macOS** — launchd 不会主动唤醒，电脑睡着的话跳过这次（需要 `pmset wake schedule` 配合）
- **Linux** — cron 同理，挂起期间不跑

## 日常命令

| 命令 | 用途 | 耗时 |
|---|---|---|
| `npm run daily` | 手动完整跑一次 | 5-8 min |
| `npm run dry-run` | 只抓取不调 LLM，验证数据源 | ~30s |
| `npm run render [date]` | 改了 CSS/排版后重渲染 | <1s |
| `npm run regen-trading [date]` | 重做交易部分 | ~2 min |
| `npm run regen-enrich <cat:sub> [date]` | 补缺失的中文摘要 | ~30s |
| `npm run open` | 在 Chrome 打开今日报告 | 即时 |
| `npm run quota-report` | 看各 LLM backend 用量统计 | 即时 |

## LLM 后端配置

项目通过 `LLM_BACKEND` 环境变量切换后端。**默认 `claude-cli`**（不设环境变量也是它），所以登录过 Claude Code 的用户开箱即用。

把 `.env.example` 复制成 `.env.local`（已经 gitignored），按 backend 解开对应几行：

| backend | API key 环境变量 | 默认 model | base URL |
|---|---|---|---|
| `claude-cli` （默认）| 不需要，复用 Claude Code OAuth | `sonnet` | — |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | `api.anthropic.com` |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | `api.openai.com/v1` |
| `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-v4-flash` | `api.deepseek.com/v1` |
| `minimax` | `MINIMAX_API_KEY` | `MiniMax-M2.7` | `api.minimax.io/v1` <sup>1</sup> |

<sup>1</sup> 中国大陆访问设 `MINIMAX_BASE_URL=https://api.minimaxi.com/v1`。

通用覆盖项：
- `LLM_MODEL=<id>` — 任意 backend 的 model 都能用这个变量覆盖默认（如 `LLM_MODEL=gpt-4o` 走 openai 的更大模型）
- `<BACKEND>_BASE_URL` — 走自托管代理 / 兼容服务（如 LM Studio / Ollama 跑 OpenAI 兼容接口 → `LLM_BACKEND=openai` + `OPENAI_BASE_URL=http://localhost:1234/v1`）

### 怎么选

| 你的情况 | 推荐 backend |
|---|---|
| 已经订了 Claude Max（**Max 5h 滚动窗口够用，不想额外付钱**） | `claude-cli` |
| 没 Max，只想跑日报，预算 ~$0.5/天 | `openai` 配 `gpt-4o-mini` 或 `deepseek` 配 `deepseek-v4-flash`（更便宜） |
| 中文摘要质量优先，预算可放宽 | `anthropic` 配 `claude-sonnet-4-6`（API 计费） |
| 国内网络访问，要规避 GFW | `deepseek` 或 `minimax`（都是国内厂商） |

### 切 backend 不需要改代码

所有 prompt 都已经在 `lib/ai/prompts.ts` 抽离，跟 backend 无关；JSON 错误兜底（`jsonrepair`）也是 backend-agnostic。切完 backend 后跑一次 `npm run daily`，进 `logs/llm-calls.jsonl` 看新 backend 的调用记录。

## Claude Code 集成

**装好后任意目录**（不必 cd 进项目）打开 Claude Code 都可用：

| 触发 | 行为 |
|---|---|
| `/run-daily` | 立即触发 daily 并后台监听到完成。从任意目录都行 |
| `/check-daily` | 查任务状态 + 报告文件 + 配额 |
| 描述问题（"日报又挂了"、"X 推文为啥没更新"等）| `daily-brief` skill 的关键词触发自动加载，让 Claude 直接懂这个项目 |

实现机制：`scripts/install.mjs --global` 在 `~/.claude/` 下建符号链接，指向项目内的 [.claude/skills/daily-brief/SKILL.md](.claude/skills/daily-brief/SKILL.md) 和 [.claude/commands/](.claude/commands/) 文件——**单一源**，编辑项目文件等于编辑用户级 skill。当 symlink 因权限受限失败时（如 Windows 无开发者模式），自动 fallback 到 copy。`~/.daily-brief-config` 记录项目实际路径，让 slash command 在任意 cwd 都能找到项目。

## 项目结构

```
daily-brief/
├── lib/
│   ├── sources/        # RSS / API / curl 抓取器；新加源在这里
│   ├── ai/             # 可插拔 LLM 后端 + 提示词（lib/ai/backends/ 下每个 backend）
│   ├── trading/        # Yahoo Finance + 技术指标
│   └── output/         # 渲染层 (HTML / Markdown)
├── scripts/
│   ├── daily.ts        # 主管线
│   ├── render.ts       # 重渲染
│   ├── regen-*.ts      # 局部重跑
│   ├── quota-report.ts # Sonnet 用量统计
│   ├── run-daily.mjs   # 调度器调用的包装
│   ├── open-report.mjs # 打开最新报告（跨平台）
│   ├── install.mjs     # 注册定时任务（Win/Mac/Linux 自适应）
│   └── uninstall.mjs   # 卸载
├── daily_reports/      # 输出 (gitignored)
├── logs/               # 运行日志 (gitignored)
└── .claude/
    ├── skills/         # Claude Code 操作 skill
    └── commands/       # slash commands
```

## 卸载

```bash
node scripts/uninstall.mjs
# 移除：定时任务 (Task Scheduler / launchd / cron) + ~/.claude/ 下的链接 + ~/.daily-brief-config
# 不动：项目文件、daily_reports/、logs/、power plan 设置
# 想彻底清理就 rm -rf 整个项目目录
```

## 自定义 / Fork

改源、改时间、改排版、加新栏目——见 [FORKING.md](FORKING.md)。

## License

MIT
