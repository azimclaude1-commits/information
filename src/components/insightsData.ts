// Shared demo content for the AI insight / opportunity / heatmap modules (home page + market overview)

// Illustrative market snapshots, not a live market-data feed.
export const MARKET_OVERVIEW = {
  capTrillions: 2.83,
  capChangePercent: -3.42,
  capChangeBillions: -100.1,
  capHistory: [2.66, 2.69, 2.64, 2.77, 2.74, 2.82, 2.83 / (1 - 0.0342), 2.83],
  btcDominance: 56.4,
  volumeBillions: 142.86,
  defiTvlBillions: 98.42,
  otcCny: 7.18,
  otcPremium: -0.67,
  longShortRatio: 1.45,
  exchanges: [
    { name: "OKX", ratio: 1.41 },
    { name: "Binance", ratio: 1.48 },
  ],
  activity: 7,
};

export const CHAIN_ACTIVITY = [
  {
    id: "ethereum",
    name: "Ethereum",
    statusZh: "低迷",
    statusEn: "Quiet",
    activity: 18,
    fee: "0.4",
    unit: "Gwei",
    feeZh: "Gas",
    feeEn: "Gas",
    volume: "$1.84B",
    descZh: "Gas 处于低位，链上交互成本较低。",
    descEn: "Low gas fees keep on-chain interactions affordable.",
  },
  {
    id: "base",
    name: "Base",
    statusZh: "平稳",
    statusEn: "Steady",
    activity: 46,
    fee: "0.006",
    unit: "Gwei",
    feeZh: "L2 Gas",
    feeEn: "L2 Gas",
    volume: "$920M",
    descZh: "网络运行平稳，L2 执行费用保持低位。",
    descEn: "Steady network activity with low L2 execution fees.",
  },
  {
    id: "solana",
    name: "Solana",
    statusZh: "活跃",
    statusEn: "Active",
    activity: 78,
    fee: "0.000005",
    unit: "SOL",
    feeZh: "基础费 / 签名",
    feeEn: "Base fee / signature",
    volume: "$3.26B",
    descZh: "DEX 交易活跃，基础费不含优先费用。",
    descEn: "Active DEX trading; base fee excludes priority fees.",
  },
] as const;

export const MARKET_HEAT_NEWS = [
  {
    id: "etf-defi",
    zh: "代币化 ETF 加速进入 DeFi 生态",
    en: "Tokenized ETFs expand into DeFi",
    growth: 1.38,
  },
  {
    id: "sol-dex",
    zh: "Solana 连续 5 周领跑 DEX 交易量",
    en: "Solana leads DEX volume for five weeks",
    growth: 3.09,
  },
  {
    id: "chain-2",
    zh: "以太坊早期地址大额转出引发关注",
    en: "Early Ethereum wallet moves draw attention",
    growth: 1.36,
  },
].sort((a, b) => b.growth - a.growth);

export const SENTIMENT_IDEAS = [
  {
    symbol: "TAO/USD",
    label: "TAO",
    zh: "AI 算力板块活跃，关注突破后的量价配合。",
    en: "AI compute activity rises; watch volume after the breakout.",
  },
  {
    symbol: "NVDA",
    label: "NVDA",
    zh: "算力资本开支预期升温，关注机构资金动向。",
    en: "AI capital spending expectations lift institutional interest.",
  },
];

export interface AiInsight {
  symbol: string;
  fallbackPrice: number;
  change: string;
  stance: "bullish" | "bearish";
  stanceZh: string;
  stanceEn: string;
  descZh: string;
  descEn: string;
}

