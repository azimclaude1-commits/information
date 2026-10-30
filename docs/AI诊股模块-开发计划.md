# AI诊股独立项目：开发计划（v1.0）

日期：2026-10-13
前置文档：`docs/AI诊股模块-功能盘点与需求确认.md`（原型功能盘点，编号 D01–D16 / A01–A08 / H01–H09 / C01–C09 在本文沿用）
执行方式：后端由 **gpt6.1sol** 开发，前端由 **opus5.5** 开发。两者以 `contracts/openapi.yaml` 为唯一契约，可并行推进。

---

## 0. 给执行 AI 的总规则（每个 Agent 必读）

1. **契约优先**：任何接口字段变动必须先改 `contracts/openapi.yaml`，再改实现；前端只依赖由契约生成的类型。
2. **数字不由 LLM 产生**：价格、评分、支撑阻力、涨跌幅、资金数据全部由后端算法计算；LLM 只负责把「事实 JSON」组织成文字，并经过数字一致性校验（见 §5.6）。
3. **不编造数据**：拿不到的数据返回 `null` + `available:false`，前端显示「暂无数据」，禁止回退到随机或模板数字。原型中的 Mitrade/IBKR 报价、`NVDA3L` 拼接代码、「暗池/冰山单/对冲基金席位」等描述一律不得出现。
4. **每个数据都带来源与时间**：响应里的数据块都要带 `source`、`asOf`，延迟数据带 `delayed:true`。
5. **密钥只在后端**：第三方 Key 只存在后端环境变量中，绝不下发前端，也不写入日志。
6. 依赖选择：优先使用发布超过 7 天的稳定版本并锁定版本（`uv.lock` / `package-lock.json`），不用 `latest`。
7. 每个里程碑结束必须通过：后端 `ruff` + `mypy` + `pytest`；前端 `tsc --noEmit` + `vitest` + `vite build`；契约 `openapi lint`。

---

## 1. 已确认决策

| 项 | 决策 |
| --- | --- |
| 范围 | 4 个子页全部真实可用：AI诊股、Ace智搜、热门榜单、云图 |
| 市场 | 美股（全市场可搜）、加密（现货 + 永续衍生品数据）、外汇、商品、指数；不含港股和 A 股 |
| 部署 | 服务器在海外，用户含中国大陆；Docker Compose 部署 |
| 后端 | Python 3.12 + FastAPI + PostgreSQL 16 + Redis 7 |
| 前端 | 独立参考应用 React 19 + Vite + Tailwind v4，沿用原型 `--ui-*` 设计令牌 |
| 运行时 LLM | 多模型可配置，统一走 OpenAI 兼容协议，按任务路由，并带降级链 |
| 数据预算 | 每月 >$500，必须使用商用/对外展示授权 |
| CFD 报价 | 全部用三方数据（不接宿主报价）；页面标注「行情来源 X，可能与交易报价存在差异」 |
| 虚构模块 | 换成真实可得的数据（替换方案见 §2） |
| 合规 | 保留目标价、止损和一键做多/做空；价位由算法计算，统一附风险提示 |
| 鉴权 | 宿主签发 JWT，本服务只校验；开发期提供游客 token |
| AI写指标 | 一期不做（入口隐藏） |
| 实时性 | 准实时：后端每 5–60 秒拉取一次并缓存，前端轮询；爆仓流与 Ace 回答走 SSE |
| 语言 | 简体、繁体、英文（`zh-Hans` / `zh-Hant` / `en`） |
| 用量 | 初期日活 <1000，配额和模型路由可配置 |
| 管理后台 | 一期不做；用 YAML 配置 + 受保护的管理 API |
| 一键下单 | 独立前端只触发 `HostBridge.onTrade` 回调（默认弹提示，或跳转可配置的 URL） |

---

## 2. 功能分析与真实数据替换方案

### 2.1 AI诊股（`/diagnosis`）

| 原型功能 | 一期实现 | 数据来源 |
| --- | --- | --- |
| D01 搜索 | 后端统一标的目录 + 别名（中英文名、代码、`XAU`→`XAU/USD`）；返回候选列表供用户消歧，未收录时给出提示 | 本地目录（启动时从 Twelve Data `/stocks` `/forex_pairs` `/commodities`、CoinGecko 币种列表同步）+ Twelve Data `/symbol_search` 兜底 |
| D02 快捷标的 | 配置文件 `quick_symbols.yaml` | 配置 |
| D03 自动分析 / 刷新 | 读缓存报告（15 分钟一档）；「刷新」需要登录，并按用户限流；同一标的的并发请求只生成一次（single-flight） | — |
| D04 方向 + 综合分 + 摘要 | 综合分和方向由评分引擎决定；摘要由 LLM 生成 | 评分引擎 §5.4 |
| D05 三条策略 | 短线 / 走势预期（看涨时标题为「上涨预期」，看跌为「下跌风险」，中性为「区间研判」）/ 中长期；LLM 基于价位事实撰写 | LLM |
| D06 当前价 / 目标区间 / 止损 | 算法计算（§5.5） | 行情 + K 线 |
| D07 五维雷达 | **固定 5 轴，轴名按资产类别切换**（§5.4），无数据的维度标灰 | 见 §5.4 |
| D08 客户多头占比 | 改为「市场多空比」：加密用 CoinGlass 全网账户多空比；外汇/商品/指数用 CFTC COT 投机净持仓；美股不显示 | CoinGlass / CFTC |
| D09 一键做多/做空 | 前端回调；API 返回 `tradeable`、`hostSymbol`（由映射表提供） | 映射表 |
| D10 交易对 | 加密：各交易所真实现货/永续价格、资金费率、OI；美股：真实跨市场挂牌（`/cross_listings`）+ 盘前盘后状态；外汇/商品/指数：现货 + 相关期货/ETF 报价 | CoinGlass / Twelve Data |
| D11 关联标的与杠杆 ETF | 维护一份**真实存在的产品映射表**（如 NVDA→NVDL/NVDD，QQQ→TQQQ/SQQQ，BTC→IBIT/FBTC，XAU→GLD/IAU），外加同行业股票（`/profile` 行业字段）；报价走 Twelve Data | `related_instruments.yaml` + Twelve Data |
| D12 所属与联动板块 | 美股按 `/profile` 行业分组、加密按 CoinGecko 分类映射到主分类、外汇/商品按固定分组；板块涨幅为本服务标的池内的成分均值，并给出领涨标的 | 自算 |
| D13 技术面 | 1D / 4H K 线计算 MA、RSI、MACD、ADX、布林、ATR、支撑阻力 | Twelve Data / CoinGlass K 线 |
| D14 资金流（原「暗池」） | 改名为「资金流向」，按资产类别分别处理：<br>• 美股：OBV / A-D 斜率、MFI、相对成交量、近 90 天内部人交易，标注「基于量价估算」<br>• 加密：现货与合约净流入、主动买卖比、ETF 资金流<br>• 外汇/商品/指数：COT 净持仓变化 | Twelve Data / CoinGlass / CFTC |
| D15 基本面与估值 | 仅美股：营收/EPS 增速、利润率、ROE、FCF、负债率、PE/PB/股息率（Venture 不含分析师预期，不显示目标价共识）；加密替换为「市场结构」「流动性与估值」两维 | Twelve Data `/statistics` `/income_statement` 等 |
| D16 风险与仓位 | 规则生成风险等级（波动率分位、事件临近如财报日、杠杆资金费率极值）+ LLM 文字；不读取用户持仓 | 自算 + LLM |

