import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  TrendingUp,
  MoveUpRight,
  Minus,
  Square,
  GitBranch,
  Percent,
  Hash,
  Activity,
  Triangle,
  Type,
  Ruler,
  Magnet,
  LockKeyhole,
  UnlockKeyhole,
  Eye,
  EyeOff,
  Trash2,
  Undo2,
  Redo2,
  Camera,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Hand,
} from "lucide-react";
import { Instrument } from "../data/marketData";
import {
  indicators,
  makeCandles,
  number,
  PERIODS,
  signed,
  useSavedState,
} from "./marketModel";

type Point = { index: number; price: number };
type Tool =
  | "cursor"
  | "pan"
  | "trend"
  | "ray"
  | "horizontal"
  | "channel"
  | "fib"
  | "gann"
  | "rect"
  | "wave"
  | "harmonic"
  | "long"
  | "short"
  | "text"
  | "measure";
type Drawing = {
  id: string;
  tool: Tool;
  points: Point[];
  color: string;
  width: number;
  text?: string;
};
const TOOLS = [
  { id: "cursor", icon: Crosshair, zh: "十字光标", en: "Crosshair", points: 0 },
  { id: "pan", icon: Hand, zh: "移动图表", en: "Pan", points: 0 },
  { id: "trend", icon: TrendingUp, zh: "趋势线", en: "Trend line", points: 2 },
  { id: "ray", icon: MoveUpRight, zh: "射线", en: "Ray", points: 2 },
  {
    id: "horizontal",
    icon: Minus,
    zh: "水平线",
    en: "Horizontal line",
    points: 1,
  },
  {
    id: "channel",
    icon: GitBranch,
    zh: "平行通道",
    en: "Parallel channel",
    points: 3,
  },
  {
    id: "fib",
    icon: Percent,
    zh: "斐波那契回撤",
    en: "Fibonacci retracement",
    points: 2,
  },
  { id: "gann", icon: Hash, zh: "江恩扇形", en: "Gann fan", points: 2 },
  { id: "rect", icon: Square, zh: "矩形", en: "Rectangle", points: 2 },
  {
    id: "wave",
    icon: Activity,
    zh: "艾略特波浪",
    en: "Elliott wave",
    points: 6,
  },
  {
    id: "harmonic",
    icon: Triangle,
    zh: "谐波形态",
    en: "Harmonic pattern",
    points: 5,
  },
  {
    id: "long",
    icon: TrendingUp,
    zh: "多头仓位",
    en: "Long position",
    points: 2,
  },
  {
    id: "short",
    icon: TrendingUp,
    zh: "空头仓位",
    en: "Short position",
    points: 2,
  },
  { id: "text", icon: Type, zh: "文字标注", en: "Text", points: 1 },
  { id: "measure", icon: Ruler, zh: "测量", en: "Measure", points: 2 },
] as const;

/** Horizontal overlay such as an open position's entry, TP, SL or a pending order */
export interface PriceLine {
  price: number;
  label: string;
  tone: "up" | "down" | "brand" | "warn";
}
const LINE_COLOR: Record<PriceLine["tone"], string> = {
  up: "var(--up)",
  down: "var(--down)",
  brand: "var(--blue)",
  warn: "#e5a429",
};
const labelWidth = (text: string) =>
  [...text].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 10 : 6), 12);

