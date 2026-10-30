import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Star,
  Plus,
  X,
  ChevronDown,
  ArrowUpDown,
  Bell,
  PanelLeftClose,
  PanelRightClose,
  Columns2,
  LayoutGrid,
  Square,
  Clock3,
  Activity,
  Sparkles,
} from "lucide-react";
import { Instrument } from "../data/marketData";
import { AssetLogo } from "./AssetLogo";
import { MarketChart, type PriceLine } from "./MarketChart";
import { SignatureIndicators } from "./SignatureIndicators";
import { MarketDetails, type Alert, type Strategy } from "./MarketDetails";
import { MobileTradingDesk } from "./MobileTradingDesk";
import {
  SECTORS,
  number,
  signed,
  useSavedState,
  useMinWidth,
  DEFAULT_FAVORITES,
  FAVORITES_KEY,
} from "./marketModel";
import { displaySymbol, marketOf, type MarketKind } from "./demoTrading";
import "./market.css";
import "./mobileTrading.css";

interface Props {
  /** cfd = stocks / FX / commodities / indices, perp = crypto USDT-M perpetuals */
  mode: MarketKind;
  instruments: Instrument[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  lang: "zh" | "en";
  theme: "dark" | "light";
  onOpenAiModal: () => void;
  onShowToast: (message: string) => void;
  ticket?: React.ReactNode;
  positions?: React.ReactNode;
  /** Phone-only 「直播间」 pane shown after 持仓 in the mobile view switcher */
  livePane?: React.ReactNode;
  positionCount?: number;
  onTradeSide?: (side: "buy" | "sell") => void;
  priceLines?: (symbol: string) => PriceLine[];
}
type Group = { name: string; symbols: string[] };

const CRYPTO_SECTORS = SECTORS.filter((s) =>
  ["all", "l1", "ai", "meme", "l2", "defi", "rwa", "gaming"].includes(s.id),
);
const SECTOR_NAME: Record<string, [string, string]> = {
  l1: ["公链", "Layer 1"],
  ai: ["AI", "AI"],
  meme: ["Meme", "Meme"],
  l2: ["Layer 2", "Layer 2"],
  defi: ["DeFi", "DeFi"],
  rwa: ["RWA", "RWA"],
  gaming: ["GameFi", "GameFi"],
};
const MAJORS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "DOGE/USD",
];
const DEFAULT_TABS: Record<MarketKind, string[]> = {
  cfd: ["XAU/USD", "NVDA", "EUR/USD"],
  perp: ["BTC/USD", "ETH/USD", "SOL/USD"],
};
const STATUS_SYMBOLS: Record<MarketKind, string[]> = {
  cfd: ["NAS100", "US500", "XAU/USD", "EUR/USD"],
  perp: ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD"],
};
const EIGHT_HOURS = 8 * 3600 * 1000;

