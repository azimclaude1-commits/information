import React, { useEffect, useMemo, useState } from "react";
import {
  ListOrdered,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  BarChart3,
  Layers,
  Bot,
  Bell,
  Star,
  Copy,
  X,
  Plus,
  RefreshCw,
  Send,
  CalendarDays,
  ChevronRight,
  Pause,
  Play,
  Trash2,
  CircleDollarSign,
} from "lucide-react";
import {
  DIVIDEND_DATA,
  ECONOMIC_CALENDAR_DATA,
  Instrument,
  NEWS_FLASH_DATA,
} from "../data/marketData";
import { number, signed, useSavedState } from "./marketModel";
import { PriceAlertSheet, StrategySheet } from "./AlertStrategySheets";

interface Props {
  onOpenAiModal: () => void;
  instrument: Instrument;
  lang: "zh" | "en";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowToast: (text: string) => void;
  alertOpen: boolean;
  onCloseAlert: () => void;
  onApplyTemplate: (kind: string) => void;
  tradePanel?: React.ReactNode;
  tradeFocus?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  embedded?: boolean;
  contentHidden?: boolean;
}
const TRADE_TAB = {
  id: "trade",
  icon: CircleDollarSign,
  zh: "模拟下单",
  en: "Demo order",
};
export type Alert = {
  id: string;
  symbol: string;
  price: number;
  direction: "above" | "below";
  triggered: boolean;
  expiresAt?: number;
  channels?: string[];
  createdAt?: number;
};
export type Strategy = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  direction: "above" | "below";
  period: string;
  active: boolean;
  triggered: boolean;
  action?: { side: "buy" | "sell"; qty: number };
  expiresAt?: number;
  createdAt?: number;
};
const RAIL = [
  { id: "book", icon: ListOrdered, zh: "盘口", en: "Order book" },
  { id: "news", icon: FileText, zh: "资讯", en: "News" },
  { id: "flow", icon: ArrowLeftRight, zh: "资金流向", en: "Capital flow" },
  { id: "analysis", icon: TrendingUp, zh: "技术分析", en: "Analysis" },
  { id: "data", icon: BarChart3, zh: "市场数据", en: "Market data" },
  { id: "etf", icon: Layers, zh: "ETF", en: "ETF" },
  { id: "agent", icon: Bot, zh: "Agent 策略", en: "Agent strategies" },
];
export function MarketDetails({
  instrument: i,
  lang,
  isFavorite,
  onToggleFavorite,
  onShowToast,
  alertOpen,
  onCloseAlert,
  onApplyTemplate,
  onOpenAiModal,
  tradePanel,
  tradeFocus,
  activeTab,
  onTabChange,
  embedded = false,
  contentHidden = false,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const rail = tradePanel ? [TRADE_TAB, ...RAIL] : RAIL;
  const [localTab, setLocalTab] = useState(tradePanel ? "trade" : "book");
  const tab = activeTab ?? localTab,
    setTab = onTabChange ?? setLocalTab;
  const [book, setBook] = useState("both"),
    [large, setLarge] = useState(false),
    [whales, setWhales] = useState(false),
    [precision, setPrecision] = useState(i.decimals);
  const [showAlert, setShowAlert] = useState(false),
    [alertPreset, setAlertPreset] = useState<number>();
  const [alerts, setAlerts] = useSavedState<Alert[]>(
    "alphapulse.alerts.v2",
    [],
  );
  const [info, setInfo] = useState(false),
    [moreNews, setMoreNews] = useState(false),
    [article, setArticle] = useState<string | null>(null),
    [range, setRange] = useState("today"),
    [flowRange, setFlowRange] = useState("24H");
  const [etfType, setEtfType] = useState("stocks"),
    [agentMode, setAgentMode] = useState("strategy"),
    [batch, setBatch] = useState(0),
    [chat, setChat] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
      [],
    ),
    [strategyDraft, setStrategyDraft] = useState<{
      name: string;
      price: number;
      direction: "above" | "below";
      template?: string;
    } | null>(null),
    [chatDraft, setChatDraft] = useState<{
      name: string;
      price: number;
      direction: "above" | "below";
    } | null>(null);
  const [strategies, setStrategies] = useSavedState<Strategy[]>(
    "alphapulse.strategies.v2",
    [],
  );
  const [analysisDetail, setAnalysisDetail] = useState<string | null>(null);
  const base = i.symbol.split("/")[0],
    crypto = i.category === "crypto";
  useEffect(() => {
    setPrecision(i.decimals);
    setMoreNews(false);
    setArticle(null);
    setMessages([]);
    setAnalysisDetail(null);
  }, [i.symbol]);
  useEffect(() => {
    if (alertOpen) {
      setShowAlert(true);
      onCloseAlert();
    }
  }, [alertOpen]);
  useEffect(() => {
    if (tradeFocus && tradePanel) setTab("trade");
  }, [tradeFocus]);
  const step = Math.max(i.price * 0.00012, 10 ** -precision),
    format = (p: number) => number(p, precision);
  const levels = (side: "buy" | "sell") =>
    Array.from({ length: whales ? 4 : 7 }, (_, n) => {
      const index = side === "sell" ? 7 - n : n + 1,
        price = Math.max(
          step,
          Math.round(
            (i.price + (side === "sell" ? 1 : -1) * step * index) / step,
          ) * step,
        ),
        quantity =
          Math.round(
            ((1700 + index * 173 + (base.charCodeAt(0) % 19) * 42) /
              Math.max(1, Math.sqrt(i.price))) *
              (whales ? 12 : 1) *
              100,
          ) / 100;
      return {
        price,
        quantity,
        total: quantity * price,
        width: 16 + ((index * 17 + base.charCodeAt(0)) % 80),
      };
    });
  const seed = [...i.symbol].reduce((n, c) => n + c.charCodeAt(0), 0),
    flowScale = ((seed % 9) + 2) * (flowRange === "7D" ? 5 : 1);
  const flows = Array.from({ length: 8 }, (_, n) => ({
    time: `${String(n * 3).padStart(2, "0")}:00`,
    buy: (5 + ((seed * (n + 3)) % 41)) * flowScale,
    sell: (3 + ((seed * (n + 5)) % 43)) * flowScale,
  }));
  const sumBuy = flows.reduce((s, r) => s + r.buy, 0),
    sumSell = flows.reduce((s, r) => s + r.sell, 0),
    net = sumBuy - sumSell;
  const news = NEWS_FLASH_DATA.filter(
    (n) =>
      n.relatedSymbol === i.symbol ||
      n.category === i.category ||
      n.category === "macro",
  );
  const visibleNews = (
    news.length ? news : NEWS_FLASH_DATA.filter((n) => n.category === "macro")
  ).slice(0, moreNews ? 8 : 2);
  const selectedArticle = NEWS_FLASH_DATA.find((n) => n.id === article);
  const strategyTemplates =
    batch % 2 === 0
      ? [
          {
            name: t("价格突破", "Price breakout"),
            desc: t(
              "价格突破指定阻力位时提醒。",
              "Alert when price breaks above resistance.",
            ),
            direction: "above" as const,
            mult: 1.02,
          },
          {
            name: t("回调观察", "Pullback watch"),
            desc: t(
              "价格回落至支撑区间时提醒。",
              "Watch for a pullback to support.",
            ),
            direction: "below" as const,
            mult: 0.98,
          },
          {
            name: t("区间上沿", "Range high"),
            desc: t(
              "跟踪日内高点附近的价格变化。",
              "Track price near the daily high.",
            ),
            direction: "above" as const,
            mult: 1.01,
          },
        ]
      : [
          {
            name: t("日内防守", "Intraday protection"),
            desc: t(
              "跌破观察价时触发风控提醒。",
              "Alert if price drops below your level.",
            ),
            direction: "below" as const,
            mult: 0.99,
          },
          {
            name: t("趋势跟踪", "Trend follow"),
            desc: t(
              "设置上行触发价，持续跟踪标的。",
              "Set an upside trigger for this symbol.",
            ),
            direction: "above" as const,
            mult: 1.03,
          },
          {
            name: t("低位观察", "Lower range"),
            desc: t(
              "关注区间下沿的交易机会。",
              "Watch the lower end of the range.",
            ),
            direction: "below" as const,
            mult: 0.97,
          },
        ];
  const openStrategy = (
    name = t("价格提醒策略", "Price alert strategy"),
    price = i.price * 1.02,
    side: "above" | "below" = "above",
    template?: string,
  ) => setStrategyDraft({ name, price, direction: side, template });
  const spark = (values: number[], color = "var(--blue)", height = 80) => {
    const lo = Math.min(...values, 0),
      hi = Math.max(...values, 1);
    return (
      <svg viewBox={`0 0 280 ${height}`} className="detail-spark">
        <line
          x1="0"
          x2="280"
          y1={height - 8 - ((0 - lo) / (hi - lo)) * (height - 16)}
          y2={height - 8 - ((0 - lo) / (hi - lo)) * (height - 16)}
          stroke="var(--line)"
          strokeDasharray="4 3"
        />
        <polyline
          points={values
            .map(
              (v, n) =>
                `${(n * 280) / (values.length - 1)},${height - 8 - ((v - lo) / (hi - lo)) * (height - 16)}`,
            )
            .join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
        />
      </svg>
    );
  };
  return (
    <aside className={`market-details${embedded ? " details-embedded" : ""}`}>
      <div className="details-content" hidden={contentHidden}>
        <div className="details-header">
          <b>
            {t(
              rail.find((r) => r.id === tab)!.zh,
              rail.find((r) => r.id === tab)!.en,
            )}
          </b>
          <span>{i.symbol}</span>
        </div>
        <div className="details-scroll">
          {tab === "trade" && tradePanel}
          {tab === "book" && (
            <>
              <section className="details-section quote-summary">
                <div className="detail-symbol">
                  <b>{i.symbol}</b>
                  <button
                    title={t("复制代码", "Copy symbol")}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(i.symbol)
                        .then(() => onShowToast(t("已复制", "Copied")))
                        .catch(() => onShowToast(t("复制失败", "Copy failed")))
                    }
                  >
                    <Copy size={12} />
                  </button>
                  <span>USD</span>
                </div>
                <div className="summary-stats">
                  <span>
                    {t("24H成交量", "24H volume")}
                    <b>{i.volume24h}</b>
                  </span>
                  <span>
                    {t("最高", "High")}
                    <b>{number(i.high24h, i.decimals)}</b>
                  </span>
                  <span>
                    {t("涨跌额", "Change")}
                    <b className={i.change24h >= 0 ? "up" : "down"}>
                      {signed(i.change24h, i.decimals)}
                    </b>
                  </span>
                  <span>
                    {t("最低", "Low")}
                    <b>{number(i.low24h, i.decimals)}</b>
                  </span>
                </div>
                <div className="detail-actions">
                  <button
                    onClick={() => {
                      setAlertPreset(i.price);
                      setShowAlert(true);
                    }}
                  >
                    <Bell size={12} />
                    {t("加预警", "Alert")}
                  </button>
                  <button
                    className={isFavorite ? "active" : ""}
                    onClick={onToggleFavorite}
                  >
                    <Star size={12} />
                    {isFavorite ? t("已自选", "Saved") : t("自选", "Watch")}
                  </button>
                  <button onClick={() => setTab("agent")}>
                    {t("策略", "Strategy")}
                  </button>
                  <button onClick={() => setInfo(true)}>
                    {t("简况", "Profile")}
                  </button>
                </div>
              </section>
              <section className="details-section orderbook">
                <div className="book-controls">
                  <div className="segmented">
                    {[
                      ["both", "买卖", "All"],
                      ["buy", "买盘", "Bids"],
                      ["sell", "卖盘", "Asks"],
                    ].map(([id, zh, en]) => (
                      <button
                        key={id}
                        className={book === id ? "active" : ""}
                        onClick={() => setBook(id)}
                      >
                        {t(zh, en)}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label={t("价格精度", "Price precision")}
                    value={precision}
                    onChange={(e) => setPrecision(+e.target.value)}
                  >
                    {Array.from(
                      { length: Math.min(3, i.decimals + 1) },
                      (_, n) => i.decimals - n,
                    ).map((n) => (
                      <option value={n} key={n}>
                        {n}
                        {t("位小数", " decimals")}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="whale-toggle">
                  <span>{t("主力挂单", "Large orders")}</span>
                  <input
                    type="checkbox"
                    checked={whales}
                    onChange={(e) => setWhales(e.target.checked)}
                  />
                </label>
                <div className="book-ratio">
                  <span>
                    {t("买盘", "Bid")} <b className="up">{i.longRatio}%</b>
                  </span>
                  <span>
                    {t("卖盘", "Ask")}{" "}
                    <b className="down">{100 - i.longRatio}%</b>
                  </span>
                </div>
                <div className="ratio-bar">
                  <i style={{ width: `${i.longRatio}%` }} />
                </div>
                <div className="book-head">
                  <span>{t("价格(USD)", "Price (USD)")}</span>
                  <span>{t("数量", "Size")}</span>
                  <span>{t("委托额", "Total")}</span>
                </div>
                {book !== "buy" &&
                  levels("sell").map((r, n) => (
                    <button
                      title={t("设置此价格预警", "Set alert at this price")}
                      className="book-row"
                      key={n}
                      onClick={() => {
                        setAlertPreset(r.price);
                        setShowAlert(true);
                      }}
                    >
                      <i
                        style={{ width: `${r.width}%` }}
                        className="ask-depth"
                      />
                      <span className="down">{format(r.price)}</span>
                      <span>{number(r.quantity, 2)}</span>
                      <span>{number(r.total / 1000, 2)}K</span>
                    </button>
                  ))}
                <div className="book-mid">
                  <strong className={i.change24h >= 0 ? "up" : "down"}>
                    {format(i.price)}
                  </strong>
                  <span className={i.change24h >= 0 ? "up" : "down"}>
                    {signed(i.changePercent24h)}%
                  </span>
                </div>
                {book !== "sell" &&
                  levels("buy").map((r, n) => (
                    <button
                      title={t("设置此价格预警", "Set alert at this price")}
                      className="book-row"
                      key={n}
                      onClick={() => {
                        setAlertPreset(r.price);
                        setShowAlert(true);
                      }}
                    >
                      <i
                        style={{ width: `${r.width}%` }}
                        className="bid-depth"
                      />
                      <span className="up">{format(r.price)}</span>
                      <span>{number(r.quantity, 2)}</span>
                      <span>{number(r.total / 1000, 2)}K</span>
                    </button>
                  ))}
              </section>
              <section className="details-section">
                <div className="section-heading">
                  <div className="segmented">
                    <button
                      className={!large ? "active" : ""}
                      onClick={() => setLarge(false)}
                    >
                      {t("最新成交", "Trades")}
                    </button>
                    <button
                      className={large ? "active" : ""}
                      onClick={() => setLarge(true)}
                    >
                      {t("大额", "Large")}
                    </button>
                  </div>
                  <span className="muted">USD</span>
                </div>
                <div className="book-head">
                  <span>{t("价格", "Price")}</span>
                  <span>{t("数量", "Size")}</span>
                  <span>{t("时间", "Time")}</span>
                </div>
                {Array.from({ length: 18 }, (_, n) => ({
                  n,
                  qty: (n % 5 === 0 ? 84 : 2 + n * 0.42) * (crypto ? 1 : 10),
                }))
                  .filter((r) => !large || r.n % 5 === 0)
                  .map(({ n, qty }) => (
                    <div className="book-row" key={n}>
                      <span className={n % 3 ? "up" : "down"}>
                        {format(i.price + ((n % 3) - 1) * step)}
                      </span>
                      <span>{number(qty, 2)}</span>
                      <span className="muted">
                        {new Date(Date.now() - n * 2400).toLocaleTimeString(
                          "en-GB",
                          { timeZone: "Asia/Shanghai" },
                        )}
                      </span>
                    </div>
                  ))}
              </section>
            </>
          )}
          {tab === "news" && (
            <>
              <section className="details-section">
                <h3>
                  {base} {t("动态", "Updates")}
                </h3>
                {visibleNews.map((n) => (
                  <article className="news-item" key={n.id}>
                    <div className="news-author">
                      <span className="author-avatar">AP</span>
                      <div>
                        <b>AlphaPulse {t("资讯", "News")}</b>
                        <small>{n.time}</small>
                      </div>
                    </div>
                    <button onClick={() => setArticle(n.id)}>
                      {t(n.titleZh, n.titleEn).replace(/【.*?】/g, "")}
                    </button>
                  </article>
                ))}
                <button
                  className="outline-button"
                  onClick={() => setMoreNews(!moreNews)}
                >
                  {moreNews ? t("收起", "Less") : t("查看更多", "More")}
                </button>
              </section>
              <section className="details-section">
                <h3>{t("快讯", "Market news")}</h3>
                {NEWS_FLASH_DATA.slice(0, moreNews ? 6 : 3).map((n) => (
                  <button
                    key={n.id}
                    className="flash-item"
                    onClick={() => setArticle(n.id)}
                  >
                    <small>{n.time}</small>
                    <b>{t(n.titleZh, n.titleEn).replace(/【.*?】/g, "")}</b>
                  </button>
                ))}
              </section>
              <section className="details-section">
                <div className="section-heading">
                  <h3>{t("大事件", "Calendar")}</h3>
                  <CalendarDays size={15} />
                </div>
                <div className="segmented">
                  {[
                    ["today", "今天", "Today"],
                    ["7d", "7天", "7 days"],
                    ["30d", "30天", "30 days"],
                  ].map(([id, zh, en]) => (
                    <button
                      key={id}
                      className={range === id ? "active" : ""}
                      onClick={() => setRange(id)}
                    >
                      {t(zh, en)}
                    </button>
                  ))}
                </div>
                {range === "today"
                  ? ECONOMIC_CALENDAR_DATA.slice(0, 3).map((e) => (
                      <div className="calendar-item" key={e.id}>
                        <small>
                          {e.time} · {e.currency}
                        </small>
                        <b>{t(e.eventZh, e.eventEn)}</b>
                        <span>
                          {t("前值", "Previous")} {e.previous} /{" "}
                          {t("预期", "Forecast")} {e.forecast}
                        </span>
                      </div>
                    ))
                  : DIVIDEND_DATA.filter(
                      (e) =>
                        e.status === "upcoming" &&
                        new Date(e.exDate).getTime() -
                          new Date("2026-10-05").getTime() <
                          (range === "7d" ? 7 : 30) * 86400000,
                    ).map((e) => (
                      <div className="calendar-item" key={e.id}>
                        <small>{e.exDate}</small>
                        <b>
                          {e.symbol} · {t("除息日", "Ex-dividend")}
                        </b>
                        <span>
                          ${e.amountPerShare} / {t("股", "share")}
                        </span>
                      </div>
                    ))}
              </section>
            </>
          )}
          {tab === "flow" && (
            <>
              <section className="details-section">
                <div className="section-heading">
                  <h3>{t("主力净流入", "Net inflow")}</h3>
                  <div className="segmented">
                    {["24H", "7D"].map((r) => (
                      <button
                        key={r}
                        className={flowRange === r ? "active" : ""}
                        onClick={() => setFlowRange(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <strong className={`big-number ${net >= 0 ? "up" : "down"}`}>
                  {signed(net)}
                  {t("万", " ×10K")}
                </strong>
                <small className="muted">USD</small>
              </section>
              <section className="details-section">
                <h3>{t("主力增减仓", "Capital activity")}</h3>
                <div className="flow-head">
                  <span>{t("时间", "Time")}</span>
                  <span>{t("流入", "Inflow")}</span>
                  <span>{t("流出", "Outflow")}</span>
                </div>
                {flows.map((r) => (
                  <div className="flow-row" key={r.time}>
                    <span>{r.time}</span>
                    <span>
                      <i
                        style={{
                          width: `${(r.buy / Math.max(sumBuy, sumSell)) * 400}%`,
                        }}
                        className="bid-depth"
                      />
                      {number(r.buy, 1)}
                    </span>
                    <span>
                      <i
                        style={{
                          width: `${(r.sell / Math.max(sumBuy, sumSell)) * 400}%`,
                        }}
                        className="ask-depth"
                      />
                      {number(r.sell, 1)}
                    </span>
                  </div>
                ))}
              </section>
              <section className="details-section">
                <h3>{t("资金流向分布", "Flow distribution")}</h3>
                <div className="flow-summary">
                  <div>
                    <small>{t("主力", "Institutional")}</small>
                    <b className={net >= 0 ? "up" : "down"}>{signed(net)}</b>
                  </div>
                  <div>
                    <small>{t("散户", "Retail")}</small>
                    <b className={net >= 0 ? "up" : "down"}>
                      {signed(net * 0.64)}
                    </b>
                  </div>
                  <div>
                    <small>{t("总净流入", "Net total")}</small>
                    <b className={net >= 0 ? "up" : "down"}>
                      {signed(net * 1.64)}
                    </b>
                  </div>
                </div>
                <div className="flow-donut">
                  <div
                    className="donut"
                    style={{
                      background: `conic-gradient(#089981 0 ${(sumBuy / (sumBuy + sumSell)) * 100}%, #f23645 0 100%)`,
                    }}
                  >
                    <span>
                      {((sumBuy / (sumBuy + sumSell)) * 100).toFixed(1)}%
                      <small>{t("流入", "Inflow")}</small>
                    </span>
                  </div>
                  <div>
                    <p>
                      <i className="dot up-dot" />
                      {t("流入", "Inflow")} <b>{number(sumBuy, 1)}</b>
                    </p>
                    <p>
                      <i className="dot down-dot" />
                      {t("流出", "Outflow")} <b>{number(sumSell, 1)}</b>
                    </p>
                    <small className="muted">
                      {t("单位：万美元", "Unit: USD 10K")}
                    </small>
                  </div>
                </div>
              </section>
              <section className="details-section">
                <h3>{t("净流入走势", "Net flow trend")}</h3>
                {spark(
                  flows.map((r) => r.buy - r.sell),
                  "#2962ff",
                  150,
                )}
                <div className="spread-labels">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>24:00</span>
                </div>
              </section>
            </>
          )}
          {tab === "analysis" && (
            <>
              <section className="details-section">
                <div className="section-heading">
                  <h3>{t("技术概览", "Technical overview")}</h3>
                  <button className="text-link" onClick={onOpenAiModal}>
                    {t("AI解读", "AI analysis")}
                    <ChevronRight size={13} />
                  </button>
                </div>
                <div className="analysis-level">
                  <span>{t("支撑位", "Support")}</span>
                  <b>{number(i.low24h, i.decimals)}</b>
                </div>
                <div className="analysis-level">
                  <span>{t("阻力位", "Resistance")}</span>
                  <b>{number(i.high24h, i.decimals)}</b>
                </div>
                <div className="analysis-level">
                  <span>{t("日内振幅", "Daily range")}</span>
                  <b>{number(((i.high24h - i.low24h) / i.price) * 100)}%</b>
                </div>
              </section>
              <section className="details-section">
                <h3>{t("图表分析", "Chart studies")}</h3>
                {[
                  { id: "channel", zh: "趋势通道", en: "Trend channel" },
                  {
                    id: "support",
                    zh: "支撑与阻力",
                    en: "Support & resistance",
                  },
                  { id: "breakout", zh: "区间突破", en: "Range breakout" },
                ].map((card, n) => (
                  <div className="analysis-card" key={card.id}>
                    <button
                      className="analysis-preview"
                      onClick={() => setAnalysisDetail(card.id)}
                    >
                      {spark(
                        Array.from(
                          { length: 28 },
                          (_, j) => 30 + j * 0.7 + Math.sin(j * 0.65 + n) * 9,
                        ),
                        "#2962ff",
                        105,
                      )}
                      <svg viewBox="0 0 280 105">
                        <path
                          d={
                            n === 0
                              ? "M15 88 L265 25 M15 65 L265 2"
                              : "M12 25 H265 M12 78 H265"
                          }
                          stroke="#e5a429"
                          fill="none"
                          strokeDasharray="5 4"
                        />
                      </svg>
                    </button>
                    <b>{t(card.zh, card.en)}</b>
                    <div className="card-meta">
                      <span>{i.symbol}</span>
                      <span>4H</span>
                      <span>{t("图表模板", "Chart template")}</span>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => onApplyTemplate(card.id)}
                    >
                      {t("应用到图表", "Apply to chart")}
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}
          {tab === "data" && (
            <>
              <section className="details-section">
                <h3>{t("多空持仓分布", "Long / short positioning")}</h3>
                <div className="position-ratio">
                  <strong className="up">{i.longRatio}%</strong>
                  <strong className="down">{100 - i.longRatio}%</strong>
                </div>
                <div className="ratio-bar large">
                  <i style={{ width: `${i.longRatio}%` }} />
                </div>
                <div className="spread-labels">
                  <span>{t("多头", "Long")}</span>
                  <span>{t("空头", "Short")}</span>
                </div>
              </section>
              <section className="details-section">
                <h3>{t("市场统计", "Statistics")}</h3>
                {[
                  [
                    t("多空比", "Long / short ratio"),
                    number(i.longRatio / (100 - i.longRatio)),
                  ],
                  [t("24H成交量", "24H volume"), i.volume24h],
                  [t("买卖价差", "Spread"), number(i.ask - i.bid, i.decimals)],
                  [t("24H最高", "24H high"), number(i.high24h, i.decimals)],
                  [t("24H最低", "24H low"), number(i.low24h, i.decimals)],
                ].map(([label, value]) => (
                  <div className="analysis-level" key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </section>
              <section className="details-section">
                <h3>{t("多空比走势", "Position ratio trend")}</h3>
                {spark(
                  Array.from(
                    { length: 20 },
                    (_, n) =>
                      i.longRatio / (100 - i.longRatio) +
                      Math.sin(n * 0.8) * 0.13,
                  ),
                  "#089981",
                  160,
                )}
              </section>
            </>
          )}
          {tab === "etf" && (
            <>
              <section className="details-section">
                <div className="segmented">
                  {[
                    ["stocks", "美股ETF", "US ETFs"],
                    ["btc", "比特币", "Bitcoin"],
                    ["eth", "以太坊", "Ethereum"],
                  ].map(([id, zh, en]) => (
                    <button
                      key={id}
                      className={etfType === id ? "active" : ""}
                      onClick={() => setEtfType(id)}
                    >
                      {t(zh, en)}
                    </button>
                  ))}
                </div>
                <h3 className="etf-title">
                  {t("ETF资金流向", "ETF fund flows")}
                </h3>
                <small className="muted">
                  {t("日净流入 · 百万美元", "Daily net flow · USD million")}
                </small>
                <strong className="big-number up">
                  +
                  {etfType === "stocks"
                    ? "486.2"
                    : etfType === "btc"
                      ? "218.4"
                      : "86.7"}
                </strong>
                {spark(
                  [22, 15, 35, 10, 45, 33, 65, 50, 84, 70, 110],
                  "#089981",
                  120,
                )}
              </section>
              <section className="details-section">
                <div className="etf-row muted">
                  <span>{t("基金", "Fund")}</span>
                  <span>{t("净流入", "Net flow")}</span>
                  <span>{t("资产规模", "AUM")}</span>
                </div>
                {(etfType === "stocks"
                  ? [
                      ["SPY", "SPDR S&P 500", 186.4, 652.1],
                      ["QQQ", "Invesco QQQ", 124.8, 328.5],
                      ["VOO", "Vanguard S&P 500", 108.6, 684.8],
                      ["IWM", "iShares Russell 2000", 66.4, 72.3],
                    ]
                  : etfType === "btc"
                    ? [
                        ["IBIT", "iShares Bitcoin", 146.2, 58.6],
                        ["FBTC", "Fidelity Bitcoin", 62.4, 21.8],
                        ["ARKB", "ARK 21Shares", 28.6, 4.8],
                        ["GBTC", "Grayscale Bitcoin", -18.8, 17.5],
                      ]
                    : [
                        ["ETHA", "iShares Ethereum", 52.3, 4.2],
                        ["FETH", "Fidelity Ethereum", 34.7, 1.8],
                        ["ETHW", "Bitwise Ethereum", 12.4, 0.9],
                        ["ETHE", "Grayscale Ethereum", -12.7, 3.4],
                      ]
                ).map(([symbol, name, flow, aum]) => (
                  <div className="etf-row" key={symbol}>
                    <span>
                      <b>{symbol}</b>
                      <small>{name}</small>
                    </span>
                    <b className={+flow >= 0 ? "up" : "down"}>
                      {signed(+flow, 1)}
                    </b>
                    <span>${aum}B</span>
                  </div>
                ))}
              </section>
            </>
          )}
          {tab === "agent" && (
            <>
              <section className="details-section">
                <div className="section-heading">
                  <h3>Alpha Agent</h3>
                  <div className="segmented">
                    <button
                      className={agentMode === "strategy" ? "active" : ""}
                      onClick={() => setAgentMode("strategy")}
                    >
                      {t("策略", "Strategy")}
                    </button>
                    <button
                      className={agentMode === "chat" ? "active" : ""}
                      onClick={() => setAgentMode("chat")}
                    >
                      Chat
                    </button>
                  </div>
                </div>
                {agentMode === "strategy" ? (
                  <>
                    <div className="agent-intro">
                      <span className="agent-icon">
                        <Bot size={25} />
                      </span>
                      <h2>
                        {t(
                          "设定条件，跟踪行情",
                          "Set conditions. Track markets.",
                        )}
                      </h2>
                      <p>
                        {t(
                          "价格到达目标时，及时提醒。",
                          "Get notified when your target price is reached.",
                        )}
                      </p>
                      <button
                        className="primary"
                        onClick={() => openStrategy()}
                      >
                        <Plus size={14} />
                        {t("创建策略", "Create strategy")}
                      </button>
                    </div>
                    <div className="section-heading">
                      <b>{t("策略模板", "Templates")}</b>
                      <button
                        className="text-link"
                        onClick={() => setBatch((old) => old + 1)}
                      >
                        <RefreshCw size={12} />
                        {t("换一批", "Refresh")}
                      </button>
                    </div>
                    {strategyTemplates.map((s, n) => (
                      <button
                        className="strategy-card"
                        key={s.name}
                        onClick={() =>
                          openStrategy(
                            s.name,
                            i.price * s.mult,
                            s.direction,
                            s.name,
                          )
                        }
                      >
                        <b>{s.name}</b>
                        <p>{s.desc}</p>
                        {spark(
                          Array.from(
                            { length: 15 },
                            (_, j) => 20 + j + Math.sin(j + n) * 3,
                          ),
                          "#2962ff",
                          38,
                        )}
                        <div className="card-meta">
                          <span>{i.symbol}</span>
                          <span>4H</span>
                          <span>{t("价格条件", "Price rule")}</span>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="agent-chat">
                    <div className="chat-message assistant">
                      {t(
                        `为 ${i.symbol} 设置一个价格提醒，例如“价格突破 ${number(i.price * 1.02, i.decimals)} 时提醒我”。`,
                        `Set a price rule for ${i.symbol}, e.g. “Alert above ${number(i.price * 1.02, i.decimals)}”.`,
                      )}
                    </div>
                    {messages.map((m, n) => (
                      <div key={n} className={`chat-message ${m.role}`}>
                        {m.text}
                      </div>
                    ))}
                    {messages.length > 0 && (
                      <button
                        className="outline-button"
                        onClick={() => chatDraft && setStrategyDraft(chatDraft)}
                      >
                        {t("查看策略草稿", "Review draft")}
                      </button>
                    )}
                    <form
                      className="chat-input"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!chat.trim()) return;
                        const match = chat
                            .replace(/,/g, "")
                            .match(/\d+(?:\.\d+)?/),
                          p = match ? Number(match[0]) : i.price * 1.02,
                          side = /低于|跌破|回落|below|under/i.test(chat)
                            ? "below"
                            : "above";
                        setChatDraft({
                          name: t("价格提醒策略", "Price alert strategy"),
                          price: p,
                          direction: side,
                        });
                        setMessages((old) => [
                          ...old,
                          { role: "user", text: chat },
                          {
                            role: "assistant",
                            text: t(
                              `草稿：${i.symbol} 价格${side === "above" ? "高于" : "低于"} ${number(p, i.decimals)} USD 时提醒。`,
                              `Draft: alert when ${i.symbol} is ${side} ${number(p, i.decimals)} USD.`,
                            ),
                          },
                        ]);
                        setChat("");
                      }}
                    >
                      <input
                        aria-label={t("策略描述", "Strategy description")}
                        value={chat}
                        placeholder={t(
                          "描述价格条件",
                          "Describe a price condition",
                        )}
                        onChange={(e) => setChat(e.target.value)}
                      />
                      <button disabled={!chat.trim()} title={t("发送", "Send")}>
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                )}
              </section>
              <section className="details-section">
                <h3>{t("我的策略", "My strategies")}</h3>
                {strategies
                  .filter((s) => s.symbol === i.symbol)
                  .map((s) => (
                    <div className="saved-strategy" key={s.id}>
                      <div>
                        <b>{s.name}</b>
                        <small>
                          {s.direction === "above" ? ">=" : "<="}{" "}
                          {number(s.price, i.decimals)} · {s.period}
                        </small>
                        <span className={s.active ? "up" : "muted"}>
                          {s.triggered
                            ? t("已触发", "Triggered")
                            : s.active
                              ? t("模拟运行中", "Demo active")
                              : t("已暂停", "Paused")}
                        </span>
                      </div>
                      <button
                        title={
                          s.active ? t("暂停", "Pause") : t("启动", "Start")
                        }
                        onClick={() =>
                          setStrategies((old) =>
                            old.map((item) =>
                              item.id === s.id
                                ? {
                                    ...item,
                                    active: !item.active,
                                    triggered: false,
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {s.active ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        title={t("删除策略", "Delete strategy")}
                        onClick={() =>
                          setStrategies((old) =>
                            old.filter((item) => item.id !== s.id),
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                {!strategies.some((s) => s.symbol === i.symbol) && (
                  <p className="muted">{t("暂无策略", "No strategies yet")}</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
      <nav
        className="details-rail"
        aria-label={t("行情详情", "Market details")}
      >
        {rail.map((r) => (
          <button
            key={r.id}
            title={t(r.zh, r.en)}
            aria-label={t(r.zh, r.en)}
            className={tab === r.id ? "active" : ""}
            onClick={() => setTab(r.id)}
          >
            <r.icon size={19} />
            <span>{t(r.zh, r.en)}</span>
          </button>
        ))}
        <div className="grow" />
        <button
          title={t("预警管理", "Manage alerts")}
          onClick={() => {
            setShowAlert(true);
            setAlertPreset(i.price);
          }}
        >
          <Bell size={18} />
          {alerts.some((a) => a.symbol === i.symbol && !a.triggered) && (
            <i className="notification-dot" />
          )}
        </button>
      </nav>
      {showAlert && (
        <PriceAlertSheet
          lang={lang}
          instrument={i}
          alerts={alerts}
          initialPrice={alertPreset}
          onClose={() => setShowAlert(false)}
          onAdd={(a) => {
            setAlerts((old) => [
              ...old,
              { ...a, id: cryptoId(), triggered: false },
            ]);
            onShowToast(t("预警已添加", "Alert added"));
          }}
          onDelete={(id) =>
            setAlerts((old) => old.filter((item) => item.id !== id))
          }
        />
      )}
      {strategyDraft && (
        <StrategySheet
          lang={lang}
          instrument={i}
          initial={strategyDraft}
          onClose={() => setStrategyDraft(null)}
          onCreate={(s) => {
            setStrategies((old) => [
              ...old,
              { ...s, id: cryptoId(), active: true, triggered: false },
            ]);
            setStrategyDraft(null);
            onShowToast(t("模拟策略已开始运行", "Demo strategy started"));
          }}
        />
      )}
      {(info || selectedArticle || analysisDetail) && (
        <div className="market-modal-backdrop">
          <section role="dialog" aria-modal="true" className="market-modal">
            <div className="modal-heading">
              <h3>
                {info
                  ? t("品种简况", "Instrument profile")
                  : analysisDetail
                    ? t("图表分析", "Chart study")
                    : t("快讯", "News")}
              </h3>
              <button
                aria-label={t("关闭", "Close")}
                onClick={() => {
                  setInfo(false);
                  setArticle(null);
                  setAnalysisDetail(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            {info ? (
              <>
                <h2>{t(i.nameZh, i.nameEn)}</h2>
                {[
                  [t("代码", "Symbol"), i.symbol],
                  [t("报价币种", "Quote"), "USD"],
                  [
                    t("品种类别", "Category"),
                    crypto
                      ? t("加密资产", "Crypto")
                      : i.category === "stocks"
                        ? t("美股CFD", "US stock CFD")
                        : i.category === "forex"
                          ? t("外汇", "Forex")
                          : i.category === "commodities"
                            ? t("大宗商品", "Commodities")
                            : t("指数", "Index"),
                  ],
                  [t("市值", "Market cap"), i.marketCap ?? "—"],
                  [
                    t("股息率", "Dividend yield"),
                    i.dividendYield ? `${i.dividendYield}%` : "—",
                  ],
                ].map(([label, value]) => (
                  <div className="analysis-level" key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </>
            ) : selectedArticle ? (
              <>
                <h2>{t(selectedArticle.titleZh, selectedArticle.titleEn)}</h2>
                <small className="muted">
                  {selectedArticle.time} · AlphaPulse
                </small>
                <p className="article-body">
                  {t(selectedArticle.summaryZh, selectedArticle.summaryEn)}
                </p>
              </>
            ) : (
              <>
                <h2>{i.symbol} · 4H</h2>
                {spark(
                  Array.from(
                    { length: 30 },
                    (_, n) => n + Math.sin(n * 0.6) * 8,
                  ),
                  "#2962ff",
                  140,
                )}
                <div className="analysis-level">
                  <span>{t("支撑位", "Support")}</span>
                  <b>{number(i.low24h, i.decimals)}</b>
                </div>
                <div className="analysis-level">
                  <span>{t("阻力位", "Resistance")}</span>
                  <b>{number(i.high24h, i.decimals)}</b>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    onApplyTemplate(analysisDetail!);
                    setAnalysisDetail(null);
                  }}
                >
                  {t("应用到图表", "Apply to chart")}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
function cryptoId() {
  return globalThis.crypto.randomUUID();
}