### 2.2 Ace智搜（`/ace`）

| 原型功能 | 一期实现 |
| --- | --- |
| A01 新建对话 | `POST /v1/ace/conversations` |
| A02 最近对话 | 用户的真实会话列表（按 JWT `sub` 归属），可重命名、删除 |
| A03 预设主题 | 改成新对话页上的「推荐提问」（配置文件，三种语言） |
| A04/A05 提问与追问 | LLM Agent + 工具调用（行情、K 线指标、基本面、加密衍生品、ETF 流、新闻、联网搜索、诊股摘要）；SSE 流式输出；附引用；支持取消 |
| A06 K线分析 | 跳转到诊股页，带上当前会话识别出的标的（不再固定 NVDA） |
| A07 AI写指标 | 一期隐藏入口 |
| A08 打开 AI诊股 | 回答中出现标的时下发 `card` 事件，前端渲染「打开诊股」按钮 |

### 2.3 热门榜单（`/hotlist`）

每个榜单都有 `market` 维度（`crypto` / `us` / `fx_cmd_idx` / `all`），不适用的组合不提供。

| 编号 | 榜单 | 一期口径 | 来源 | 刷新 |
| --- | --- | --- | --- | --- |
| H01 | 比特币 ETF | ETF 本身报价 + 日净流入（T+1，最新一日标注「待结算」）；行点击打开 **ETF 本身** 的诊股（如 `us:IBIT`），不再映射到 BTC | Twelve Data 报价 + CoinGlass ETF 流 | 报价 60s / 流 1h |
| H02 | 热门搜索 | 本站诊股/Ace/搜索事件 24h 计数（加权去重）；加密冷启动时混入 CoinGecko trending 并标注来源 | 自有 `search_events` + CoinGecko | 5min |
| H03/H04 | 涨/跌幅 | 加密：市值前 250 的 24h 涨跌；美股：`/market_movers`（当日）；外汇商品指数：池内排序 | CoinGecko / Twelve Data | 60s / 5min |
| H05 | 成交额 | 统一换算为 USD 成交额；美股为当日成交额 | 同上 | 60s |
| H06 | 实时大额爆仓 | 全网交易所爆仓单（只限加密），可设金额阈值；**不混入 CFD** | CoinGlass | 15s（SSE 推送） |
| H07 | 持仓量 OI | 全网聚合名义持仓（USD）+ 24h 变化 | CoinGlass | 60s |
| H08 | 资金费率异动 | OI 加权资金费率，按绝对值排序，并显示结算周期 | CoinGlass | 60s |
| H09 | 净流入 | 加密：现货+合约净流入（CoinGlass）；美股：量价资金流估算，明确标注「估算」 | CoinGlass / 自算 | 5min |

### 2.4 云图（`/heatmap`）

| 编号 | 一期实现 |
| --- | --- |
| C01 前 100/25/10 | 按市场分别排序：加密按 CoinGecko 市值；美股按市值（候选池 = S&P 500 ∪ Nasdaq-100，每晚计算）；外汇商品指数为固定池，不按市值筛选 |
| C02 指标 | `change` 控制颜色和文字；`volume` 时文字显示成交额，颜色仍按涨跌（与原型一致，并在图例中注明） |
| C03 面积 | `cap`（市值，仅股票/加密）/ `turnover`（成交额）/ `equal`；外汇商品指数只能选 `turnover` 或 `equal` |
| C04 分组 | 按板块分组或不分组（§2.1 D12 的分类） |
| C05 周期 | 5m / 1h / 4h / 24h，由后端每分钟价格快照**真实计算**；美股休市期间按最后交易时段计算，并返回 `marketState` |
| C06 颜色强度 | 前端本地计算（沿用原型配色并做色盲友好校验） |
| C07 悬停 | 同一快照时间戳 `asOf` |
| C08 点击 | 统一 `instrumentId` 跳转诊股 |
| C09 布局 | 前端沿用原型 `partition()` 二分布局；窄屏按组竖排 |

市场切换：云图顶部新增 `市场` 选择（加密 / 美股 / 外汇·商品·指数）。三类资产的「市值」口径不同，**不提供混合市场的单一云图**。

---

## 3. 数据源方案（订阅建议）

价格为 2026-10 从官网或第三方核对的结果，下单前以官网为准。全部需要选择**商用 / Business** 档。

