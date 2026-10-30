import React, { useEffect, useMemo, useRef, useState } from "react";
import { Instrument } from "../data/marketData";
import { MarketOverviewView } from "./MarketOverviewView";
import { AiDiagnoseView } from "./AiDiagnoseView";
import "./research.css";
export type ResearchTab = "diagnosis" | "ace" | "hotlist" | "heatmap";
type SharedProps = {
  instruments: Instrument[];
  lang: "zh" | "en";
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (tab: any) => void;
};
export function ResearchView({
  instruments,
  lang,
  onSelectSymbol,
  onNavigate,
  selectedSymbol,
  tab,
  onTabChange,
  onQuickTrade,
}: {
  selectedSymbol: string;
  tab: ResearchTab;
  onTabChange: (tab: ResearchTab) => void;
  onQuickTrade: (symbol: string, side: "buy" | "sell") => void;
} & SharedProps) {
  const diagnose = (symbol: string) => {
    const valid = instruments.find(
      (i) =>
        i.symbol === symbol || i.symbol.split("/")[0] === symbol.split("/")[0],
    );
    if (valid) onSelectSymbol(valid.symbol);
    onTabChange("diagnosis");
  };
  return (
    <div className="news-shell research-page">
      <div className="news-toolbar">
        <div className="news-tabs" role="tablist">
          {[
            ["diagnosis", "AI诊股"],
            ["ace", "Ace智搜"],
            ["hotlist", "热门榜单"],
            ["heatmap", "云图"],
          ].map(([id, title]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              onClick={() => onTabChange(id as ResearchTab)}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      {tab === "diagnosis" ? (
        <AiDiagnoseView
          instruments={instruments}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={onSelectSymbol}
          onQuickTrade={onQuickTrade}
          lang={lang}
          onNavigateTab={onNavigate}
        />
      ) : tab === "heatmap" ? (
        <MarketCloud instruments={instruments} onSelect={diagnose} />
      ) : (
        <MarketOverviewView
          instruments={instruments}
          lang={lang}
          view={tab}
          hideNavigation
          onChangeView={(v) => onTabChange(v as ResearchTab)}
          onOpenAiOverviewWithSymbol={diagnose}
          onQuickTrade={diagnose}
          onTrade={onQuickTrade}
          onNavigateTab={onNavigate}
        />
      )}
    </div>
  );
}

type Tile = {
  instrument: Instrument;
  weight: number;
  change: number;
  sector: string;
};
type Rect<T> = { item: T; x: number; y: number; width: number; height: number };
function partition<T extends { weight: number }>(
  items: T[],
  x: number,
  y: number,
  width: number,
  height: number,
): Rect<T>[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ item: items[0], x, y, width, height }];
  const total = items.reduce((n, i) => n + i.weight, 0);
  let sum = 0,
    split = 1;
  for (let i = 0; i < items.length - 1; i++) {
    sum += items[i].weight;
    split = i + 1;
    if (sum >= total / 2) break;
  }
  const ratio = sum / total;
  return width > height
    ? [
        ...partition(items.slice(0, split), x, y, width * ratio, height),
        ...partition(
          items.slice(split),
          x + width * ratio,
          y,
          width * (1 - ratio),
          height,
        ),
      ]
    : [
        ...partition(items.slice(0, split), x, y, width, height * ratio),
        ...partition(
          items.slice(split),
          x,
          y + height * ratio,
          width,
          height * (1 - ratio),
        ),
      ];
}
function MarketCloud({
  instruments,
  onSelect,
}: {
  instruments: Instrument[];
  onSelect: (symbol: string) => void;
}) {
  const [limit, setLimit] = useState("100"),
    [metric, setMetric] = useState("change"),
    [area, setArea] = useState("cap"),
    [grouped, setGrouped] = useState("yes"),
    [period, setPeriod] = useState("24H"),
    [intensity, setIntensity] = useState("1");
  const [hover, setHover] = useState<Tile | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setCanvasWidth(entry.contentRect.width),
    );
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);
  const cap = (i: Instrument, n: number) =>
    i.symbol === "BTC/USD"
      ? 950
      : i.symbol === "ETH/USD"
        ? 480
        : i.symbol === "NVDA"
          ? 320
          : i.symbol === "AAPL"
            ? 300
            : i.symbol === "MSFT"
              ? 290
              : Math.max(20, 150 - n * 3);
  const tiles = useMemo(
    () =>
      instruments
        .map(
          (i, n): Tile => ({
            instrument: i,
            weight:
              area === "equal"
                ? 70
                : area === "volume"
                  ? Math.max(35, (n * 67 + 19) % 240)
                  : cap(i, n),
            change:
              i.changePercent24h *
              (period === "5Min"
                ? 0.12
                : period === "1H"
                  ? 0.35
                  : period === "4H"
                    ? 0.65
                    : 1),
            sector:
              i.category === "crypto"
                ? {
                    ai: "AI 生态",
                    meme: "Meme",
                    l1: "公链",
                    l2: "Layer 2",
                    defi: "DeFi",
                    rwa: "RWA",
                    gaming: "GameFi",
                  }[i.perpSector || "l1"]
                : {
                    stocks: "美股",
                    indices: "指数",
                    forex: "外汇",
                    commodities: "大宗商品",
                  }[i.category],
          }),
        )
        .sort(
          (a, b) =>
            cap(b.instrument, instruments.indexOf(b.instrument)) -
            cap(a.instrument, instruments.indexOf(a.instrument)),
        )
        .slice(0, Number(limit))
        .sort((a, b) => b.weight - a.weight),
    [instruments, area, limit, period],
  );
  const groups =
    grouped === "yes"
      ? Object.values(
          tiles.reduce<
            Record<string, { name: string; weight: number; tiles: Tile[] }>
          >((obj, t) => {
            const g =
              obj[t.sector] ||
              (obj[t.sector] = { name: t.sector, weight: 0, tiles: [] });
            g.weight += t.weight;
            g.tiles.push(t);
            return obj;
          }, {}),
        ).sort((a, b) => b.weight - a.weight)
      : [{ name: "全市场", weight: 1, tiles }];
  const narrow = canvasWidth < 600;
  const viewWidth = narrow ? Math.max(250, canvasWidth) : 1200;
  let nextY = 0;
  const rectangles = narrow
    ? groups.map((item) => {
        const height = Math.max(
          150,
          Math.ceil(item.tiles.length / 3) * 90 + 30,
        );
        const rect = { item, x: 0, y: nextY, width: viewWidth, height };
        nextY += height;
        return rect;
      })
    : partition(groups, 0, 0, 1200, 680);
  const viewHeight = narrow ? nextY : 680;
  const color = (change: number) => {
    const strength = Math.min(1, (Math.abs(change) * Number(intensity)) / 3);
    if (Math.abs(change) < 0.2) return "#d7dfe5";
    return change > 0
      ? `hsl(163 48% ${78 - strength * 35}%)`
      : `hsl(354 78% ${86 - strength * 25}%)`;
  };
  return (
    <div className="cloud-page">
      <div className="cloud-controls">
        <div className="cloud-selects">
          <label>
            市值
            <select
              aria-label="市值范围"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            >
              <option value="100">前 100</option>
              <option value="25">前 25</option>
              <option value="10">前 10</option>
            </select>
          </label>
          <label>
            类型
            <select
              aria-label="云图类型"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="change">涨跌幅</option>
              <option value="volume">成交量</option>
            </select>
          </label>
          <label>
            面积
            <select
              aria-label="云图面积"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="cap">流通市值</option>
              <option value="volume">成交活跃度</option>
              <option value="equal">等面积</option>
            </select>
          </label>
          <label>
            <select
              aria-label="板块分组"
              value={grouped}
              onChange={(e) => setGrouped(e.target.value)}
            >
              <option value="yes">板块分组</option>
              <option value="no">不分组</option>
            </select>
          </label>
          <div className="cloud-periods">
            {["5Min", "1H", "4H", "24H"].map((p) => (
              <button
                key={p}
                className={period === p ? "active" : ""}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="cloud-scale">
          <select
            aria-label="颜色强度"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
          >
            <option value="1">×1</option>
            <option value="2">×2</option>
            <option value="3">×3</option>
          </select>
          {[-3, -2, -1, 0, 1, 2, 3].map((n) => (
            <span key={n} style={{ background: color(n) }}>
              {n > 0 ? "+" : ""}
              {n}%
            </span>
          ))}
        </div>
      </div>
      <div className="cloud-info">
        <span>
          {hover
            ? `${hover.instrument.nameZh}  ·  ${hover.instrument.symbol}`
            : `${tiles.length} 个品种 · ${grouped === "yes" ? "按板块展示" : "全市场"}`}
        </span>
        <span>
          {hover
            ? `最新价 ${hover.instrument.price.toLocaleString()}  /  ${period} ${hover.change > 0 ? "+" : ""}${hover.change.toFixed(2)}%`
            : "选择品种查看诊股"}
        </span>
      </div>
      <div className="cloud-canvas" ref={canvasRef}>
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          role="group"
          aria-label="市场云图"
        >
          {rectangles.map((g) => (
            <g key={g.item.name}>
              <text x={g.x + 6} y={g.y + 17} className="cloud-group-title">
                {g.item.name}
              </text>
              {partition(
                g.item.tiles,
                g.x + 3,
                g.y + 25,
                g.width - 6,
                Math.max(1, g.height - 30),
              ).map((r) => {
                const i = r.item.instrument;
                const small = r.width < 80 || r.height < 55;
                return (
                  <g
                    key={i.symbol}
                    role="button"
                    tabIndex={0}
                    aria-label={`${i.symbol} ${r.item.change.toFixed(2)}%`}
                    onClick={() => onSelect(i.symbol)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(i.symbol);
                      }
                    }}
                    onMouseEnter={() => setHover(r.item)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(r.item)}
                    onBlur={() => setHover(null)}
                    className="cloud-tile"
                  >
                    <rect
                      x={r.x}
                      y={r.y}
                      width={Math.max(1, r.width - 2)}
                      height={Math.max(1, r.height - 2)}
                      fill={color(r.item.change)}
                    />
                    <svg
                      x={r.x + 3}
                      y={r.y}
                      width={Math.max(1, r.width - 8)}
                      height={r.height}
                    >
                      <text
                        x="50%"
                        y="48%"
                        textAnchor="middle"
                        fontSize={small ? 10 : Math.min(30, r.width / 7)}
                        fill="#173e47"
                        fontWeight="600"
                      >
                        {i.category === "forex"
                          ? i.symbol
                          : i.symbol.split("/")[0]}
                      </text>
                      {r.height > 30 && (
                        <text
                          x="50%"
                          y="48%"
                          dy={small ? 14 : 25}
                          textAnchor="middle"
                          fontSize={small ? 8 : Math.min(21, r.width / 10)}
                          fill="#173e47"
                        >
                          {metric === "volume"
                            ? i.volume24h
                            : `${r.item.change > 0 ? "+" : ""}${r.item.change.toFixed(2)}%`}
                        </text>
                      )}
                    </svg>
                    <title>
                      {i.nameZh} · {i.symbol} · {r.item.change.toFixed(2)}%
                    </title>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