export const MarketTerminal: React.FC<Props> = ({
  mode,
  instruments,
  selectedSymbol,
  onSelectSymbol,
  lang,
  onShowToast,
  onOpenAiModal,
  ticket,
  positions,
  livePane,
  positionCount = 0,
  onTradeSide,
  priceLines,
}) => {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const perp = mode === "perp";
  const isDesktop = useMinWidth(1024);
  const [mobilePicker, setMobilePicker] = useState(false);
  const [tab, setTab] = useState("favorites"),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const [favorites, setFavorites] = useSavedState(
    FAVORITES_KEY,
    DEFAULT_FAVORITES,
  );
  const [groups, setGroups] = useSavedState<Group[]>(
    "alphapulse.groups.v2",
    [],
  );
  const [alerts, setAlerts] = useSavedState<Alert[]>(
    "alphapulse.alerts.v2",
    [],
  );
  const [strategies, setStrategies] = useSavedState<Strategy[]>(
    "alphapulse.strategies.v2",
    [],
  );
  const [opened, setOpened] = useSavedState(
    `alphapulse.tabs.${mode}.v1`,
    DEFAULT_TABS[mode],
  );
  const [sort, setSort] = useState<{
    field: "name" | "price" | "change";
    asc: boolean;
  }>({ field: "name", asc: true });
  const [period, setPeriod] = useState("4H"),
    [layout, setLayout] = useState(1),
    [leftOpen, setLeftOpen] = useState(true),
    [rightOpen, setRightOpen] = useState(true);
  const [modal, setModal] = useState<"search" | "group" | null>(null),
    [newName, setNewName] = useState(""),
    [members, setMembers] = useState<string[]>([]),
    [lookup, setLookup] = useState("");
  const [anomalies, setAnomalies] = useState(false),
    [alertOpen, setAlertOpen] = useState(false),
    [pulseOpen, setPulseOpen] = useState(true),
    [clock, setClock] = useState("");
  const [mobilePane, setMobilePane] = useState<
    "list" | "chart" | "details" | "positions" | "live"
  >("chart");
  const [tradeFocus, setTradeFocus] = useState(0);
  const [template, setTemplate] = useState<{ id: number; kind: string }>();
  const selected =
    instruments.find((i) => i.symbol === selectedSymbol) ?? instruments[0];
  /** One desk now lists CFD and crypto together, so each symbol keeps its own quote suffix */
  const sym = (s: string) =>
    displaySymbol(
      s,
      marketOf(instruments.find((i) => i.symbol === s) ?? selected),
    );
  useEffect(() => {
    const matches = (rule: Alert | Strategy) => {
      const asset = instruments.find((a) => a.symbol === rule.symbol);
      return (
        asset &&
        !(rule.expiresAt && rule.expiresAt < Date.now()) &&
        (rule.direction === "above"
          ? asset.price >= rule.price
          : asset.price <= rule.price)
      );
    };
    const hit = alerts.filter((a) => !a.triggered && matches(a));
    if (hit.length) {
      setAlerts((old) =>
        old.map((a) =>
          hit.some((h) => h.id === a.id) ? { ...a, triggered: true } : a,
        ),
      );
      onShowToast(
        `${hit[0].symbol} · ${t("价格预警已触发", "Price alert triggered")}`,
      );
    }
    const triggered = strategies.filter(
      (s) => s.active && !s.triggered && matches(s),
    );
    if (triggered.length) {
      setStrategies((old) =>
        old.map((s) =>
          triggered.some((h) => h.id === s.id)
            ? { ...s, triggered: true, active: false }
            : s,
        ),
      );
      onShowToast(
        `${t("模拟策略已触发", "Demo strategy triggered")} · ${triggered[0].name}${
          triggered[0].action
            ? ` · ${
                triggered[0].action.side === "buy"
                  ? t("建议买入", "suggest buy")
                  : t("建议卖出", "suggest sell")
              } ${triggered[0].action.qty}`
            : ""
        }`,
      );
    }
  }, [instruments, alerts, strategies]);
  const choose = (symbol: string) => {
    setMobilePicker(false);
    setMobilePane("chart");
    onSelectSymbol(symbol);
    setOpened((old) => (old.includes(symbol) ? old : [...old, symbol]));
  };
  const favorite = (symbol: string) =>
    setFavorites((old) =>
      old.includes(symbol) ? old.filter((s) => s !== symbol) : [...old, symbol],
    );
  useEffect(() => {
    setOpened((old) =>
      old.includes(selectedSymbol) ? old : [...old, selectedSymbol],
    );
  }, [selectedSymbol]);
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Shanghai" }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const watchTabs: [string, string, string][] = [
    ["favorites", "自选", "Watchlist"],
    ["stocks", "美股", "Stocks"],
    ["forex", "外汇", "Forex"],
    ["commodities", "商品", "Commodities"],
    ["indices", "指数", "Indices"],
    ["crypto", "加密", "Crypto"],
  ];
  const groupFilters = groups.map((g) => [`group:${g.name}`, g.name]);
  const subFilters =
    tab === "favorites"
      ? [
          ["all", t("全部", "All")],
          ["stocks", t("美股", "Stocks")],
          ["forex", t("外汇", "Forex")],
          ["commodities", t("商品", "Commodities")],
          ["indices", t("指数", "Indices")],
          ["crypto", t("加密", "Crypto")],
          ...groupFilters,
        ]
      : tab === "crypto"
        ? [
            ["all", t("全部合约", "All")],
            ["majors", t("主流币", "Majors")],
            ["gainers", t("今日上涨", "Gainers")],
            ["losers", t("今日下跌", "Losers")],
            ...CRYPTO_SECTORS.map((s) => [s.id, t(s.name, s.en)]),
          ]
        : tab === "stocks"
          ? [
              ["all", t("全部", "All")],
              ["tech", t("科技", "Technology")],
              ["finance", t("金融", "Finance")],
              ["consumer", t("消费", "Consumer")],
            ]
          : [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return instruments
      .filter((i) => {
        if (
          q &&
          !`${i.symbol} ${sym(i.symbol)} ${i.nameZh} ${i.nameEn}`
            .toLowerCase()
            .includes(q)
        )
          return false;
        if (tab === "favorites") {
          if (filter.startsWith("group:"))
            return groups
              .find((g) => `group:${g.name}` === filter)
              ?.symbols.includes(i.symbol);
          return (
            favorites.includes(i.symbol) &&
            (filter === "all" || i.category === filter)
          );
        }
        if (tab === "crypto") {
          if (i.category !== "crypto") return false;
          return filter === "all"
            ? true
            : filter === "majors"
              ? MAJORS.includes(i.symbol)
              : filter === "gainers"
                ? i.changePercent24h > 0
                : filter === "losers"
                  ? i.changePercent24h < 0
                  : (SECTORS.find((s) => s.id === filter)?.match(i) ?? true);
        }
        if (tab === "stocks")
          return (
            i.category === "stocks" &&
            (filter === "all" ||
              (filter === "tech"
                ? ["NVDA", "AAPL", "MSFT", "GOOGL", "META"].includes(i.symbol)
                : filter === "finance"
                  ? i.symbol === "JPM"
                  : ["KO", "TSLA", "AMZN"].includes(i.symbol)))
          );
        if (tab === "forex" || tab === "commodities" || tab === "indices")
          return i.category === tab;
        return true;
      })
      .sort((a, b) => {
        const difference =
          sort.field === "name"
            ? a.symbol.localeCompare(b.symbol)
            : sort.field === "price"
              ? a.price - b.price
              : a.changePercent24h - b.changePercent24h;
        return sort.asc ? difference : -difference;
      });
  }, [instruments, tab, filter, search, sort, favorites, groups]);
  const results = instruments.filter((i) =>
    `${i.symbol} ${i.nameZh} ${i.nameEn}`
      .toLowerCase()
      .includes(lookup.toLowerCase()),
  );
  const sortBy = (field: typeof sort.field) =>
    setSort((old) => ({ field, asc: old.field === field ? !old.asc : false }));
  const chartSymbols = [
    selected.symbol,
    ...opened.filter(
      (s) => s !== selected.symbol && instruments.some((i) => i.symbol === s),
    ),
    ...instruments
      .map((i) => i.symbol)
      .filter((s) => s !== selected.symbol && !opened.includes(s)),
  ].slice(0, layout);
  const seed = [...selected.symbol].reduce((n, c) => n + c.charCodeAt(0), 0);
  const fundingRate = ((seed % 9) - 2) * 0.0025 + 0.01;
  const nextFunding = (() => {
    const left = EIGHT_HOURS - (Date.now() % EIGHT_HOURS);
    const p = (n: number) => String(Math.floor(n)).padStart(2, "0");
    return `${p(left / 3600000)}:${p((left / 60000) % 60)}:${p((left / 1000) % 60)}`;
  })();
  const statusRow = instruments.filter((i) =>
    STATUS_SYMBOLS[mode].includes(i.symbol),
  );
  const watchlist = (
    <aside
      className={`market-watchlist${pulseOpen ? "" : " is-pulse-collapsed"}`}
    >
      <div
        className="market-tabs"
        role="tablist"
        aria-label={t("行情分类", "Market categories")}
      >
        {watchTabs.map(([id, zh, en]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              setFilter("all");
              setSearch("");
            }}
          >
            {t(zh, en)}
          </button>
        ))}
      </div>
      <div
        className={`market-filters ${tab === "sectors" ? "wrap" : ""} ${subFilters.length ? "" : "is-empty"}`}
      >
        {subFilters.map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        {tab === "favorites" && (
          <button
            title={t("管理分组", "Manage group")}
            onClick={() => {
              const g = groups.find((g) => `group:${g.name}` === filter);
              setNewName(g?.name ?? "");
              setMembers(g?.symbols ?? []);
              setLookup("");
              setModal("group");
            }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>
      <div className="market-search">
        <Search size={14} />
        <input
          aria-label={t("搜索行情", "Search markets")}
          placeholder={t("搜索名称 / 代码", "Search name / symbol")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            title={t("清空搜索", "Clear search")}
            onClick={() => setSearch("")}
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div className="watchlist-heading">
        <button onClick={() => sortBy("name")}>
          {t("名称", "Name")}
          <ArrowUpDown size={10} />
        </button>
        <button onClick={() => sortBy("price")}>
          {t("最新价", "Last")}
          <ArrowUpDown size={10} />
        </button>
        <button onClick={() => sortBy("change")}>
          {t("涨跌幅", "Change")}
          <ArrowUpDown size={10} />
        </button>
      </div>
      <div className="watchlist-scroll">
        {rows.map((item) => (
          <div
            key={item.symbol}
            className={`watchlist-row ${selected.symbol === item.symbol ? "selected" : ""}`}
          >
            <button
              className={`watch-star ${favorites.includes(item.symbol) ? "saved" : ""}`}
              title={
                favorites.includes(item.symbol)
                  ? t("取消自选", "Remove from watchlist")
                  : t("加入自选", "Add to watchlist")
              }
              onClick={() => favorite(item.symbol)}
            >
              <Star
                size={12}
                fill={favorites.includes(item.symbol) ? "currentColor" : "none"}
              />
            </button>
            <button className="watch-asset" onClick={() => choose(item.symbol)}>
              <AssetLogo {...item} size="sm" />
              <span>
                <b>
                  {sym(item.symbol)}
                  {item.category === "crypto" && (
                    <em className="watch-lev">{item.leverage}x</em>
                  )}
                </b>
                <small>
                  {item.category === "crypto" && item.perpSector
                    ? `${t(...SECTOR_NAME[item.perpSector])} · `
                    : ""}
                  {t(item.nameZh, item.nameEn)
                    .replace(/永续.*$/, "")
                    .trim()}
                </small>
              </span>
            </button>
            <button className="watch-price" onClick={() => choose(item.symbol)}>
              <b>{number(item.price, item.decimals)}</b>
              <small>{item.volume24h}</small>
            </button>
            <button
              className={`watch-change ${item.changePercent24h >= 0 ? "up" : "down"}`}
              onClick={() => choose(item.symbol)}
            >
              {signed(item.changePercent24h)}%
            </button>
          </div>
        ))}
        {!rows.length && (
          <div className="market-empty">
            <Search size={22} />
            <span>
              {t(
                search ? "未找到相关标的" : "暂无自选标的",
                search ? "No matching symbols" : "No symbols yet",
              )}
            </span>
            <button
              onClick={() => {
                setLookup("");
                setModal("search");
              }}
            >
              {t("添加标的", "Add symbols")}
            </button>
          </div>
        )}
      </div>
      <div className="watchlist-add">
        <button
          onClick={() => {
            setLookup("");
            setModal("search");
          }}
        >
          <Plus size={14} />
          {t("添加自选", "Add symbols")}
        </button>
        <div className="watchlist-add-actions">
          <button
            onClick={() => {
              setMobilePane("details");
              setRightOpen(true);
              setAlertOpen(true);
            }}
          >
            <Bell size={14} />
            {t("预警", "Alerts")}
          </button>
          <button
            className="watchlist-collapse"
            aria-expanded={pulseOpen}
            aria-controls="watchlist-pulse"
            aria-label={t("折叠领涨品种", "Collapse top gainers")}
            onClick={() => setPulseOpen((v) => !v)}
          >
            <ChevronDown
              size={13}
              style={{
                transform: pulseOpen ? "rotate(180deg)" : undefined,
              }}
            />
          </button>
        </div>
      </div>
      <div className="watchlist-pulse" id="watchlist-pulse">
        <div className="section-heading">
          <b>{t("领涨品种", "Top gainers")}</b>
          <span>24H</span>
        </div>
        {[...instruments]
          .sort((a, b) => b.changePercent24h - a.changePercent24h)
          .slice(0, 3)
          .map((i, n) => (
            <button key={i.symbol} onClick={() => choose(i.symbol)}>
              <span>{n + 1}</span>
              <b>{sym(i.symbol)}</b>
              <svg viewBox="0 0 60 20" aria-hidden="true">
                <path
                  d={`M0 17L8 ${13 + n}L16 15L25 8L34 ${10 + n}L44 5L52 8L60 2`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <strong className={i.changePercent24h >= 0 ? "up" : "down"}>
                {signed(i.changePercent24h)}%
              </strong>
            </button>
          ))}
      </div>
      <div className="market-anomalies">
        <button
          className="section-title"
          onClick={() => setAnomalies(!anomalies)}
        >
          <span>
            <Activity size={13} />
            {t("市场异动", "Market activity")}
          </span>
          <ChevronDown
            size={13}
            style={{
              transform: anomalies ? "rotate(180deg)" : undefined,
            }}
          />
        </button>
        {anomalies &&
          [...instruments]
            .sort(
              (a, b) =>
                Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h),
            )
            .slice(0, 4)
            .map((i) => (
              <button
                className="anomaly-row"
                key={i.symbol}
                onClick={() => choose(i.symbol)}
              >
                <b>{sym(i.symbol)}</b>
                <span className={i.changePercent24h >= 0 ? "up" : "down"}>
                  {signed(i.changePercent24h)}%
                </span>
              </button>
            ))}
      </div>
    </aside>
  );
  return (
    <>
      <main
        className={`market-terminal is-trading mode-${mode}${isDesktop ? "" : " has-mobile-desk"}`}
      >
        {isDesktop ? (
          <>
            <nav
              className="market-mobile-nav"
              aria-label={t("交易视图", "Trading view")}
            >
              {(
                [
                  ["list", "列表", "List"],
                  ["chart", "K线", "Chart"],
                  [
                    "details",
                    ticket ? "下单" : "详情",
                    ticket ? "Trade" : "Details",
                  ],
                  ...(positions
                    ? ([["positions", "持仓", "Positions"]] as const)
                    : []),
                  ...(livePane ? ([["live", "直播间", "Live"]] as const) : []),
                ] as const
              ).map(([id, zh, en]) => (
                <button
                  key={id}
                  aria-pressed={mobilePane === id}
                  className={mobilePane === id ? "active" : ""}
                  onClick={() => {
                    setMobilePane(id);
                    if (id === "list") setLeftOpen(true);
                    if (id === "details") {
                      setRightOpen(true);
                      setTradeFocus((n) => n + 1);
                    }
                  }}
                >
                  {t(zh, en)}
                  {id === "positions" && positionCount > 0 && (
                    <em className="pane-count">{positionCount}</em>
                  )}
                </button>
              ))}
              <span>{sym(selected.symbol)}</span>
            </nav>
            <div
              className={`market-workspace mobile-${mobilePane} ${!leftOpen ? "left-hidden" : ""} ${!rightOpen ? "right-hidden" : ""}`}
            >
              {leftOpen && watchlist}
              <section
                className={`market-center ${positions ? "has-positions" : ""}`}
              >
                <div className="symbol-tabs">
                  <div className="symbol-tabs-scroll">
                    {opened
                      .filter((s) => instruments.some((i) => i.symbol === s))
                      .map((s) => {
                        const i = instruments.find((i) => i.symbol === s)!;
                        return (
                          <div
                            className={`symbol-tab ${s === selected.symbol ? "active" : ""}`}
                            key={s}
                          >
                            <button onClick={() => choose(s)}>
                              <b>{sym(s)}</b>
                              <small>
                                {number(i.price, i.decimals)}{" "}
                                <span
                                  className={
                                    i.changePercent24h >= 0 ? "up" : "down"
                                  }
                                >
                                  {signed(i.changePercent24h)}%
                                </span>
                              </small>
                            </button>
                            {opened.length > 1 && (
                              <button
                                title={`${t("关闭", "Close")} ${s}`}
                                className="close-tab"
                                onClick={() => {
                                  const next = opened.filter((v) => v !== s);
                                  setOpened(next);
                                  if (s === selected.symbol)
                                    onSelectSymbol(next[next.length - 1]);
                                }}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    <button
                      className="add-tab"
                      title={t("添加图表", "Add chart")}
                      onClick={() => {
                        setLookup("");
                        setModal("search");
                      }}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  <div className="layout-controls">
                    <button
                      title={t("切换自选列表", "Toggle watchlist")}
                      className={!leftOpen ? "active" : ""}
                      onClick={() => setLeftOpen(!leftOpen)}
                    >
                      <PanelLeftClose size={16} />
                    </button>
                    {[
                      { n: 1, Icon: Square },
                      { n: 2, Icon: Columns2 },
                      { n: 4, Icon: LayoutGrid },
                    ].map(({ n, Icon }) => (
                      <button
                        key={n}
                        title={t(`${n}图`, `${n} chart`)}
                        className={layout === n ? "active" : ""}
                        onClick={() => setLayout(n)}
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                    <button
                      title={t("切换详情面板", "Toggle details")}
                      className={!rightOpen ? "active" : ""}
                      onClick={() => setRightOpen(!rightOpen)}
                    >
                      <PanelRightClose size={16} />
                    </button>
                  </div>
                </div>
                <div className="market-quote">
                  <div className="quote-name">
                    <AssetLogo {...selected} size="md" />
                    <div>
                      <b>
                        {t(selected.nameZh, selected.nameEn)
                          .replace(/永续.*$/, "")
                          .trim()}
                      </b>
                      <small>
                        {sym(selected.symbol)}{" "}
                        <span className="asset-badge">
                          {selected.category === "crypto"
                            ? t("USDT 永续", "USDT-M Perp")
                            : selected.category === "indices"
                              ? t("指数 CFD", "Index CFD")
                              : "CFD"}
                        </span>
                      </small>
                    </div>
                    <button
                      title={t("自选", "Watchlist")}
                      className={
                        favorites.includes(selected.symbol) ? "saved" : ""
                      }
                      onClick={() => favorite(selected.symbol)}
                    >
                      <Star
                        size={16}
                        fill={
                          favorites.includes(selected.symbol)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>
                  <div
                    className={`quote-price ${selected.changePercent24h >= 0 ? "up" : "down"}`}
                  >
                    <strong>{number(selected.price, selected.decimals)}</strong>
                    <small>
                      {signed(selected.change24h, selected.decimals)} (
                      {signed(selected.changePercent24h)}%)
                    </small>
                  </div>
                  <dl>
                    {perp ? (
                      <>
                        <div>
                          <dt>{t("资金费率 / 倒计时", "Funding / next")}</dt>
                          <dd>
                            <span className={fundingRate >= 0 ? "up" : "down"}>
                              {signed(fundingRate, 4)}%
                            </span>{" "}
                            <span className="muted">{nextFunding}</span>
                          </dd>
                        </div>
                        <div>
                          <dt>{t("指数价格", "Index price")}</dt>
                          <dd>
                            {number(selected.price * 0.9998, selected.decimals)}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <dt>{t("点差", "Spread")}</dt>
                          <dd>{selected.spreadPips} pips</dd>
                        </div>
                        <div>
                          <dt>{t("最高杠杆", "Max leverage")}</dt>
                          <dd>{selected.leverage}x</dd>
                        </div>
                        <div>
                          <dt>{t("24H最高", "24H high")}</dt>
                          <dd>{number(selected.high24h, selected.decimals)}</dd>
                        </div>
                        <div>
                          <dt>{t("24H最低", "24H low")}</dt>
                          <dd>{number(selected.low24h, selected.decimals)}</dd>
                        </div>
                      </>
                    )}
                    <div>
                      <dt>{t("24H成交量", "24H volume")}</dt>
                      <dd>{selected.volume24h}</dd>
                    </div>
                  </dl>
                  <button className="quote-ai" onClick={onOpenAiModal}>
                    <Sparkles size={13} />
                    {t("AI 解读", "AI insight")}
                  </button>
                </div>
                <div className="market-context-strip">
                  <div>
                    <span>{t("日内区间", "Daily range")}</span>
                    <b>
                      {number(selected.low24h, selected.decimals)} —{" "}
                      {number(selected.high24h, selected.decimals)}
                    </b>
                    <div className="context-range">
                      <i
                        style={{
                          left: `${Math.max(0, Math.min(100, ((selected.price - selected.low24h) / (selected.high24h - selected.low24h)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span>{t("多空分布", "Positioning")}</span>
                    <b>
                      <em className="up">{selected.longRatio}%</em>
                      <em className="down">{100 - selected.longRatio}%</em>
                    </b>
                    <div className="context-ratio">
                      <i style={{ width: `${selected.longRatio}%` }} />
                    </div>
                  </div>
                  <div>
                    <span>{t("市场广度", "Market breadth")}</span>
                    <b>
                      <em className="up">
                        {instruments.filter((i) => i.changePercent24h > 0).length}{" "}
                        {t("上涨", "up")}
                      </em>
                      <em className="down">
                        {instruments.filter((i) => i.changePercent24h < 0).length}{" "}
                        {t("下跌", "down")}
                      </em>
                    </b>
                    <small>
                      {t("CFD / 永续品种", "CFD & perpetual instruments")}{" "}
                      {instruments.length}
                    </small>
                  </div>
                </div>
                <div className={`market-chart-grid grid-${layout}`}>
                  {chartSymbols.map((s, index) => (
                    <div className="market-chart-cell" key={`${layout}-${index}`}>
                      {layout > 1 && (
                        <button className="split-title" onClick={() => choose(s)}>
                          {sym(s)}
                          <span>
                            {number(
                              instruments.find((i) => i.symbol === s)!.price,
                              2,
                            )}
                          </span>
                        </button>
                      )}
                      <MarketChart
                        instrument={instruments.find((i) => i.symbol === s)!}
                        lang={lang}
                        period={period}
                        onPeriod={setPeriod}
                        compact={layout > 1}
                        onTemplateApplied={() => setTemplate(undefined)}
                        template={index === 0 ? template : undefined}
                        priceLines={priceLines?.(s)}
                      />
                    </div>
                  ))}
                </div>
                {positions}
              </section>
              {rightOpen && (
                <MarketDetails
                  tradePanel={ticket}
                  tradeFocus={tradeFocus}
                  onOpenAiModal={onOpenAiModal}
                  instrument={selected}
                  lang={lang}
                  isFavorite={favorites.includes(selected.symbol)}
                  onToggleFavorite={() => favorite(selected.symbol)}
                  onShowToast={onShowToast}
                  alertOpen={alertOpen}
                  onCloseAlert={() => setAlertOpen(false)}
                  onApplyTemplate={(kind) => {
                    setMobilePane("chart");
                    setPeriod("4H");
                    setLayout(1);
                    setTemplate({ id: Date.now(), kind });
                  }}
                />
              )}
            </div>
            {livePane && mobilePane === "live" && (
              <div className="market-live-pane open">{livePane}</div>
            )}
            <footer className="market-status">
              <span className="feed-status">
                <i />
                {t("模拟行情 · 模拟交易", "Demo feed · paper trading")}
              </span>
              <div className="status-ticker">
                {statusRow.map((i) => (
                  <button key={i.symbol} onClick={() => choose(i.symbol)}>
                    {sym(i.symbol)}
                    <span className={i.changePercent24h >= 0 ? "up" : "down"}>
                      {signed(i.changePercent24h)}%
                    </span>
                    <b>{number(i.price, i.decimals)}</b>
                  </button>
                ))}
              </div>
              <span className="market-clock">
                <Clock3 size={12} />
                UTC+8 {clock}
              </span>
            </footer>
          </>
        ) : (
          <MobileTradingDesk
            instrument={selected}
            lang={lang}
            favorite={favorites.includes(selected.symbol)}
            onFavorite={() => favorite(selected.symbol)}
            pickerOpen={mobilePicker}
            onPicker={setMobilePicker}
            watchlist={watchlist}
            ticket={ticket}
            positions={positions}
            live={livePane}
            priceLines={priceLines?.(selected.symbol)}
            onTradeSide={onTradeSide}
            onToast={onShowToast}
            onOpenAi={onOpenAiModal}
            alertOpen={alertOpen}
            onAlert={() => setAlertOpen(true)}
            onCloseAlert={() => setAlertOpen(false)}
          />
        )}
        {modal && (
          <div
            className="market-modal-backdrop"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModal(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label={
                modal === "group"
                  ? t("自选分组", "Watchlist group")
                  : t("添加标的", "Add symbols")
              }
              className="market-modal"
            >
              <div className="modal-heading">
                <h3>
                  {modal === "group"
                    ? t("自选分组", "Watchlist group")
                    : t("添加标的", "Add symbols")}
                </h3>
                <button
                  onClick={() => setModal(null)}
                  aria-label={t("关闭", "Close")}
                >
                  <X size={18} />
                </button>
              </div>
              {modal === "group" && (
                <input
                  maxLength={16}
                  aria-label={t("分组名称", "Group name")}
                  placeholder={t("分组名称", "Group name")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              )}
              <div className="market-search">
                <Search size={15} />
                <input
                  autoFocus
                  aria-label={t("查找标的", "Find symbol")}
                  placeholder={t("输入名称或代码", "Name or symbol")}
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                />
              </div>
              <div className="symbol-results">
                {results.map((i) => (
                  <div key={i.symbol}>
                    <button
                      className="result-symbol"
                      onClick={() => {
                        if (modal === "group")
                          setMembers((old) =>
                            old.includes(i.symbol)
                              ? old.filter((s) => s !== i.symbol)
                              : [...old, i.symbol],
                          );
                        else {
                          choose(i.symbol);
                          setModal(null);
                        }
                      }}
                    >
                      <AssetLogo {...i} size="sm" />
                      <span>
                        <b>{sym(i.symbol)}</b>
                        <small>{t(i.nameZh, i.nameEn)}</small>
                      </span>
                    </button>
                    {modal === "group" ? (
                      <input
                        type="checkbox"
                        aria-label={i.symbol}
                        checked={members.includes(i.symbol)}
                        onChange={(e) =>
                          setMembers((old) =>
                            e.target.checked
                              ? [...old, i.symbol]
                              : old.filter((s) => s !== i.symbol),
                          )
                        }
                      />
                    ) : (
                      <button
                        title={t("切换自选", "Toggle favorite")}
                        className={favorites.includes(i.symbol) ? "saved" : ""}
                        onClick={() => favorite(i.symbol)}
                      >
                        <Star
                          size={17}
                          fill={
                            favorites.includes(i.symbol) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    )}
                  </div>
                ))}
                {!results.length && (
                  <div className="market-empty">
                    {t("未找到相关标的", "No matching symbols")}
                  </div>
                )}
              </div>
              {modal === "group" && (
                <div className="modal-actions">
                  <button
                    disabled={!groups.some((g) => g.name === newName)}
                    onClick={() => {
                      setGroups((old) => old.filter((g) => g.name !== newName));
                      setFilter("all");
                      setModal(null);
                    }}
                  >
                    {t("删除分组", "Delete group")}
                  </button>
                  <button
                    className="primary"
                    disabled={!newName.trim()}
                    onClick={() => {
                      const name = newName.trim();
                      setGroups((old) => [
                        ...old.filter((g) => g.name !== name),
                        { name, symbols: members },
                      ]);
                      setTab("favorites");
                      setFilter(`group:${name}`);
                      setModal(null);
                    }}
                  >
                    {t("保存", "Save")}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      {isDesktop && (
        <SignatureIndicators instrument={selected} period={period} lang={lang} />
      )}
    </>
  );
};