| 平台 | 档位 | 月费 | 用途 | 授权要点 |
| --- | --- | --- | --- | --- |
| **Twelve Data** | Business **Venture**（2,584 credits/min 档） | **$499**（年付 -17%；开发期可先用 $299 档） | 美股报价/K 线/基本面/资料/跨市场挂牌/涨跌榜/内部人交易；外汇、商品、指数报价与 K 线 | Venture 含对外展示授权；**不含** Ultra+ 数据（分析师预期、目标价、机构持仓、ETF 成分） |
| **CoinGlass** | **Standard** | **$299**（年付 $3,588） | 爆仓、OI、资金费率、多空比、ETF 资金流、各交易所交易对行情、净流入、恐慌贪婪指数、加密 K 线 | Standard 起为 Commercial use；Hobbyist/Startup 仅限个人使用 |
| **CoinGecko** | **Analyst** | **$129**（年付约 $103/月） | 加密市值排行、分类（板块）、Logo、trending、币种目录 | 含 Commercial License，**需要标注 "Data by CoinGecko"** |
| **Benzinga News（经 Massive）** | Benzinga News **Business** | 需询价（个人版 $99/月/数据集，仅供参考） | 美股/宏观新闻全文 + 标的标签，用于情绪维度和 Ace 引用 | 商用必须是 Business 版；找 sales@massive.com |
| **Tavily** | Bootstrap 起步 | $100（15k credits）→ 按用量升级 | Ace 联网搜索（加密新闻、宏观、实时问题），返回可引用的 URL | 实现成 Provider，可切换到 Exa（$7/千次） |
| **CFTC COT** | 公开 API | 免费 | 外汇、黄金、原油、股指期货的周度持仓 | 政府公开数据，标注来源 |
| **LLM** | 多供应商 | 按量计费 | 诊股文字、Ace 对话、新闻情绪打标、会话标题 | 见 §5.7 |

**合计**：数据约 $1,030–$1,250/月（不含 Benzinga Business 报价和 LLM 费用）。

### 3.1 Twelve Data 额度估算（Venture $499 = 2,584 credits/min）

| 任务 | 频率 | credits/min |
| --- | --- | --- |
| 美股行情池（约 600 只，S&P500 ∪ NDX，批量 quote） | 交易时段每 60s；休市每 15min | ≈600 |
| 外汇 / 商品 / 指数池（约 40 个） | 30s | ≈80 |
| `market_movers` 涨/跌 | 5min | ≈40 |
| 临时诊股（新标的首次约 600 credits，包含基本面；之后命中 24h 缓存） | 按需 | 峰值 ≤1,200 |
| 夜间 `/statistics` 市值（600 × 50） | 凌晨，限速执行 | 不占日间额度 |

加密行情**不走** Twelve Data，改用 CoinGecko（`/coins/markets` 每页 250 条，1 次调用），从而节省 credits。

### 3.2 地区与网络注意事项

- **服务器放新加坡或东京，不要放香港**：OpenAI、Anthropic 官方 API 目前不支持香港地区（以官方 supported countries 列表为准）。
- 大陆用户访问：API 域名可以挂到宿主的网关/CDN 上（宿主负责大陆加速）；SSE 需要关闭代理缓冲（`X-Accel-Buffering: no`）。
- 前端不加载任何 Google 资源（沿用原型自托管字体）。

### 3.3 文档入口（交给后端 AI）

- Twelve Data：`https://twelvedata.com/llms-full.txt`（含各接口 credits 与档位要求）
- CoinGlass：`https://docs.coinglass.com/llms.txt`
- CoinGecko：`https://docs.coingecko.com`
- Benzinga（Massive）：`https://massive.com/docs/rest/partners/benzinga/news`
- Tavily：`https://docs.tavily.com`
- CFTC：`https://publicreporting.cftc.gov`

**接口路径一律以官方文档为准，不要凭记忆编写。**每个 Provider 首次接入时都要录制真实响应作为测试 fixture。

---

## 4. 总体架构

```
             ┌──────────── 宿主前端（技术团队） ────────────┐
             │   或  本项目独立参考前端（React，opus5.5）     │
             └───────────────┬──────────────────────────────┘
                             │ HTTPS  REST + SSE   Authorization: Bearer <宿主JWT>
                ┌────────────▼─────────────┐
                │  api（FastAPI, uvicorn）   │  鉴权/限流/契约/SSE
                └───┬───────────┬──────────┘
                    │           │
         ┌──────────▼──┐   ┌────▼───────────┐
         │ Redis 7      │   │ PostgreSQL 16  │
         │ 行情/快照/榜单 │   │ 会话/报告审计/   │
         │ 缓存/锁/限流   │   │ 目录/映射/用量   │
         └──────▲──────┘   └────▲───────────┘
                │               │
         ┌──────┴───────────────┴──┐
         │ worker（APScheduler）     │  定时拉取 → 标准化 → 写缓存/快照
         └──────┬───────────────────┘
                │ httpx
   Twelve Data · CoinGlass · CoinGecko · Benzinga · Tavily · CFTC · LLM 供应商
```

- `api` 与 `worker` 用同一个代码库、两个进程（同一镜像，入口命令不同）。
- `api` 只读缓存；缓存未命中时可以按需调用 Provider（诊股新标的、Ace 工具），通过 Redis 锁实现 single-flight。

### 4.1 仓库结构（新项目 `alphapulse-ai-research/`）

```
contracts/openapi.yaml           # 唯一契约（后端维护，前端只读）
backend/
  pyproject.toml  uv.lock  AGENTS.md
  app/
    main.py                     # FastAPI 应用，路由挂载
    config.py                   # pydantic-settings，读取 env + config/*.yaml
    api/v1/                     # instruments, quotes, diagnosis, ace, hotlists, heatmap, meta, admin
    core/                       # auth(JWT), ratelimit, errors, i18n(OpenCC), sse, logging
    providers/                  # twelvedata, coinglass, coingecko, benzinga, tavily, cftc, llm
      base.py                   # Provider 协议、重试、熔断、计量
    domain/
      instruments/              # 目录、别名、映射、搜索
      market/                   # 行情标准化、快照、周期涨跌
      indicators/               # numpy 实现的 MA/EMA/RSI/MACD/ADX/BOLL/ATR/OBV/MFI/AD/pivots
      scoring/                  # 按资产类别的五维评分
      levels/                   # 支撑阻力 / 目标 / 止损
      diagnosis/                # 事实组装 → LLM → 校验 → 多语言 → 缓存/审计
      ace/                      # agent loop、tools、会话、配额
      hotlists/  heatmap/
    jobs/                       # worker 定时任务
    db/                         # SQLAlchemy 2 models + Alembic migrations
  config/                       # quick_symbols.yaml, related_instruments.yaml, sectors.yaml,
                                # host_symbol_map.yaml, ace_prompts.yaml, scoring.yaml, llm_routes.yaml
  prompts/                      # 版本化提示词（diagnosis_v1.md, ace_system_v1.md ...）
  tests/  fixtures/
frontend/
  package.json  AGENTS.md
  src/
    api/                        # openapi-typescript 生成的类型 + openapi-fetch 客户端 + SSE 解析
    mocks/                      # MSW handlers（基于契约 examples）
    host/HostBridge.ts          # 宿主适配接口 + 独立运行默认实现
    i18n/                       # zh-Hans / zh-Hant / en 字典
    pages/ diagnosis/ ace/ hotlist/ heatmap/
    components/                 # Radar, Treemap(partition), BoardCard, Markdown, StaleBadge...
    styles/                     # 从原型复制的 index.css 令牌与 ui-* 原语、research.css
docker-compose.yml  .env.example  README.md  AGENTS.md
```