export const AI_INSIGHTS: AiInsight[] = [
  {
    symbol: "NVDA",
    fallbackPrice: 234.15,
    change: "+1.40%",
    stance: "bullish",
    stanceZh: "AI看涨",
    stanceEn: "AI Bullish",
    descZh:
      "NVDA 处于上升通道突破点，北美四大云厂商 Q4 算力资本开支上修，暗池大单连续3日净流入，短期看涨至 $250-$265。",
    descEn:
      "NVDA holds an ascending channel breakout as hyperscaler Q4 CapEx revises upward; institutional dark-pool inflows target $250-$265.",
  },
  {
    symbol: "XAU/USD",
    fallbackPrice: 4141.8,
    change: "+0.69%",
    stance: "bullish",
    stanceZh: "AI看涨",
    stanceEn: "AI Bullish",
    descZh:
      "现货黄金站稳 4140 美元关口，全球央行购金与避险买盘强劲，多头持仓占比达 76%，回踩 4128 支撑位可顺势做多。",
    descEn:
      "Spot Gold holds firmly above $4,140 on central bank accumulation and 76% long sentiment; pullbacks to $4,128 offer high-RR entries.",
  },
  {
    symbol: "BTC/USD",
    fallbackPrice: 85324.5,
    change: "+0.55%",
    stance: "bullish",
    stanceZh: "AI看涨",
    stanceEn: "AI Bullish",
    descZh:
      "BTC 在 85300 上方交投积极，机构现货 ETF 买盘强劲，长期目标看涨至 100k+，但短期需关注 86.5k-87k 阻力突破情况。",
    descEn:
      "BTC trades actively above $85,300 with strong ETF spot inflows; watch $86.5k-$87k short-term resistance for breakout continuation.",
  },
  {
    symbol: "TSLA",
    fallbackPrice: 288.6,
    change: "-1.84%",
    stance: "bearish",
    stanceZh: "AI看跌",
    stanceEn: "AI Bearish",
    descZh:
      "TSLA 正处于收敛三角形变盘点，欧洲月度交付数据低于一致预期，295 美元附近期权看跌对冲增加，短线等待 282 支撑确认。",
    descEn:
      "TSLA faces resistance near $295 after softer European delivery figures and elevated put hedging; await support confirmation at $282.",
  },
];

export const MARKET_OPPORTUNITIES = [
  {
    id: 1,
    zh: "1. NVDA 异动，大摩上调目标价至 $265，24H 机构净流入 $4.82亿",
    en: "1. NVDA Anomaly: Price target raised to $265, 24h net inflow $482M",
    symbol: "NVDA",
  },
  {
    id: 2,
    zh: "2. 主力 24h 动向：XAU/USD 大户限价买单密集挂出，共 9.08 亿美元",
    en: "2. Whale 24h Flow: XAU/USD institutional limit bid walls total $908M",
    symbol: "XAU/USD",
  },
  {
    id: 3,
    zh: "3. 汇市异动预警：USD/JPY 日银鹰派预期升温，套息交易平仓回落 64 点",
    en: "3. FX Alert: USD/JPY drops 64 pips on BoJ hawkish rate hike expectations",
    symbol: "USD/JPY",
  },
  {
    id: 4,
    zh: "4. ETH/USD 突破 3180 美元关口，链上 DEX 结算量创月度新高",
    en: "4. ETH/USD surpasses $3,180 as on-chain DEX settlement hits monthly high",
    symbol: "ETH/USD",
  },
  {
    id: 5,
    zh: "5. 「瞬时飙升」SOL/USD 成交量飙升 3.5 倍，领涨主流加密永续",
    en: "5. [Volume Surge] SOL/USD volume spikes 3.5x, leading major crypto perps",
    symbol: "SOL/USD",
  },
  {
    id: 6,
    zh: "6. 美股高股息防御板块走强，KO 除息日前夕多头持仓占比升至 81%",
    en: "6. High-yield dividend stocks firm up; KO long ratio hits 81% ahead of ex-date",
    symbol: "KO",
  },
  {
    id: 7,
    zh: "7. BTC/USD 突破 85,000 美元重要心理关口，空头爆仓 $1.24亿",
    en: "7. BTC/USD reclaims $85,000 psychological level with $124M short liquidations",
    symbol: "BTC/USD",
  },
];

export const HOT_TOPICS = [
  {
    id: 1,
    tag: "AI算力",
    zh: "1. AI算力：随着下一代 Blackwell 机架大规模交付，科技巨头资本开支继续扩张，提振美股半导体与AI代币板块。",
    en: "1. AI Compute: Next-gen rack deployments accelerate hyperscaler CapEx.",
    symbol: "NVDA",
  },
  {
    id: 2,
    tag: "非农与降息",
    zh: "2. 非农就业：美国 9 月非农就业人口录得 19.2 万人超预期，失业率降至 4.0%，美元指数短线走强。",
    en: "2. NFP Report: US Sep payrolls print 192K above consensus, unemployment at 4.0%.",
    symbol: "EUR/USD",
  },
  {
    id: 3,
    tag: "央行购金",
    zh: "3. 黄金储备：新兴市场主权基金连续第 14 个月增持黄金，金价突破 4,140 美元创历史新高。",
    en: "3. Gold Reserves: Sovereign wealth funds extend gold buying streak to 14 months.",
    symbol: "XAU/USD",
  },
  {
    id: 4,
    tag: "日元加息",
    zh: "4. 日银决议：日本央行审议委员释放年底前加息信号，日元套息头寸加速回流本土。",
    en: "4. BoJ Policy: Board members signal potential year-end rate hike.",
    symbol: "USD/JPY",
  },
  {
    id: 5,
    tag: "现货ETF",
    zh: "5. BTC：美股现货比特币 ETF 连续 8 日净流入超 14 亿美元，对冲通胀与法币贬值需求旺盛。",
    en: "5. Spot ETF: US Bitcoin ETFs log 8-day inflow streak exceeding $1.4B.",
    symbol: "BTC/USD",
  },
  {
    id: 6,
    tag: "美股财报季",
    zh: "6. 财报前瞻：微软、苹果与 Meta 即将披露三季报并迎来季度除权派息，机构多头提前建仓。",
    en: "6. Earnings & Dividends: MSFT, AAPL, and META approach Q3 earnings.",
    symbol: "AAPL",
  },
];

