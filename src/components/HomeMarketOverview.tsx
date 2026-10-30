import React, { useId, useState } from "react";
import {
  Activity,
  ChartPie,
  CloudDrizzle,
  Flame,
  Fuel,
  Gauge,
} from "lucide-react";
import type { Instrument } from "../data/marketData";
import {
  CHAIN_ACTIVITY,
  MARKET_HEAT_NEWS,
  MARKET_OVERVIEW,
  SENTIMENT_IDEAS,
} from "./insightsData";

type Props = {
  instruments: Instrument[];
  lang: "zh" | "en";
  onDiagnose: (symbol: string) => void;
  onOpenTrade: (symbol: string) => void;
  onOpenNews: (id: string) => void;
};

export function HomeMarketOverview({
  instruments,
  lang,
  onDiagnose,
  onOpenTrade,
  onOpenNews,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [chainId, setChainId] =
    useState<(typeof CHAIN_ACTIVITY)[number]["id"]>("ethereum");
  const chain = CHAIN_ACTIVITY.find((c) => c.id === chainId)!;
  const btc = instruments.find((i) => i.symbol === "BTC/USD");
  const snapshot = MARKET_OVERVIEW;
  const longPercent =
    (snapshot.longShortRatio / (1 + snapshot.longShortRatio)) * 100;
  const uid = useId().replace(/:/g, "");
  const chartId = `market-cap-${uid}`;
  const gaugeId = `market-gauge-${uid}`;
  const panelId = (id: string) => `market-overview-${uid}-${id}`;
  const chartMin = Math.min(...snapshot.capHistory);
  const chartRange = Math.max(...snapshot.capHistory) - chartMin || 1;
  const points = snapshot.capHistory
    .map(
      (v, i) =>
        `${(i * 100) / (snapshot.capHistory.length - 1)},${65 - ((v - chartMin) / chartRange) * 52}`,
    )
    .join(" ");
  const angle = Math.PI * (1 - longPercent / 100);
  const needleX = 100 + Math.cos(angle) * 57;
  const needleY = 86 - Math.sin(angle) * 57;
  const cardClass = "ui-card overflow-hidden min-w-0";

  return (
    <div
      className="min-w-0 order-first lg:order-none"
      aria-label={t("市场概览", "Market overview")}
    >
      <div className="grid grid-cols-1 gap-5 items-start">
        <section
          id={panelId("cap")}
          className={cardClass}
          aria-labelledby={`${chartId}-title`}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <h2
              id={`${chartId}-title`}
              className="ui-card-title !text-[14px] !whitespace-normal"
            >
              <ChartPie className="w-4 h-4 text-brand shrink-0" />
              {t("全球总市值与场外溢价", "Global market cap & OTC")}
            </h2>
            <span className="ui-badge !text-[10px]">24H</span>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <div className="min-w-0 rounded-xl border border-line bg-surface-2/70 px-1.5 py-3 text-center">
                <p className="text-[12px] text-ink-2">
                  {t("总市值", "Market cap")}
                </p>
                <p className="mt-1.5 text-[clamp(14px,4vw,20px)] font-semibold tracking-tight text-down">
                  ${snapshot.capTrillions}
                  <span className="ml-0.5 text-[11px] font-medium">
                    {t("万亿", "T")}
                  </span>
                </p>
                <p className="mt-1 flex flex-wrap justify-center gap-x-1 text-[10px] font-medium text-down">
                  <span>
                    {t(
                      `${snapshot.capChangeBillions * 10}亿`,
                      `${snapshot.capChangeBillions}B`,
                    )}
                  </span>
                  <span>{snapshot.capChangePercent.toFixed(2)}%</span>
                </p>
              </div>
              <button
                onClick={() => onOpenTrade("BTC/USD")}
                className="group min-w-0 rounded-xl border border-line bg-surface-2/70 px-1.5 py-3 text-center hover:border-line-2 hover:bg-surface-2 transition-colors"
                aria-label={t("查看 BTC 合约行情", "Open BTC perpetual market")}
              >
                <span className="block text-[12px] text-ink-2">BTC</span>
                <span
                  className={`block mt-1.5 text-[clamp(14px,4vw,20px)] font-semibold tracking-tight ${(btc?.changePercent24h ?? 0) >= 0 ? "text-up" : "text-down"}`}
                >
                  {btc
                    ? `$${Math.round(btc.price).toLocaleString("en-US")}`
                    : "—"}
                </span>
                <span
                  className={`block mt-1 text-[10px] font-medium ${(btc?.changePercent24h ?? 0) >= 0 ? "text-up" : "text-down"}`}
                >
                  {btc
                    ? `${btc.changePercent24h >= 0 ? "+" : ""}${btc.changePercent24h.toFixed(2)}%`
                    : "—"}
                  <span className="ml-1.5">{t("交易", "Trade")}</span>
                </span>
              </button>
              <div className="min-w-0 rounded-xl border border-line bg-surface-2/70 px-1.5 py-3 text-center">
                <p className="text-[12px] text-ink-2">
                  {t("USDT 场外", "USDT OTC")}
                </p>
                <p
                  className="mt-1.5 text-[clamp(14px,4vw,20px)] font-semibold tracking-tight text-down"
                  title="CNY"
                >
                  {snapshot.otcCny.toFixed(2)}
                </p>
                <p className="mt-1 text-[10px] text-ink-3">
                  {t("溢价", "Premium")}{" "}
                  <span className="text-ink-2 font-medium">
                    {snapshot.otcPremium.toFixed(2)}%
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/70 p-3">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-ink-2 font-medium">
                  {t("全市场总市值 7D 趋势图", "Total market cap · 7D")}
                </span>
                <span className="text-up font-semibold shrink-0">
                  BTC.D {snapshot.btcDominance}%
                </span>
              </div>
              <svg
                viewBox="0 0 100 80"
                preserveAspectRatio="none"
                className="w-full h-[96px] mt-3 text-brand"
                role="img"
                aria-label={t(
                  "近七日模拟总市值走势，当前 2.83 万亿美元",
                  "Illustrative seven-day market cap trend, currently $2.83 trillion",
                )}
              >
                <defs>
                  <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0"
                      stopColor="currentColor"
                      stopOpacity="0.18"
                    />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,80 ${points} 100,80`}
                  fill={`url(#${chartId})`}
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-ink-3">
                <span>
                  {t("24H 成交额", "24H volume")}{" "}
                  <b className="font-medium text-ink-2">
                    $
                    {t(
                      (snapshot.volumeBillions * 10).toLocaleString("en-US", {
                        maximumFractionDigits: 1,
                      }) + "亿",
                      snapshot.volumeBillions + "B",
                    )}
                  </b>
                </span>
                <span>
                  DeFi TVL{" "}
                  <b className="font-medium text-ink-2">
                    $
                    {t(
                      (snapshot.defiTvlBillions * 10).toFixed(1) + "亿",
                      snapshot.defiTvlBillions + "B",
                    )}
                  </b>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id={panelId("sentiment")}
          className={cardClass}
          aria-labelledby={`${gaugeId}-title`}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <h2 id={`${gaugeId}-title`} className="ui-card-title !text-[14px]">
              <Gauge className="w-4 h-4 text-up shrink-0" />
              {t("综合多空比", "Long / short ratio")} (
              {snapshot.longShortRatio.toFixed(2)})
            </h2>
          </div>
          <div className="p-4 flex flex-col flex-1 gap-4">
            <div className="grid grid-cols-2 items-center gap-3 flex-1">
              <div className="min-w-0">
                <svg
                  viewBox="0 0 200 110"
                  className="w-full max-w-[210px] mx-auto"
                  role="img"
                  aria-label={t(
                    `多方占比 ${longPercent.toFixed(2)}%`,
                    `Long share ${longPercent.toFixed(2)}%`,
                  )}
                >
                  <defs>
                    <linearGradient id={gaugeId}>
                      <stop offset="0" stopColor="var(--ui-down)" />
                      <stop offset="0.5" stopColor="var(--ui-warn)" />
                      <stop offset="1" stopColor="var(--ui-up)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M22 86 A78 78 0 0 1 178 86"
                    fill="none"
                    stroke={`url(#${gaugeId})`}
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M38 86 A62 62 0 0 1 162 86"
                    fill="none"
                    stroke="var(--ui-line)"
                    strokeWidth="1"
                    strokeDasharray="1 8"
                  />
                  <path
                    d={`M95 86 L${needleX} ${needleY} L105 86 Z`}
                    fill="var(--ui-up)"
                  />
                  <circle cx="100" cy="86" r="6" fill="var(--ui-up)" />
                  <text x="18" y="107" fontSize="12" fill="var(--ui-ink-3)">
                    {t("看空", "Short")}
                  </text>
                  <text
                    x="182"
                    y="107"
                    fontSize="12"
                    textAnchor="end"
                    fill="var(--ui-ink-3)"
                  >
                    {t("看多", "Long")}
                  </text>
                </svg>
                <div className="mx-auto max-w-[190px] mt-2 flex items-center justify-center gap-1 text-[10px] text-ink-3">
                  <span>{t("低迷", "Quiet")}</span>
                  <span
                    className="flex flex-1 min-w-0 justify-center gap-0.5"
                    aria-label={t(
                      "市场活跃度 7 / 12",
                      "Market activity 7 / 12",
                    )}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className={`flex-1 max-w-1.5 h-3 rounded-sm ${i < snapshot.activity ? "bg-amber-500/80" : "bg-surface-3"}`}
                      />
                    ))}
                  </span>
                  <span>{t("活跃", "Active")}</span>
                </div>
              </div>
              <div className="rounded-xl border border-up/15 bg-up-soft px-3 py-3.5">
                <p className="flex flex-wrap items-baseline gap-x-1 mb-2 text-[15px] font-semibold text-up">
                  {t("多方主导", "Longs lead")}
                  <span>{longPercent.toFixed(2)}%</span>
                </p>
                {snapshot.exchanges.map((exchange) => (
                  <div
                    key={exchange.name}
                    className="flex flex-wrap items-baseline gap-x-1 text-[11px] leading-6"
                  >
                    <span className="text-ink-2">
                      {exchange.name === "Binance"
                        ? t("币安", "Binance")
                        : exchange.name}{" "}
                      -BTC
                    </span>
                    <span className="text-ink-3">{t("多空比：", "L/S:")}</span>
                    <b className="font-semibold text-ink">
                      {exchange.ratio.toFixed(2)}
                    </b>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SENTIMENT_IDEAS.map((idea) => (
                <button
                  key={idea.symbol}
                  onClick={() => onDiagnose(idea.symbol)}
                  className="group rounded-xl border border-line bg-surface-2/70 p-3 text-left min-w-0 hover:bg-surface hover:border-line-2 transition-colors"
                >
                  <span className="flex flex-wrap items-center justify-between gap-1">
                    <b className="text-[14px] font-semibold text-ink group-hover:text-brand">
                      {idea.label}
                    </b>
                    <span className="ui-badge ui-badge-up !text-[10px]">
                      {t("AI 看涨", "AI bullish")}
                    </span>
                  </span>
                  <span className="block mt-1.5 text-[12px] leading-5 text-ink-2 line-clamp-2">
                    {t(idea.zh, idea.en)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          id={panelId("chain")}
          className={cardClass}
          aria-labelledby={`chain-title-${uid}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4">
            <h2
              id={`chain-title-${uid}`}
              className="ui-card-title !text-[14px]"
            >
              <Flame className="w-4 h-4 text-down fill-current shrink-0" />
              {t("市场热度 & 链上监控", "Market & on-chain activity")}
            </h2>
            <div
              className="ui-seg self-start"
              aria-label={t("选择区块链", "Select blockchain")}
            >
              {CHAIN_ACTIVITY.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={chainId === c.id}
                  onClick={() => setChainId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div
              className="rounded-xl border border-line bg-surface-2/70 p-3"
              aria-live="polite"
            >
              <div className="flex gap-3 items-center">
                <div
                  className="relative h-11 w-1.5 shrink-0 rounded-full bg-gradient-to-t from-up via-amber-400 to-down"
                  aria-hidden="true"
                >
                  <span
                    className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-surface border-2 border-up rounded-full transition-all"
                    style={{ bottom: `${chain.activity}%` }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                    {chain.activity < 30 ? (
                      <CloudDrizzle className="w-4 h-4 text-brand" />
                    ) : (
                      <Activity className="w-4 h-4 text-up" />
                    )}
                    {t(chain.statusZh, chain.statusEn)}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-ink-3">
                    {t(chain.descZh, chain.descEn)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="flex items-center justify-end gap-1 text-[13px] font-semibold text-up"
                    title={t(chain.feeZh, chain.feeEn)}
                  >
                    <Fuel className="w-3.5 h-3.5" />
                    {chain.fee}{" "}
                    <span className="text-[10px]">{chain.unit}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-ink-3">
                    DEX 24H: {chain.volume}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <h3 className="text-[12px] font-semibold text-ink-2">
                {t("市场热度飙升榜", "Trending stories")}
              </h3>
              <span className="text-[10px] text-ink-3">
                {t("24H 热度增幅", "24H attention change")}
              </span>
            </div>
            <ol className="-mx-1.5">
              {MARKET_HEAT_NEWS.map((item, idx) => (
                <li key={item.id}>
                  <button
                    onClick={() => onOpenNews(item.id)}
                    title={t(item.zh, item.en)}
                    className="group flex items-center gap-2 w-full px-1.5 py-2 text-left rounded-md hover:bg-surface-2 transition-colors"
                  >
                    <span
                      className={`w-3 shrink-0 text-[12px] font-semibold ${idx === 0 ? "text-down" : "text-ink-3"}`}
                    >
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-[12px] text-ink-2 group-hover:text-brand">
                      {t(item.zh, item.en)}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-up">
                      +{item.growth.toFixed(2)}%
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