---

## 5. 后端详细设计（gpt6.1sol）

### 5.1 技术栈

FastAPI、Pydantic v2、SQLAlchemy 2（async）+ Alembic、asyncpg、redis-py（asyncio）、httpx、APScheduler、numpy/pandas、PyJWT（RS256/JWKS）、OpenCC（简转繁）、官方 `openai` SDK（通过 `base_url` 对接各家 OpenAI 兼容端点，不引入第三方 LLM 网关依赖）、structlog。测试用 pytest、pytest-asyncio、respx（HTTP mock）。包管理用 uv。

### 5.2 标的模型

- 统一 ID：`{class}:{code}`，例如 `us:NVDA`、`crypto:BTC`、`fx:EURUSD`、`cmd:XAUUSD`、`idx:NDX`、`etf:IBIT`（ETF 用 `us:` 也可以，以 `assetClass` 区分）。URL 一律用 ID，避免 `XAU/USD` 中的斜杠问题。
- `instruments` 表：`id, asset_class, symbol, names{zh-Hans,zh-Hant,en}, aliases[], exchange, currency, decimals, sector_id, logo_url, provider_symbols{twelvedata, coingecko_id, coinglass_symbol}, active`。
- `host_symbol_map.yaml`：本服务 ID ↔ 宿主交易代码（如 `idx:NDX → NAS100`、`cmd:XAUUSD → XAU/USD`、`crypto:BTC → BTC/USD`）。有映射的标的 `tradeable=true`。
- 指数行情：Twelve Data 指数代码（SPX、NDX、HSI 等）的覆盖范围和延迟需在 M2 实测；如果不可用，就用对应 ETF（SPY/QQQ）或期货代理，并标注。

### 5.3 定时任务（worker）

| 任务 | 频率 | 写入 |
| --- | --- | --- |
| `crypto_markets`（CoinGecko top 250） | 60s | `quote:*`、快照 |
| `us_quotes`（约 600 只，批量） | 交易时段 60s / 其他 15min | `quote:*`、快照 |
| `fx_cmd_idx_quotes` | 30s | `quote:*`、快照 |
| `snapshots`：每分钟把价格写入 Redis ZSET（保留 26h） | 60s | `snap:{id}` |
| `us_movers` | 5min | `hot:gainers/losers:us` |
| `cg_liquidations` | 15s | `liq:stream`（Redis Stream）+ 榜单 |
| `cg_oi` / `cg_funding` / `cg_longshort` | 60s / 60s / 5min | 榜单、诊股 |
| `cg_netflow` | 5min | 榜单、诊股 |
| `cg_etf_flows` | 1h | H01 |
| `news_benzinga` 拉取 + 用轻量模型打情绪标签 | 2min | `news` 表 |
| `cftc_cot` | 每周六 | `cot` 表 |
| `us_fundamentals_nightly`（`/statistics`、`/profile`） | 每日 / 每周 | `fundamentals` 表 |
| `coingecko_categories` | 每日 | `sectors` |
| `diagnosis_prewarm`（快捷标的 + 热搜前 20，三种语言） | 15min | 报告缓存 |
| `catalog_sync` | 每日 | `instruments` |

所有任务：分布式锁（Redis `SET NX PX`）、超时、指数退避重试、失败计数；连续失败触发熔断，熔断期间对应数据块返回 `stale:true` 和最后成功时间。

### 5.4 五维评分（规则可配置，写在 `config/scoring.yaml`）

每个子指标通过分段线性函数映射到 0–100；维度分 = 子指标加权平均；有子指标缺失时按剩余权重重新归一化，**全部缺失则 `available:false`**。

| 资产类别 | 5 个轴（API 返回 key + 三种语言 label） | 综合分权重 |
| --- | --- | --- |
| 美股 / ETF | technical 技术形态、fundamental 基本面、capitalFlow 资金流向、sentiment 消息情绪、valuation 估值与股息 | .25 / .20 / .20 / .15 / .20 |
| 加密 | technical 技术形态、marketStructure 市场结构（OI 变化 vs 价格、基差）、capitalFlow 资金流向（净流入、主动买卖、ETF 流）、sentiment 多空情绪（资金费率、多空比反向、恐慌贪婪、新闻）、liquidity 流动性与估值（成交额/市值、FDV/市值、排名） | .30 / .20 / .20 / .20 / .10 |
| 外汇 / 商品 / 指数 | technical 技术形态、momentum 趋势一致性（多周期同向程度）、positioning 机构持仓（COT 净持仓分位与变化）、sentiment 消息情绪、volatility 波动风险（ATR%、已实现波动率分位，反向计分） | .30 / .20 / .20 / .15 / .15 |