interface Props {
  instrument: Instrument;
  lang: "zh" | "en";
  period: string;
  onPeriod: (value: string) => void;
  template?: { id: number; kind: string };
  onTemplateApplied?: () => void;
  compact?: boolean;
  mobile?: boolean;
  priceLines?: PriceLine[];
}
export function MarketChart({
  instrument,
  lang,
  period,
  onPeriod,
  template,
  onTemplateApplied,
  compact = false,
  mobile = false,
  priceLines = [],
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const wrapper = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null),
    plot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 530 });
  const [now] = useState(Date.now),
    [tool, setTool] = useState<Tool>("cursor");
  const [allDrawings, setAllDrawings] = useSavedState<
    Record<string, Drawing[]>
  >("alphapulse.drawings.v2", {});
  const scope = `${instrument.symbol}:${period}`,
    drawings = allDrawings[scope] ?? [];
  const [history, setHistory] = useState<Drawing[][]>([]),
    [future, setFuture] = useState<Drawing[][]>([]);
  const [pending, setPending] = useState<Point[]>([]),
    [hover, setHover] = useState<Point | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [magnet, setMagnet] = useState(false),
    [locked, setLocked] = useState(false),
    [hidden, setHidden] = useState(false);
  const [color, setColor] = useState("#2962ff"),
    [width, setWidth] = useState(1.5),
    [textPoint, setTextPoint] = useState<Point | null>(null),
    [annotation, setAnnotation] = useState("");
  const [main, setMain] = useState(["MA"]),
    [sub, setSub] = useState(mobile ? "NONE" : "MACD"),
    [volume, setVolume] = useState(true);
  const [scale, setScale] = useState<"linear" | "log" | "percent">("linear"),
    [auto, setAuto] = useState(true);
  const [count, setCount] = useState(mobile ? 40 : 90),
    [offset, setOffset] = useState(0),
    [chartType, setChartType] = useState("candles");
  const [full, setFull] = useState(false);
  /** In-app fullscreen (works on iOS); native fullscreen + landscape lock where the browser allows it */
  const toggleFull = () => {
    if (full) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setFull(false);
      return;
    }
    setFull(true);
    const el = wrapper.current;
    if (el?.requestFullscreen && !/iPhone|iPad/.test(navigator.userAgent))
      el.requestFullscreen()
        .then(() =>
          (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })
            .lock?.("landscape")
            .catch(() => {}),
        )
        .catch(() => {});
  };
  useEffect(() => {
    if (!full) return;
    document.documentElement.classList.add("sh-locked");
    const key = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    const change = () => !document.fullscreenElement && setFull(false);
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", change);
    return () => {
      document.documentElement.classList.remove("sh-locked");
      window.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", change);
    };
  }, [full]);
  const drag = useRef<{
    x: number;
    offset: number;
    id?: string;
    point?: Point;
    before?: Drawing[];
  } | null>(null);
  const [frozenRange, setFrozenRange] = useState<[number, number] | null>(null);
  const source = useMemo(
    () => makeCandles(instrument, period, now),
    [instrument.symbol, period, now],
  );
  const candles = useMemo(
    () =>
      source.map((c, i) =>
        i !== source.length - 1
          ? c
          : {
              ...c,
              close: instrument.price,
              high: Math.max(c.high, instrument.price),
              low: Math.min(c.low, instrument.price),
            },
      ),
    [source, instrument.price],
  );
  const start = Math.max(0, candles.length - count - offset),
    end = Math.min(candles.length, start + count),
    visible = candles.slice(start, end);
  const stats = useMemo(() => indicators(candles), [candles]);
  const w = Math.max(220, size.w),
    h = Math.max(mobile ? 180 : 270, size.h),
    axis = size.w < 400 ? 64 : 74,
    pw = w - axis;
  const volumeH = volume ? (mobile ? 48 : 65) : 0,
    subH = sub === "NONE" ? 0 : mobile ? 60 : 85,
    priceH = h - 30 - volumeH - subH;
  const currentMin = Math.min(...visible.map((c) => c.low)),
    currentMax = Math.max(...visible.map((c) => c.high));
  const [low, high] =
    !auto && frozenRange ? frozenRange : [currentMin, currentMax];
  const spread = Math.max(high - low, high * 0.001),
    min = Math.max(0.0000001, low - spread * 0.13),
    max = high + spread * 0.13;
  const tx = (index: number) => ((index - start + 0.5) * pw) / count;
  const ty = (price: number) =>
    12 +
    (priceH - 24) *
      (1 -
        (scale === "log"
          ? (Math.log(Math.max(price, 0.00000001)) - Math.log(min)) /
            (Math.log(max) - Math.log(min))
          : (price - min) / (max - min)));
  const priceAt = (y: number) =>
    scale === "log"
      ? Math.exp(
          Math.log(min) +
            (1 - (y - 12) / (priceH - 24)) * (Math.log(max) - Math.log(min)),
        )
      : min + (1 - (y - 12) / (priceH - 24)) * (max - min);
  const format = (p: number) =>
    scale === "percent"
      ? `${signed((p / visible[0].open - 1) * 100)}%`
      : number(p, instrument.decimals);
  const active =
    candles[
      Math.max(
        0,
        Math.min(
          candles.length - 1,
          Math.round(hover?.index ?? candles.length - 1),
        ),
      )
    ];
  const toolMeta = TOOLS.find((i) => i.id === tool)!;
  const updateDrawings = (value: Drawing[]) =>
    setAllDrawings((old) => ({ ...old, [scope]: value }));
  const commit = (value: Drawing[]) => {
    setHistory((old) => [...old.slice(-49), drawings]);
    setFuture([]);
    updateDrawings(value);
  };
  const undo = () => {
    if (!history.length) return;
    setFuture((old) => [...old, drawings]);
    updateDrawings(history[history.length - 1]);
    setHistory((old) => old.slice(0, -1));
    setSelected(null);
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((old) => [...old, drawings]);
    updateDrawings(future[future.length - 1]);
    setFuture((old) => old.slice(0, -1));
  };

  useEffect(() => {
    if (!plot.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setPending([]);
    setSelected(null);
    setHistory([]);
    setFuture([]);
    setOffset(0);
    setFrozenRange(null);
    setAuto(true);
    setHover(null);
  }, [scope]);
  useEffect(() => {
    if (
      !template ||
      drawings.some((d) => d.id.startsWith(`template-${template.id}`))
    )
      return;
    const a = candles.length - 60,
      b = candles.length - 12;
    const kind =
      template.kind === "channel"
        ? "channel"
        : template.kind === "breakout"
          ? "rect"
          : "horizontal";
    const points = [
      { index: a, price: candles[a].low },
      { index: b, price: candles[b].low },
    ];
    if (kind === "channel")
      points.push({ index: a, price: candles[a].high + spread * 0.25 });
    if (kind === "horizontal") {
      commit([
        ...drawings,
        {
          id: `template-${template.id}-support`,
          tool: "horizontal",
          points: [{ index: a, price: currentMin }],
          color: "#089981",
          width: 1.5,
        },
        {
          id: `template-${template.id}-resistance`,
          tool: "horizontal",
          points: [{ index: a, price: currentMax }],
          color: "#f23645",
          width: 1.5,
        },
      ]);
    } else {
      if (kind === "rect") {
        points[0].price = currentMin;
        points[1].price = currentMax;
      }
      commit([
        ...drawings,
        {
          id: `template-${template.id}`,
          tool: kind,
          points,
          color: "#2962ff",
          width: 1.5,
        },
      ]);
    }
    setMain(["MA", "BOLL"]);
    onTemplateApplied?.();
  }, [template?.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "Escape") {
        setPending([]);
        setTool("cursor");
        setSelected(null);
        setTextPoint(null);
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selected &&
        !locked
      ) {
        e.preventDefault();
        commit(drawings.filter((d) => d.id !== selected));
        setSelected(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const pointFromEvent = (e: React.PointerEvent): Point => {
    const bounds = svg.current!.getBoundingClientRect(),
      x = ((e.clientX - bounds.left) * w) / bounds.width,
      y = ((e.clientY - bounds.top) * h) / bounds.height;
    const index = Math.max(
      0,
      Math.min(candles.length - 1, start + (x / pw) * count - 0.5),
    );
    let price = priceAt(y);
    if (magnet) {
      const c = candles[Math.round(index)];
      price = [c.open, c.high, c.low, c.close].sort(
        (a, b) => Math.abs(ty(a) - y) - Math.abs(ty(b) - y),
      )[0];
    }
    return { index, price };
  };
  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    if (
      ((e.clientY - bounds.top) * h) / bounds.height > priceH ||
      ((e.clientX - bounds.left) * w) / bounds.width > pw
    )
      return;
    const point = pointFromEvent(e);
    const id = (e.target as Element)
      .closest("[data-drawing]")
      ?.getAttribute("data-drawing");
    if (id && tool === "cursor" && !locked && !hidden) {
      setSelected(id);
      const d = drawings.find((d) => d.id === id)!;
      setColor(d.color);
      setWidth(d.width);
      drag.current = { x: e.clientX, offset, id, point, before: drawings };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    setSelected(null);
    if (tool === "cursor" || tool === "pan") {
      drag.current = { x: e.clientX, offset };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (locked || hidden) return;
    if (tool === "text") {
      setTextPoint(point);
      setAnnotation("");
      return;
    }
    const points = [...pending, point];
    if (points.length >= toolMeta.points) {
      commit([
        ...drawings,
        { id: crypto.randomUUID(), tool, points, color, width },
      ]);
      setPending([]);
    } else setPending(points);
  }
  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const point = pointFromEvent(e);
    setHover(point);
    if (!drag.current) return;
    if (drag.current.id && drag.current.point) {
      const shift = {
        index: point.index - drag.current.point.index,
        price: point.price - drag.current.point.price,
      };
      updateDrawings(
        drag.current.before!.map((d) =>
          d.id !== drag.current!.id
            ? d
            : {
                ...d,
                points: d.points.map((p) => ({
                  index: p.index + shift.index,
                  price: p.price + shift.price,
                })),
              },
        ),
      );
    } else
      setOffset(
        Math.max(
          0,
          Math.min(
            candles.length - count,
            drag.current.offset +
              Math.round(((e.clientX - drag.current.x) / pw) * count),
          ),
        ),
      );
  }
  function onUp() {
    if (drag.current?.id) {
      const before = drag.current.before!;
      setHistory((old) => [...old, before]);
      setFuture([]);
    }
    drag.current = null;
  }
  const zoom = (delta: number) => {
    setCount((old) => Math.max(25, Math.min(200, old + delta)));
    setOffset((old) =>
      Math.min(old, Math.max(0, candles.length - count - delta)),
    );
  };
  const linePath = (values: number[], mapY = ty) =>
    values
      .slice(start, end)
      .map((v, i) => `${tx(start + i)},${mapY(v)}`)
      .join(" ");
  const chartColor = active.close >= active.open ? "var(--up)" : "var(--down)";

  function renderDrawing(d: Drawing, preview = false) {
    if (!d.points.length) return null;
    const pts = d.points.map((p) => ({ x: tx(p.index), y: ty(p.price) })),
      a = pts[0],
      b = pts[1] ?? a;
    const stroke = { stroke: d.color, strokeWidth: d.width, fill: "none" };
    let content: React.ReactNode;
    if (d.tool === "horizontal")
      content = (
        <>
          <line x1={0} x2={pw} y1={a.y} y2={a.y} {...stroke} />
          <text x={pw - 8} y={a.y - 6} textAnchor="end" fill={d.color}>
            {number(d.points[0].price, instrument.decimals)}
          </text>
        </>
      );
    else if (d.tool === "text")
      content = (
        <text x={a.x} y={a.y} fill={d.color} fontSize={12}>
          {d.text}
        </text>
      );
    else if (d.tool === "rect" || d.tool === "measure")
      content = (
        <>
          <rect
            x={Math.min(a.x, b.x)}
            y={Math.min(a.y, b.y)}
            width={Math.abs(b.x - a.x)}
            height={Math.abs(b.y - a.y)}
            {...stroke}
            fill={`${d.color}12`}
          />
          {d.tool === "measure" && (
            <text
              x={(a.x + b.x) / 2}
              y={Math.min(a.y, b.y) - 8}
              textAnchor="middle"
              fill={d.color}
            >
              {signed((d.points[1].price / d.points[0].price - 1) * 100)}% ·{" "}
              {Math.round(Math.abs(d.points[1].index - d.points[0].index))}{" "}
              {t("根", "bars")}
            </text>
          )}
        </>
      );
    else if (d.tool === "fib")
      content = (
        <>
          {[0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((level, i) => {
            const y = a.y + (b.y - a.y) * level;
            return (
              <g key={level}>
                <rect
                  x={Math.min(a.x, b.x)}
                  y={Math.min(
                    y,
                    a.y +
                      (b.y - a.y) * [0.236, 0.382, 0.5, 0.618, 0.786, 1, 1][i],
                  )}
                  width={Math.abs(b.x - a.x)}
                  height={Math.abs(
                    (b.y - a.y) *
                      [0.236, 0.146, 0.118, 0.118, 0.168, 0.214, 0][i],
                  )}
                  fill={
                    [
                      "#2962ff",
                      "#8b5cf6",
                      "#eab308",
                      "#089981",
                      "#06b6d4",
                      "#f23645",
                    ][i % 6]
                  }
                  opacity=".05"
                />
                <line
                  x1={Math.min(a.x, b.x)}
                  x2={Math.max(a.x, b.x)}
                  y1={y}
                  y2={y}
                  {...stroke}
                />
                <text x={Math.max(a.x, b.x) + 4} y={y - 3} fill={d.color}>
                  {level} (
                  {number(
                    d.points[0].price +
                      (d.points[1].price - d.points[0].price) * level,
                    instrument.decimals,
                  )}
                  )
                </text>
              </g>
            );
          })}
        </>
      );
    else if (d.tool === "gann")
      content = (
        <>
          {[0.25, 0.5, 1, 2, 4].map((r) => (
            <g key={r}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={a.y + (b.y - a.y) * r}
                {...stroke}
              />
              <text x={b.x + 4} y={a.y + (b.y - a.y) * r} fill={d.color}>
                {r}:1
              </text>
            </g>
          ))}
        </>
      );
    else if (d.tool === "long" || d.tool === "short") {
      const distance = Math.abs(b.y - a.y),
        direction = d.tool === "long" ? -1 : 1,
        targetY = a.y + direction * distance,
        stopY = a.y - (direction * distance) / 2;
      content = (
        <>
          <rect
            x={Math.min(a.x, b.x)}
            y={Math.min(a.y, targetY)}
            width={Math.max(50, Math.abs(b.x - a.x))}
            height={distance}
            fill="#08998122"
            stroke="#089981"
          />
          <rect
            x={Math.min(a.x, b.x)}
            y={Math.min(a.y, stopY)}
            width={Math.max(50, Math.abs(b.x - a.x))}
            height={distance / 2}
            fill="#f2364522"
            stroke="#f23645"
          />
          <text x={a.x + 5} y={a.y - 5} fill={d.color}>
            {t("盈亏比", "R/R")} 2:1
          </text>
        </>
      );
    } else if (d.tool === "channel") {
      const shift = (pts[2]?.y ?? a.y + 40) - a.y;
      content = (
        <>
          <polygon
            points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y + shift} ${a.x},${a.y + shift}`}
            fill={`${d.color}12`}
          />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...stroke} />
          <line
            x1={a.x}
            y1={a.y + shift}
            x2={b.x}
            y2={b.y + shift}
            {...stroke}
          />
          <line
            x1={a.x}
            y1={a.y + shift / 2}
            x2={b.x}
            y2={b.y + shift / 2}
            {...stroke}
            strokeDasharray="4 4"
          />
        </>
      );
    } else if (d.tool === "ray") {
      const x = b.x >= a.x ? pw : 0,
        y =
          Math.abs(b.x - a.x) < 1
            ? b.y
            : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
      content = <line x1={a.x} y1={a.y} x2={x} y2={y} {...stroke} />;
    } else
      content = (
        <>
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            {...stroke}
          />
          {(d.tool === "wave" || d.tool === "harmonic") &&
            pts.map((p, i) => (
              <text
                key={i}
                x={p.x}
                y={p.y - 9}
                textAnchor="middle"
                fill={d.color}
              >
                {d.tool === "wave" ? i : ["X", "A", "B", "C", "D"][i]}
              </text>
            ))}
        </>
      );
    return (
      <g
        key={d.id}
        data-drawing={preview ? undefined : d.id}
        opacity={preview ? 0.6 : 1}
        style={{
          cursor: locked ? "default" : "move",
          pointerEvents: preview ? "none" : "all",
        }}
      >
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="transparent"
          strokeWidth="14"
        />
        {content}
        {selected === d.id &&
          pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--panel)"
              stroke={d.color}
              strokeWidth="1.5"
            />
          ))}
      </g>
    );
  }
  function download() {
    if (!svg.current) return;
    const clone = svg.current.cloneNode(true) as SVGSVGElement;
    const style = getComputedStyle(svg.current);
    clone.setAttribute(
      "style",
      `background:${style.getPropertyValue("--panel")};color:${style.color};--panel:${style.getPropertyValue("--panel")};--line:${style.getPropertyValue("--line")};--muted:${style.getPropertyValue("--muted")};--up:#089981;--down:#f23645;font-family:Arial;font-size:10px`,
    );
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${instrument.symbol.replace("/", "-")}-${period}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div
      className={`market-chart ${compact ? "compact" : ""} ${full ? "is-full" : ""}`}
      ref={wrapper}
    >
      {full && (
        <div className="chart-full-head">
          <b>{instrument.symbol}</b>
          <span>{number(instrument.price, instrument.decimals)}</span>
          <em className={instrument.changePercent24h >= 0 ? "up" : "down"}>
            {signed(instrument.changePercent24h)}%
          </em>
          <small>
            {t("高", "H")} {number(instrument.high24h, instrument.decimals)} ·{" "}
            {t("低", "L")} {number(instrument.low24h, instrument.decimals)}
          </small>
          <button
            aria-label={t("退出全屏", "Exit fullscreen")}
            onClick={toggleFull}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="chart-controls">
        <div className="periods">
          {PERIODS.map(([id, label]) => (
            <button
              key={id}
              className={period === id ? "active" : ""}
              onClick={() => onPeriod(id)}
            >
              {t(label, id)}
            </button>
          ))}
        </div>
        <div className="chart-actions">
          <select
            aria-label={t("图表类型", "Chart type")}
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="candles">{t("K线", "Candles")}</option>
            <option value="line">{t("折线", "Line")}</option>
          </select>
          <button title={t("保存图表", "Save chart")} onClick={download}>
            <Camera size={15} />
          </button>
          <button
            title={full ? t("退出全屏", "Exit fullscreen") : t("全屏", "Fullscreen")}
            aria-pressed={full}
            onClick={toggleFull}
          >
            {full ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>
      {!compact && (
        <div className="indicator-bar">
          {["MA", "EMA", "BOLL"].map((v) => (
            <button
              className={main.includes(v) ? "active" : ""}
              key={v}
              onClick={() =>
                setMain((old) =>
                  old.includes(v) ? old.filter((i) => i !== v) : [...old, v],
                )
              }
            >
              {v}
            </button>
          ))}
          <span className="separator" />
          <button
            onClick={() => setVolume(!volume)}
            className={volume ? "active" : ""}
          >
            Volume
          </button>
          {["MACD", "RSI", "KDJ", "OBV"].map((v) => (
            <button
              key={v}
              className={sub === v ? "active" : ""}
              onClick={() => setSub(sub === v ? "NONE" : v)}
            >
              {v}
            </button>
          ))}
          <span className="grow" />
          <button
            disabled={!history.length}
            title={t("撤销", "Undo")}
            onClick={undo}
          >
            <Undo2 size={14} />
          </button>
          <button
            disabled={!future.length}
            title={t("重做", "Redo")}
            onClick={redo}
          >
            <Redo2 size={14} />
          </button>
        </div>
      )}
      <div className="chart-body">
        {!compact && (
          <div className="drawing-toolbar">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                title={t(item.zh, item.en)}
                aria-label={t(item.zh, item.en)}
                className={tool === item.id ? "active" : ""}
                onClick={() => {
                  setTool(item.id);
                  setPending([]);
                  setSelected(null);
                }}
              >
                <item.icon size={17} />
              </button>
            ))}
            <span className="toolbar-divider" />
            <button
              title={t("磁吸", "Magnet")}
              className={magnet ? "active" : ""}
              onClick={() => setMagnet(!magnet)}
            >
              <Magnet size={16} />
            </button>
            <button
              title={t("锁定画线", "Lock drawings")}
              className={locked ? "active" : ""}
              onClick={() => {
                setLocked(!locked);
                setPending([]);
              }}
            >
              {locked ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}
            </button>
            <button
              title={t("隐藏画线", "Hide drawings")}
              className={hidden ? "active" : ""}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              disabled={locked || !drawings.length}
              title={
                selected
                  ? t("删除选中画线", "Delete selected")
                  : t("清空画线", "Clear drawings")
              }
              onClick={() => {
                commit(
                  selected ? drawings.filter((d) => d.id !== selected) : [],
                );
                setSelected(null);
                setPending([]);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        <div className="chart-surface">
          <div className="ohlc">
            <b>
              {instrument.symbol} · {period}
            </b>
            <span>
              {t("开", "O")} {number(active.open, instrument.decimals)}
            </span>
            <span>
              {t("高", "H")} {number(active.high, instrument.decimals)}
            </span>
            <span>
              {t("低", "L")} {number(active.low, instrument.decimals)}
            </span>
            <span style={{ color: chartColor }}>
              {t("收", "C")} {number(active.close, instrument.decimals)}
            </span>
          </div>
          {((tool !== "cursor" && tool !== "pan") || selected) && (
            <div className="drawing-properties">
              <span>
                {selected ? t("画线", "Drawing") : t(toolMeta.zh, toolMeta.en)}
                {pending.length
                  ? ` · ${pending.length}/${toolMeta.points}`
                  : ""}
              </span>
              <input
                aria-label={t("线条颜色", "Line color")}
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (selected)
                    commit(
                      drawings.map((d) =>
                        d.id === selected ? { ...d, color: e.target.value } : d,
                      ),
                    );
                }}
              />
              <select
                aria-label={t("线条粗细", "Line width")}
                value={width}
                onChange={(e) => {
                  setWidth(+e.target.value);
                  if (selected)
                    commit(
                      drawings.map((d) =>
                        d.id === selected
                          ? { ...d, width: +e.target.value }
                          : d,
                      ),
                    );
                }}
              >
                {[1, 1.5, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}px
                  </option>
                ))}
              </select>
              <button
                title={t("退出画线", "Exit drawing")}
                onClick={() => {
                  setTool("cursor");
                  setSelected(null);
                  setPending([]);
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div
            className="chart-plot"
            ref={plot}
            onWheel={(e) => zoom(e.deltaY > 0 ? 8 : -8)}
          >
            <svg
              ref={svg}
              role="img"
              aria-label={`${instrument.symbol} ${t("交互K线图", "interactive chart")}`}
              viewBox={`0 0 ${w} ${h}`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onPointerLeave={() => {
                if (!drag.current) setHover(null);
              }}
              style={{
                touchAction: tool === "cursor" && !selected ? "pan-y" : "none",
                cursor: tool === "pan" ? "grab" : "crosshair",
              }}
            >
              <defs>
                <clipPath id={`plot-${scope.replace(/[^\w]/g, "")}-${compact}`}>
                  <rect width={pw} height={priceH} />
                </clipPath>
              </defs>
              {Array.from({ length: 7 }, (_, i) => {
                const y = 12 + (i * (priceH - 24)) / 6;
                return (
                  <g key={i}>
                    <line
                      x1="0"
                      x2={pw}
                      y1={y}
                      y2={y}
                      stroke="var(--line)"
                      strokeOpacity=".65"
                    />
                    <text x={pw + 8} y={y + 4} fill="var(--muted)">
                      {format(priceAt(y))}
                    </text>
                  </g>
                );
              })}
              {Array.from({ length: 7 }, (_, i) => {
                const idx = start + Math.floor((i * count) / 7),
                  x = tx(idx),
                  c = candles[idx];
                return (
                  c && (
                    <g key={i}>
                      <line
                        x1={x}
                        x2={x}
                        y1="0"
                        y2={h - 25}
                        stroke="var(--line)"
                        strokeOpacity=".5"
                      />
                      <text
                        x={x}
                        y={h - 8}
                        textAnchor="middle"
                        fill="var(--muted)"
                      >
                        {new Date(c.time).toLocaleString(
                          lang === "zh" ? "zh-CN" : "en-US",
                          period === "1D" || period === "1W" || period === "1M"
                            ? { month: "numeric", day: "numeric" }
                            : {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              },
                        )}
                      </text>
                    </g>
                  )
                );
              })}
              <g
                clipPath={`url(#plot-${scope.replace(/[^\w]/g, "")}-${compact})`}
              >
                {chartType === "line" ? (
                  <polyline
                    points={visible
                      .map((c, i) => `${tx(start + i)},${ty(c.close)}`)
                      .join(" ")}
                    stroke="#2962ff"
                    strokeWidth="1.8"
                    fill="none"
                  />
                ) : (
                  visible.map((c, i) => (
                    <g
                      key={c.time}
                      fill={c.close >= c.open ? "var(--up)" : "var(--down)"}
                      stroke={c.close >= c.open ? "var(--up)" : "var(--down)"}
                    >
                      <line
                        x1={tx(start + i)}
                        x2={tx(start + i)}
                        y1={ty(c.high)}
                        y2={ty(c.low)}
                        strokeWidth="1"
                      />
                      <rect
                        x={tx(start + i) - (pw / count) * 0.3}
                        y={Math.min(ty(c.open), ty(c.close))}
                        width={Math.max(1, (pw / count) * 0.6)}
                        height={Math.max(1, Math.abs(ty(c.open) - ty(c.close)))}
                        strokeWidth="0"
                      />
                    </g>
                  ))
                )}
                {main.map((name) =>
                  stats[name as "MA" | "EMA" | "BOLL"].map((values, i) => (
                    <polyline
                      key={`${name}${i}`}
                      points={linePath(values)}
                      fill="none"
                      stroke={
                        name === "BOLL"
                          ? ["#a78bfa", "#818cf8", "#818cf8"][i]
                          : ["#e5a429", "#2962ff", "#b276d7"][i]
                      }
                      strokeWidth="1.2"
                      opacity=".9"
                    />
                  )),
                )}
                {!hidden && drawings.map((d) => renderDrawing(d))}
                {!hidden &&
                  pending.length > 0 &&
                  hover &&
                  renderDrawing(
                    {
                      id: "preview",
                      tool,
                      points: [...pending, hover],
                      color,
                      width,
                    },
                    true,
                  )}
              </g>
              <line
                x1="0"
                x2={pw}
                y1={ty(instrument.price)}
                y2={ty(instrument.price)}
                stroke={instrument.change24h >= 0 ? "var(--up)" : "var(--down)"}
                strokeDasharray="5 5"
              />
              {ty(instrument.price) > 0 && ty(instrument.price) < priceH && (
                <g>
                  <rect
                    x={pw}
                    y={ty(instrument.price) - 10}
                    width={axis}
                    height="20"
                    fill={
                      instrument.change24h >= 0 ? "var(--up)" : "var(--down)"
                    }
                  />
                  <text x={pw + 5} y={ty(instrument.price) + 4} fill="white">
                    {format(instrument.price)}
                  </text>
                </g>
              )}
              {priceLines.map((line, n) => {
                const y = ty(line.price);
                if (!(y > 6 && y < priceH - 6)) return null;
                const color = LINE_COLOR[line.tone];
                return (
                  <g key={`pl-${n}`} pointerEvents="none">
                    <line
                      x1="0"
                      x2={pw}
                      y1={y}
                      y2={y}
                      stroke={color}
                      strokeDasharray="2 3"
                      opacity=".85"
                    />
                    <rect
                      x="8"
                      y={y - 9}
                      width={labelWidth(line.label)}
                      height="18"
                      rx="4"
                      fill={color}
                    />
                    <text x="14" y={y + 4} fill="white" fontSize="10">
                      {line.label}
                    </text>
                    <rect
                      x={pw}
                      y={y - 9}
                      width={axis}
                      height="18"
                      fill={color}
                      opacity=".9"
                    />
                    <text x={pw + 5} y={y + 4} fill="white" fontSize="10">
                      {format(line.price)}
                    </text>
                  </g>
                );
              })}
              <text
                x="14"
                y={priceH - 15}
                fill="var(--muted)"
                opacity=".22"
                fontSize="23"
                fontWeight="700"
              >
                AlphaPulse
              </text>
              {volume && (
                <g>
                  <line
                    x1="0"
                    x2={w}
                    y1={priceH}
                    y2={priceH}
                    stroke="var(--line)"
                  />
                  <text x="10" y={priceH + 14} fill="var(--muted)">
                    Volume {number(active.volume, 0)}
                  </text>
                  {visible.map((c, i) => {
                    const barH =
                      (c.volume / Math.max(...visible.map((c) => c.volume))) *
                      (volumeH - 22);
                    return (
                      <rect
                        key={i}
                        x={tx(start + i) - (pw / count) * 0.3}
                        y={priceH + volumeH - barH}
                        height={barH}
                        width={Math.max(1, (pw / count) * 0.6)}
                        fill={c.close >= c.open ? "#08998188" : "#f2364588"}
                      />
                    );
                  })}
                </g>
              )}
              {sub !== "NONE" &&
                (() => {
                  const lines = stats[sub as "MACD" | "RSI" | "OBV" | "KDJ"],
                    values = lines.flatMap((v) => v.slice(start, end)),
                    sMin = sub === "RSI" ? 0 : Math.min(...values, 0),
                    sMax = sub === "RSI" ? 100 : Math.max(...values),
                    mapY = (v: number) =>
                      priceH +
                      volumeH +
                      22 +
                      (subH - 30) *
                        (1 - (v - sMin) / Math.max(0.000001, sMax - sMin));
                  return (
                    <g>
                      <line
                        x1="0"
                        x2={w}
                        y1={priceH + volumeH}
                        y2={priceH + volumeH}
                        stroke="var(--line)"
                      />
                      <text
                        x="10"
                        y={priceH + volumeH + 14}
                        fill="var(--muted)"
                      >
                        {sub}
                      </text>
                      <line
                        x1="0"
                        x2={pw}
                        y1={mapY(sub === "RSI" ? 50 : 0)}
                        y2={mapY(sub === "RSI" ? 50 : 0)}
                        stroke="var(--line)"
                        strokeDasharray="3 3"
                      />
                      {lines.map((v, i) =>
                        sub === "MACD" && i === 2 ? (
                          v
                            .slice(start, end)
                            .map((n, j) => (
                              <rect
                                key={j}
                                x={tx(start + j) - (pw / count) * 0.3}
                                y={Math.min(mapY(n), mapY(0))}
                                width={Math.max(1, (pw / count) * 0.6)}
                                height={Math.max(
                                  0.7,
                                  Math.abs(mapY(n) - mapY(0)),
                                )}
                                fill={n >= 0 ? "var(--up)" : "var(--down)"}
                              />
                            ))
                        ) : (
                          <polyline
                            key={i}
                            points={linePath(v, mapY)}
                            fill="none"
                            stroke={["#e5a429", "#818cf8", "#2962ff"][i]}
                            strokeWidth="1.2"
                          />
                        ),
                      )}
                      <text x={pw + 8} y={mapY(sMax) + 4} fill="var(--muted)">
                        {number(sMax, 2)}
                      </text>
                      <text x={pw + 8} y={mapY(sMin) + 4} fill="var(--muted)">
                        {number(sMin, 2)}
                      </text>
                    </g>
                  );
                })()}
              {hover && (
                <g pointerEvents="none">
                  <line
                    x1={tx(hover.index)}
                    x2={tx(hover.index)}
                    y1="0"
                    y2={h - 26}
                    stroke="var(--muted)"
                    strokeDasharray="3 3"
                  />
                  {ty(hover.price) < priceH && (
                    <>
                      <line
                        x1="0"
                        x2={pw}
                        y1={ty(hover.price)}
                        y2={ty(hover.price)}
                        stroke="var(--muted)"
                        strokeDasharray="3 3"
                      />
                      <rect
                        x={pw}
                        y={ty(hover.price) - 10}
                        width={axis}
                        height="20"
                        fill="#64748b"
                      />
                      <text x={pw + 5} y={ty(hover.price) + 4} fill="white">
                        {format(hover.price)}
                      </text>
                    </>
                  )}
                </g>
              )}
            </svg>
            <div className="chart-zoom">
              <button title={t("缩小", "Zoom out")} onClick={() => zoom(15)}>
                <ZoomOut size={15} />
              </button>
              <button title={t("放大", "Zoom in")} onClick={() => zoom(-15)}>
                <ZoomIn size={15} />
              </button>
              <button
                title={t("重置视图", "Reset view")}
                onClick={() => {
                  setOffset(0);
                  setCount(mobile ? 40 : 90);
                  setAuto(true);
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
          <div className="chart-bottom">
            <div>
              {[
                ["1日", "1m"],
                ["5日", "15m"],
                ["1月", "4H"],
                ["3月", "1D"],
                ["1年", "1W"],
              ].map(([label, id]) => (
                <button
                  key={label}
                  onClick={() => {
                    onPeriod(id);
                    setCount(label === "1日" ? 200 : 90);
                    setOffset(0);
                  }}
                >
                  {t(
                    label,
                    label
                      .replace("日", "D")
                      .replace("月", "M")
                      .replace("年", "Y"),
                  )}
                </button>
              ))}
            </div>
            <div>
              <button
                className={scale === "log" ? "active" : ""}
                onClick={() => setScale(scale === "log" ? "linear" : "log")}
              >
                {t("对数", "Log")}
              </button>
              <button
                className={scale === "percent" ? "active" : ""}
                onClick={() =>
                  setScale(scale === "percent" ? "linear" : "percent")
                }
              >
                %
              </button>
              <button
                className={auto ? "active" : ""}
                onClick={() => {
                  setFrozenRange([currentMin, currentMax]);
                  setAuto(!auto);
                }}
              >
                {t("自动", "Auto")}
              </button>
            </div>
          </div>
        </div>
      </div>
      {textPoint && (
        <div className="market-modal-backdrop">
          <form
            className="market-modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (!annotation.trim()) return;
              commit([
                ...drawings,
                {
                  id: crypto.randomUUID(),
                  tool: "text",
                  points: [textPoint],
                  color,
                  width,
                  text: annotation.trim(),
                },
              ]);
              setTextPoint(null);
            }}
          >
            <h3>{t("文字标注", "Text annotation")}</h3>
            <input
              autoFocus
              maxLength={80}
              aria-label={t("标注内容", "Annotation")}
              placeholder={t("输入标注", "Enter text")}
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
            />
            <div className="modal-actions">
              <button type="button" onClick={() => setTextPoint(null)}>
                {t("取消", "Cancel")}
              </button>
              <button className="primary" disabled={!annotation.trim()}>
                {t("添加", "Add")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
