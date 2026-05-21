# daily-brief · 每日 AI/科技/财经/时政简报

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![LLM: pluggable](https://img.shields.io/badge/LLM-pluggable%20(5%20backends)-orange.svg)](#llm-后端配置)
[![Demo: live](https://img.shields.io/badge/demo-daily.leiting.tech-brightgreen.svg)](https://daily.leiting.tech)
[![Stars](https://img.shields.io/github/stars/leiting-eric/DailyBrief?style=social)](https://github.com/leiting-eric/DailyBrief)

> **每天自动跑一份你的私人简报** — 22 个数据源 · LLM 摘要 · 股票/加密**技术指标 + AI 交易点评** · 中英双语 · 5 个 LLM 后端可选（Claude CLI / Anthropic / OpenAI / DeepSeek / MiniMax）· 一切本地运行，零云依赖。

> ***Your morning brief shouldn't live in someone else's database.*** *A self-hosted daily digest — tech, markets, geopolitics, finance — 22 sources, LLM-summarized in Chinese or English, with stock/crypto technicals + AI trading commentary. 5 swappable LLM backends (claude-cli / anthropic / openai / deepseek / minimax). Zero secrets to start with the default `claude` CLI. [Live demo](https://daily.leiting.tech).*

**[📰 在线 Demo · daily.leiting.tech](https://daily.leiting.tech)**

<table>
  <tr>
    <td width="50%" align="center"><img src="docs/screenshots/tech.png" alt="技术动态 — GitHub Trending / X 推文 / AI 媒体" width="100%"><br><sub>技术动态 — GH Trending + X 推文 + AI 媒体</sub></td>
    <td width="50%" align="center"><img src="docs/screenshots/trading.png" alt="市场行情 — 21 ticker 技术指标 + AI 中文点评" width="100%"><br><sub>市场行情 — 21 ticker 技术指标 + AI 中文点评</sub></td>
  </tr>
  <tr>
    <td width="50%" align="center"><img src="docs/screenshots/politics.png" alt="时政观察 — BBC / Guardian / NYT 等国际要闻" width="100%"><br><sub>时政观察 — BBC / Guardian / NYT 国际要闻</sub></td>
    <td width="50%" align="center"><img src="docs/screenshots/finance.png" alt="财经要点 — Bloomberg / WSJ / FT 全球财经" width="100%"><br><sub>财经要点 — Bloomberg / WSJ / FT 全球财经</sub></td>
  </tr>
</table>

每天自动生成一份单文件 HTML 报告，覆盖：

- **技术动态** — GitHub Trending 热榜、AI 资讯（OpenAI/DeepMind/Hugging Face/TLDR AI/Smol AI/Latent Space/MIT Tech Review）、X 推文（attentionvc 维度）
- **市场行情** — 21 个 ticker 的技术指标（SMA / RSI / MACD）+ 加密恐慌贪婪指数 + LLM 中文交易点评
- **时政观察** — BBC / Guardian / NYT / NPR / DW / Al Jazeera / The Diplomat 国际要闻
- **财经要点** — Bloomberg / WSJ / FT / BBC / Economist 全球财经
- **社区讨论** — V2EX / LinuxDo 中文社区热议

英文源附 LLM 生成的中文摘要。报告以 `daily_reports/<日期>/<日期>.html` 落盘（每天一个子目录），日期使用系统本地时区，可在 `.env.local` 用 `REPORT_TZ` 改（如 `Asia/Shanghai` / `UTC`）。单文件、CSS+JS 全内联。

## 设计要点

- **本地驱动**：系统自带调度器触发（Windows Task Scheduler / macOS launchd / Linux cron），不依赖任何云服务
- **数据源零 API key**：所有数据源走免费公开端点（RSS / 公开 JSON）
- **LLM 后端可插拔**：通过 `LLM_BACKEND` 环境变量在 claude CLI / Anthropic / OpenAI / DeepSeek / MiniMax 之间一行切换。默认走本地 [claude CLI](https://github.com/anthropics/claude-code)（复用 Claude Code 已有的认证，按你订阅的等级计费），其他后端按各家 API key 走 —— 见 [LLM 后端配置](#llm-后端配置)
- **错误隔离**：单源失败不阻断全流程，单次 LLM 失败有 1-shot 重试 + 兜底渲染
- **可观测**：每次任务运行写 `logs/daily-<日期>.log`，每次 LLM 调用写 `logs/llm-calls.jsonl`，`npm run quota-report` 按 backend 汇总热度

## 前置要求

- **Node.js 20+** + **npm**
- **Windows 10/11** / **macOS 12+** / **Linux**（任一平台都支持，定时机制自动适配）
- **一个能跑的 LLM**（任选其一）：
  - 默认：[Claude Code CLI](https://docs.claude.com/en/docs/claude-code/quickstart) 已登录（项目复用它的认证，按你 Claude 订阅的等级计费）
  - 或：Anthropic / OpenAI / DeepSeek / MiniMax 任一家的 API key（详见 [LLM 后端配置](#llm-后端配置)）
- **git**

## 给 AI Agent 一句话装

无论你用哪个 AI Agent（Claude Code / Cursor / Codex / Continue.dev / OpenClaw 等），直接把下面这段发给它：

> 帮我装这个开源项目，跑 `node scripts/install.mjs --global` 完成全局安装，装好后告诉我下次自动触发的时间：
> https://github.com/leiting-eric/DailyBrief

Agent 会执行：`git clone` → `npm install` → 注册系统调度器（Task Scheduler / launchd / cron）→ 跑一次 `npm run dry-run` 烟测。**装完后定时任务在系统层面跑，不再需要 Agent 介入**。

### Claude Code 用户额外福利

`--global` 步骤会在 `~/.claude/` 下链接 skill 和 slash command，所以：
- 任意目录打开 Claude Code 都能用 `/run-daily`、`/check-daily`
- 描述问题（"日报又挂了"、"加个新数据源"）也能触发 `daily-brief` skill 自动加载

Cursor / Codex / 其他 Agent 没有 skill 加载机制，定时任务跑得起来，但这两个交互层福利吃不到。要手动运行就 `cd` 到项目目录跑 `npm run daily`，或者用对应平台的命令触发：

| 平台 | 手动触发 |
|---|---|
| Windows | `Start-ScheduledTask -TaskName DailyBrief` |
| macOS | `launchctl start com.daily-brief` |
| Linux | `node scripts/run-daily.mjs`（cron 不支持手动触发） |

### LLM 后端说明

默认走 **claude CLI**——多数 Claude Code 用户开箱即用，但首次需要本人在浏览器登录一次（Agent 替不了 OAuth 同意）：

```bash
echo "hi" | claude --print --model sonnet
```

登录一次永久生效。**不用 Claude Code 或想走自己的 API key 的用户**：跳过 claude CLI，复制 `.env.example` 到 `.env.local` 把 `LLM_BACKEND` 切到 OpenAI / Anthropic / DeepSeek / MiniMax 任一家——见 [LLM 后端配置](#llm-后端配置)。bootstrap 检测到没装 claude CLI 时只发警告不阻断，可以继续完成调度器注册。

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
| `npm run sources` | 列出所有数据源（按 locale 标注启用/过滤状态）| 即时 |
| `npm run sources:check` | 仅校验 `sources.config.json` schema（适合 CI / pre-commit）| 即时 |

## 数据源配置

数据源以 JSON 数组形式集中存储在项目根的 [`sources.config.json`](sources.config.json) — **唯一配置入口**，不需要改 TypeScript 代码即可加/禁/调整源。每条记录的字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✓ | 全局唯一短标识（dispatch.ts 用 id 路由到对应 fetcher）|
| `name` | ✓ | UI 显示名 |
| `type` | ✓ | `rss` / `api` / `scrape` |
| `url` | ✓ | RSS feed 或 API endpoint |
| `category` | ✓ | `tech` / `finance` / `politics`，决定 L1 tab |
| `subcategory` |   | `tech` 下的 L2 分组（`github-trending` / `ai-news` / `x-viral` / `cn-community`）；`finance` 下统一 `news` |
| `enabled` |   | 默认 `true`，设 `false` 跳过抓取（保留记录便于回滚）|
| `useCurl` |   | 若该源被 Cloudflare TLS-fingerprint 拦了 Node undici，设 `true` 让 rss.ts 走 curl 子进程 |
| `lang` |   | `zh` 表示源内容是中文 — enrich 阶段会跳过它（无需把中文翻译成中文）|
| `locales` |   | 数组，标明该源出现在哪些 report locale 下。默认 `["zh", "en"]` |
| `notes` |   | 任意备注（如"被废弃因为 feed 死了"），运行时忽略 |

### 加一个 RSS 源

1. 编辑 `sources.config.json`，追加一条记录
2. 跑 `npm run sources:check` 校验 schema
3. `npm run dry-run` 抓一次验证拉取正常
4. 下次 `npm run daily` 自动包含

### Locale 模式（zh / en）

通过 `REPORT_LOCALE` 环境变量切换：

```bash
# .env.local
REPORT_LOCALE=zh    # 默认 — 中文 mode，含 V2EX / LinuxDo / DW 中文等中文源
# REPORT_LOCALE=en  # 英文 mode — 自动过滤掉 zh-only 源，挂上 en-only 源
```

每个源在 JSON 里的 `locales` 字段决定它在哪些模式下出现：

- `["zh"]` — **仅中文 mode**（V2EX / LinuxDo / DW 中文 / 阮一峰等中文专属源）。英文 mode 用户读不懂这些，自动 drop。
- `["en"]` — **仅英文 mode**（Hacker News / Reddit / Lobsters 等英文社区源，用于替代中文社区源）。zh mode 不显示，避免跟 GH Trending 等重复。
- `["zh", "en"]`（默认）— 两 mode 都参与（BBC / Bloomberg / WSJ / NYT 等全球英文源 + 各 AI 资讯源）

当前实际启用源（`enabled: true`）按 locale 分布：

| Locale | 启用源数 | 主要构成 |
|---|---|---|
| `zh` | 19 | 16 个英文源（含中文摘要）+ 3 个中文社区源（V2EX / LinuxDo / DW 中文）|
| `en` | 18 | 16 个英文源 + 2 个英文社区源（Hacker News / r/stocks）|

英文 mode 完整切换：HTML UI 文案、enrichment / digest / trading-commentary 三套 prompt、stance 词（"偏上行/偏下行/中性" → Bullish/Bearish/Neutral）、日期格式（zh-CN → en-GB）、Markdown 输出 — 全部都跟着 `REPORT_LOCALE` 切。**中文社区源在英文 mode 下被自动过滤掉**（没 fork 用户读英文却想看 V2EX 帖子的合理场景）。

## LLM 后端配置

项目通过 `LLM_BACKEND` 环境变量切换后端。**默认 `claude-cli`** —— 直接复用 Claude Code 已登录的认证，不需要额外配 API key。不用 Claude Code、或想走自己的 API key，按下表切换。

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
| 已经在用 Claude Code（任意订阅等级）| `claude-cli` — 零配置，按你订阅的等级走 |
| 不用 Claude Code，只想低成本跑日报 | `openai` 配 `gpt-4o-mini`、或 `deepseek` 配 `deepseek-v4-flash`（更便宜）|
| 中文摘要质量优先，预算可放宽 | `anthropic` 配 `claude-sonnet-4-6` |
| 国内网络访问，要规避 GFW | `deepseek` 或 `minimax`（都是国内厂商）|

### 切 backend 不需要改代码

所有 prompt 都已经在 `lib/ai/prompts.ts` 抽离，跟 backend 无关；JSON 错误兜底（`jsonrepair`）也是 backend-agnostic。切完 backend 后跑一次 `npm run daily`，进 `logs/llm-calls.jsonl` 看新 backend 的调用记录。

## 自托管部署（可选）

每次 `npm run daily` 跑完，自动把新 HTML 推到自己的服务器，访客打开 `https://your-domain/` 就能看到当天最新报告。**默认不启用**，环境变量不设就跳过。

### 一次性服务器准备

假设服务器跑 Ubuntu + nginx + 已申请域名，登录用户有 sudo NOPASSWD：

```bash
# 服务器上
sudo mkdir -p /var/www/your-domain && sudo chown -R www-data:www-data /var/www/your-domain
```

`/etc/nginx/sites-available/your-domain.conf`：

```nginx
server {
    listen 80;
    server_name your-domain;
    root /var/www/your-domain;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

启用 + 自动签 SSL：

```bash
sudo ln -s /etc/nginx/sites-available/your-domain.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain --agree-tos --redirect
```

### 本地启用 auto-deploy

`.env.local`（gitignored）加两行：

```
DEPLOY_HOST=user@your-server-ip
DEPLOY_PATH=/var/www/your-domain
```

之后：
- 每次 `npm run daily` 跑完，自动 scp 当天 HTML 到服务器 + 刷新 `index.html`
- 也可 `npm run deploy [YYYY-MM-DD]` 手动推任意一天
- 部署失败不阻断 daily 本身（HTML 已经在本地 `daily_reports/` 落盘，可重跑 `npm run deploy` 补推）

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
│   └── 2026-05-15/     # 每日一个子目录，内含 .html (主) / .json (缓存) / -articles.json (缓存)
│                       #   .md 默认不生成，可在 .env.local 设 OUTPUT_MARKDOWN=true 开启
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