- **技术形态**：价格相对 MA20/50/200、均线斜率、RSI14、MACD 柱、ADX 强度、布林位置（1D 权重 0.6，4H 权重 0.4）。
- **基本面**（美股）：营收 YoY、EPS YoY、净利率、ROE、FCF 利润率、负债权益比；能用行业中位数时用相对分位，否则用绝对阈值。
- **估值**（美股）：PE/PB 相对行业中位数、PEG、股息率、派息率。
- **消息情绪**：近 7 天与该标的相关的新闻，由 LLM 批量打 `-1/0/1` 标签并按时间衰减加权；新闻少于 3 条时该子指标缺失。
- **方向**：`overall ≥ 62` 看涨，`≤ 42` 看跌，其余为震荡（阈值可配置）。**方向只由评分决定，LLM 不能改。**
- 输出每个维度的 `signals[]`（名称、数值、展示文本、影响 +1/0/−1），作为四维研报拆解与可解释性的依据。

### 5.5 支撑阻力与价位算法

1. 取 1D 最近 120 根 + 4H 最近 180 根 K 线，用分形法（n=3）找摆动高低点，再加上经典日 Pivot（P/R1/R2/S1/S2）。
2. 用 0.5×ATR(14, 1D) 作为聚类半径；强度 = 触及次数 + 周期权重。
3. 看涨：目标区间 = 上方最近两个阻力；止损 = 最近支撑 − 0.3×ATR。看跌对称。震荡：同时给出区间上下沿，`targetZone` 为区间上沿，`stopLoss` 为下沿外 0.3×ATR。
4. 合理性约束：目标与现价距离需在 [0.5, 4]×ATR 之间，超出就改用 ATR 倍数兜底，并标记 `method:"atr_fallback"`。
5. 输出 `supports[]`、`resistances[]`、`targetZone{low,high}`、`stopLoss`、`atr`、`method`、`timeframe`。

### 5.6 诊股生成流水线

```
resolve(instrumentId) → gather facts（并行，各自带超时，缺失时为 null）
  → indicators → scoring → levels → facts JSON（完整数字，已按 decimals 格式化）
  → LLM（结构化输出 JSON Schema：summary, shortTerm, outlook, longTerm, pillars[4], risk）
  → 校验：① schema；② 文中出现的所有数字必须能在 facts 中找到（价格容差 1 个最小单位，百分比 ±0.05）；
          ③ 禁用词（保证/稳赚/必涨/暗池/冰山…）；④ 方向措辞与 stance 一致
  → 失败：带错误反馈重试 1 次 → 仍然失败就使用确定性模板（三种语言），并设置 narrativeSource:"template"
  → 生成 zh-Hans 与 en；zh-Hant 用 OpenCC（s2twp / s2hk 可配置）转换
  → 写 Redis 缓存（key: diag:{id}:{lang}:{15min桶}）+ Postgres 审计（输入 facts、输出、模型、promptVersion）
```

- 原型的 4 张研报卡（技术 / 资金流向 / 基本面 / 风险）对应 `pillars[]`；加密和外汇类的第 3 张卡分别替换为「市场结构」和「机构持仓」。
- 提示词指令用英文编写，输出语言由参数指定；提示词放在 `prompts/`，带版本号。

### 5.7 LLM 路由（`config/llm_routes.yaml` + 环境变量）

```yaml
providers:            # 均为 OpenAI 兼容端点
  openai:   { base_url: ..., api_key_env: OPENAI_API_KEY }
  anthropic:{ base_url: ..., api_key_env: ANTHROPIC_API_KEY }
  deepseek: { base_url: ..., api_key_env: DEEPSEEK_API_KEY }
routes:
  diagnosis_narrative: [ {provider: openai, model: <主力模型>}, {provider: deepseek, model: <备用>} ]
  ace_chat:            [ ... 需支持 tool calling + streaming ... ]
  ace_title:           [ ... 便宜模型 ... ]
  news_sentiment:      [ ... 便宜模型，批量 ... ]
limits: { timeout_s: 40, max_tool_rounds: 6, max_output_tokens: 1500 }
```

每次调用都写入 `llm_usage` 表（feature、provider、model、tokens、估算成本、延迟、是否降级）。

### 5.8 Ace Agent

- 工具（返回精简 JSON，并带 source/asOf）：`search_instrument`、`get_quote`、`get_candles_indicators`、`get_fundamentals`、`get_crypto_derivatives`、`get_etf_flows`、`get_diagnosis_summary`、`search_news`（Benzinga）、`web_search`（Tavily）。
- 循环：最多 6 轮工具调用；单个工具超时 8s；总时长 60s。
- 上下文：最近 12 条消息 + 更早消息的滚动摘要。
- 系统提示要求：使用新闻或网页内容必须给出引用；不承诺收益；数字必须来自工具结果；回答语言跟随 `lang`（繁体直接让模型输出，流式内容不做 OpenCC 转换）。
- 配额：默认每用户每天 30 条（可配置）、每分钟 5 条；超额返回 429 和 `retryAfter`。
- 会话标题：首轮问答结束后异步生成。
- SSE 事件（`POST /v1/ace/conversations/{id}/messages`，响应为 `text/event-stream`）：

```
event: meta      data: {"conversationId","messageId"}
event: status    data: {"stage":"searching|reading|analyzing","detail":"..."}
event: tool      data: {"name","args","summary"}
event: delta     data: {"text":"..."}
event: citation  data: {"index":1,"title","url","source","publishedAt"}
event: card      data: {"type":"instrument","instrumentId","quote":{...},"actions":["diagnose","trade"]}
event: done      data: {"finishReason","usage":{...}}
event: error     data: {"code","message"}
```

客户端断开时取消 LLM 请求；已生成的部分以 `finishReason:"cancelled"` 落库。

### 5.9 鉴权与限流

- 宿主签发 **RS256** JWT：`{iss:"alphapulse", aud:"ai-research", sub:<userId>, exp, iat}`；本服务通过 `JWT_JWKS_URL` 或 `JWT_PUBLIC_KEY` 校验，不持有私钥。
- 匿名可访问（按 IP 限流）：instruments、quotes、hotlists、heatmap、读取缓存诊股报告、爆仓 SSE。
- 需要 JWT：诊股强制刷新、Ace 全部接口。
- 开发环境：`ENV=dev` 时开放 `POST /v1/dev/guest-token`（用本地密钥对签发），生产环境禁用。
- 管理 API：`/v1/admin/*`（重载配置、查看 Provider 健康和 LLM 用量），通过 `X-Admin-Key` 访问，并限制来源 IP。