/** Word-cloud terms. `weight` 1–3 drives size; `cls` is the legacy overview styling. */
export const HOT_WORDS = [
  {
    label: "AI算力",
    symbol: "NVDA",
    weight: 3,
    cls: "text-2xl font-extrabold text-blue-600 dark:text-blue-400",
  },
  {
    label: "黄金4140",
    symbol: "XAU/USD",
    weight: 2,
    cls: "text-lg font-bold text-indigo-500",
  },
  {
    label: "BTC",
    symbol: "BTC/USD",
    weight: 3,
    cls: "text-2xl font-bold text-purple-500",
  },
  {
    label: "TAO算力",
    symbol: "TAO/USD",
    weight: 1,
    cls: "text-base font-bold text-emerald-500",
  },
  {
    label: "MEME热潮",
    symbol: "PEPE/USD",
    weight: 2,
    cls: "text-lg font-bold text-violet-500",
  },
  {
    label: "高股息分红",
    symbol: "KO",
    weight: 1,
    cls: "text-sm font-semibold text-blue-400",
  },
  {
    label: "SUI公链",
    symbol: "SUI/USD",
    weight: 1,
    cls: "text-base font-bold text-teal-500",
  },
] as const;

export type HeatmapTimeframe = "5Min" | "1H" | "4H" | "24H";

export const HEATMAP_FACTOR: Record<HeatmapTimeframe, number> = {
  "5Min": 0.07,
  "1H": 0.24,
  "4H": 0.53,
  "24H": 1,
};

/** [symbol, label, grid placement] on a 12 × 6 grid */
export const HEATMAP_PREVIEW_TILES: [string, string, string][] = [
  ["NVDA", "NVDA", "col-span-4 row-span-6"],
  ["BTC/USD", "BTC", "col-span-4 row-span-3"],
  ["TAO/USD", "TAO", "col-span-4 row-span-3"],
  ["SUI/USD", "SUI", "col-span-3 row-span-3"],
  ["PEPE/USD", "PEPE", "col-span-3 row-span-3"],
  ["TSLA", "TSLA", "col-span-2 row-span-3"],
];

export const MULTI_ASSET_HIGHLIGHTS = [
  {
    symbol: "TAO/USD",
    name: "Bittensor AI算力永续",
    tag: "AI龙头",
    statusZh: "主力大单抢筹",
    taskZh: "24H +4.26%",
    yieldStr: "$1.42B 成交",
  },
  {
    symbol: "PEPE/USD",
    name: "1000PEPE 迷因永续",
    tag: "MEME热榜",
    statusZh: "持仓量激增",
    taskZh: "24H +8.92%",
    yieldStr: "$2.84B 成交",
  },
  {
    symbol: "XAU/USD",
    name: "伦敦现货黄金 CFD",
    tag: "贵金属",
    statusZh: "多头趋势确认",
    taskZh: "76% 客户做多",
    yieldStr: "$96.4B 成交",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA 英伟达 CFD",
    tag: "美股算力",
    statusZh: "暗池资金强流入",
    taskZh: "AI评分 91/100",
    yieldStr: "$5.74T 市值",
  },
  {
    symbol: "ETH/USD",
    name: "以太坊永续 ETHUSDT",
    tag: "L1主流",
    statusZh: "现货持仓转正",
    taskZh: "24H +1.86%",
    yieldStr: "$3.16B 成交",
  },
  {
    symbol: "US500",
    name: "标普500指数 CFD",
    tag: "指数焦点",
    statusZh: "财报季驱动波动",
    taskZh: "24H +0.52%",
    yieldStr: "$64.5B 成交",
  },
];
