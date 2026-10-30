import React, { useState } from "react";
import {
  X,
  RefreshCw,
  Sparkles,
  TrendingUp,
  BarChart2,
  Layers,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { Instrument } from "../data/marketData";
import { AssetLogo } from "./AssetLogo";

interface AiChartInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: Instrument;
  lang: "zh" | "en";
  onQuickOrder: (side: "buy" | "sell") => void;
  /** Charges one AI analysis for a regenerated reading; false when the quota is used up. */
  onRegenerate?: () => boolean;
}

export const AiChartInsightModal: React.FC<AiChartInsightModalProps> = ({
  isOpen,
  onClose,
  instrument,
  lang,
  onQuickOrder,
  onRegenerate,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "quant">("overview");
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const isUp = instrument.changePercent24h >= 0;
  const p = instrument.price;
  const dec = instrument.decimals;

  const resHigh = Number((p * 1.032).toFixed(dec));
  const resMid = Number((p * 1.016).toFixed(dec));
  const supMid = Number((p * 0.985).toFixed(dec));
  const supLow = Number((p * 0.968).toFixed(dec));

  // Generate annotated candlestick data for the secondary modal chart
  const candles = Array.from({ length: 28 }).map((_, idx) => {
    const progress = idx / 27;
    const wave = Math.sin(idx * 0.45) * p * 0.008;
    const drift = (progress - 0.5) * p * (isUp ? 0.024 : -0.022);
    const close = p + drift + wave;
    const open = close - (idx % 3 === 0 ? -1 : 1) * p * 0.0045;
    const high = Math.max(open, close) + p * 0.0035;
    const low = Math.min(open, close) - p * 0.0035;
    return { open, close, high, low, bull: close >= open };
  });

  const minChart = Math.min(...candles.map((c) => c.low), supLow * 0.996);
  const maxChart = Math.max(...candles.map((c) => c.high), resHigh * 1.004);
  const range = Math.max(0.0001, maxChart - minChart);
  const toY = (val: number) => 220 - ((val - minChart) / range) * 190 - 15;

  const triggerRefresh = () => {
    if (onRegenerate && !onRegenerate()) return;
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1224]/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-[#111722] border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.22),0_2px_8px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-[#f5f7fa] dark:bg-[#0D1219]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              AI
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <AssetLogo
                symbol={instrument.symbol}
                category={instrument.category}
                logoUrl={instrument.logoUrl}
                baseFlag={instrument.baseFlag}
                quoteFlag={instrument.quoteFlag}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {lang === "zh"
                      ? `解读 ${instrument.symbol} 今日走势与盘面结构`
                      : `AI Chart & Price Action Decoding: ${instrument.symbol}`}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold whitespace-nowrap shrink-0">
                    {lang === "zh" ? "AI解读" : "AI Insight"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {lang === "zh" ? instrument.nameZh : instrument.nameEn} ·{" "}
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    ${p.toFixed(dec)} ({isUp ? "+" : ""}
                    {instrument.changePercent24h.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={triggerRefresh}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${refreshing ? "animate-spin text-indigo-500" : ""}`}
              />
              <span className="hidden sm:inline">
                {lang === "zh" ? "重新生成" : "Regenerate"}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Interactive Sub-Tabs inside Modal */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {lang === "zh"
                  ? "AI 走势解读 & 关键位图表"
                  : "AI Action Decoding & Annotated Chart"}
              </button>
              <button
                onClick={() => setActiveTab("quant")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "quant"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {lang === "zh"
                  ? "主力资金流 & 多空情绪图表"
                  : "Institutional Orderflow & Sentiment"}
              </button>
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 Cols: Screenshot-Matched AI Structured Narrative */}
              <div className="lg:col-span-7 bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 text-xs sm:text-sm leading-relaxed">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                  <span>{lang === "zh" ? "总体：" : "Overall: "}</span>
                  <span
                    className={
                      isUp
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }
                  >
                    {isUp
                      ? lang === "zh"
                        ? "今日看涨 📈"
                        : "Bullish Today 📈"
                      : lang === "zh"
                        ? "今日看跌 📉"
                        : "Bearish Today 📉"}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300">
                  {lang === "zh"
                    ? `${instrument.symbol} (${instrument.nameZh}) 正处于关键转折区间，技术面与主力订单流数据${
                        isUp
                          ? "略偏多，向上突破概率 68%"
                          : "略偏空，向下回测支撑概率 62%"
                      }（压力区间 $${resMid} - $${resHigh}），下方第一强支撑位于 $${supLow} - $${supMid}。日内多头情绪占比 ${instrument.longRatio}%，主力成交量温和放大。`
                    : `${instrument.symbol} (${instrument.nameEn}) sits at a pivotal level. Technical structure and orderflow ${
                        isUp
                          ? "lean bullish with 68% breakout probability"
                          : "lean cautious with 62% support test probability"
                      } (resistance zone $${resMid} - $${resHigh}, primary support $${supLow} - $${supMid}).`}
                </p>

                <div className="pt-1 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {lang === "zh" ? "下单信息：" : "Order Execution Plan:"}
                  </div>
                  <ul className="list-disc pl-5 space-y-2 text-slate-700 dark:text-slate-300">
                    <li>
                      <strong className="text-slate-900 dark:text-white">
                        {lang === "zh" ? "短期交易：" : "Short-Term Trade: "}
                      </strong>
                      {lang === "zh"
                        ? `若跌破 $${supLow}-$${supMid}，可考虑顺势做空或等待更低位置买入；若放量突破 $${resMid}，可顺势追涨，目标看至 $${resHigh}。`
                        : `If price breaks below $${supLow}-$${supMid}, consider shorting or waiting for deeper bids; if volume breaks above $${resMid}, chase momentum longs toward $${resHigh}.`}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">
                        {lang === "zh"
                          ? `${instrument.symbol} 波动预期：`
                          : `${instrument.symbol} Outlook: `}
                      </strong>
                      {lang === "zh"
                        ? `中长期基本面与流动性预期乐观，机构大单在 $${supMid} 附近形成密集买盘托底，短期内 $${resMid} 颈线位的得失将直接决定波段加速幅度。`
                        : `Medium-term liquidity remains constructive with institutional bids stacked near $${supMid}.`}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">
                        {lang === "zh"
                          ? "仓位与风控建议："
                          : "Position Sizing: "}
                      </strong>
                      {lang === "zh"
                        ? `建议在回调至 $${supMid} 支撑带附近分批建仓，止损严格设于 $${supLow} 下方。`
                        : `Scale in near $${supMid} support with a protective stop below $${supLow}.`}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right 5 Cols: AI Annotated Support/Resistance Chart + Key Levels */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between text-white">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    {lang === "zh"
                      ? `${instrument.symbol} AI 关键支撑/阻力图谱`
                      : `${instrument.symbol} AI Key Levels Chart`}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    15M / 4H AI STRUCT
                  </span>
                </div>

                <div className="my-2">
                  <svg
                    viewBox="0 0 360 220"
                    className="w-full h-48 overflow-visible"
                  >
                    {/* Resistance Zone Band */}
                    <rect
                      x={0}
                      y={toY(resHigh)}
                      width={360}
                      height={Math.max(8, toY(resMid) - toY(resHigh))}
                      fill="rgba(244, 63, 94, 0.14)"
                    />
                    <line
                      x1={0}
                      y1={toY(resMid)}
                      x2={360}
                      y2={toY(resMid)}
                      stroke="#F23645"
                      strokeDasharray="4 3"
                      strokeWidth="1.2"
                    />
                    <text
                      x={6}
                      y={toY(resMid) - 4}
                      className="fill-rose-400 text-[9px] font-mono"
                    >
                      RES: ${resMid.toFixed(dec)} - ${resHigh.toFixed(dec)}
                    </text>

                    {/* Support Zone Band */}
                    <rect
                      x={0}
                      y={toY(supMid)}
                      width={360}
                      height={Math.max(8, toY(supLow) - toY(supMid))}
                      fill="rgba(16, 185, 129, 0.15)"
                    />
                    <line
                      x1={0}
                      y1={toY(supMid)}
                      x2={360}
                      y2={toY(supMid)}
                      stroke="#089981"
                      strokeDasharray="4 3"
                      strokeWidth="1.2"
                    />
                    <text
                      x={6}
                      y={toY(supLow) + 10}
                      className="fill-emerald-400 text-[9px] font-mono"
                    >
                      SUP: ${supLow.toFixed(dec)} - ${supMid.toFixed(dec)}
                    </text>

                    {/* Candlesticks */}
                    {candles.map((c, i) => {
                      const x = 12 + i * 12;
                      const yOpen = toY(c.open);
                      const yClose = toY(c.close);
                      const yHigh = toY(c.high);
                      const yLow = toY(c.low);
                      const color = c.bull ? "#089981" : "#F23645";
                      return (
                        <g key={i}>
                          <line
                            x1={x}
                            y1={yHigh}
                            x2={x}
                            y2={yLow}
                            stroke={color}
                            strokeWidth="1"
                          />
                          <rect
                            x={x - 3}
                            y={Math.min(yOpen, yClose)}
                            width={6}
                            height={Math.max(2, Math.abs(yClose - yOpen))}
                            fill={color}
                            rx={0.5}
                          />
                        </g>
                      );
                    })}

                    {/* AI Projection Path */}
                    <polyline
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      points={`336,${toY(candles[candles.length - 1].close)} 348,${toY(p * (isUp ? 1.012 : 0.992))} 358,${toY(isUp ? resMid : supMid)}`}
                    />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900">
                    <div className="text-slate-400">
                      {lang === "zh" ? "上方压力带" : "Resistance"}
                    </div>
                    <div className="text-rose-400 font-bold mt-0.5">
                      ${resMid.toFixed(dec)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900">
                    <div className="text-slate-400">
                      {lang === "zh" ? "当前现价" : "Current"}
                    </div>
                    <div className="text-white font-bold mt-0.5">
                      ${p.toFixed(dec)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900">
                    <div className="text-slate-400">
                      {lang === "zh" ? "下方支撑带" : "Support"}
                    </div>
                    <div className="text-emerald-400 font-bold mt-0.5">
                      ${supMid.toFixed(dec)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Institutional Orderflow & Multi-Timeframe Signal Chart */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>
                    {lang === "zh"
                      ? "主力大单净流入分布 (AICoin Delta)"
                      : "Institutional Net Delta Distribution"}
                  </span>
                  <span className="font-mono text-emerald-500">
                    +$42.8M NET INFLOW
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    {
                      label:
                        lang === "zh"
                          ? "超大单 (机构暗池 >$1M)"
                          : "Block Orders (>$1M)",
                      pct: 68,
                      val: "+$28.4M",
                      bull: true,
                    },
                    {
                      label:
                        lang === "zh"
                          ? "大单 (量化席位 $200K-$1M)"
                          : "Whale Orders ($200K-$1M)",
                      pct: 61,
                      val: "+$14.4M",
                      bull: true,
                    },
                    {
                      label:
                        lang === "zh" ? "中单 ($20K-$200K)" : "Medium Orders",
                      pct: 46,
                      val: "-$3.1M",
                      bull: false,
                    },
                    {
                      label:
                        lang === "zh"
                          ? "散户小单 (<$20K)"
                          : "Retail Orders (<$20K)",
                      pct: 52,
                      val: "+$1.9M",
                      bull: true,
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          {item.label}
                        </span>
                        <span
                          className={`font-mono font-bold ${item.bull ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {item.val}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${item.bull ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>
                    {lang === "zh"
                      ? "多周期技术指标共振矩阵"
                      : "Multi-Timeframe Signal Matrix"}
                  </span>
                  <span className="font-mono text-indigo-500">
                    STRONG BUY (8/10)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      tf: "15M 周期",
                      sig: lang === "zh" ? "EMA多头排列" : "EMA Bullish",
                      bull: true,
                    },
                    {
                      tf: "1H 周期",
                      sig: lang === "zh" ? "MACD金叉放量" : "MACD Cross",
                      bull: true,
                    },
                    {
                      tf: "4H 周期",
                      sig: lang === "zh" ? "突破布林上轨" : "BB Breakout",
                      bull: true,
                    },
                    {
                      tf: "1D 日线",
                      sig: lang === "zh" ? "主力筹码集中" : "Accumulation",
                      bull: true,
                    },
                  ].map((box, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-white dark:bg-[#111722] border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="text-slate-400 text-[11px] font-mono">
                        {box.tf}
                      </div>
                      <div className="font-bold text-emerald-500 mt-0.5">
                        {box.sig}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Direct Order Placement in Current Trading Terminal */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-[#f5f7fa] dark:bg-[#0D1219] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">
              {lang === "zh"
                ? `一键将 ${instrument.symbol} 方向策略带入当前下单面板`
                : `Apply ${instrument.symbol} setup directly to active order ticket`}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                onQuickOrder("buy");
                onClose();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-sm shadow-emerald-600/25"
            >
              {lang === "zh"
                ? `带入做多 (${instrument.ask.toFixed(dec)})`
                : `Set Long (${instrument.ask.toFixed(dec)})`}
            </button>
            <button
              onClick={() => {
                onQuickOrder("sell");
                onClose();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-sm shadow-rose-600/25"
            >
              {lang === "zh"
                ? `带入做空 (${instrument.bid.toFixed(dec)})`
                : `Set Short (${instrument.bid.toFixed(dec)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