### 5.10 统一响应约定

- 成功：直接返回资源对象；列表为 `{items, nextCursor?}`。
- 错误：`{"error":{"code":"INSTRUMENT_NOT_FOUND","message":"...","details":{}}}`，并使用正确的 HTTP 状态码（不再出现「失败也返回 200 + fallback」）。
- 所有数据块都带 `source`、`asOf`、`stale`、`delayed`（如适用）。
- 金额统一用 USD 数值，同时给出 `display` 字段（按语言格式化，例如 `563.27万` / `$5.63M`）。

### 5.11 数据库表（Alembic 管理）

`instruments`、`sectors`、`fundamentals`（JSONB + fetched_at）、`news`（标的数组、情绪、来源）、`cot`、`diagnosis_reports`（审计）、`conversations`、`messages`（role、content、tool_calls、citations、tokens）、`search_events`、`llm_usage`、`provider_health`。

### 5.12 可观测性与运维

- `/healthz`（存活）、`/readyz`（DB/Redis/各 Provider 最近成功时间）。
- structlog JSON 日志，带 request_id，**屏蔽 Key 与 Authorization**。
- Postgres 每日备份（compose 中的 cron 容器 + 保留 7 天）。

---

## 6. API 契约概要（`contracts/openapi.yaml` 的初稿依据）

```
GET  /v1/instruments/search?q=&limit=10            → {items: Instrument[]}
GET  /v1/instruments/{id}                          → Instrument
GET  /v1/quotes?ids=us:NVDA,crypto:BTC             → {items: Quote[]}
GET  /v1/meta/quick-symbols                        → {items: Instrument[]}
GET  /v1/meta/disclaimer?lang=                     → {text}

GET  /v1/diagnosis/{id}?lang=                      → DiagnosisReport（命中缓存直接返回；未命中同步生成，上限约 25s，超时返回 202 + 轮询地址）
POST /v1/diagnosis/{id}/refresh?lang=      [JWT]   → DiagnosisReport
GET  /v1/diagnosis/{id}/context                    → MarketContext（venues / related / sectors）

GET  /v1/ace/suggestions?lang=                     → 推荐提问
GET  /v1/ace/conversations                 [JWT]   → {items, nextCursor}
POST /v1/ace/conversations                 [JWT]   → Conversation
GET  /v1/ace/conversations/{cid}           [JWT]   → Conversation + messages
PATCH/DELETE /v1/ace/conversations/{cid}   [JWT]
POST /v1/ace/conversations/{cid}/messages  [JWT]   → text/event-stream（§5.8）

GET  /v1/hotlists?market=&lang=                    → {boards: HotBoard[]}（总览，每榜 8 行）
GET  /v1/hotlists/{board}?market=&limit=50&lang=   → HotBoard
GET  /v1/hotlists/liquidations/stream              → text/event-stream（event: liquidation）

GET  /v1/heatmap?market=crypto|us|fx_cmd_idx&limit=100&period=5m|1h|4h|24h&area=cap|turnover|equal
                                                   → Heatmap（扁平 tiles + groups，布局由前端完成）
GET  /healthz  /readyz
```

核心结构（字段名为准，详细类型在 OpenAPI 里定义）：

```ts
Instrument   { id, assetClass, symbol, name, exchange?, currency, decimals, logoUrl?, sector?{id,name}, tradeable, hostSymbol? }
Quote        { id, price, change, changePct, high?, low?, volume?, turnoverUsd?, marketState, asOf, source, delayed }
DiagnosisReport {
  instrument, quote, lang, generatedAt, dataAsOf, expiresAt, stale,
  score: { overall, stance: "bullish"|"neutral"|"bearish", stanceLabel },
  dimensions: [{ key, label, score|null, available, summary, signals:[{name,value,display,impact}] }],   // 恒为 5 项
  levels: { supports:[{price,strength}], resistances:[...], targetZone:{low,high}, stopLoss, atr, method, timeframe },
  narrative: { summary, shortTerm, outlook:{title,text}, longTerm, source:"llm"|"template" },
  pillars: [{ key, title, score|null, text }],                                                         // 4 项
  positioning: { longPct, shortPct, label, source, asOf } | null,
  risk: { level:"low"|"medium"|"high", text },
  sources: [{ name, url? }], disclaimer, model:{ provider, name, promptVersion }
}
MarketContext {
  venues:  [{ venue, pair, price, changePct, fundingRate?, openInterestUsd?, source }],
  related: [{ instrument, relation:"leveraged_etf"|"inverse_etf"|"spot_etf"|"sector_etf"|"peer"|"perp"|"futures", price, changePct }],
  sectors: [{ id, name, changePct, leader:{ instrumentId, symbol, changePct }, count }]
}
HotBoard { id, title, market, columns:[{key,label}], rows:[{ rank, instrumentId?, name, price?, value, valueDisplay, direction }], asOf, source, refreshSec, note? }
Heatmap  { market, period, area, asOf, groups:[{id,name}], tiles:[{ instrumentId, symbol, name, groupId, price, changePct, turnoverUsd?, marketCapUsd?, weight }] }
```

每个接口在 OpenAPI 中都必须带 `examples`，供前端 MSW mock 和联调样例使用。

---

## 7. 前端详细设计（opus5.5）

### 7.1 技术栈

React 19、Vite、TypeScript strict、Tailwind v4、TanStack Query v5、react-router（路由：`/diagnosis/:id?`、`/ace/:cid?`、`/hotlist/:board?`、`/heatmap`）、openapi-typescript + openapi-fetch（类型安全客户端）、MSW（mock）、lucide-react、`@fontsource-variable/inter`、react-markdown + remark-gfm（Ace 回答，禁用原始 HTML）、vitest、Playwright。

### 7.2 从原型复用

- `src/index.css` 中的 `--ui-*` 令牌（`:root` + `.dark`）、`@theme inline` 映射和 `ui-*` 组件原语；`research.css` 中的 `news-tabs` 和 `cloud-*` 样式。
- `ResearchViews.tsx` 中的 `partition()` 树图布局和 MarketCloud 交互（筛选控件、悬停信息栏、键盘可达）。
- `AiDiagnoseView.tsx` 中的雷达图 SVG、卡片布局、底部双 Tab 布局。
- 遵循原型 `AGENTS.md` 的规范：使用令牌类名、不用 px 任意断点、长列表在 sm 以上分页、在 sm 以下固定高度滚动。

