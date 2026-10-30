import React, { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  Play,
  Radio,
  ScanLine,
  Search,
  Sparkles,
} from "lucide-react";
import {
  DIVIDEND_DATA,
  ECONOMIC_CALENDAR_DATA,
  Instrument,
} from "../data/marketData";
import { AssetLogo } from "./AssetLogo";
import { ARTICLES, FLASH_ITEMS } from "./newsContent";
import { EditorialArt } from "./NewsViews";
import type { ResearchTab } from "./ResearchViews";
import {
  AI_INSIGHTS,
  HEATMAP_FACTOR,
  HEATMAP_PREVIEW_TILES,
  HOT_TOPICS,
  HOT_WORDS,
  HeatmapTimeframe,
  MARKET_OPPORTUNITIES,
  MULTI_ASSET_HIGHLIGHTS,
} from "./insightsData";
import type { AccountSummary, MarketKind } from "./demoTrading";
import { useMinWidth } from "./marketModel";
import { HomeMarketOverview } from "./HomeMarketOverview";
import { LiveBanner } from "./live/LiveShared";
import type { LiveStore } from "./live/useLive";

type Lang = "zh" | "en";

type HomeProps = {
  instruments: Instrument[];
  lang: Lang;
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (tab: any) => void;
  onResearch: (tab: ResearchTab) => void;
  onOpenTrade: (symbol: string) => void;
  /** Live demo-account summaries for the CFD / perpetual desks */
  demo: Record<MarketKind, AccountSummary>;
  live: LiveStore;
};

type MarketTab = "list" | "focus" | "heatmap" | "highlights";
type InsightTab = "ai" | "opportunities" | "topics";
type HotTab = "gainers" | "losers" | "volume";
type NewsTab = "flash" | "headlines";
type AgendaTab = "economic" | "dividend";

const CATEGORIES = [
  ["all", "全部", "All"],
  ["stocks", "美股", "Stocks"],
  ["indices", "指数", "Indices"],
  ["forex", "外汇", "Forex"],
  ["commodities", "商品", "Commodities"],
  ["crypto", "加密", "Crypto"],
] as const;

const FOCUS_SYMBOLS = [
  "XAU/USD",
  "NVDA",
  "BTC/USD",
  "EUR/USD",
  "TSLA",
  "ETH/USD",
  "SOL/USD",
  "USD/JPY",
];

const VOLUME_MULT: Record<string, number> = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
};
const volumeNum = (s: string) => {
  const m = /^([\d.]+)\s*([KMBT])?$/.exec(s.trim());
  return m ? Number(m[1]) * (VOLUME_MULT[m[2] ?? ""] ?? 1) : 0;
};

