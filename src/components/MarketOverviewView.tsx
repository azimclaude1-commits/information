import React, { useEffect, useState } from "react";
import { QuotaPill, useMembership } from "./membership/Membership";
import { KlineWorkspace } from "./kline/KlineAnalysis";
import {
  Search,
  Flame,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Plus,
  ArrowUp,
  MessageSquare,
  BarChart2,
  Code2,
  BookOpen,
  Gauge,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { Instrument } from "../data/marketData";
import { AssetLogo } from "./AssetLogo";
import { makeCandles } from "./marketModel";
import {
  AI_INSIGHTS,
  HEATMAP_FACTOR,
  HEATMAP_PREVIEW_TILES,
  HOT_TOPICS,
  HOT_WORDS,
  MARKET_OPPORTUNITIES,
  MULTI_ASSET_HIGHLIGHTS,
} from "./insightsData";

/** Deterministic candlestick thumbnail used by the AI K-line reading */
function KlineSnapshot({ instrument }: { instrument: Instrument }) {
  const candles = makeCandles(instrument, "4H", Date.now()).slice(-46);
  const hi = Math.max(...candles.map((c) => c.high));
  const lo = Math.min(...candles.map((c) => c.low));
  const span = hi - lo || 1;
  const y = (v: number) => 102 - ((v - lo) / span) * 98;
  const w = 100 / candles.length;
  return (
    <svg
      viewBox="0 0 100 104"
      preserveAspectRatio="none"
      className="w-full h-full"
      aria-hidden="true"
    >
      {candles.map((c, i) => {
        const color = c.close >= c.open ? "#089981" : "#f23645";
        const x = i * w + w / 2;
        const top = y(Math.max(c.open, c.close));
        const body = Math.max(0.9, Math.abs(y(c.open) - y(c.close)));
        return (
          <g key={i} stroke={color} fill={color}>
            <line
              x1={x}
              x2={x}
              y1={y(c.high)}
              y2={y(c.low)}
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
            <rect x={x - w * 0.3} y={top} width={w * 0.6} height={body} />
          </g>
        );
      })}
    </svg>
  );
}

const ACE_PROMPTS: {
  id: string;
  zh: string;
  en: string;
  icon: "book" | "gauge" | "search";
  items: { zh: string; en: string }[];
}[] = [
  {
    id: "learn",
    zh: "快速学习",
    en: "Quick Learn",
    icon: "book",
    items: [
      { zh: "Ledger 事件如何影响 BTC？", en: "How does the Ledger event hit BTC?" },
      { zh: "BTC 90 分钟周期走势如何？", en: "BTC 90-minute trend?" },
      { zh: "筹码集中度对行情意味着什么？", en: "What does chip concentration mean?" },
    ],
  },
  {
    id: "sentiment",
    zh: "市场情绪",
    en: "Sentiment",
    icon: "gauge",
    items: [
      { zh: "AI 叙事对比特币价格影响？", en: "AI narrative impact on BTC?" },
      { zh: "监管言论会带动 BNB 吗？", en: "Will regulation headlines lift BNB?" },
      { zh: "本周数据对加密市场影响？", en: "This week's data for crypto?" },
    ],
  },
  {
    id: "price",
    zh: "价格分析",
    en: "Price Analysis",
    icon: "search",
    items: [
      { zh: "ETH 价格走势会反弹吗？", en: "Will ETH bounce back?" },
      { zh: "黄金突破前高后怎么接力？", en: "Gold above its prior high — then what?" },
      { zh: "TSLA 持续下跌的原因？", en: "Why is TSLA still sliding?" },
    ],
  },
];

interface MarketOverviewViewProps {
  view?: OverviewSubTab;
  hideNavigation?: boolean;
  compactOverview?: boolean;
  showPreviews?: boolean;
  onChangeView?: (view: OverviewSubTab) => void;
  instruments: Instrument[];
  lang: "zh" | "en";
  onOpenAiOverviewWithSymbol: (symbol: string) => void;
  onQuickTrade: (symbol: string, side: "buy" | "sell") => void;
  /** Opens the trading desk with a side (K线分析 plans). */
  onTrade?: (symbol: string, side: "buy" | "sell") => void;
  onNavigateTab: (tab: any) => void;
}

type OverviewSubTab = "ace" | "overview" | "hotlist" | "heatmap";

export const MarketOverviewView: React.FC<MarketOverviewViewProps> = ({
  instruments,
  lang,
  onOpenAiOverviewWithSymbol,
  onQuickTrade,
  onTrade,
  onNavigateTab,
  view,
  hideNavigation = false,
  compactOverview = false,
  showPreviews = false,
  onChangeView,
}) => {
  // Requirement #3 & #4: Sub-tabs inside 市场概览 (Removed '条件选币/选股', '排行', '合约与分红雷达')
  const [localView, setLocalView] = useState<OverviewSubTab>("overview");
  const subNav = view ?? localView;
  const setSubNav = (next: OverviewSubTab) =>
    onChangeView ? onChangeView(next) : setLocalView(next);
  const [searchInput, setSearchInput] = useState<string>("");
  const [hotTimeframe, setHotTimeframe] = useState<"1H" | "24H">("24H");
  const [heatmapDimension, setHeatmapDimension] = useState<string>("change");
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<
    "5Min" | "1H" | "4H" | "24H"
  >("24H");
  const [radarFilter, setRadarFilter] = useState<"all" | "cfd" | "dividends">(
    "all",
  );

  // Ace智搜 state (Screenshot 2)
  // `#diagnose/ace/kline` opens K线分析 directly (used by the trading desk's 全部分析记录).
  const [aceActiveTopic, setAceActiveTopic] = useState<string>(() =>
    window.location.hash.split("/")[2] === "kline" ? "kline_analysis" : "usd_confidence",
  );
  useEffect(() => {
    const sync = () => {
      const parts = window.location.hash.slice(1).split("/");
      if (parts[1] === "ace" && parts[2] === "kline") setAceActiveTopic("kline_analysis");
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const [aceInput, setAceInput] = useState<string>("");
  const [aceMode, setAceMode] = useState<"fast" | "deep">("fast");
  const [aceModeOpen, setAceModeOpen] = useState(false);
  const [aceCustomMessages, setAceCustomMessages] = useState<
    { q: string; a: string }[]
  >([]);
  /** The symbol the AI candle reading runs against — SOL keeps the demo crypto-flavoured */
  const klineInst =
    instruments.find((i) => i.symbol === "SOL/USD") ??
    instruments.find((i) => i.category === "crypto") ??
    instruments[0];

  /** Ace questions draw from the shared daily AI quota; K线分析 charges when an analysis is confirmed. */
  const membership = useMembership();
  const openKline = () => setAceActiveTopic("kline_analysis");

  // 热门榜单 filter state (Screenshot 3)
  const [hotListFilter, setHotListFilter] = useState<string>("all");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim().toUpperCase();
    if (!q) {
      onOpenAiOverviewWithSymbol("NVDA");
      return;
    }
    const found = instruments.find(
      (i) =>
        i.symbol.toUpperCase().includes(q) ||
        i.nameZh.includes(q) ||
        i.nameEn.toUpperCase().includes(q),
    );
    onOpenAiOverviewWithSymbol(found ? found.symbol : "NVDA");
  };

  const handleAceAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceInput.trim()) return;
    const question = aceInput.trim();
    if (
      !membership.request(
        "insight",
        `ace:${Date.now()}`,
        `Ace · ${question.slice(0, 24)}`,
        { force: true },
      )
    )
      return;
    const match = instruments.find(
      (i) =>
        question.toUpperCase().includes(i.symbol.split("/")[0]) ||
        question.includes(i.nameZh.split(" ")[0]),
    );
    setAceCustomMessages((prev) => [
      ...prev,
      {
        q: question,
        a:
          (match
            ? `${match.nameZh}（${match.symbol}）当前价格为 ${match.price.toFixed(match.decimals)}，24 小时涨跌幅 ${match.changePercent24h.toFixed(2)}%，区间 ${match.low24h}—${match.high24h}。可打开诊股继续查看技术形态与成交情况。`
            : /美元|黄金|利率|美联储/.test(question)
              ? "观察美元与黄金时，可以结合实际利率、通胀预期和避险需求。利率变化可能影响持有资产的机会成本，而短期价格还受到资金流与仓位调整影响。"
              : /指标|均线|MA/i.test(question)
                ? "均线可以帮助观察价格趋势。短期均线对价格变化反应较快，长期均线更平滑。切换到「AI写指标」可以查看双均线示例。"
                : "可以输入股票或币种代码查看当前行情，也可以选择左侧的美元、算力、ETF 或黄金研究主题。") +
          (aceMode === "deep"
            ? lang === "zh"
              ? "\n\n推理路径：先界定数据口径 → 对比同期资产表现 → 校验资金流与持仓变化 → 列出可跟踪的验证指标。"
              : "\n\nReasoning path: fix the data basis → compare peers → verify flows and open interest → list the checks to track."
            : ""),
      },
    ]);
    setAceInput("");
  };

  const aiInsightsList = AI_INSIGHTS.map((item) => ({
    ...item,
    price:
      instruments.find((i) => i.symbol === item.symbol)?.price ||
      item.fallbackPrice,
  }));

  const marketOpportunities = MARKET_OPPORTUNITIES;

  const hotTopics = HOT_TOPICS;

  // 12-Card Matrix Data for 热门榜单 (Exact Screenshot 3 Replica)
  const hotLeaderboardCards = [
    {
      id: "etf",
      titleZh: "比特币ETF",
      titleEn: "Bitcoin Spot ETFs",
      colPriceZh: "价格",
      colExtraZh: "涨跌幅",
      rows: [
        {
          rank: 1,
          name: "IBIT (BlackRock)",
          price: "$49.61",
          extra: "+1.84%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 2,
          name: "FBTC (Fidelity)",
          price: "$76.28",
          extra: "+1.76%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 3,
          name: "GBTC (Grayscale)",
          price: "$68.40",
          extra: "+1.62%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 4,
          name: "ARKB (ARK 21Shares)",
          price: "$87.25",
          extra: "+1.81%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 5,
          name: "BITB (Bitwise)",
          price: "$47.54",
          extra: "+1.79%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 6,
          name: "HODL (VanEck)",
          price: "$29.05",
          extra: "+1.68%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 7,
          name: "BITO (ProShares)",
          price: "$21.16",
          extra: "+1.42%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 8,
          name: "BTCO (Invesco)",
          price: "$87.14",
          extra: "+1.75%",
          up: true,
          sym: "BTC/USD",
        },
      ],
    },
    {
      id: "hot",
      titleZh: "热门搜索榜",
      titleEn: "Trending Searches",
      colPriceZh: "价格",
      colExtraZh: "涨跌幅",
      rows: [
        {
          rank: 1,
          name: "BTC",
          price: "$85,342.76",
          extra: "+0.55%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 2,
          name: "ETH",
          price: "$3,184.20",
          extra: "+1.36%",
          up: true,
          sym: "ETH/USD",
        },
        {
          rank: 3,
          name: "NVDA",
          price: "$234.15",
          extra: "+1.40%",
          up: true,
          sym: "NVDA",
        },
        {
          rank: 4,
          name: "XAU/USD",
          price: "$4,141.80",
          extra: "+0.69%",
          up: true,
          sym: "XAU/USD",
        },
        {
          rank: 5,
          name: "SOL",
          price: "$214.65",
          extra: "+3.30%",
          up: true,
          sym: "SOL/USD",
        },
        {
          rank: 6,
          name: "TAO",
          price: "$548.60",
          extra: "+4.26%",
          up: true,
          sym: "TAO/USD",
        },
        {
          rank: 7,
          name: "PEPE",
          price: "$0.01148",
          extra: "+8.92%",
          up: true,
          sym: "PEPE/USD",
        },
        {
          rank: 8,
          name: "SUI",
          price: "$2.348",
          extra: "+7.51%",
          up: true,
          sym: "SUI/USD",
        },
      ],
    },
    {
      id: "gainers",
      titleZh: "涨幅榜 (24H)",
      titleEn: "Top Gainers (24H)",
      colPriceZh: "价格",
      colExtraZh: "涨跌幅",
      rows: [
        {
          rank: 1,
          name: "FET",
          price: "$1.648",
          extra: "+9.43%",
          up: true,
          sym: "FET/USD",
        },
        {
          rank: 2,
          name: "1000PEPE",
          price: "$0.01148",
          extra: "+8.92%",
          up: true,
          sym: "PEPE/USD",
        },
        {
          rank: 3,
          name: "WIF",
          price: "$2.742",
          extra: "+8.47%",
          up: true,
          sym: "WIF/USD",
        },
        {
          rank: 4,
          name: "SUI",
          price: "$2.348",
          extra: "+7.51%",
          up: true,
          sym: "SUI/USD",
        },
        {
          rank: 5,
          name: "NEAR",
          price: "$5.420",
          extra: "+6.82%",
          up: true,
          sym: "NEAR/USD",
        },
        {
          rank: 6,
          name: "RENDER",
          price: "$8.420",
          extra: "+6.47%",
          up: true,
          sym: "RENDER/USD",
        },
        {
          rank: 7,
          name: "ENA",
          price: "$0.4120",
          extra: "+6.32%",
          up: true,
          sym: "ENA/USD",
        },
        {
          rank: 8,
          name: "DOGE",
          price: "$0.1685",
          extra: "+5.78%",
          up: true,
          sym: "DOGE/USD",
        },
      ],
    },
    {
      id: "losers",
      titleZh: "跌幅榜 (24H)",
      titleEn: "Top Losers (24H)",
      colPriceZh: "价格",
      colExtraZh: "涨跌幅",
      rows: [
        {
          rank: 1,
          name: "TSLA",
          price: "$288.60",
          extra: "-1.84%",
          up: false,
          sym: "TSLA",
        },
        {
          rank: 2,
          name: "WLD",
          price: "$2.485",
          extra: "-1.66%",
          up: false,
          sym: "WLD/USD",
        },
        {
          rank: 3,
          name: "AVAX",
          price: "$34.82",
          extra: "-1.28%",
          up: false,
          sym: "AVAX/USD",
        },
        {
          rank: 4,
          name: "WTI 原油",
          price: "$74.28",
          extra: "-1.22%",
          up: false,
          sym: "WTI",
        },
        {
          rank: 5,
          name: "USD/JPY",
          price: "143.680",
          extra: "-0.44%",
          up: false,
          sym: "USD/JPY",
        },
        {
          rank: 6,
          name: "GOOGL",
          price: "$204.75",
          extra: "-0.41%",
          up: false,
          sym: "GOOGL",
        },
        {
          rank: 7,
          name: "USD/CAD",
          price: "1.35140",
          extra: "-0.09%",
          up: false,
          sym: "USD/CAD",
        },
        {
          rank: 8,
          name: "TRX",
          price: "$0.2380",
          extra: "-0.18%",
          up: false,
          sym: "BTC/USD",
        },
      ],
    },
    {
      id: "volume",
      titleZh: "成交额榜",
      titleEn: "24H Volume Leaders",
      colPriceZh: "价格",
      colExtraZh: "24H成交额",
      rows: [
        {
          rank: 1,
          name: "XAU/USD",
          price: "$4,141.80",
          extra: "$96.4B",
          up: true,
          sym: "XAU/USD",
        },
        {
          rank: 2,
          name: "NAS100",
          price: "21,482.5",
          extra: "$82.1B",
          up: true,
          sym: "NAS100",
        },
        {
          rank: 3,
          name: "BTCUSDT",
          price: "$85,324.50",
          extra: "$38.7B",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 4,
          name: "ETHUSDT",
          price: "$3,184.20",
          extra: "$19.4B",
          up: true,
          sym: "ETH/USD",
        },
        {
          rank: 5,
          name: "NVDA",
          price: "$234.15",
          extra: "$11.3B",
          up: true,
          sym: "NVDA",
        },
        {
          rank: 6,
          name: "SOLUSDT",
          price: "$214.65",
          extra: "$7.8B",
          up: true,
          sym: "SOL/USD",
        },
        {
          rank: 7,
          name: "XRPUSDT",
          price: "$0.6842",
          extra: "$4.6B",
          up: true,
          sym: "XRP/USD",
        },
        {
          rank: 8,
          name: "DOGEUSDT",
          price: "$0.1685",
          extra: "$3.4B",
          up: true,
          sym: "DOGE/USD",
        },
      ],
    },
    {
      id: "liquidation",
      titleZh: "实时大额爆仓单",
      titleEn: "Real-Time Liquidations",
      colPriceZh: "爆仓价格",
      colExtraZh: "金额",
      rows: [
        {
          rank: 1,
          name: "空单 ETH/USDT永续",
          price: "$3,182.05",
          extra: "563.27万",
          up: false,
          sym: "ETH/USD",
        },
        {
          rank: 2,
          name: "空单 BTC/USDT永续",
          price: "$85,310.0",
          extra: "339.53万",
          up: false,
          sym: "BTC/USD",
        },
        {
          rank: 3,
          name: "多单 TSLA CFD",
          price: "$288.50",
          extra: "128.40万",
          up: true,
          sym: "TSLA",
        },
        {
          rank: 4,
          name: "空单 SOL/USDT永续",
          price: "$214.50",
          extra: "89.94万",
          up: false,
          sym: "SOL/USD",
        },
        {
          rank: 5,
          name: "空单 TAO/USDT永续",
          price: "$548.20",
          extra: "64.80万",
          up: false,
          sym: "TAO/USD",
        },
        {
          rank: 6,
          name: "空单 SUI/USDT永续",
          price: "$2.345",
          extra: "45.12万",
          up: false,
          sym: "SUI/USD",
        },
        {
          rank: 7,
          name: "多单 WLD/USDT永续",
          price: "$2.482",
          extra: "31.05万",
          up: true,
          sym: "WLD/USD",
        },
        {
          rank: 8,
          name: "空单 PEPE/USDT永续",
          price: "$0.01147",
          extra: "28.60万",
          up: false,
          sym: "PEPE/USD",
        },
      ],
    },
    {
      id: "oi",
      titleZh: "合约持仓量 (OI)",
      titleEn: "Open Interest Leaders",
      colPriceZh: "价格",
      colExtraZh: "持仓额",
      rows: [
        {
          rank: 1,
          name: "BTCUSDT",
          price: "$85,324.50",
          extra: "339.5亿",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 2,
          name: "ETHUSDT",
          price: "$3,184.20",
          extra: "224.7亿",
          up: true,
          sym: "ETH/USD",
        },
        {
          rank: 3,
          name: "SOLUSDT",
          price: "$214.65",
          extra: "47.3亿",
          up: true,
          sym: "SOL/USD",
        },
        {
          rank: 4,
          name: "XAU/USD",
          price: "$4,141.80",
          extra: "38.2亿",
          up: true,
          sym: "XAU/USD",
        },
        {
          rank: 5,
          name: "XRPUSDT",
          price: "$0.6842",
          extra: "20.3亿",
          up: true,
          sym: "XRP/USD",
        },
        {
          rank: 6,
          name: "DOGEUSDT",
          price: "$0.1685",
          extra: "16.8亿",
          up: true,
          sym: "DOGE/USD",
        },
        {
          rank: 7,
          name: "TAOUSDT",
          price: "$548.60",
          extra: "12.4亿",
          up: true,
          sym: "TAO/USD",
        },
        {
          rank: 8,
          name: "BNBUSDT",
          price: "$648.40",
          extra: "11.5亿",
          up: true,
          sym: "BNB/USD",
        },
      ],
    },
    {
      id: "funding",
      titleZh: "资金费率异动",
      titleEn: "Funding Rate Extremes",
      colPriceZh: "价格",
      colExtraZh: "资金费率",
      rows: [
        {
          rank: 1,
          name: "FET/USDT永续",
          price: "$1.648",
          extra: "+0.042%",
          up: true,
          sym: "FET/USD",
        },
        {
          rank: 2,
          name: "PEPE/USDT永续",
          price: "$0.01148",
          extra: "+0.038%",
          up: true,
          sym: "PEPE/USD",
        },
        {
          rank: 3,
          name: "SUI/USDT永续",
          price: "$2.348",
          extra: "+0.031%",
          up: true,
          sym: "SUI/USD",
        },
        {
          rank: 4,
          name: "TAO/USDT永续",
          price: "$548.60",
          extra: "+0.025%",
          up: true,
          sym: "TAO/USD",
        },
        {
          rank: 5,
          name: "WLD/USDT永续",
          price: "$2.485",
          extra: "-0.028%",
          up: false,
          sym: "WLD/USD",
        },
        {
          rank: 6,
          name: "ARB/USDT永续",
          price: "$0.6840",
          extra: "+0.012%",
          up: true,
          sym: "ARB/USD",
        },
        {
          rank: 7,
          name: "BTC/USDT永续",
          price: "$85,324.50",
          extra: "+0.010%",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 8,
          name: "ETH/USDT永续",
          price: "$3,184.20",
          extra: "+0.010%",
          up: true,
          sym: "ETH/USD",
        },
      ],
    },
    {
      id: "inflow",
      titleZh: "主力净流入榜",
      titleEn: "Institutional Net Inflow",
      colPriceZh: "价格",
      colExtraZh: "24H净流入",
      rows: [
        {
          rank: 1,
          name: "BTCUSDT",
          price: "$85,324.50",
          extra: "+$6.42亿",
          up: true,
          sym: "BTC/USD",
        },
        {
          rank: 2,
          name: "NVDA",
          price: "$234.15",
          extra: "+$4.82亿",
          up: true,
          sym: "NVDA",
        },
        {
          rank: 3,
          name: "XAU/USD",
          price: "$4,141.80",
          extra: "+$3.95亿",
          up: true,
          sym: "XAU/USD",
        },
        {
          rank: 4,
          name: "SOLUSDT",
          price: "$214.65",
          extra: "+$2.18亿",
          up: true,
          sym: "SOL/USD",
        },
        {
          rank: 5,
          name: "ETHUSDT",
          price: "$3,184.20",
          extra: "+$1.84亿",
          up: true,
          sym: "ETH/USD",
        },
        {
          rank: 6,
          name: "TAOUSDT",
          price: "$548.60",
          extra: "+$9,420万",
          up: true,
          sym: "TAO/USD",
        },
        {
          rank: 7,
          name: "ONDOUSDT",
          price: "$0.8460",
          extra: "+$6,150万",
          up: true,
          sym: "ONDO/USD",
        },
        {
          rank: 8,
          name: "SUIUSDT",
          price: "$2.348",
          extra: "+$5,480万",
          up: true,
          sym: "SUI/USD",
        },
      ],
    },
  ];

  // Multi-Sector Treemap Data for 云图 (Exact Screenshot 4 Replica)
  const cloudSectorGroups = [
    {
      sectorZh: "a16z投资",
      sectorEn: "a16z Portfolio",
      avgChange: "+0.65%",
      spanClass: "lg:col-span-5",
      items: [
        {
          sym: "BTC",
          chg: "+0.55%",
          size: "col-span-6 row-span-4 text-xl",
          up: true,
          target: "BTC/USD",
        },
        {
          sym: "ETH",
          chg: "+1.36%",
          size: "col-span-4 row-span-3 text-base",
          up: true,
          target: "ETH/USD",
        },
        {
          sym: "XRP",
          chg: "+4.33%",
          size: "col-span-2 row-span-3 text-sm",
          up: true,
          target: "XRP/USD",
        },
        {
          sym: "UNI",
          chg: "+3.09%",
          size: "col-span-2 row-span-1 text-xs",
          up: true,
          target: "UNI/USD",
        },
        {
          sym: "SUI",
          chg: "+7.51%",
          size: "col-span-2 row-span-1 text-xs",
          up: true,
          target: "SUI/USD",
        },
        {
          sym: "WLD",
          chg: "-1.66%",
          size: "col-span-2 row-span-1 text-xs",
          up: false,
          target: "WLD/USD",
        },
      ],
    },
    {
      sectorZh: "公链 Layer 1",
      sectorEn: "Public Chains L1",
      avgChange: "+1.85%",
      spanClass: "lg:col-span-4",
      items: [
        {
          sym: "ETH",
          chg: "+1.36%",
          size: "col-span-4 row-span-2 text-base",
          up: true,
          target: "ETH/USD",
        },
        {
          sym: "SOL",
          chg: "+3.30%",
          size: "col-span-4 row-span-2 text-base",
          up: true,
          target: "SOL/USD",
        },
        {
          sym: "NEAR",
          chg: "+6.82%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "NEAR/USD",
        },
        {
          sym: "AVAX",
          chg: "-1.28%",
          size: "col-span-2 row-span-2 text-xs",
          up: false,
          target: "AVAX/USD",
        },
      ],
    },
    {
      sectorZh: "AI 人工智能 & Agents",
      sectorEn: "AI & Agents",
      avgChange: "+5.12%",
      spanClass: "lg:col-span-3",
      items: [
        {
          sym: "TAO",
          chg: "+4.26%",
          size: "col-span-3 row-span-2 text-base",
          up: true,
          target: "TAO/USD",
        },
        {
          sym: "FET",
          chg: "+9.43%",
          size: "col-span-3 row-span-2 text-sm",
          up: true,
          target: "FET/USD",
        },
        {
          sym: "RENDER",
          chg: "+6.47%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "RENDER/USD",
        },
        {
          sym: "WLD",
          chg: "-1.66%",
          size: "col-span-2 row-span-2 text-xs",
          up: false,
          target: "WLD/USD",
        },
        {
          sym: "NEAR",
          chg: "+6.82%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "NEAR/USD",
        },
      ],
    },
    {
      sectorZh: "美股七巨头 & 黄金宏观",
      sectorEn: "US Mag-7 & Bullion",
      avgChange: "+0.94%",
      spanClass: "lg:col-span-5",
      items: [
        {
          sym: "NVDA",
          chg: "+1.40%",
          size: "col-span-4 row-span-3 text-lg",
          up: true,
          target: "NVDA",
        },
        {
          sym: "XAU/USD",
          chg: "+0.69%",
          size: "col-span-4 row-span-3 text-base",
          up: true,
          target: "XAU/USD",
        },
        {
          sym: "AAPL",
          chg: "+0.66%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "AAPL",
        },
        {
          sym: "TSLA",
          chg: "-1.84%",
          size: "col-span-2 row-span-2 text-xs",
          up: false,
          target: "TSLA",
        },
        {
          sym: "MSFT",
          chg: "+0.84%",
          size: "col-span-2 row-span-1 text-xs",
          up: true,
          target: "MSFT",
        },
        {
          sym: "META",
          chg: "+1.41%",
          size: "col-span-2 row-span-1 text-xs",
          up: true,
          target: "META",
        },
      ],
    },
    {
      sectorZh: "DeFi & 衍生品协议",
      sectorEn: "DeFi & Yield",
      avgChange: "+3.18%",
      spanClass: "lg:col-span-4",
      items: [
        {
          sym: "UNI",
          chg: "+3.09%",
          size: "col-span-3 row-span-2 text-sm",
          up: true,
          target: "UNI/USD",
        },
        {
          sym: "AAVE",
          chg: "+3.05%",
          size: "col-span-3 row-span-2 text-sm",
          up: true,
          target: "AAVE/USD",
        },
        {
          sym: "ENA",
          chg: "+6.32%",
          size: "col-span-3 row-span-2 text-xs",
          up: true,
          target: "ENA/USD",
        },
        {
          sym: "LINK",
          chg: "+3.38%",
          size: "col-span-3 row-span-2 text-xs",
          up: true,
          target: "LINK/USD",
        },
      ],
    },
    {
      sectorZh: "MEME / Layer2 / RWA",
      sectorEn: "MEME / L2 / RWA",
      avgChange: "+4.86%",
      spanClass: "lg:col-span-3",
      items: [
        {
          sym: "DOGE",
          chg: "+5.78%",
          size: "col-span-2 row-span-2 text-sm",
          up: true,
          target: "DOGE/USD",
        },
        {
          sym: "PEPE",
          chg: "+8.92%",
          size: "col-span-2 row-span-2 text-sm",
          up: true,
          target: "PEPE/USD",
        },
        {
          sym: "WIF",
          chg: "+8.47%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "WIF/USD",
        },
        {
          sym: "ARB",
          chg: "+2.93%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "ARB/USD",
        },
        {
          sym: "OP",
          chg: "+3.25%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "OP/USD",
        },
        {
          sym: "ONDO",
          chg: "+5.09%",
          size: "col-span-2 row-span-2 text-xs",
          up: true,
          target: "ONDO/USD",
        },
      ],
    },
  ];

  return (
    <div className={subNav === "ace" ? "" : "pb-10"}>
      {/* Top Sub-Navigation Bar (Requirement #4: Removed '条件选币/选股', '排行', '合约与分红雷达') */}
      {!hideNavigation && (
        <>
          <div className="bg-white dark:bg-[#0F131C] border-b border-slate-200 dark:border-slate-800/90 px-4 lg:px-8">
            <div className="max-w-[1440px] mx-auto flex items-center gap-7 text-xs sm:text-sm font-medium overflow-x-auto">
              {[
                { id: "ace", zh: "Ace智搜", en: "Ace AI Search" },
                { id: "overview", zh: "市场概览", en: "Market Overview" },
                { id: "hotlist", zh: "热门榜单", en: "Hot Leaderboards" },
                { id: "heatmap", zh: "云图", en: "Market Cloud" },
              ].map((tab) => {
                const active = subNav === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSubNav(tab.id as OverviewSubTab)}
                    className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? "border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {lang === "zh" ? tab.zh : tab.en}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {/* SUB-PAGE 1: ACE智搜 (Exact Screenshot 2 Replica: Left Sidebar + Right Research Report + Bottom Rounded Chat Input) */}
      {subNav === "ace" && (
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 lg:h-[calc(100dvh_-_var(--app-header-h)_-_53px)] bg-surface">
          {/* Left Sidebar (2.5 Cols) */}
          <aside className="lg:col-span-3 xl:col-span-2 border-b lg:border-b-0 lg:border-r border-line p-4 flex flex-col justify-between bg-surface-2 lg:overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                    AI
                  </span>
                  <span>{lang === "zh" ? "Ace智搜" : "Ace Research"}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setAceActiveTopic("new");
                    setAceCustomMessages([]);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {lang === "zh" ? "新建对话" : "New Research Chat"}
                  </span>
                </button>
                <button
                  onClick={openKline}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium cursor-pointer ${
                    aceActiveTopic === "kline_analysis"
                      ? "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <BarChart2 className="w-4 h-4 text-blue-500" />
                  <span>
                    {lang === "zh" ? "K线分析" : "K-Line AI Diagnosis"}
                  </span>
                </button>
                <button
                  onClick={() => setAceActiveTopic("ai_indicator")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-indigo-500" />
                  <span>
                    {lang === "zh" ? "AI写指标" : "AI Pine Indicator"}
                  </span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-[11px] text-slate-400 px-2">
                  {lang === "zh" ? "最近对话" : "Recent Threads"}
                </div>
                {[
                  {
                    id: "usd_confidence",
                    zh: "美元信心低迷的影响",
                    en: "Impact of Soft USD Confidence",
                  },
                  {
                    id: "nvda_blackwell",
                    zh: "NVDA Blackwell算力周期与目标价",
                    en: "NVDA Blackwell Cycle & Target",
                  },
                  {
                    id: "btc_etf_flow",
                    zh: "BTC现货ETF净流入与10万关口推演",
                    en: "BTC Spot ETF Inflow Analysis",
                  },
                  {
                    id: "gold_4140",
                    zh: "黄金突破4140美元后的央行购金逻辑",
                    en: "Gold $4,140 Central Bank Thesis",
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAceActiveTopic(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate cursor-pointer transition-colors ${
                      aceActiveTopic === t.id
                        ? "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {lang === "zh" ? t.zh : t.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-800">
              Ace智搜 · 市场研究
            </div>
          </aside>

          {/* Right Main Conversation & Deep Macro Report Area (9.5 Cols - Exact Screenshot 2) */}
          <section className="lg:col-span-9 xl:col-span-10 flex flex-col justify-between p-4 sm:p-6 lg:p-10 lg:h-full lg:overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full space-y-6 pb-8">
              <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {
                    (
                      {
                        new: "新对话",
                        kline_analysis: "K线分析",
                        usd_confidence: "美元与全球资产",
                        nvda_blackwell: "NVDA 算力周期",
                        btc_etf_flow: "BTC 现货 ETF 资金流",
                        gold_4140: "黄金与央行储备",
                        ai_indicator: "双均线指标示例",
                      } as Record<string, string>
                    )[aceActiveTopic]
                  }
                </h2>
              </div>
              <div className="space-y-5 text-xs sm:text-sm leading-7 text-slate-700 dark:text-slate-300">
                {aceActiveTopic === "new" ? (
                  <div className="space-y-8 pt-4">
                    <h3 className="text-center text-2xl sm:text-[32px] font-bold tracking-tight text-slate-900 dark:text-white">
                      {lang === "zh"
                        ? "今天想研究哪一段行情？"
                        : "What shall we research today?"}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        {lang === "zh"
                          ? "获取任何品种的即时可靠洞察"
                          : "Instant, reliable insight on any symbol"}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {ACE_PROMPTS.map((g) => {
                          const GIcon =
                            g.icon === "book"
                              ? BookOpen
                              : g.icon === "gauge"
                                ? Gauge
                                : Search;
                          return (
                            <div
                              key={g.id}
                              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111722]"
                            >
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <GIcon className="w-4 h-4" />
                                {lang === "zh" ? g.zh : g.en}
                              </div>
                              <div className="mt-2.5 space-y-2">
                                {g.items.map((q) => (
                                  <button
                                    key={q.zh}
                                    type="button"
                                    onClick={() =>
                                      setAceInput(lang === "zh" ? q.zh : q.en)
                                    }
                                    className="block w-full text-left text-xs leading-5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  >
                                    {lang === "zh" ? q.zh : q.en}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111722]">
                      <div className="h-[150px] p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0d131d]">
                        <KlineSnapshot instrument={klineInst} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {lang === "zh" ? "K线分析" : "Chart analysis"}
                        </h4>
                        <p className="mt-1.5 text-xs leading-6 text-slate-600 dark:text-slate-300">
                          {lang === "zh"
                            ? "框选任意一段 K 线，AI 识别形态、计算支撑阻力并给出交易计划，记录与交易台同步保存。"
                            : "Select any stretch of candles; AI reads patterns, levels and plans. Records are shared with the trading desk."}
                        </p>
                        <button
                          type="button"
                          onClick={openKline}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {lang === "zh" ? "立即体验" : "Try it"}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : aceActiveTopic === "kline_analysis" ? (
                  <KlineWorkspace
                    instruments={instruments}
                    lang={lang}
                    onTrade={onTrade ?? onQuickTrade}
                  />
                ) : aceActiveTopic === "ai_indicator" ? (
                  <>
                    <p>
                      使用 20 日与 60 日均线，观察短期价格与长期趋势的关系。
                    </p>
                    <pre className="p-5 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-auto text-xs">{`//@version=5
indicator("Dual Moving Average", overlay=true)
fast = ta.sma(close, 20)
slow = ta.sma(close, 60)
plot(fast, color=color.blue, title="MA20")
plot(slow, color=color.orange, title="MA60")`}</pre>
                  </>
                ) : (
                  (
                    (
                      {
                        usd_confidence: [
                          [
                            "美元的不同观察角度",
                            "美元指数、实际利率与跨境资金流，反映不同维度的美元需求。单次价格变化不足以代表整个市场的信心。",
                          ],
                          [
                            "黄金与加密资产",
                            "黄金受到实际利率和避险需求影响，加密资产还受到市场流动性、产品资金流与链上活动影响。两者可能在不同阶段呈现不同方向。",
                          ],
                          [
                            "后续关注",
                            "可以跟踪就业和通胀数据、国债收益率及 ETF 资金流，结合多个时间窗口比较变化。",
                          ],
                        ],
                        nvda_blackwell: [
                          [
                            "算力需求与收入确认",
                            "数据中心资本开支为算力需求提供线索，但订单、交付和收入确认存在时间差。阅读财报时，应同时关注公司指引与客户采购节奏。",
                          ],
                          [
                            "供应与利润率",
                            "新品交付规模、供应链成本和产品组合变化，都可能影响毛利率。短期价格反应应与基本面数据分开观察。",
                          ],
                        ],
                        btc_etf_flow: [
                          [
                            "申购与赎回",
                            "ETF 资金净流入反映基金份额变化，需要结合持仓规模与币价变动阅读。资金流入不直接等同于未来涨幅。",
                          ],
                          [
                            "现货与衍生品",
                            "现货成交、期货基差和资金费率反映不同参与者的活动。比较这些数据，可以更完整地观察市场结构。",
                          ],
                        ],
                        gold_4140: [
                          [
                            "储备配置",
                            "央行储备调整往往涉及流动性、分散化和长期政策目标，不宜直接解释为短期价格信号。",
                          ],
                          [
                            "实际利率与黄金",
                            "实际利率变化会影响持有黄金的机会成本。同时还应观察汇率、实物需求和资金流向。",
                          ],
                        ],
                      } as Record<string, string[][]>
                    )[aceActiveTopic] || []
                  ).map(([heading, body]) => (
                    <div key={heading}>
                      <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                        {heading}
                      </h3>
                      <p>{body}</p>
                    </div>
                  ))
                )}

                {/* Custom Follow-up Q&A */}
                {aceCustomMessages.map((msg, i) => (
                  <div
                    key={i}
                    className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex justify-end">
                      <span className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs font-medium">
                        {msg.q}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111722] border border-slate-200 dark:border-slate-800 text-xs leading-6 whitespace-pre-line">
                      {msg.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* K线分析 has its own controls; the question composer is for the other topics. */}
            {aceActiveTopic !== "kline_analysis" && (
            <>
            {/* Bottom Floating Gradient Border Input Box (Exact Screenshot 2 Bottom Input) */}
            <div className="max-w-3xl mx-auto w-full pt-2 sticky bottom-0 bg-surface">
              <form
                onSubmit={handleAceAsk}
                className="p-3.5 rounded-2xl border border-indigo-300/80 dark:border-indigo-500/50 bg-white dark:bg-[#111722] shadow-[0_8px_28px_rgba(79,70,229,0.13)] ring-1 ring-indigo-500/10 space-y-3"
              >
                <input
                  type="text"
                  value={aceInput}
                  onChange={(e) => setAceInput(e.target.value)}
                  placeholder={
                    lang === "zh"
                      ? "输入品种代码或市场问题…"
                      : "Ask Ace AI anything about macro, US stocks, or crypto perpetuals..."
                  }
                  className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <button
                      type="button"
                      aria-label={
                        lang === "zh" ? "插入当前品种" : "Insert current symbol"
                      }
                      title={
                        lang === "zh" ? "插入当前品种" : "Insert current symbol"
                      }
                      onClick={() =>
                        setAceInput(
                          (v) => (v.trim() ? v.trim() + " " : "") + klineInst.symbol,
                        )
                      }
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={aceModeOpen}
                        onClick={() => setAceModeOpen((v) => !v)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {aceMode === "fast"
                          ? lang === "zh"
                            ? "快速回答"
                            : "Fast answer"
                          : lang === "zh"
                            ? "深度思考"
                            : "Deep research"}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            aceModeOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {aceModeOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setAceModeOpen(false)}
                          />
                          <div
                            role="listbox"
                            className="absolute bottom-full left-0 z-20 mb-2 min-w-[150px] whitespace-nowrap p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161d2b] shadow-lg"
                          >
                            {(["fast", "deep"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                role="option"
                                aria-selected={aceMode === m}
                                onClick={() => {
                                  setAceModeOpen(false);
                                  if (
                                    m === "deep" &&
                                    !membership.requireTier(
                                      "premium",
                                      lang === "zh" ? "Ace 深度思考" : "Ace deep research",
                                    )
                                  )
                                    return;
                                  setAceMode(m);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                  aceMode === m
                                    ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}
                              >
                                {m === "fast"
                                  ? lang === "zh"
                                    ? "快速回答"
                                    : "Fast answer"
                                  : lang === "zh"
                                    ? "深度思考"
                                    : "Deep research"}
                                {m === "deep" && membership.tier !== "premium" && membership.tier !== "elite" && (
                                  <span className="mb-badge is-premium ml-1.5">
                                    {lang === "zh" ? "高级" : "Premium"}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <QuotaPill compact className="ml-auto mr-2" />
                  <button
                    type="submit"
                    aria-label="发送问题"
                    className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
            </>
            )}
          </section>
        </div>
      )}

      {/* SUB-PAGE 2: 市场概览 (Default Screenshot 1 Dashboard) */}
      {subNav === "overview" && (
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-6 space-y-6">
          {!compactOverview && (
            <>
              <div className="space-y-3">
                <form
                  onSubmit={handleSearchSubmit}
                  className="max-w-2xl relative"
                >
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={
                      lang === "zh"
                        ? "行情、指标、数据、美股诊股和外汇的一站式 AI 搜索引擎 (输入如 NVDA, XAU, BTC)..."
                        : "One-stop AI search engine for quotes, indicators & stock diagnosis (try NVDA, XAU, BTC)..."
                    }
                    className="w-full pl-11 pr-28 py-3 rounded-full text-xs sm:text-sm bg-white dark:bg-[#111722] border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white shadow-[0_1px_3px_rgba(19,23,34,0.05)] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{lang === "zh" ? "AI分析" : "AI Analyze"}</span>
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shrink-0">
                      AI
                    </span>
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 mr-1 whitespace-nowrap">
                    {lang === "zh" ? "快捷入口" : "Quick Access"}
                  </span>
                  {[
                    {
                      zh: "🔥 比特币ETF榜",
                      en: "🔥 BTC ETFs",
                      action: () => setSubNav("hotlist"),
                    },
                    {
                      zh: "全市场云图",
                      en: "Market Cloud",
                      action: () => setSubNav("heatmap"),
                    },
                    {
                      zh: "Ace宏观智搜",
                      en: "Ace Macro AI",
                      action: () => setSubNav("ace"),
                    },
                    {
                      zh: "美股AI诊股 (NVDA)",
                      en: "NVDA AI Diagnose",
                      action: () => onOpenAiOverviewWithSymbol("NVDA"),
                    },
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={q.action}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-[#111722] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-500/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {lang === "zh" ? q.zh : q.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 Promotional Feature Banners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => onOpenAiOverviewWithSymbol("NVDA")}
                  className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#3370f3] via-blue-600 to-indigo-700 text-white flex flex-col justify-between min-h-28 gap-2 cursor-pointer shadow-[0_8px_24px_-10px_rgba(41,98,255,0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-10px_rgba(41,98,255,0.6)] transition-all"
                >
                  <div>
                    <div className="text-xs font-semibold text-blue-200">
                      {lang === "zh"
                        ? "五维智能量化引擎"
                        : "5-Factor Quant Engine"}
                    </div>
                    <div className="text-base sm:text-lg font-bold mt-0.5">
                      {lang === "zh"
                        ? "全品种 AI 诊股与支撑阻力推演"
                        : "Multi-Asset AI Stock Diagnosis"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-blue-100">
                    <span className="truncate">
                      {lang === "zh"
                        ? "抄底逃顶利器 · 自动测算止盈止损"
                        : "Automated Support, Resistance & TP/SL"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/15 font-mono whitespace-nowrap shrink-0">
                      AI PRO
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setSubNav("hotlist")}
                  className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white flex flex-col justify-between min-h-28 gap-2 cursor-pointer shadow-[0_8px_24px_-10px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-10px_rgba(124,58,237,0.6)] transition-all"
                >
                  <div>
                    <div className="text-xs font-semibold text-amber-400">
                      {lang === "zh"
                        ? "全网多维异动榜单"
                        : "Multi-Dimension Hot Leaderboards"}
                    </div>
                    <div className="text-base sm:text-lg font-bold mt-0.5">
                      {lang === "zh"
                        ? "比特币ETF、爆仓榜、持仓量与资金费率"
                        : "BTC ETFs, Liquidations, Open Interest & Funding"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="truncate">
                      {lang === "zh"
                        ? "9大机构级实时数据榜单同屏监控"
                        : "9 institutional telemetry boards"}
                    </span>
                    <span className="text-emerald-400 font-mono whitespace-nowrap shrink-0">
                      ● HOT LISTS
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setSubNav("heatmap")}
                  className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0f172a] ring-1 ring-white/10 text-white flex flex-col justify-between min-h-28 gap-2 cursor-pointer shadow-[0_8px_24px_-10px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 hover:ring-blue-400/40 transition-all"
                >
                  <div>
                    <div className="text-xs font-semibold text-emerald-300">
                      {lang === "zh"
                        ? "全市场板块云图 (Treemap)"
                        : "Sector Market Cloud"}
                    </div>
                    <div className="text-base sm:text-lg font-bold mt-0.5">
                      {lang === "zh"
                        ? "a16z、公链、AI、DeFi与美股全景云图"
                        : "a16z, L1, AI, DeFi & US Tech Cloud"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-blue-200">
                    <span className="truncate">
                      {lang === "zh"
                        ? "一眼洞察全市场资金轮动方向"
                        : "Visualize cross-sector capital rotation"}
                    </span>
                    <span className="font-mono font-bold text-amber-300 whitespace-nowrap shrink-0">
                      TREEMAP →
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          {/* Main 3-Column Intelligence Matrix: AI解读 | 市场机会 | 今日热点 + 词云 */}
          <div className="ui-card p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-4 lg:border-r border-slate-100 dark:border-slate-800/80 lg:pr-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === "zh" ? "AI解读" : "AI Market Insights"}
                  </h2>
                  <button
                    onClick={() => onOpenAiOverviewWithSymbol("NVDA")}
                    className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:bg-indigo-500/20 cursor-pointer"
                  >
                    <span>
                      🤖 {lang === "zh" ? "进入AI诊股" : "AI Diagnose"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  {aiInsightsList.map((item) => {
                    const inst = instruments.find(
                      (i) => i.symbol === item.symbol,
                    );
                    const isBull = item.stance === "bullish";
                    return (
                      <div
                        key={item.symbol}
                        onClick={() => onOpenAiOverviewWithSymbol(item.symbol)}
                        className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer space-y-1.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AssetLogo
                              symbol={item.symbol}
                              category={inst?.category || "stocks"}
                              logoUrl={inst?.logoUrl}
                              baseFlag={inst?.baseFlag}
                              quoteFlag={inst?.quoteFlag}
                              size="sm"
                            />
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {item.symbol}
                            </span>
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                              ${item.price.toFixed(inst?.decimals || 2)}
                            </span>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                item.change.startsWith("+")
                                  ? "text-emerald-500"
                                  : "text-rose-500"
                              }`}
                            >
                              {item.change}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              isBull
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {lang === "zh" ? item.stanceZh : item.stanceEn}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {lang === "zh" ? item.descZh : item.descEn}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4 lg:border-r border-slate-100 dark:border-slate-800/80 lg:pr-5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === "zh" ? "市场机会" : "Market Opportunities"}
                </h2>
                <div className="space-y-3">
                  {marketOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => onOpenAiOverviewWithSymbol(opp.symbol)}
                      className="text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer leading-relaxed py-0.5"
                    >
                      {lang === "zh" ? opp.zh : opp.en}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {lang === "zh" ? "今日热点" : "Trending Narratives"}
                    </h2>
                    <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                    <button
                      onClick={() => setHotTimeframe("1H")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        hotTimeframe === "1H"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                          : "text-slate-500"
                      }`}
                    >
                      1H
                    </button>
                    <button
                      onClick={() => setHotTimeframe("24H")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        hotTimeframe === "24H"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                          : "text-slate-500"
                      }`}
                    >
                      24H
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-7 space-y-2.5">
                    {(hotTimeframe === "1H"
                      ? hotTopics.slice().reverse().slice(0, 4)
                      : hotTopics
                    ).map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => onOpenAiOverviewWithSymbol(topic.symbol)}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1 cursor-pointer"
                      >
                        {lang === "zh" ? topic.zh : topic.en}
                      </div>
                    ))}
                  </div>

                  <div className="sm:col-span-5 bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4 h-52 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 select-none overflow-hidden">
                    {HOT_WORDS.map((word) => (
                      <button
                        key={word.label}
                        onClick={() => onOpenAiOverviewWithSymbol(word.symbol)}
                        className={`${word.cls} hover:scale-105 transition-transform cursor-pointer`}
                      >
                        {word.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(!compactOverview || showPreviews) && (
            <>
              {/* Bottom Preview Row: 行情热力图 + 热门精选 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 ui-card p-5 space-y-4">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <button
                      onClick={() => setSubNav("heatmap")}
                      className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                    >
                      <span>
                        {lang === "zh"
                          ? "行情热力图"
                          : "Market Heatmap (Expand Cloud)"}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1 text-xs font-mono">
                      {(["5Min", "1H", "4H", "24H"] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setHeatmapTimeframe(tf)}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            heatmapTimeframe === tf
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                              : "text-slate-500"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 grid-rows-6 gap-1.5 h-60 text-white font-mono">
                    {HEATMAP_PREVIEW_TILES.map(([symbol, label, layout]) => {
                      const item = instruments.find((i) => i.symbol === symbol);
                      const factor = HEATMAP_FACTOR[heatmapTimeframe];
                      const change = (item?.changePercent24h ?? 0) * factor;
                      return <button key={symbol} onClick={() => onOpenAiOverviewWithSymbol(symbol)}
                        className={`${layout} rounded-lg ${change >= 0 ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"} transition-colors flex flex-col items-center justify-center min-w-0 p-1 text-center`}>
                        <span className="text-sm font-bold">{label}</span>
                        <span className="text-xs">{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
                      </button>;
                    })}
                  </div>
                </div>

                <div className="lg:col-span-6 ui-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSubNav("hotlist")}
                      className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                    >
                      <span>
                        {lang === "zh"
                          ? "多资产异动精选"
                          : "Multi-Asset Highlights"}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {MULTI_ASSET_HIGHLIGHTS.map((card) => {
                      const inst = instruments.find(
                        (i) => i.symbol === card.symbol,
                      );
                      return (
                        <div
                          key={card.symbol}
                          onClick={() =>
                            onOpenAiOverviewWithSymbol(card.symbol)
                          }
                          className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <AssetLogo
                                symbol={card.symbol}
                                category={inst?.category || "crypto"}
                                logoUrl={inst?.logoUrl}
                                size="md"
                              />
                              <div>
                                <div className="font-bold text-sm text-slate-900 dark:text-white">
                                  {card.symbol}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {card.name}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {card.tag}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                            <div>
                              <div className="text-slate-400">
                                {lang === "zh" ? "状态" : "Status"}
                              </div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                                {card.statusZh}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">
                                {lang === "zh" ? "动量" : "Momentum"}
                              </div>
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                                {card.taskZh}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-400">
                                {lang === "zh" ? "规模" : "Volume"}
                              </div>
                              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                                {card.yieldStr}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>{" "}
            </>
          )}
        </div>
      )}

      {/* SUB-PAGE 3: 热门榜单 (Exact Screenshot 3 Replica: Multi-Board Institutional Leaderboards) */}
      {subNav === "hotlist" && (
        <div className="max-w-[1440px] mx-auto px-3 md:px-6 pt-5 space-y-4">
          {/* Filter Pills Row (Screenshot 3 Top Sub-Filter) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-medium">
            {[
              { id: "all", zh: "总览", en: "All Boards" },
              { id: "etf", zh: "比特币ETF 🔥", en: "Bitcoin ETFs 🔥" },
              { id: "hot", zh: "热门", en: "Trending" },
              { id: "gainers", zh: "涨幅榜", en: "Top Gainers" },
              { id: "losers", zh: "跌幅榜", en: "Top Losers" },
              { id: "volume", zh: "成交额", en: "Volume" },
              { id: "liquidation", zh: "爆仓", en: "Liquidations" },
              { id: "oi", zh: "持仓量", en: "Open Interest" },
              { id: "funding", zh: "资金费率", en: "Funding Rate" },
              { id: "inflow", zh: "净流入", en: "Net Inflows" },
            ].map((pill) => (
              <button
                key={pill.id}
                aria-pressed={hotListFilter === pill.id}
                onClick={() => setHotListFilter(pill.id)}
                className="ui-chip"
              >
                {lang === "zh" ? pill.zh : pill.en}
              </button>
            ))}
          </div>

          {/* 4-Column Multi-Card Grid (Exact Screenshot 3 Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hotLeaderboardCards
              .filter((c) => hotListFilter === "all" || c.id === hotListFilter)
              .map((board) => (
                <div
                  key={board.id}
                  className="ui-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-white border-b-2 border-amber-500 pb-2 -mb-2.5">
                      {lang === "zh" ? board.titleZh : board.titleEn}
                    </span>
                    <span className="text-[11px] text-slate-400">24H</span>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 text-[11px]">
                        <th className="py-1.5 w-6">#</th>
                        <th className="py-1.5">
                          {lang === "zh" ? "名称 / 合约" : "Symbol"}
                        </th>
                        <th className="py-1.5 text-right">
                          {board.colPriceZh}
                        </th>
                        <th className="py-1.5 text-right">
                          {board.colExtraZh}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                      {board.rows.map((r) => (
                        <tr
                          key={r.rank}
                          onClick={() =>
                            onQuickTrade(r.sym, r.up ? "buy" : "sell")
                          }
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2 text-slate-400">{r.rank}</td>
                          <td className="py-2 font-sans font-bold text-slate-800 dark:text-slate-200">
                            {r.name}
                          </td>
                          <td className="py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                            {r.price}
                          </td>
                          <td
                            className={`py-2 text-right tabular-nums font-bold ${
                              r.up ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {r.extra}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-PAGE 4: 云图 (Exact Screenshot 4 Full-Viewport Sector Treemap Cloud) */}
      {subNav === "heatmap" && (
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-4 space-y-4">
          {/* Cloud Controls Header (Matching Screenshot 4 Top Filter Bar) */}
          <div className="flex flex-wrap items-center justify-between gap-3 ui-card px-4 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {lang === "zh" ? "市值: 前100 ⌄" : "Cap: Top 100 ⌄"}
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {lang === "zh" ? "类型: 涨跌幅 ⌄" : "Metric: 24h Chg ⌄"}
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {lang === "zh" ? "板块分组: 开启 ⌄" : "Sector Grouping: ON ⌄"}
              </span>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                {(["5Min", "1H", "4H", "24H"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setHeatmapTimeframe(tf)}
                    className={`px-2.5 py-0.5 rounded cursor-pointer ${
                      heatmapTimeframe === tf
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                        : "text-slate-500"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scale Legend (Screenshot 4 Top Right) */}
            <div className="flex items-center gap-1 font-mono text-[10px] text-white">
              <span className="px-2 py-0.5 rounded bg-rose-600">-3%</span>
              <span className="px-2 py-0.5 rounded bg-rose-500">-2%</span>
              <span className="px-2 py-0.5 rounded bg-rose-400">-1%</span>
              <span className="px-2 py-0.5 rounded bg-slate-400">0%</span>
              <span className="px-2 py-0.5 rounded bg-emerald-400">+1%</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500">+2%</span>
              <span className="px-2 py-0.5 rounded bg-emerald-600">+3%</span>
            </div>
          </div>

          {/* Multi-Sector Treemap Grid (Exact Screenshot 4 Visual Structure) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {cloudSectorGroups.map((group, gIdx) => (
              <div
                key={gIdx}
                className={`${group.spanClass} ui-card p-3 space-y-2`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">
                    {lang === "zh" ? group.sectorZh : group.sectorEn}
                  </span>
                  <span className="font-mono text-emerald-500">
                    {group.avgChange}
                  </span>
                </div>

                <div className="grid grid-cols-6 auto-rows-[52px] gap-1.5 font-mono text-white">
                  {group.items.map((box, bIdx) => (
                    <div
                      key={bIdx}
                      onClick={() => onOpenAiOverviewWithSymbol(box.target)}
                      className={`${box.size} rounded-lg flex flex-col items-center justify-center p-1 text-center cursor-pointer transition-transform hover:scale-[0.99] ${
                        box.up
                          ? box.chg.includes("+6") ||
                            box.chg.includes("+7") ||
                            box.chg.includes("+8") ||
                            box.chg.includes("+9")
                            ? "bg-[#089981]"
                            : "bg-[#22b287]/90"
                          : "bg-[#f7525f]"
                      }`}
                    >
                      <span className="font-bold leading-tight">{box.sym}</span>
                      <span className="text-[11px] font-semibold opacity-95">
                        {box.chg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