### 7.3 页面

| 页面 | 要点 |
| --- | --- |
| 诊股 | 搜索框（防抖 250ms 调用 search 接口，下拉候选，键盘可选）；快捷标的；AI 卡片（显示方向、综合分、`narrative`、价位条、做多/做空按钮调用 `HostBridge.onTrade`，`tradeable=false` 时置灰并提示）；雷达图（轴名来自 API，`available=false` 的轴虚线标灰）；多空比（为 null 时隐藏）；底部 Tab：「全网行情与板块」（venues / related / sectors 三张表）和「四维研报拆解」（pillars）；页脚显示数据来源、生成时间和免责声明；`narrative.source==="template"` 时显示「AI 解读暂不可用，当前为规则摘要」 |
| Ace | 左栏：新建对话 + 会话列表（重命名/删除）；手机端左栏变为抽屉；主区：空态显示推荐提问；流式渲染 Markdown；status 事件显示「正在检索…」；引用角标 + 底部来源列表；instrument 卡片（打开诊股 / 交易）；停止生成按钮；配额用尽提示；未登录时显示登录引导（独立应用中自动获取游客 token） |
| 热门榜单 | 市场切换 + 原型的 9 个筛选标签（只显示当前市场适用的榜单）；总览为卡片网格 1/2/3 列，单榜为完整列表（分页）；行点击跳转诊股；每张卡显示 `asOf` 与来源；爆仓榜订阅 SSE，新行高亮 |
| 云图 | 市场选择 + 原型全部控件（`area` 根据市场禁用不可用选项）；轮询 60s；保留原型的悬停、键盘操作和窄屏布局；底部标注「Data by CoinGecko」等来源 |

### 7.4 通用状态（四页都要实现）

骨架屏加载、错误 + 重试、空数据、`stale`（显示「数据更新于 x 分钟前」）、`delayed`、美股休市标识、429 配额提示、离线提示。

### 7.5 HostBridge（宿主对接点）

```ts
export interface HostBridge {
  getToken(): Promise<string | null>;                 // 宿主提供 JWT；独立应用：dev 游客 token
  onTrade(p: { instrumentId: string; hostSymbol?: string; side: "buy" | "sell" }): void;  // 独立应用：toast 或跳转 VITE_TRADE_URL_TEMPLATE
  onNavigate?(route: string): void;
  lang: "zh-Hans" | "zh-Hant" | "en";
  theme: "light" | "dark";
}
```

### 7.6 数据获取

- TanStack Query 刷新间隔：quotes 15s、诊股报告按 `expiresAt` 计算、hotlists 30s、heatmap 60s；页面不可见时暂停轮询。
- SSE：自己实现基于 `fetch` + `ReadableStream` 的解析器（因为需要 POST 和 Authorization header），带单元测试；爆仓流使用原生 `EventSource`。
- `VITE_API_MOCK=1` 时启用 MSW，前端可完全脱离后端开发。

---

## 8. 给技术团队的对接说明（随代码交付 `docs/INTEGRATION.md`）

1. **JWT**：宿主后端用 RS256 私钥签发（字段见 §5.9），并提供 JWKS URL 或公钥给本服务。
2. **CORS**：提供宿主前端域名白名单。
3. **标的映射**：宿主提供可交易品种清单，填入 `host_symbol_map.yaml`。
4. **交易跳转**：前端拿到 `hostSymbol` 后调用宿主现有的 `openTrade(symbol, side)`。
5. **嵌入方式**：宿主前端按 OpenAPI 生成客户端，自行实现 UI（可参考独立前端源码）。
6. **SSE 代理**：网关需关闭缓冲，读超时 ≥ 120s。
7. **价格差异说明**：诊股价格来自三方数据，与交易报价可能存在微小差异，页面已经标注。

---

## 9. 合规与风控

- 每个诊股页和 Ace 回答下方固定显示免责声明（三种语言，来自 `/v1/meta/disclaimer`）：内容由 AI 基于公开数据生成，仅供参考，不构成投资建议；CFD/加密为高风险杠杆产品。
- 目标价和止损由算法计算，并在界面上注明「算法参考价位」。
- 禁用词校验（§5.6）；Ace 系统提示禁止承诺收益和推荐具体仓位比例。
- 报告审计：每份报告的输入 facts 与输出全部落库，保留 ≥ 180 天，用于追溯。
- 遵守数据来源的展示要求（CoinGecko 标注、Benzinga 展示条款）；新闻只展示标题、摘要和原文链接，不展示全文（以 Business 合同为准）。

---

## 10. 开发里程碑

依赖关系：M0 → M1 →（M2 → M3 / M4 / M5，后端顺序推进；前端在 M1 后基于 mock 并行）→ M6。

### M0 准备工作（由你完成，详见 §11）

### M1 契约与脚手架
- **后端**：根据 §6 编写 `contracts/openapi.yaml` v0.1（全部接口 + examples）；FastAPI 骨架、配置加载、错误格式、healthz；docker-compose（api / worker / postgres / redis）；Alembic 初始迁移；CI 脚本（ruff / mypy / pytest / openapi lint）。
- **前端**：Vite 项目；复制设计令牌与原语；路由与四页空壳；从契约生成类型；MSW 加载契约 examples；HostBridge 默认实现；i18n 骨架；深色模式。
- **验收**：`docker compose up` 后 `/healthz` 返回 200；前端在 mock 模式下能切换四个页面；契约 lint 通过。

### M2 数据层（后端）
- 各 Provider 客户端（重试、熔断、计量、fixture 测试）；标的目录同步、别名搜索、映射表；worker 定时任务；行情快照与周期涨跌；`/instruments`、`/quotes`。
- **验收**：用真实 Key 跑 30 分钟，worker 无未处理异常；`/quotes` 能返回美股、加密、外汇、黄金、指数各至少 1 个；搜索「英伟达 / nvda / 黄金 / xau / 比特币」均能命中；5m/1h 涨跌与 Provider K 线核对误差 < 0.1%。