const fmtPrice = (n: number, decimals: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const tone = (n: number) => (n >= 0 ? "text-up" : "text-down");
const stripIndex = (s: string) => s.replace(/^\d+\.\s*/, "");

const heatTileBg = (change: number) => {
  const a = Math.abs(change);
  if (change >= 0)
    return a > 5
      ? "bg-emerald-600"
      : a > 1.5
        ? "bg-emerald-500"
        : "bg-emerald-400";
  return a > 5 ? "bg-rose-700" : a > 1.5 ? "bg-rose-600" : "bg-rose-500";
};

const WORD_STYLE: Record<number, string> = {
  3: "text-[22px] font-bold text-brand",
  2: "text-[17px] font-semibold text-ink",
  1: "text-[14px] font-medium text-ink-2",
};

/** From this width up the market list paginates; below it the rows scroll in a fixed-height box */
const PAGER_MIN_WIDTH = 640;
const PAGE_SIZE = { cards: 4, list: 10 };

/** Deterministic mini trend line, seeded by symbol so it stays stable between ticks */
function Sparkline({
  seed,
  up,
  className = "",
}: {
  seed: string;
  up: boolean;
  className?: string;
}) {
  const gradientId = `spk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const line = useMemo(() => {
    let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    let walk = 0;
    const pts: string[] = [];
    for (let k = 0; k < 24; k++) {
      // bounded noise around a trend that always matches the day's direction
      walk = (walk + (rnd() - 0.5) * 0.22) * 0.8;
      const trend = up ? 0.22 + 0.56 * (k / 23) : 0.78 - 0.56 * (k / 23);
      const v = Math.min(0.94, Math.max(0.06, trend + walk));
      pts.push(`${((k / 23) * 100).toFixed(1)} ${((1 - v) * 32).toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
  }, [seed, up]);
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100 32 L0 32 Z`} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function TabCard<T extends string>({
  tabs,
  value,
  onChange,
  actions,
  className = "",
  children,
}: {
  tabs: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`ui-card overflow-hidden flex flex-col ${className}`}>
      <div className="ui-card-head shrink-0">
        <div role="tablist" className="ui-tabs ui-tabs-lg self-stretch">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={value === t.id}
              onClick={() => onChange(t.id)}
              className="ui-tab"
            >
              {t.label}
            </button>
          ))}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      <div
        role="tabpanel"
        key={value}
        className="ui-fade-in flex flex-col flex-1 min-h-0"
      >
        {children}
      </div>
    </section>
  );
}

export function HomeDashboard({
  instruments,
  lang,
  onSelectSymbol,
  onNavigate,
  onResearch,
  onOpenTrade,
  demo,
  live,
}: HomeProps) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const diagnose = (symbol: string) => {
    onSelectSymbol(symbol);
    onResearch("diagnosis");
  };
  const bySymbol = (symbol: string) =>
    instruments.find((i) => i.symbol === symbol);

  const [marketTab, setMarketTab] = useState<MarketTab>("list");
  const [insightTab, setInsightTab] = useState<InsightTab>("ai");
  const [hotTab, setHotTab] = useState<HotTab>("gainers");
  const [newsTab, setNewsTab] = useState<NewsTab>("flash");
  const [agendaTab, setAgendaTab] = useState<AgendaTab>("economic");

  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"default" | "down" | "up">("default");
  const [marketView, setMarketView] = useState<"cards" | "list">("cards");
  const [page, setPage] = useState(0);
  const paged = useMinWidth(PAGER_MIN_WIDTH);
  useEffect(() => setPage(0), [category, query, sort, paged]);

  const [heatTf, setHeatTf] = useState<HeatmapTimeframe>("24H");
  const [hotTf, setHotTf] = useState<"1H" | "24H">("24H");

  const rows = instruments
    .filter(
      (i) =>
        (category === "all" || i.category === category) &&
        `${i.symbol}${i.nameZh}${i.nameEn}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "default"
        ? 0
        : sort === "down"
          ? b.changePercent24h - a.changePercent24h
          : a.changePercent24h - b.changePercent24h,
    );

  const pageSize = marketView === "cards" ? PAGE_SIZE.cards : PAGE_SIZE.list;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = paged
    ? rows.slice(page * pageSize, page * pageSize + pageSize)
    : rows;
  const hotRows = useMemo(
    () =>
      [...instruments]
        .sort((a, b) =>
          hotTab === "volume"
            ? volumeNum(b.volume24h) - volumeNum(a.volume24h)
            : hotTab === "losers"
              ? a.changePercent24h - b.changePercent24h
              : b.changePercent24h - a.changePercent24h,
        )
        .slice(0, 8),
    [instruments, hotTab],
  );
  const pageWindow = useMemo(() => {
    const span = Math.min(5, pages);
    const start = Math.max(0, Math.min(page - 2, pages - span));
    return Array.from({ length: span }, (_, k) => start + k);
  }, [page, pages]);

  const openFlash = (id: string) => {
    onNavigate("flash");
    window.history.replaceState(null, "", `#flash/${id}`);
  };
  const openArticle = (id: string) => {
    onNavigate("headlines");
    window.history.replaceState(null, "", `#headlines/${id}`);
  };

  const flashes = FLASH_ITEMS.filter((i) =>
    i.categories.includes("精选"),
  ).slice(0, 4);
  const demoEquity = demo.cfd.equity + demo.perp.equity;
  const demoPnl = demo.cfd.unrealized + demo.perp.unrealized;
  const upcomingDividends = DIVIDEND_DATA.filter(
    (d) => d.status === "upcoming",
  ).slice(0, 4);

  const viewAll = (onClick: () => void, label = t("查看全部", "View all")) => (
    <button onClick={onClick} className="ui-link">
      {label}
      <ChevronRight className="w-3.5 h-3.5" />
    </button>
  );

  /* ---------------- 行情中心 panels ---------------- */

  const marketList = (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-line shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-w-0 grow shrink basis-[340px]">
          {CATEGORIES.map(([id, zh, en]) => (
            <button
              key={id}
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              className="ui-chip h-[26px] px-2.5 text-[11px]"
            >
              {lang === "zh" ? zh : en}
              <span className="text-[10px] opacity-60 tabular-nums">
                {id === "all"
                  ? instruments.length
                  : instruments.filter((i) => i.category === id).length}
              </span>
            </button>
          ))}
        </div>
        <label className="ui-input w-full sm:w-44 xl:w-56 shrink-0">
          <Search className="w-4 h-4 shrink-0" />
          <input
            aria-label={t("搜索首页市场", "Search markets")}
            placeholder={t("名称 / 代码", "Name / symbol")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-line bg-surface-2/50 shrink-0">
        <span className="text-[11px] text-ink-3">
          {t("多资产行情 · 模拟报价", "Multi-asset markets · demo quotes")}
        </span>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() =>
              setSort((v) =>
                v === "default" ? "down" : v === "down" ? "up" : "default",
              )
            }
            className="inline-flex items-center gap-1 text-[11px] text-ink-2 hover:text-brand"
          >
            {sort === "up" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {sort === "default"
              ? t("默认排序", "Default order")
              : sort === "down"
                ? t("涨幅优先", "Gainers first")
                : t("跌幅优先", "Losers first")}
          </button>
          <div
            className="ui-seg"
            aria-label={t("行情显示方式", "Market display")}
          >
            <button
              aria-pressed={marketView === "cards"}
              onClick={() => setMarketView("cards")}
              className="!flex items-center gap-1"
            >
              <Grid2X2 className="w-3 h-3" />
              {t("卡片", "Cards")}
            </button>
            <button
              aria-pressed={marketView === "list"}
              onClick={() => setMarketView("list")}
              className="!flex items-center gap-1"
            >
              <List className="w-3 h-3" />
              {t("列表", "List")}
            </button>
          </div>
        </div>
      </div>
      {marketView === "cards" ? (
        <div
          className="grid grid-cols-2 gap-2.5 p-2.5 sm:gap-3 sm:p-3 flex-1 min-h-0 max-h-[400px] sm:max-h-none overflow-y-auto overscroll-y-contain"
          aria-label={t("品种行情卡片", "Instrument quote cards")}
        >
          {shown.map((i) => (
            <button
              key={i.symbol}
              onClick={() => onOpenTrade(i.symbol)}
              aria-label={t(
                `查看 ${i.symbol} ${i.category === "crypto" ? "合约" : "CFD"}行情`,
                `Open ${i.symbol} ${i.category === "crypto" ? "perpetual" : "CFD"} market`,
              )}
              className="group rounded-xl border border-line p-3 text-left min-w-0 bg-surface hover:border-line-2 hover:bg-surface-2/50 transition-colors sm:p-3.5"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0">
                  <AssetLogo
                    symbol={i.symbol}
                    category={i.category}
                    logoUrl={i.logoUrl}
                    baseFlag={i.baseFlag}
                    quoteFlag={i.quoteFlag}
                    size="sm"
                  />
                  <b className="truncate text-[13px] font-semibold text-ink group-hover:text-brand">
                    {i.symbol}
                  </b>
                  <span className="ui-badge !h-4 !text-[10px]">
                    {i.leverage}×
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[12px] font-semibold ${tone(i.changePercent24h)}`}
                >
                  {fmtPct(i.changePercent24h)}
                </span>
              </span>
              <span className="block mt-1 truncate text-[11px] text-ink-3">
                {lang === "zh" ? i.nameZh : i.nameEn}
              </span>
              <span className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-[17px] leading-6 font-semibold tracking-tight text-ink sm:text-[19px]">
                  {fmtPrice(i.price, i.decimals)}
                </span>
                <span className={`text-[11px] ${tone(i.change24h)}`}>
                  {i.change24h >= 0 ? "+" : ""}
                  {fmtPrice(i.change24h, i.decimals)}
                </span>
              </span>
              <Sparkline
                seed={i.symbol}
                up={i.changePercent24h >= 0}
                className={`w-full h-10 mt-3 ${tone(i.changePercent24h)}`}
              />
              <span className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-line text-[10px] text-ink-3">
                <span>
                  24H Vol{" "}
                  <b className="ml-1 text-ink-2 font-medium">{i.volume24h}</b>
                </span>
                <span>
                  {t("多头", "Long")}{" "}
                  <b className="text-up font-medium">{i.longRatio}%</b>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-auto flex-1 min-h-0 max-h-[400px] sm:max-h-none">
          <table className="ui-table">
            <thead>
              <tr>
                <th>{t("名称", "Name")}</th>
                <th>{t("最新价", "Price")}</th>
                <th>
                  <button
                    onClick={() =>
                      setSort((v) => (v === "down" ? "up" : "down"))
                    }
                    className="inline-flex items-center gap-1 hover:text-ink transition-colors"
                  >
                    {t("24H 涨跌幅", "24H Change")}
                    {sort === "down" ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUp className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="hidden md:table-cell">
                  {t("24H 最高 / 最低", "24H High / Low")}
                </th>
                <th className="hidden sm:table-cell">
                  {t("24H 成交量", "24H Volume")}
                </th>
                <th className="hidden lg:table-cell">
                  {t("多头占比", "Long ratio")}
                </th>
                <th className="hidden sm:table-cell">
                  {t("研究", "Research")}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr
                  key={i.symbol}
                  className="cursor-pointer"
                  onClick={() => diagnose(i.symbol)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <AssetLogo
                        symbol={i.symbol}
                        category={i.category}
                        logoUrl={i.logoUrl}
                        baseFlag={i.baseFlag}
                        quoteFlag={i.quoteFlag}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">
                          {i.symbol}
                        </div>
                        <div className="text-[12px] text-ink-3 truncate max-w-[104px] sm:max-w-[200px]">
                          {lang === "zh" ? i.nameZh : i.nameEn}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="font-medium text-ink">
                    {fmtPrice(i.price, i.decimals)}
                  </td>
                  <td>
                    <span
                      className={`inline-flex justify-end min-w-[70px] px-2 py-1 rounded-md text-[12px] font-semibold ${
                        i.changePercent24h >= 0
                          ? "bg-up-soft text-up"
                          : "bg-down-soft text-down"
                      }`}
                    >
                      {fmtPct(i.changePercent24h)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-[12px] text-ink-2">
                    {fmtPrice(i.high24h, i.decimals)}
                    <span className="text-ink-3"> / </span>
                    {fmtPrice(i.low24h, i.decimals)}
                  </td>
                  <td className="hidden sm:table-cell text-ink-2">
                    {i.volume24h}
                  </td>
                  <td className="hidden lg:table-cell">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-14 h-1 rounded-full bg-down/25 overflow-hidden">
                        <span
                          className="block h-full bg-up rounded-full"
                          style={{ width: `${i.longRatio}%` }}
                        />
                      </span>
                      <span className="w-8 text-[12px] font-medium text-up">
                        {i.longRatio}%
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        diagnose(i.symbol);
                      }}
                      className="inline-flex items-center gap-0.5 text-[12px] font-medium text-brand hover:underline"
                    >
                      {t("诊股", "Diagnose")}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!rows.length && (
        <div className="ui-empty shrink-0">
          {t("未找到相关品种", "No matching instruments")}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 h-12 px-4 border-t border-line text-[12px] text-ink-3 shrink-0">
        <span className="tabular-nums">
          {paged
            ? t(
                `共 ${rows.length} 个品种 · 第 ${page + 1} / ${pages} 页`,
                `${rows.length} assets · page ${page + 1} of ${pages}`,
              )
            : t(
                `共 ${rows.length} 个品种 · 上下滑动查看`,
                `${rows.length} assets · scroll to browse`,
              )}
        </span>
        {paged && pages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              aria-label={t("上一页", "Previous page")}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="ui-btn ui-btn-soft h-7 w-7 px-0 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="ui-seg" aria-label={t("分页", "Pages")}>
              {pageWindow.map((n) => (
                <button
                  key={n}
                  aria-pressed={n === page}
                  onClick={() => setPage(n)}
                >
                  {n + 1}
                </button>
              ))}
            </div>
            <button
              aria-label={t("下一页", "Next page")}
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              className="ui-btn ui-btn-soft h-7 w-7 px-0 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  const focusGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 flex-1 min-h-0 max-h-[400px] sm:max-h-none overflow-y-auto overscroll-y-contain">
      {FOCUS_SYMBOLS.map((symbol) => {
        const i = bySymbol(symbol);
        if (!i) return null;
        const pos = Math.max(
          0,
          Math.min(100, ((i.price - i.low24h) / (i.high24h - i.low24h)) * 100),
        );
        return (
          <button
            key={symbol}
            onClick={() => diagnose(symbol)}
            className="group text-left rounded-xl border border-line bg-surface-2/60 p-4 hover:bg-surface hover:border-line-2 hover:shadow-[var(--ui-shadow-hover)] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <AssetLogo {...i} size="md" />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink">
                  {symbol}
                </div>
                <div className="text-[12px] text-ink-3 truncate">
                  {lang === "zh" ? i.nameZh : i.nameEn}
                </div>
              </div>
              <ArrowUpRight className="ml-auto w-4 h-4 text-ink-3 group-hover:text-brand transition-colors shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-4">
              <span className="text-[20px] leading-7 font-semibold tracking-tight text-ink">
                {fmtPrice(i.price, i.decimals)}
              </span>
              <span
                className={`text-[13px] font-semibold ${tone(i.changePercent24h)}`}
              >
                {fmtPct(i.changePercent24h)}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink-2 truncate">
              {lang === "zh"
                ? i.hotTagZh || "全球市场重点观察"
                : i.hotTagEn || "Global market focus"}
            </p>
            <div className="mt-4 flex justify-between text-[11px] text-ink-3">
              <span>
                {t("低", "L")} {fmtPrice(i.low24h, i.decimals)}
              </span>
              <span>
                {t("高", "H")} {fmtPrice(i.high24h, i.decimals)}
              </span>
            </div>
            <div className="relative h-1 mt-1.5 rounded-full bg-gradient-to-r from-down/40 via-line-2 to-up/40">
              <span
                className="absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface border-2 border-brand"
                style={{ left: `${pos}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[12px]">
              <span className="text-ink-3">
                {t("24H 成交量", "24H Volume")}
              </span>
              <span className="font-semibold text-ink">{i.volume24h}</span>
            </div>
          </button>
        );
      })}
    </div>
  );

  const heatmapPreview = (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line shrink-0">
        <div className="ui-seg">
          {(["5Min", "1H", "4H", "24H"] as const).map((tf) => (
            <button
              key={tf}
              aria-pressed={heatTf === tf}
              onClick={() => setHeatTf(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
        {viewAll(
          () => onResearch("heatmap"),
          t("全市场云图", "Full market cloud"),
        )}
      </div>
      <div className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
        <div className="grid grid-cols-12 grid-rows-6 gap-1.5 h-[260px] sm:h-[300px]">
          {HEATMAP_PREVIEW_TILES.map(([symbol, label, layout]) => {
            const change =
              (bySymbol(symbol)?.changePercent24h ?? 0) *
              HEATMAP_FACTOR[heatTf];
            return (
              <button
                key={symbol}
                onClick={() => diagnose(symbol)}
                className={`${layout} ${heatTileBg(change)} rounded-lg text-white flex flex-col items-center justify-center min-w-0 p-1 hover:brightness-110 transition`}
              >
                <span className="text-[14px] sm:text-[16px] font-semibold truncate max-w-full">
                  {label}
                </span>
                <span className="text-[12px] opacity-90">{fmtPct(change)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink-3">
          {t(
            "颜色深浅代表涨跌幅度，点击色块查看诊股",
            "Shade reflects move size — click a tile to diagnose",
          )}
        </p>
      </div>
    </>
  );

  const highlightsGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 flex-1 min-h-0 max-h-[400px] sm:max-h-none overflow-y-auto overscroll-y-contain">
      {MULTI_ASSET_HIGHLIGHTS.map((card) => {
        const inst = bySymbol(card.symbol);
        return (
          <button
            key={card.symbol}
            onClick={() => diagnose(card.symbol)}
            className="text-left rounded-xl border border-line bg-surface-2/60 p-4 hover:bg-surface hover:border-line-2 hover:shadow-[var(--ui-shadow-hover)] transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <AssetLogo
                  symbol={card.symbol}
                  category={inst?.category || "crypto"}
                  logoUrl={inst?.logoUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">
                    {card.symbol}
                  </div>
                  <div className="text-[12px] text-ink-3 truncate">
                    {card.name}
                  </div>
                </div>
              </div>
              <span className="ui-badge">{card.tag}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-line text-[12px]">
              <div className="min-w-0">
                <div className="text-ink-3">{t("状态", "Status")}</div>
                <div className="mt-0.5 font-semibold text-ink truncate">
                  {card.statusZh}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-ink-3">{t("动量", "Momentum")}</div>
                <div className="mt-0.5 font-semibold text-up truncate">
                  {card.taskZh}
                </div>
              </div>
              <div className="text-right min-w-0">
                <div className="text-ink-3">{t("规模", "Volume")}</div>
                <div className="mt-0.5 font-semibold text-ink truncate">
                  {card.yieldStr}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  /* ---------------- AI 洞察 panels ---------------- */

  const aiInsights = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
      {AI_INSIGHTS.map((item) => {
        const inst = bySymbol(item.symbol);
        const bull = item.stance === "bullish";
        return (
          <button
            key={item.symbol}
            onClick={() => diagnose(item.symbol)}
            className="text-left rounded-xl border border-line p-4 hover:border-line-2 hover:bg-surface-2/70 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AssetLogo
                symbol={item.symbol}
                category={inst?.category || "stocks"}
                logoUrl={inst?.logoUrl}
                baseFlag={inst?.baseFlag}
                quoteFlag={inst?.quoteFlag}
                size="sm"
              />
              <span className="text-[13px] font-semibold text-ink">
                {item.symbol}
              </span>
              <span className="text-[12px] text-ink-2">
                $
                {(inst?.price ?? item.fallbackPrice).toFixed(
                  inst?.decimals || 2,
                )}
              </span>
              <span
                className={`text-[12px] font-semibold ${
                  item.change.startsWith("+") ? "text-up" : "text-down"
                }`}
              >
                {item.change}
              </span>
              <span
                className={`ml-auto ui-badge ${bull ? "ui-badge-up" : "ui-badge-down"}`}
              >
                {lang === "zh" ? item.stanceZh : item.stanceEn}
              </span>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.7] text-ink-2 line-clamp-2">
              {lang === "zh" ? item.descZh : item.descEn}
            </p>
          </button>
        );
      })}
    </div>
  );

  const opportunities = (
    <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-4 p-2 sm:p-3">
      {MARKET_OPPORTUNITIES.map((o, idx) => (
        <li key={o.id}>
          <button
            onClick={() => diagnose(o.symbol)}
            className="group w-full flex items-start gap-3 text-left px-2.5 py-3 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <span
              className={`w-5 h-5 mt-px shrink-0 rounded-md text-[11px] font-bold flex items-center justify-center ${
                idx < 3 ? "bg-brand text-white" : "bg-surface-3 text-ink-3"
              }`}
            >
              {o.id}
            </span>
            <span className="flex-1 min-w-0 text-[13px] leading-[1.6] text-ink group-hover:text-brand transition-colors">
              {stripIndex(lang === "zh" ? o.zh : o.en)}
            </span>
            <span className="ui-badge shrink-0 mt-px">{o.symbol}</span>
          </button>
        </li>
      ))}
    </ol>
  );

  const hotTopics = (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <span className="text-[12px] text-ink-3">
          {t("按热度排序的市场叙事", "Narratives ranked by attention")}
        </span>
        <div className="ui-seg">
          {(["1H", "24H"] as const).map((tf) => (
            <button
              key={tf}
              aria-pressed={hotTf === tf}
              onClick={() => setHotTf(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-4 p-3 sm:p-4">
        <ul className="min-w-0">
          {(hotTf === "1H"
            ? HOT_TOPICS.slice().reverse().slice(0, 4)
            : HOT_TOPICS
          ).map((topic, idx) => {
            const text = stripIndex(lang === "zh" ? topic.zh : topic.en);
            const cut = text.search(/[：:]/);
            return (
              <li key={topic.id}>
                <button
                  onClick={() => diagnose(topic.symbol)}
                  className="group w-full flex items-center gap-3 text-left px-2.5 py-2.5 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <span
                    className={`w-5 shrink-0 text-[13px] font-bold tabular-nums ${
                      idx < 3 ? "text-rose-500" : "text-ink-3"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[13px] text-ink-2 group-hover:text-ink transition-colors">
                    {cut > 0 ? (
                      <>
                        <b className="font-semibold text-ink">
                          {text.slice(0, cut)}
                        </b>
                        {text.slice(cut)}
                      </>
                    ) : (
                      text
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="rounded-xl bg-surface-2 border border-line p-4 min-h-[180px] flex flex-wrap content-center items-center justify-center gap-x-4 gap-y-2 select-none">
          {HOT_WORDS.map((w) => (
            <button
              key={w.label}
              onClick={() => diagnose(w.symbol)}
              className={`${WORD_STYLE[w.weight]} hover:text-brand transition-colors`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  /* ---------------- Sidebar ---------------- */

  const tools = [
    {
      name: t("五维诊股", "5-Factor Diagnosis"),
      desc: t("技术、资金与基本面", "Technicals, flows & fundamentals"),
      Icon: ScanLine,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      action: () => onResearch("diagnosis"),
    },
    {
      name: t("Ace智搜", "Ace Search"),
      desc: t("宏观与品种研究", "Macro & asset research"),
      Icon: Search,
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      action: () => onResearch("ace"),
    },
    {
      name: t("热门榜单", "Hot Lists"),
      desc: t("ETF、持仓与资金费率", "ETFs, OI & funding"),
      Icon: BarChart3,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      action: () => onResearch("hotlist"),
    },
    {
      name: t("全市场云图", "Market Cloud"),
      desc: t("板块涨跌与资金轮动", "Sector moves & rotation"),
      Icon: Grid2X2,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      action: () => onResearch("heatmap"),
    },
  ];

  return (
    <div className="ui-page">
      <LiveBanner store={live} lang={lang} onOpen={() => onNavigate("live")} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_480px] gap-5">
        <div className="flex flex-col gap-5 min-w-0">
          <TabCard<MarketTab>
            className="flex-1 min-h-0"
            value={marketTab}
            onChange={setMarketTab}
            tabs={[
              { id: "list", label: t("全球行情", "Global Markets") },
              { id: "focus", label: t("焦点品种", "Spotlight") },
              { id: "heatmap", label: t("行情热力图", "Heatmap") },
              { id: "highlights", label: t("异动精选", "Movers") },
            ]}
            actions={
              marketTab === "highlights"
                ? viewAll(
                    () => onResearch("hotlist"),
                    t("热门榜单", "Hot lists"),
                  )
                : marketTab === "focus"
                  ? viewAll(
                      () => onNavigate("trade"),
                      t("CFD 交易", "Trade CFD"),
                    )
                  : undefined
            }
          >
            {marketTab === "list"
              ? marketList
              : marketTab === "focus"
                ? focusGrid
                : marketTab === "heatmap"
                  ? heatmapPreview
                  : highlightsGrid}
          </TabCard>

          <TabCard<InsightTab>
            value={insightTab}
            onChange={setInsightTab}
            tabs={[
              { id: "ai", label: t("AI 解读", "AI Insights") },
              { id: "opportunities", label: t("市场机会", "Opportunities") },
              { id: "topics", label: t("今日热点", "Trending") },
            ]}
            actions={
              <button
                onClick={() => diagnose("NVDA")}
                className="ui-btn ui-btn-soft h-7 px-2.5 text-[12px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {t("进入AI诊股", "AI Diagnose")}
                </span>
              </button>
            }
          >
            {insightTab === "ai"
              ? aiInsights
              : insightTab === "opportunities"
                ? opportunities
                : hotTopics}
          </TabCard>

          {/* Phone-only: the 热门 nav entry folds into the home feed */}
          <TabCard<HotTab>
            className="lg:hidden"
            value={hotTab}
            onChange={setHotTab}
            tabs={[
              { id: "gainers", label: t("涨幅榜", "Gainers") },
              { id: "losers", label: t("跌幅榜", "Losers") },
              { id: "volume", label: t("成交额", "Turnover") },
            ]}
            actions={viewAll(
              () => onNavigate("dividends"),
              t("热门品种", "Trending"),
            )}
          >
            <ul className="divide-y divide-line">
              {hotRows.map((i, n) => (
                <li key={i.symbol}>
                  <button
                    onClick={() => onOpenTrade(i.symbol)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors"
                  >
                    <span
                      className={`w-3 shrink-0 text-[12px] font-bold tabular-nums ${
                        n < 3 ? "text-rose-500" : "text-ink-3"
                      }`}
                    >
                      {n + 1}
                    </span>
                    <AssetLogo
                      symbol={i.symbol}
                      category={i.category}
                      logoUrl={i.logoUrl}
                      baseFlag={i.baseFlag}
                      quoteFlag={i.quoteFlag}
                      size="sm"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-ink truncate">
                        {i.symbol}
                      </span>
                      <span className="block text-[11px] text-ink-3 truncate">
                        {lang === "zh" ? i.nameZh : i.nameEn}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[13px] font-medium text-ink tabular-nums">
                        {fmtPrice(i.price, i.decimals)}
                      </span>
                      <span
                        className={`block text-[11px] font-semibold tabular-nums ${tone(
                          i.changePercent24h,
                        )}`}
                      >
                        {fmtPct(i.changePercent24h)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </TabCard>
        </div>

        <HomeMarketOverview
          instruments={instruments}
          lang={lang}
          onDiagnose={diagnose}
          onOpenTrade={onOpenTrade}
          onOpenNews={openFlash}
        />
      </div>

      <aside className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[repeat(2,minmax(0,1fr))_480px] gap-5 min-w-0">
        <section className="ui-card overflow-hidden flex flex-col">
          <div className="ui-card-head">
            <h2 className="ui-card-title">
              {t("模拟交易", "Demo Trading")}
              <span className="ui-badge h-[18px] text-[10px] bg-amber-500/12 text-amber-600 dark:text-amber-400">
                DEMO
              </span>
            </h2>
            <span className="text-right leading-tight">
              <span className="block text-[11px] text-ink-3">
                {t("账户总权益", "Total equity")}
              </span>
              <span className="block text-[14px] font-semibold text-ink">
                ${fmtPrice(demoEquity, 2)}
                <span
                  className={`ml-1.5 text-[11px] font-medium ${tone(demoPnl)}`}
                >
                  {demoPnl >= 0 ? "+" : ""}
                  {fmtPrice(demoPnl, 2)}
                </span>
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 flex-1">
            {(["cfd", "perp"] as const).map((m) => (
              <button
                key={m}
                onClick={() =>
                  onOpenTrade(m === "perp" ? "BTC/USD" : "XAU/USD")
                }
                className="group text-left rounded-xl border border-line p-3 hover:border-line-2 hover:bg-surface-2 transition-colors min-w-0"
              >
                <span className="flex items-center justify-between text-[13px] font-semibold text-ink group-hover:text-brand transition-colors">
                  {m === "cfd"
                    ? t("CFD · USD 保证金", "CFD · USD margin")
                    : t("加密永续 · USDT 保证金", "Perps · USDT margin")}
                  <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-brand" />
                </span>
                <span className="block mt-1.5 text-[15px] font-semibold text-ink truncate">
                  {m === "cfd" ? "$" : ""}
                  {fmtPrice(demo[m].equity, 2)}
                  {m === "perp" && (
                    <span className="ml-1 text-[11px] font-medium text-ink-3">
                      USDT
                    </span>
                  )}
                </span>
                <span className="block mt-0.5 text-[11px] text-ink-3 truncate">
                  {demo[m].positions} {t("笔持仓", "positions")} ·{" "}
                  <span className={tone(demo[m].unrealized)}>
                    {demo[m].unrealized >= 0 ? "+" : ""}
                    {fmtPrice(demo[m].unrealized, 2)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="ui-card overflow-hidden flex flex-col">
          <div className="ui-card-head">
            <h2 className="ui-card-title">{t("研究工具", "Research Tools")}</h2>
            <span className="ui-badge ui-badge-brand">AI</span>
          </div>
          <div className="grid grid-cols-2 gap-1 p-2 flex-1">
            {tools.map(({ name, desc, Icon, color, action }) => (
              <button
                key={name}
                onClick={action}
                className="group flex items-center gap-2.5 text-left px-2 py-2.5 rounded-xl hover:bg-surface-2 transition-colors min-w-0"
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink truncate group-hover:text-brand transition-colors">
                    {name}
                  </span>
                  <span className="block mt-0.5 text-[12px] text-ink-3 truncate">
                    {desc}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <TabCard<NewsTab>
          value={newsTab}
          onChange={setNewsTab}
          tabs={[
            { id: "flash", label: t("最新快讯", "Flash") },
            { id: "headlines", label: t("今日要闻", "Headlines") },
          ]}
          actions={viewAll(() =>
            onNavigate(newsTab === "flash" ? "flash" : "headlines"),
          )}
        >
          {newsTab === "flash" ? (
            <ul className="px-4 py-2">
              {flashes.map((i) => (
                <li
                  key={i.id}
                  className="grid grid-cols-[40px_minmax(0,1fr)] gap-2"
                >
                  <time className="pt-[9px] text-[12px] text-ink-3">
                    {i.time}
                  </time>
                  <div className="relative pl-4 border-l border-line">
                    <span
                      className={`absolute -left-[4px] top-[14px] w-[7px] h-[7px] rounded-full ring-[3px] ring-surface ${
                        i.important ? "bg-brand" : "bg-line-2"
                      }`}
                    />
                    <button
                      onClick={() => openFlash(i.id)}
                      className={`block w-full text-left py-2 text-[13px] leading-[1.6] line-clamp-2 hover:text-brand transition-colors ${
                        i.important ? "font-semibold text-ink" : "text-ink"
                      }`}
                    >
                      {i.title}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <button
                onClick={() => openArticle(ARTICLES[0].id)}
                className="group block w-full text-left home-feature-art"
              >
                <EditorialArt article={ARTICLES[0]} large />
                <span className="mt-3 block text-[12px] font-medium text-brand">
                  {t("宏观观察", "Macro Watch")}
                </span>
                <h3 className="mt-1 text-[15px] leading-[1.55] font-semibold text-ink line-clamp-2 group-hover:text-brand transition-colors">
                  {ARTICLES[0].title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-[1.7] text-ink-3 line-clamp-2">
                  {ARTICLES[0].intro}
                </p>
                <span className="mt-2 block text-[12px] text-ink-3">
                  {ARTICLES[0].author} · 10-05
                </span>
              </button>
              <ul className="mt-3 border-t border-line divide-y divide-line">
                {ARTICLES.slice(1, 3).map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => openArticle(a.id)}
                      className="group w-full flex items-center gap-3 py-3 text-left"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium leading-[1.55] text-ink line-clamp-2 group-hover:text-brand transition-colors">
                          {a.title}
                        </span>
                        <span className="block mt-1 text-[12px] text-ink-3">
                          {a.author} · 10-05
                        </span>
                      </span>
                      <EditorialArt article={a} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabCard>

        <TabCard<AgendaTab>
          value={agendaTab}
          onChange={setAgendaTab}
          tabs={[
            { id: "economic", label: t("财经日历", "Economic") },
            { id: "dividend", label: t("股息日历", "Dividends") },
          ]}
          actions={
            agendaTab === "economic"
              ? viewAll(() => onNavigate("news"))
              : viewAll(
                  () => {
                    onNavigate("dividends");
                    window.history.replaceState(
                      null,
                      "",
                      "#dividends/dividends",
                    );
                  },
                  t("分红中心", "Dividend center"),
                )
          }
        >
          {agendaTab === "economic" ? (
            <ul className="px-4 divide-y divide-line">
              {ECONOMIC_CALENDAR_DATA.slice(0, 3).map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onNavigate("news")}
                    className="group w-full grid grid-cols-[40px_minmax(0,1fr)] gap-2 text-left py-2.5"
                  >
                    <span className="text-[12px] leading-5">
                      <span className="block font-semibold text-brand">
                        {e.time}
                      </span>
                      <span className="block text-ink-3">{e.currency}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="flex-1 min-w-0 text-[13px] leading-5 font-medium text-ink truncate group-hover:text-brand transition-colors">
                          {lang === "zh" ? e.eventZh : e.eventEn}
                        </span>
                        <span className="text-[12px] text-amber-500 tracking-[-1px] shrink-0">
                          {"★".repeat(e.importance)}
                          <span className="text-line-2">
                            {"★".repeat(3 - e.importance)}
                          </span>
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-x-3 text-[12px] leading-5 text-ink-3">
                        <span>
                          {t("前值", "Prev")}{" "}
                          <b className="font-medium text-ink-2">{e.previous}</b>
                        </span>
                        <span>
                          {t("预测", "Fcst")}{" "}
                          <b className="font-medium text-ink-2">{e.forecast}</b>
                        </span>
                        <span>
                          {t("公布", "Actual")}{" "}
                          <b className="font-semibold text-brand">{e.actual}</b>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <div className="px-4 pt-3 text-[12px] text-ink-3">
                {t("每股派息 / 除息日", "Dividend per share / ex-date")}
              </div>
              <ul className="px-4 divide-y divide-line">
                {upcomingDividends.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => diagnose(d.symbol)}
                      className="group w-full flex items-center gap-3 py-3 text-left"
                    >
                      <AssetLogo
                        symbol={d.symbol}
                        category="stocks"
                        logoUrl={bySymbol(d.symbol)?.logoUrl}
                        size="md"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold text-ink group-hover:text-brand transition-colors">
                          {d.symbol}
                        </span>
                        <span className="block text-[12px] text-ink-3 truncate">
                          {lang === "zh" ? d.companyZh : d.companyEn}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-[13px] font-semibold text-ink">
                          ${d.amountPerShare.toFixed(2)}
                        </span>
                        <span className="block text-[12px] text-ink-3">
                          {d.exDate}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabCard>


      </aside>
    </div>
  );
}