### M3 热门榜单 + 云图
- **后端**：9 个榜单聚合、爆仓 SSE、heatmap 接口、板块分类。
- **前端**：榜单页和云图页，先用 mock，再切到真实接口。
- **验收**：每个榜单和 Provider 原始数据抽样核对一致；爆仓 SSE 30 秒内收到新事件；云图 top100 加密渲染 < 300ms；四种周期都是真实值；点击能跳转诊股并带正确 ID（IBIT 跳转到 ETF 本身）。

### M4 AI诊股
- **后端**：indicators（与参考实现对比的单元测试）、scoring、levels、MarketContext、LLM 流水线、校验、模板兜底、OpenCC、缓存与审计、prewarm。
- **前端**：诊股页全部区块与状态。
- **验收**：
  - 10 个代表标的（NVDA、AAPL、KO、IBIT、BTC、ETH、PEPE、EUR/USD、XAU/USD、NDX）× 3 种语言都能生成报告
  - 报告中的数字 100% 通过一致性校验
  - LLM 断网时返回模板报告，并带 `narrative.source="template"`
  - 缓存命中 P95 < 300ms，冷生成 P95 < 20s
  - 加密不出现「市盈率」，外汇不出现「财报」

### M5 Ace智搜
- **后端**：agent loop、9 个工具、SSE、会话 CRUD、滚动摘要、配额、标题生成。
- **前端**：Ace 页全部交互。
- **验收**：
  - 「NVDA 最近为什么跌」能调用行情、新闻工具并附引用
  - 「BTC 资金费率和 ETF 流入怎么样」能调用 CoinGlass 工具
  - 追问能利用上下文
  - 中途停止后再追问正常
  - 超出配额返回 429，前端有提示
  - 首字节延迟 P95 < 3s

### M6 加固与交付
- JWT（RS256/JWKS）接入、IP 与用户限流、管理 API、日志脱敏、备份；Playwright E2E 覆盖完整流程（搜索 → 诊股 → 交易回调；Ace 提问 → 打开诊股；榜单/云图 → 诊股）；`README`、`INTEGRATION.md`、`.env.example`、部署手册；压测（50 并发读接口、10 并发 Ace）。
- **验收**：E2E 全部通过；在新服务器上按文档能一次部署成功；任意 Provider 断开时页面降级显示而不报 500。

---

## 11. 开发前准备清单（你需要做的事）

1. **注册并订阅数据服务**（用公司主体，选 Business/商用档）：
   - Twelve Data Business Venture
   - CoinGlass Standard
   - CoinGecko Analyst
   - Tavily
   - 联系 Massive sales 获取 Benzinga News Business 报价（报价到位前可先只用 Tavily，新闻 Provider 可后接）
   - 申请创业折扣：Twelve Data 有 20%，FMP/CoinGecko 可咨询
2. **LLM 账号**：至少准备 2 家（一个主力，一个备用），确认它们的 OpenAI 兼容 `base_url` 和支持 tool calling + streaming 的模型名。
3. **服务器**：新加坡或东京云主机（建议 4 vCPU / 8 GB 起）+ 域名 + HTTPS 证书；确认宿主网关是否代理本服务（大陆加速）。
4. **与技术团队约定**：JWT 字段和 JWKS/公钥、CORS 域名、可交易品种清单（用于 `host_symbol_map`）、网关 SSE 配置。
5. **法务/老板确认**：免责声明文案、是否保留「目标价 / 止损 / 一键下单」措辞、报告审计保留期限。
6. **给两个 AI 的启动材料**：本文档、原型源码（只读参考）、各 Provider 文档链接（§3.3）；密钥只放在你本机的 `.env`，**不要贴进对话**。

---

## 12. 风险与默认处理

| 风险 | 默认处理 |
| --- | --- |
| Twelve Data 指数（NDX/SPX）覆盖或延迟不理想 | M2 实测；不理想时用 QQQ/SPY 或期货代理，并标注 |
| Benzinga Business 报价过高 | 新闻改用 Tavily 定向搜索 + Twelve Data `/press_releases`；情绪维度权重自动重新归一化 |
| 美股「资金流向」被误解为机构真实资金 | 界面和 API 都标注「基于量价估算」 |
| Venture 不含分析师预期 | 基本面维度不含一致预期；需要时升级 Enterprise（$1,099） |
| LLM 编造数字 | §5.6 校验 + 模板兜底 + 审计 |
| 大陆访问不稳定 | 走宿主网关/CDN；前端零境外依赖 |
| 第三方限流 | 缓存优先、single-flight、熔断、额度监控（`/v1/admin/usage`） |

---

## 13. 交给 AI 的启动提示（可直接复制）

**后端（gpt6.1sol）**

> 你负责 `backend/` 与 `contracts/openapi.yaml`。完整阅读 `docs/AI诊股模块-开发计划.md`，严格遵守 §0 规则。先完成 M1：根据 §6 写出 OpenAPI v0.1（含 examples），然后搭建 FastAPI + docker-compose 骨架。之后按 M2→M3→M4→M5→M6 顺序推进，每个里程碑结束时运行 ruff、mypy、pytest，对照验收标准自检，并在 `backend/AGENTS.md` 记录命令和决策。第三方接口路径必须查官方文档（§3.3），不能凭记忆编写；每个 Provider 都要录制 fixture 并编写测试。密钥从 `.env` 读取。

**前端（opus5.5）**

> 你负责 `frontend/`。完整阅读 `docs/AI诊股模块-开发计划.md` 的 §0、§2、§6、§7。只依赖 `contracts/openapi.yaml` 生成的类型；后端未就绪时用 MSW mock（契约 examples）。从原型复制设计令牌、`ui-*` 原语、树图 `partition()` 和雷达图，遵循原型 AGENTS.md 的样式规范。实现四个页面及 §7.4 的全部状态，以及 HostBridge。每个里程碑结束时运行 `tsc --noEmit`、vitest、`vite build`，在 `frontend/AGENTS.md` 记录命令。不要修改契约；需要改字段时，写明需求交给后端。
