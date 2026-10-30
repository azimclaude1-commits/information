import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Crop,
  History,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { makeCandles, number, PERIODS, useSavedState } from "../marketModel";
import type { ChartView } from "../MarketChart";
import { ConfirmSheet, Sheet, SheetRows } from "../ui/Sheet";
import { QuotaPill, useMembership } from "../membership/Membership";
import {
  KLINE_RECORDS_KEY,
  addRecord,
  analyseKline,
  compactBars,
  selectionKey,
  type Bar,
  type KlineRecord,
  type KlineResult,
  type PatternId,
  type Plan,
} from "./klineModel";
import "./kline.css";

type Lang = "zh" | "en";
type T = (zh: string, en: string) => string;
const tr = (lang: Lang): T => (zh, en) => (lang === "zh" ? zh : en);

/* ---------------- Shared helpers ---------------- */

export const periodLabel = (p: string, lang: Lang) => {
  const row = PERIODS.find((r) => r[0] === p);
  return lang === "zh" ? (row?.[1] ?? p) : p;
};
const intraday = (p: string) => !["1D", "1W", "1M"].includes(p);
const pad = (n: number) => String(n).padStart(2, "0");
export function barTime(ts: number, period: string) {
  const d = new Date(ts);
  return intraday(period)
    ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function barSpan(from: number, to: number, period: string) {
  const a = barTime(from, period),
    b = barTime(to, period);
  return intraday(period) && a.slice(0, 5) === b.slice(0, 5) ? `${a} – ${b.slice(6)}` : `${a} – ${b}`;
}
function ago(ts: number, lang: Lang) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  const t = tr(lang);
  if (s < 60) return t("刚刚", "just now");
  if (s < 3600) return t(`${Math.floor(s / 60)} 分钟前`, `${Math.floor(s / 60)}m ago`);
  if (s < 86400) return t(`${Math.floor(s / 3600)} 小时前`, `${Math.floor(s / 3600)}h ago`);
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** The same series the trading chart draws, with the live price on the last bar. */
export function seriesFor(inst: Instrument, period: string): Bar[] {
  const src = makeCandles(inst, period, Date.now());
  const last = src.length - 1;
  return src.map((c, i) =>
    i !== last ? c : { ...c, close: inst.price, high: Math.max(c.high, inst.price), low: Math.min(c.low, inst.price) },
  );
}

/** K线分析 records, shared by the trading desk and Ace智搜 (persisted in `alphapulse.kline.v1`). */
export function useKlineRecords() {
  return useSavedState<KlineRecord[]>(KLINE_RECORDS_KEY, []);
}

function useWidth<E extends HTMLElement>() {
  const ref = useRef<E>(null);
  const [size, setSize] = useState({ w: 600, h: 300 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const PATTERNS: Record<PatternId, [string, string, string, string]> = {
  bull_engulf: ["看涨吞没", "Bullish engulfing", "阳线实体完全覆盖前一根阴线，短线买盘转强。", "A bullish body engulfs the prior bearish candle; buyers took over."],
  bear_engulf: ["看跌吞没", "Bearish engulfing", "阴线实体完全覆盖前一根阳线，短线卖压增强。", "A bearish body engulfs the prior bullish candle; sellers took over."],
  hammer: ["锤子线", "Hammer", "长下影线说明低位有资金承接。", "A long lower shadow shows buying on dips."],
  shooting_star: ["射击之星", "Shooting star", "长上影线说明高位抛压较重。", "A long upper shadow shows selling into strength."],
  doji: ["十字星", "Doji", "开收盘接近，多空暂时均衡，等待方向选择。", "Open and close nearly equal; the market is undecided."],
  three_white: ["三连阳", "Three advancing bars", "连续三根阳线逐级抬高，短线动能偏强。", "Three rising bullish bars; short-term momentum is strong."],
  three_black: ["三连阴", "Three declining bars", "连续三根阴线逐级走低，短线动能偏弱。", "Three falling bearish bars; short-term momentum is weak."],
  double_bottom: ["双底（W 底）雏形", "Double bottom forming", "两次探底位置接近，关注颈线突破确认。", "Two similar lows; watch for a neckline break."],
  double_top: ["双顶（M 头）雏形", "Double top forming", "两次冲高位置接近，关注颈线跌破确认。", "Two similar highs; watch for a neckline break."],
  breakout_up: ["向上突破区间", "Range breakout", "收盘价突破所选区间的前高。", "The last close cleared the range high."],
  breakout_down: ["向下跌破区间", "Range breakdown", "收盘价跌破所选区间的前低。", "The last close broke the range low."],
};

const stanceText = (s: KlineResult["stance"], t: T) =>
  s === "bull" ? t("偏多", "Bullish") : s === "bear" ? t("偏空", "Bearish") : t("震荡", "Range-bound");

/** One-paragraph conclusion used in the report, history and the copy button. */
export function conclusion(rec: KlineRecord, lang: Lang) {
  const t = tr(lang);
  const r = rec.result,
    f = (v: number) => number(v, rec.decimals);
  const trend = r.trend === "up" ? t("上行", "rising") : r.trend === "down" ? t("下行", "falling") : t("横盘震荡", "sideways");
  const pos = r.position > 0.66 ? t("区间上沿", "the top of the range") : r.position < 0.34 ? t("区间下沿", "the bottom of the range") : t("区间中部", "mid-range");
  return t(
    `所选 ${r.count} 根 K 线整体${trend}，区间涨跌 ${r.change >= 0 ? "+" : ""}${r.change.toFixed(2)}%，最新价 ${f(r.last)} 位于${pos}。上方关注 ${f(r.levels.r1)}，下方支撑 ${f(r.levels.s1)}，综合判断${stanceText(r.stance, t)}（${r.score} 分）。`,
    `The ${r.count} selected candles trend ${trend} (${r.change >= 0 ? "+" : ""}${r.change.toFixed(2)}%); last ${f(r.last)} sits at ${pos}. Resistance ${f(r.levels.r1)}, support ${f(r.levels.s1)}. Overall ${stanceText(r.stance, t).toLowerCase()} (${r.score}/100).`,
  );
}

/* ---------------- Candle drawing ---------------- */

function Candles({
  bars,
  x,
  y,
  bw,
  dim,
}: {
  bars: Bar[];
  x: (i: number) => number;
  y: (v: number) => number;
  bw: number;
  dim?: (i: number) => boolean;
}) {
  return (
    <>
      {bars.map((b, i) => {
        const up = b.close >= b.open;
        return (
          <g key={i} className={`${up ? "kc-up" : "kc-down"}${dim?.(i) ? " is-dim" : ""}`}>
            <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} />
            <rect
              x={x(i) - Math.max(0.6, bw * 0.32)}
              width={Math.max(1.2, bw * 0.64)}
              y={y(Math.max(b.open, b.close))}
              height={Math.max(1, Math.abs(y(b.open) - y(b.close)))}
            />
          </g>
        );
      })}
    </>
  );
}

/* ---------------- 裁剪页 ---------------- */

export type CropPick = { series: Bar[]; from: number; to: number; focus?: { lo: number; hi: number } };
type Box = { a: number; b: number; t: number; u: number };
type Mode = "move" | "l" | "r" | "t" | "b" | "tl" | "tr" | "bl" | "br" | "new";
const MIN_BARS = 5;
const AXIS_W = 58;
/** Gap above the plot so the top crop handle is fully visible. */
const TOP = 14;

/**
 * Full-screen crop page. The box starts on the candles that were on screen in the chart (plus some
 * earlier bars, dimmed, so it can be extended); drag inside to move, drag the edges/corners to resize,
 * or drag on the dimmed area to draw a new box.
 */
export function KlineCropper({
  instrument,
  period,
  view,
  lang,
  onCancel,
  onNext,
}: {
  instrument: Instrument;
  period: string;
  view?: ChartView | null;
  lang: Lang;
  onCancel: () => void;
  onNext: (pick: CropPick) => void;
}) {
  const t = tr(lang);
  const series = useMemo(() => seriesFor(instrument, period), [instrument.symbol, period]);
  const valid = !!view && view.symbol === instrument.symbol && view.period === period && view.end <= series.length && view.end - view.start >= MIN_BARS;
  const screen: [number, number] = valid ? [view!.start, view!.end] : [Math.max(0, series.length - 40), series.length];
  const extra = Math.min(screen[0], Math.max(12, Math.round((screen[1] - screen[0]) * 0.5)));
  const winStart = screen[0] - extra;
  const bars = series.slice(winStart, screen[1]);
  const n = bars.length;
  const initial: Box = { a: extra, b: n, t: 0, u: 1 };
  const [box, setBox] = useState<Box>(initial);
  const [ref, size] = useWidth<HTMLDivElement>();
  const drag = useRef<{ mode: Mode; x: number; y: number; box: Box; anchor: number; ay: number } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("kc-locked");
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".sh-panel")) onCancel();
    };
    document.addEventListener("keydown", key);
    return () => {
      document.documentElement.classList.remove("kc-locked");
      document.removeEventListener("keydown", key);
    };
  }, []);

  // Geometry: price area on top, volume strip below; the crop box spans both vertically.
  const plotW = Math.max(120, size.w - AXIS_W),
    plotH = Math.max(160, size.h - 26 - TOP);
  const volH = Math.round(plotH * 0.16),
    priceH = plotH - volH - 6;
  const bw = plotW / n;
  const lo = Math.min(...bars.map((b) => b.low)),
    hi = Math.max(...bars.map((b) => b.high));
  const padP = (hi - lo) * 0.06 || hi * 0.001;
  const pMin = lo - padP,
    pMax = hi + padP;
  const y = (v: number) => 8 + (priceH - 8) * (1 - (v - pMin) / (pMax - pMin));
  const priceAtFrac = (f: number) => {
    const py = f * plotH;
    const clamped = Math.max(8, Math.min(priceH, py));
    return pMax - ((clamped - 8) / (priceH - 8)) * (pMax - pMin);
  };
  const x = (i: number) => (i + 0.5) * bw;
  const maxVol = Math.max(...bars.map((b) => b.volume));
  const ma = (len: number) =>
    bars.map((_, i) => {
      const g = winStart + i;
      const w = series.slice(Math.max(0, g - len + 1), g + 1);
      return w.reduce((s, b) => s + b.close, 0) / w.length;
    });
  const ma5 = useMemo(() => ma(5), [series, winStart, n]);
  const ma20 = useMemo(() => ma(20), [series, winStart, n]);
  const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  const idxAt = (px: number) => Math.max(0, Math.min(n - 1, Math.floor(px / bw)));
  const local = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const mode = (target.dataset.mode as Mode | undefined) ?? "new";
    const { px, py } = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x: px, y: py, box, anchor: idxAt(px), ay: py / plotH };
    if (mode === "new") setBox({ a: idxAt(px), b: Math.min(n, idxAt(px) + 1), t: 0, u: 1 });
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const { px, py } = local(e);
    const dc = Math.round((px - d.x) / bw);
    const df = (py - d.y) / plotH;
    const b0 = d.box;
    const clampF = (v: number) => Math.max(0, Math.min(1, v));
    let next: Box = { ...b0 };
    if (d.mode === "new") {
      const c = idxAt(px);
      let a = Math.min(d.anchor, c),
        b = Math.max(d.anchor, c) + 1;
      if (b - a < MIN_BARS) {
        b = Math.min(n, a + MIN_BARS);
        a = Math.max(0, b - MIN_BARS);
      }
      const fy = clampF(py / plotH);
      const tall = Math.abs(fy - d.ay) > 0.12;
      next = { a, b, t: tall ? Math.min(fy, d.ay) : 0, u: tall ? Math.max(fy, d.ay) : 1 };
    } else if (d.mode === "move") {
      const w = b0.b - b0.a,
        h = b0.u - b0.t;
      const a = Math.max(0, Math.min(n - w, b0.a + dc));
      const tt = Math.max(0, Math.min(1 - h, b0.t + df));
      next = { a, b: a + w, t: tt, u: tt + h };
    } else {
      if (d.mode.includes("l")) next.a = Math.max(0, Math.min(b0.b - MIN_BARS, b0.a + dc));
      if (d.mode.includes("r")) next.b = Math.min(n, Math.max(b0.a + MIN_BARS, b0.b + dc));
      if (d.mode.includes("t")) next.t = Math.max(0, Math.min(b0.u - 0.12, b0.t + df));
      if (d.mode.startsWith("b")) next.u = Math.min(1, Math.max(b0.t + 0.12, b0.u + df));
    }
    setBox(next);
  };
  const up = () => (drag.current = null);

  const count = box.b - box.a;
  const narrowed = box.t > 0.01 || box.u < 0.99;
  const focus = narrowed ? { lo: priceAtFrac(box.u), hi: priceAtFrac(box.t) } : undefined;
  const from = bars[box.a],
    to = bars[box.b - 1];
  const left = box.a * bw,
    right = box.b * bw,
    top = box.t * plotH,
    bottom = box.u * plotH;
  const preset = (k: number) => setBox({ a: Math.max(0, n - k), b: n, t: 0, u: 1 });
  const ticks = [0.12, 0.38, 0.64, 0.9].map((f) => pMin + (pMax - pMin) * f);
  const timeTicks = [0.06, 0.36, 0.66, 0.94].map((f) => Math.min(n - 1, Math.floor(f * n)));

  return createPortal(
    <div className="kc-crop" role="dialog" aria-modal="true" aria-label={t("框选 K 线", "Select candles")}>
      <div className="kc-panel">
        <header className="kc-head">
          <button className="kc-icon" aria-label={t("关闭", "Close")} onClick={onCancel}>
            <X size={20} />
          </button>
          <div>
            <h2>{t("框选 K 线", "Select candles")}</h2>
            <p>
              {instrument.symbol} · {periodLabel(period, lang)} ·{" "}
              {t(`已自动选中当前屏幕 ${screen[1] - screen[0]} 根`, `${screen[1] - screen[0]} on-screen candles preselected`)}
            </p>
          </div>
          <QuotaPill compact />
        </header>
        <div className="kc-presets" role="group" aria-label={t("快捷选择", "Presets")}>
          <button aria-pressed={box.a === extra && box.b === n && !narrowed} onClick={() => setBox(initial)}>
            {t("当前屏幕", "On screen")}
          </button>
          {[20, 60].filter((k) => k < n).map((k) => (
            <button key={k} aria-pressed={box.a === n - k && box.b === n && !narrowed} onClick={() => preset(k)}>
              {t(`最近 ${k} 根`, `Last ${k}`)}
            </button>
          ))}
          <button aria-pressed={box.a === 0 && box.b === n && !narrowed} onClick={() => preset(n)}>
            {t(`全部 ${n} 根`, `All ${n}`)}
          </button>
        </div>
        <div className="kc-stage" ref={ref}>
          <svg width={size.w} height={size.h} className="kc-svg" aria-hidden>
            <g transform={`translate(0,${TOP})`}>
            {ticks.map((v) => (
              <g key={v}>
                <line className="kc-grid" x1={0} x2={plotW} y1={y(v)} y2={y(v)} />
                <text className="kc-axis" x={plotW + 6} y={y(v) + 3}>
                  {number(v, instrument.decimals)}
                </text>
              </g>
            ))}
            {extra > 0 && (
              <g>
                <line className="kc-screen-line" x1={extra * bw} x2={extra * bw} y1={0} y2={plotH} />
                <text className="kc-screen-label" x={extra * bw - 6} y={plotH - volH - 10} textAnchor="end">
                  {t("← 更早的 K 线", "← Earlier candles")}
                </text>
              </g>
            )}
            <Candles bars={bars} x={x} y={y} bw={bw} />
            <path d={line(ma5)} className="kc-ma5" />
            <path d={line(ma20)} className="kc-ma20" />
            {bars.map((b, i) => {
              const h = (b.volume / maxVol) * (volH - 2);
              return (
                <rect
                  key={i}
                  className={b.close >= b.open ? "kc-vol-up" : "kc-vol-down"}
                  x={x(i) - Math.max(0.6, bw * 0.32)}
                  width={Math.max(1.2, bw * 0.64)}
                  y={plotH - h}
                  height={h}
                />
              );
            })}
            </g>
            {timeTicks.map((i) => (
              <text key={i} className="kc-axis" x={x(i)} y={size.h - 8} textAnchor="middle">
                {barTime(bars[i].time, period).slice(intraday(period) ? 6 : 5)}
              </text>
            ))}
          </svg>
          <div
            className="kc-overlay"
            style={{ top: TOP, width: plotW, height: plotH }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <i className="kc-mask" style={{ left: 0, top: 0, width: left, height: plotH }} />
            <i className="kc-mask" style={{ left: right, top: 0, width: plotW - right, height: plotH }} />
            <i className="kc-mask" style={{ left, top: 0, width: right - left, height: top }} />
            <i className="kc-mask" style={{ left, top: bottom, width: right - left, height: plotH - bottom }} />
            <div className="kc-box" data-mode="move" style={{ left, top, width: right - left, height: bottom - top }}>
              <span className="kc-count">
                <Crop size={11} />
                {t(`${count} 根`, `${count}`)}
              </span>
              <i className="kc-third v1" />
              <i className="kc-third v2" />
              <i className="kc-third h1" />
              <i className="kc-third h2" />
              {(["tl", "tr", "bl", "br"] as const).map((m) => (
                <b key={m} className={`kc-corner ${m}`} data-mode={m} />
              ))}
              {(["l", "r", "t", "b"] as const).map((m) => (
                <b key={m} className={`kc-edge ${m}`} data-mode={m} />
              ))}
            </div>
          </div>
        </div>
        <footer className="kc-foot">
          <div className="kc-summary">
            <b>{t(`已选 ${count} 根 K 线`, `${count} candles selected`)}</b>
            <span>{barSpan(from.time, to.time, period)}</span>
            {focus && (
              <span>
                {t("关注价格", "Price band")} {number(focus.lo, instrument.decimals)} – {number(focus.hi, instrument.decimals)}
              </span>
            )}
          </div>
          <div className="kc-actions">
            <button className="sh-btn" onClick={() => setBox(initial)}>
              <RotateCcw size={16} />
              {t("重置", "Reset")}
            </button>
            <button
              className="sh-btn sh-btn-primary"
              onClick={() => onNext({ series, from: winStart + box.a, to: winStart + box.b, focus })}
            >
              <Check size={16} />
              {t("确认选区", "Use selection")}
            </button>
          </div>
        </footer>
        <p className="kc-tip">
          {t("拖动框内移动选区，拖动边角调整范围，在暗区拖动可重新框选", "Drag inside to move, drag edges to resize, drag on the dimmed area to draw a new box")}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Flow: crop → confirm → loading → result ---------------- */

export function KlineFlow({
  instrument,
  period,
  view,
  source,
  lang,
  onClose,
  onTrade,
  onHistory,
  inline = false,
  onSaved,
}: {
  instrument: Instrument;
  period: string;
  view?: ChartView | null;
  source: KlineRecord["source"];
  lang: Lang;
  onClose: () => void;
  onTrade?: (rec: KlineRecord, side: "buy" | "sell") => void;
  onHistory?: () => void;
  /** Ace智搜 shows the result on the page instead of in a sheet. */
  inline?: boolean;
  onSaved?: (rec: KlineRecord) => void;
}) {
  const t = tr(lang);
  const m = useMembership();
  const [records, setRecords] = useKlineRecords();
  const [stage, setStage] = useState<"crop" | "confirm" | "loading" | "result">("crop");
  const [pick, setPick] = useState<CropPick | null>(null);
  const [record, setRecord] = useState<KlineRecord | null>(null);
  const [step, setStep] = useState(0);
  const pLabel = periodLabel(period, lang);

  const keyOf = (p: CropPick) =>
    selectionKey(instrument.symbol, period, p.series[p.from].time, p.series[p.to - 1].time) +
    (p.focus ? `:${p.focus.lo.toPrecision(6)}-${p.focus.hi.toPrecision(6)}` : "");
  const existing = pick ? records.find((r) => r.key === keyOf(pick) && sameDay(r.createdAt, Date.now())) : undefined;
  const reopen = !!existing && !!pick && m.isUnlocked(keyOf(pick));

  const start = () => {
    if (!pick) return;
    if (reopen && existing) {
      setRecord(existing);
      onSaved?.(existing);
      if (inline) onClose();
      else setStage("result");
      return;
    }
    const key = keyOf(pick);
    if (!m.request("kline", key, `${instrument.symbol} · ${pLabel} ${t("K线分析", "chart analysis")}`)) {
      setStage("crop");
      return;
    }
    const result = analyseKline(pick.series, pick.from, pick.to, pick.focus);
    const rec: KlineRecord = {
      id: `K${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      key,
      source,
      symbol: instrument.symbol,
      nameZh: instrument.nameZh,
      nameEn: instrument.nameEn,
      decimals: instrument.decimals,
      period,
      createdAt: Date.now(),
      fromTime: pick.series[pick.from].time,
      toTime: pick.series[pick.to - 1].time,
      bars: compactBars(pick.series.slice(pick.from, pick.to)),
      result,
    };
    // Saved before the loading animation so closing early never loses a charged analysis.
    setRecords((old) => addRecord(old, rec));
    setRecord(rec);
    setStep(0);
    setStage("loading");
  };

  const steps = [
    t(`读取 ${pick ? pick.to - pick.from : 0} 根 K 线`, `Read ${pick ? pick.to - pick.from : 0} candles`),
    t("识别 K 线形态", "Detect candle patterns"),
    t("计算支撑阻力与指标", "Levels and indicators"),
    t("生成交易计划", "Build trade plans"),
  ];
  useEffect(() => {
    if (stage !== "loading") return;
    if (step >= steps.length) {
      if (record) onSaved?.(record);
      if (inline) onClose();
      else setStage("result");
      return;
    }
    const id = window.setTimeout(() => setStep((s) => s + 1), Math.max(380, m.delay / 2));
    return () => window.clearTimeout(id);
  }, [stage, step]);

  return (
    <>
      {(stage === "crop" || stage === "confirm") && (
        <KlineCropper
          instrument={instrument}
          period={period}
          view={view}
          lang={lang}
          onCancel={onClose}
          onNext={(p) => {
            setPick(p);
            setStage("confirm");
          }}
        />
      )}
      {stage === "confirm" && pick && (
        <ConfirmSheet
          title={t("针对当前 K 线进行分析？", "Analyse these candles?")}
          confirm={reopen ? t("查看结果", "View result") : t("开始分析", "Analyse")}
          cancel={t("返回调整", "Adjust")}
          onClose={() => setStage("crop")}
          onConfirm={start}
        >
          <div className="kf-confirm">
            <MiniCandles bars={pick.series.slice(pick.from, pick.to)} />
            <SheetRows
              rows={[
                [t("品种", "Symbol"), `${instrument.symbol} · ${lang === "zh" ? instrument.nameZh : instrument.nameEn}`],
                [t("周期", "Period"), pLabel],
                [t("K 线数量", "Candles"), t(`${pick.to - pick.from} 根`, `${pick.to - pick.from}`)],
                [t("时间范围", "Time"), barSpan(pick.series[pick.from].time, pick.series[pick.to - 1].time, period)],
                ...(pick.focus
                  ? ([[t("关注价格", "Price band"), `${number(pick.focus.lo, instrument.decimals)} – ${number(pick.focus.hi, instrument.decimals)}`]] as [string, string][])
                  : []),
              ]}
            />
            <div className="kf-cost">
              {reopen ? (
                <span>{t("该选区今天已分析过，查看结果不扣次数", "Already analysed today — reopening is free")}</span>
              ) : (
                <span>{t("确认后将消耗 1 次 AI 分析", "Uses 1 AI analysis")}</span>
              )}
              <QuotaPill />
            </div>
          </div>
        </ConfirmSheet>
      )}
      {stage === "loading" && record && (
        <Sheet title={t("AI 正在分析 K 线", "Analysing candles")} subtitle={`${record.symbol} · ${pLabel}`} size="sm" onClose={onClose}>
          <div className="kf-loading">
            <div className="kf-scan">
              <MiniCandles bars={record.bars} />
              <i />
            </div>
            <ol>
              {steps.map((s, i) => (
                <li key={s} className={i < step ? "is-done" : i === step ? "is-now" : ""}>
                  <span>{i < step ? <Check size={11} strokeWidth={3} /> : null}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </Sheet>
      )}
      {stage === "result" && record && (
        <KlineResultSheet
          record={record}
          lang={lang}
          onClose={onClose}
          onTrade={onTrade}
          onRecrop={() => setStage("crop")}
          onHistory={onHistory}
        />
      )}
    </>
  );
}

/* ---------------- Result ---------------- */

export function KlineResultSheet({
  record,
  lang,
  onClose,
  onTrade,
  onRecrop,
  onHistory,
}: {
  record: KlineRecord;
  lang: Lang;
  onClose: () => void;
  onTrade?: (rec: KlineRecord, side: "buy" | "sell") => void;
  onRecrop?: () => void;
  onHistory?: () => void;
}) {
  const t = tr(lang);
  return (
    <Sheet
      title={t(`${record.symbol} · ${periodLabel(record.period, lang)} K线分析`, `${record.symbol} · ${record.period} chart analysis`)}
      subtitle={`${barSpan(record.fromTime, record.toTime, record.period)} · ${t(`${record.result.count} 根`, `${record.result.count} candles`)}`}
      size="full"
      className="kr-sheet"
      onClose={onClose}
      footer={
        <>
          {onRecrop && (
            <button className="sh-btn" onClick={onRecrop}>
              <Crop size={16} />
              {t("重新框选", "Reselect")}
            </button>
          )}
          {onHistory ? (
            <button className="sh-btn sh-btn-primary" onClick={onHistory}>
              <History size={16} />
              {t("全部分析记录", "All records")}
            </button>
          ) : (
            <button className="sh-btn sh-btn-primary" onClick={onClose}>
              {t("完成", "Done")}
            </button>
          )}
        </>
      }
    >
      <KlineReport record={record} lang={lang} onTrade={onTrade} />
    </Sheet>
  );
}

function MiniCandles({ bars }: { bars: Bar[] }) {
  const [ref, size] = useWidth<HTMLDivElement>();
  const lo = Math.min(...bars.map((b) => b.low)),
    hi = Math.max(...bars.map((b) => b.high));
  const h = 64;
  const y = (v: number) => 3 + (h - 6) * (1 - (v - lo) / (hi - lo || 1));
  const bw = size.w / bars.length;
  return (
    <div className="kf-mini" ref={ref}>
      <svg width={size.w} height={h} aria-hidden>
        <Candles bars={bars} x={(i) => (i + 0.5) * bw} y={y} bw={bw} />
      </svg>
    </div>
  );
}

/** Snapshot of the selected candles with key levels, the focus band and pattern markers. */
function Snapshot({ record, lang }: { record: KlineRecord; lang: Lang }) {
  const t = tr(lang);
  const [ref, size] = useWidth<HTMLDivElement>();
  const { bars, result: r, decimals } = record;
  const h = 210,
    axis = 84;
  const pw = Math.max(100, size.w - axis);
  const lvls = [r.levels.r1, r.levels.s1, r.levels.pivot];
  const lo = Math.min(...bars.map((b) => b.low), ...lvls),
    hi = Math.max(...bars.map((b) => b.high), ...lvls);
  const padP = (hi - lo) * 0.08 || hi * 0.001;
  const y = (v: number) => 10 + (h - 30) * (1 - (v - (lo - padP)) / (hi - lo + padP * 2));
  const bw = pw / bars.length;
  const x = (i: number) => (i + 0.5) * bw;
  const level = (v: number, cls: string, label: string) => (
    <g className={cls}>
      <line x1={0} x2={pw} y1={y(v)} y2={y(v)} />
      <rect x={pw + 2} y={y(v) - 8} width={axis - 4} height={16} rx={3} />
      <text x={pw + 6} y={y(v) + 3.5}>
        {label} {number(v, decimals)}
      </text>
    </g>
  );
  return (
    <div className="kr-snap" ref={ref}>
      <svg width={size.w} height={h} role="img" aria-label={t("K 线快照", "Candle snapshot")}>
        {r.focus && (
          <rect className="kr-focus" x={0} width={pw} y={y(r.focus.hi)} height={Math.max(2, y(r.focus.lo) - y(r.focus.hi))} />
        )}
        <Candles bars={bars} x={x} y={y} bw={bw} />
        {level(r.levels.pivot, "kr-lv is-pivot", "P")}
        {level(r.levels.r1, "kr-lv is-r", "R1")}
        {level(r.levels.s1, "kr-lv is-s", "S1")}
        {r.patterns.map((p) => {
          const b = bars[p.index];
          if (!b) return null;
          const above = p.tone === "bear";
          const cy = above ? y(b.high) - 9 : y(b.low) + 9;
          return (
            <g key={p.id} className={`kr-mark is-${p.tone}`}>
              <circle cx={x(p.index)} cy={cy} r={4} />
            </g>
          );
        })}
        <text className="kr-snap-time" x={2} y={h - 6}>
          {barTime(record.fromTime, record.period)}
        </text>
        <text className="kr-snap-time" x={pw - 2} y={h - 6} textAnchor="end">
          {barTime(record.toTime, record.period)}
        </text>
      </svg>
    </div>
  );
}

function PlanCard({
  plan,
  side,
  primary,
  record,
  lang,
  onTrade,
}: {
  plan: Plan;
  side: "buy" | "sell";
  primary: boolean;
  record: KlineRecord;
  lang: Lang;
  onTrade?: (rec: KlineRecord, side: "buy" | "sell") => void;
}) {
  const t = tr(lang);
  const f = (v: number) => number(v, record.decimals);
  const stance = record.result.stance;
  const title =
    stance === "range"
      ? side === "buy"
        ? t("区间低吸", "Buy the range low")
        : t("区间高抛", "Sell the range high")
      : primary
        ? side === "buy"
          ? t("顺势做多", "Trend long")
          : t("顺势做空", "Trend short")
        : side === "buy"
          ? t("反弹做多（轻仓）", "Counter-trend long (small)")
          : t("冲高做空（轻仓）", "Counter-trend short (small)");
  return (
    <div className={`kr-plan is-${side}${primary ? " is-primary" : ""}`}>
      <header>
        {side === "buy" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        <b>{title}</b>
        <em>
          {t("盈亏比", "R:R")} 1 : {plan.rr.toFixed(1)}
        </em>
      </header>
      <dl>
        <div>
          <dt>{t("进场", "Entry")}</dt>
          <dd>{f(plan.entry)}</dd>
        </div>
        <div>
          <dt>{t("止损", "Stop")}</dt>
          <dd className="is-stop">{f(plan.stop)}</dd>
        </div>
        <div>
          <dt>{t("目标", "Target")}</dt>
          <dd className="is-target">{f(plan.target)}</dd>
        </div>
      </dl>
      {onTrade && (
        <button onClick={() => onTrade(record, side)}>
          {side === "buy" ? t("按此计划做多", "Long with this plan") : t("按此计划做空", "Short with this plan")}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

/** The full reading: conclusion, snapshot, patterns, indicators, levels and two plans. */
export function KlineReport({
  record,
  lang,
  onTrade,
}: {
  record: KlineRecord;
  lang: Lang;
  onTrade?: (rec: KlineRecord, side: "buy" | "sell") => void;
}) {
  const t = tr(lang);
  const r = record.result;
  const f = (v: number) => number(v, record.decimals);
  const [copied, setCopied] = useState(false);
  const longFirst = r.stance !== "bear";
  const rsiLabel = r.rsi > 70 ? t("超买", "overbought") : r.rsi < 30 ? t("超卖", "oversold") : r.rsi >= 50 ? t("偏强", "firm") : t("偏弱", "soft");
  const kdjLabel = r.kdj.j > 100 ? t("高位钝化", "stretched high") : r.kdj.j < 0 ? t("低位钝化", "stretched low") : r.kdj.k >= r.kdj.d ? t("K 上穿 D", "K above D") : t("K 下穿 D", "K below D");
  const ind: [string, string, string, string][] = [
    [
      "MA",
      r.ma.order === "bull" ? t("多头排列", "Bullish stack") : r.ma.order === "bear" ? t("空头排列", "Bearish stack") : t("均线交织", "Mixed"),
      `MA5 ${f(r.ma.ma5)} · MA10 ${f(r.ma.ma10)} · MA20 ${f(r.ma.ma20)}`,
      r.ma.order === "bull" ? "up" : r.ma.order === "bear" ? "down" : "",
    ],
    [
      "MACD",
      r.macd.cross
        ? r.macd.cross === "golden"
          ? t(`金叉 · ${r.macd.crossAgo} 根前`, `Golden cross · ${r.macd.crossAgo} bars ago`)
          : t(`死叉 · ${r.macd.crossAgo} 根前`, `Dead cross · ${r.macd.crossAgo} bars ago`)
        : r.macd.hist >= 0
          ? t("红柱区间", "Positive histogram")
          : t("绿柱区间", "Negative histogram"),
      `DIF ${r.macd.dif.toFixed(3)} · DEA ${r.macd.dea.toFixed(3)}`,
      r.macd.hist >= 0 ? "up" : "down",
    ],
    ["RSI(14)", `${r.rsi.toFixed(1)} · ${rsiLabel}`, t("50 以上偏强，70/30 为超买/超卖", "Above 50 is firm; 70/30 mark extremes"), r.rsi >= 50 ? "up" : "down"],
    ["KDJ", kdjLabel, `K ${r.kdj.k.toFixed(1)} · D ${r.kdj.d.toFixed(1)} · J ${r.kdj.j.toFixed(1)}`, r.kdj.k >= r.kdj.d ? "up" : "down"],
    [
      t("成交量", "Volume"),
      r.volume.trend === "expand" ? t("放量", "Expanding") : r.volume.trend === "shrink" ? t("缩量", "Contracting") : t("量能平稳", "Steady"),
      t(`近 5 根均量为区间均量的 ${r.volume.ratio.toFixed(2)} 倍`, `Last 5 bars at ${r.volume.ratio.toFixed(2)}× the range average`),
      "",
    ],
  ];
  const copy = () => {
    const text = `【${record.symbol} · ${periodLabel(record.period, lang)} ${t("K线分析", "chart analysis")}】${barSpan(record.fromTime, record.toTime, record.period)}\n${conclusion(record, lang)}\nR1 ${f(r.levels.r1)} / S1 ${f(r.levels.s1)} · ${t("做多", "Long")} ${f(r.plans.long.entry)}→${f(r.plans.long.target)} (SL ${f(r.plans.long.stop)}) · ${t("做空", "Short")} ${f(r.plans.short.entry)}→${f(r.plans.short.target)} (SL ${f(r.plans.short.stop)})`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <article className="kr">
      <section className={`kr-verdict is-${r.stance}`}>
        <div className="kr-score">
          <b>{r.score}</b>
          <small>/100</small>
        </div>
        <div className="kr-verdict-main">
          <div>
            <span className="kr-stance">{stanceText(r.stance, t)}</span>
            <span className="kr-src">{record.source === "desk" ? t("交易台", "Trading desk") : "Ace智搜"}</span>
            <time>{ago(record.createdAt, lang)}</time>
          </div>
          <p>{conclusion(record, lang)}</p>
        </div>
      </section>

      <Snapshot record={record} lang={lang} />

      <section className="kr-sec">
        <h4>{t("一、走势概览", "1 · Overview")}</h4>
        <div className="kr-stats">
          {(
            [
              [t("区间涨跌", "Change"), `${r.change >= 0 ? "+" : ""}${r.change.toFixed(2)}%`, r.change >= 0 ? "up" : "down"],
              [t("振幅", "Amplitude"), `${r.amplitude.toFixed(2)}%`, ""],
              [t("最高 / 最低", "High / low"), `${f(r.high)} / ${f(r.low)}`, ""],
              [t("趋势斜率", "Slope"), `${r.slope >= 0 ? "+" : ""}${r.slope.toFixed(3)}%/${t("根", "bar")}`, r.slope >= 0 ? "up" : "down"],
            ] as [string, string, string][]
          ).map(([k, v, c]) => (
            <div key={k}>
              <span>{k}</span>
              <b className={c}>{v}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="kr-sec">
        <h4>{t("二、形态识别", "2 · Patterns")}</h4>
        {r.patterns.length ? (
          <ul className="kr-patterns">
            {r.patterns.map((p) => (
              <li key={p.id} className={`is-${p.tone}`}>
                <i />
                <div>
                  <b>
                    {t(PATTERNS[p.id][0], PATTERNS[p.id][1])}
                    <small>
                      {r.count - 1 - p.index === 0 ? t("最新一根", "latest bar") : t(`${r.count - 1 - p.index} 根前`, `${r.count - 1 - p.index} bars ago`)}
                    </small>
                  </b>
                  <span>{t(PATTERNS[p.id][2], PATTERNS[p.id][3])}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="kr-muted">{t("所选区间内没有明显的经典 K 线形态。", "No classic candle pattern in this range.")}</p>
        )}
      </section>

      <section className="kr-sec">
        <h4>{t("三、技术指标", "3 · Indicators")}</h4>
        <div className="kr-ind">
          {ind.map(([name, state, detail, tone]) => (
            <div key={name}>
              <span>{name}</span>
              <b className={tone}>{state}</b>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="kr-sec">
        <h4>{t("四、关键点位", "4 · Key levels")}</h4>
        <ol className="kr-ladder">
          {(
            [
              ["R2", r.levels.r2, "is-r"],
              ["R1", r.levels.r1, "is-r"],
              [t("最新", "Last"), r.last, "is-last"],
              [t("枢轴", "Pivot"), r.levels.pivot, ""],
              ["S1", r.levels.s1, "is-s"],
              ["S2", r.levels.s2, "is-s"],
            ] as [string, number, string][]
          )
            .sort((a, b) => b[1] - a[1])
            .map(([k, v, c]) => (
              <li key={k} className={c}>
                <span>{k}</span>
                <i />
                <b>{f(v)}</b>
              </li>
            ))}
        </ol>
        {r.focus && (
          <p className="kr-muted">
            {t("你框选的关注价格区间：", "Your price band: ")}
            {f(r.focus.lo)} – {f(r.focus.hi)}
            {r.last > r.focus.hi
              ? t("，最新价位于其上方。", "; price is above it.")
              : r.last < r.focus.lo
                ? t("，最新价位于其下方。", "; price is below it.")
                : t("，最新价正在区间内。", "; price is inside it.")}
          </p>
        )}
      </section>

      <section className="kr-sec">
        <h4>{t("五、策略建议", "5 · Plans")}</h4>
        <div className="kr-plans">
          {longFirst ? (
            <>
              <PlanCard plan={r.plans.long} side="buy" primary record={record} lang={lang} onTrade={onTrade} />
              <PlanCard plan={r.plans.short} side="sell" primary={false} record={record} lang={lang} onTrade={onTrade} />
            </>
          ) : (
            <>
              <PlanCard plan={r.plans.short} side="sell" primary record={record} lang={lang} onTrade={onTrade} />
              <PlanCard plan={r.plans.long} side="buy" primary={false} record={record} lang={lang} onTrade={onTrade} />
            </>
          )}
        </div>
      </section>

      <div className="kr-disclaimer">
        <ShieldCheck size={15} />
        <p>
          {t(
            "本结果由 AI 基于所选 K 线与技术指标生成，仅供参考，不构成投资建议。行情基于模拟数据，请结合自身风险偏好独立决策。",
            "Generated by AI from the selected candles and indicators for reference only; not investment advice. Quotes are simulated.",
          )}
        </p>
      </div>
      <button className="kr-copy" onClick={copy}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? t("已复制分析结论", "Copied") : t("复制分析结论", "Copy summary")}
      </button>
    </article>
  );
}

/* ---------------- History ---------------- */

function Spark({ bars }: { bars: Bar[] }) {
  const closes = bars.map((b) => b.close);
  const lo = Math.min(...closes),
    hi = Math.max(...closes);
  const d = closes
    .map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, closes.length - 1)) * 64).toFixed(1)},${(26 - ((v - lo) / (hi - lo || 1)) * 22).toFixed(1)}`)
    .join("");
  const up = closes.at(-1)! >= closes[0];
  return (
    <svg className={`kh-spark ${up ? "is-up" : "is-down"}`} viewBox="0 0 64 30" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function KlineHistory({
  lang,
  symbol,
  activeId,
  onOpen,
  title,
  empty,
}: {
  lang: Lang;
  /** When set, a 当前品种 / 全部 filter is shown (defaults to the current symbol). */
  symbol?: string;
  activeId?: string;
  onOpen: (rec: KlineRecord) => void;
  title?: string;
  empty?: React.ReactNode;
}) {
  const t = tr(lang);
  const [records, setRecords] = useKlineRecords();
  const [scope, setScope] = useState<"symbol" | "all">(symbol ? "symbol" : "all");
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const list = scope === "symbol" && symbol ? records.filter((r) => r.symbol === symbol) : records;
  return (
    <section className="kh">
      <header className="kh-head">
        <h3>
          <History size={15} />
          {title ?? t("分析记录", "Records")}
          <em>{list.length}</em>
        </h3>
        {symbol && (
          <div className="ui-seg">
            <button aria-pressed={scope === "symbol"} onClick={() => setScope("symbol")}>
              {symbol}
            </button>
            <button aria-pressed={scope === "all"} onClick={() => setScope("all")}>
              {t("全部", "All")}
            </button>
          </div>
        )}
      </header>
      {list.length ? (
        <ul className="kh-list">
          {list.map((r) => (
            <li key={r.id}>
              <button className="kh-row" aria-pressed={r.id === activeId} onClick={() => onOpen(r)}>
                <Spark bars={r.bars} />
                <span className="kh-main">
                  <b>
                    {r.symbol} · {periodLabel(r.period, lang)}
                  </b>
                  <small>
                    {t(`${r.result.count} 根`, `${r.result.count} bars`)} · {barSpan(r.fromTime, r.toTime, r.period)}
                  </small>
                </span>
                <span className="kh-end">
                  <em className={`is-${r.result.stance}`}>
                    {stanceText(r.result.stance, t)} {r.result.score}
                  </em>
                  <small>
                    {r.source === "desk" ? t("交易台", "Desk") : "Ace"} · {ago(r.createdAt, lang)}
                  </small>
                </span>
              </button>
              <button className="kh-del" aria-label={t("删除记录", "Delete record")} onClick={() => setConfirmClear(r.id)}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="kh-empty">
          {empty ?? (
            <>
              <Sparkles size={18} />
              <span>{t("还没有 K 线分析记录", "No chart analyses yet")}</span>
            </>
          )}
        </div>
      )}
      {confirmClear && (
        <ConfirmSheet
          title={t("删除这条分析记录？", "Delete this record?")}
          confirm={t("删除", "Delete")}
          cancel={t("取消", "Cancel")}
          danger
          onClose={() => setConfirmClear(null)}
          onConfirm={() => {
            setRecords((old) => old.filter((r) => r.id !== confirmClear));
            setConfirmClear(null);
          }}
        >
          <p className="kr-muted">{t("删除后在交易台和 Ace智搜 中都不再显示。", "It will be removed from both the desk and Ace.")}</p>
        </ConfirmSheet>
      )}
    </section>
  );
}

/* ---------------- Ace智搜 → K线分析 workspace ---------------- */

const WS_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "XAU/USD", "NVDA", "AAPL", "TSLA", "EUR/USD"];
const WS_PERIODS = ["15m", "1H", "4H", "1D"];

/**
 * Ace智搜's K线分析 page. Starts new analyses for any symbol / period and lists the same records as the
 * trading desk's K线分析 tab, with the selected record's full report below.
 */
export function KlineWorkspace({
  instruments,
  lang,
  onTrade,
}: {
  instruments: Instrument[];
  lang: Lang;
  onTrade: (symbol: string, side: "buy" | "sell") => void;
}) {
  const t = tr(lang);
  const [records] = useKlineRecords();
  const [activeId, setActiveId] = useState<string | undefined>(records[0]?.id);
  const active = records.find((r) => r.id === activeId) ?? records[0];
  const [symbol, setSymbol] = useState(active?.symbol && WS_SYMBOLS.includes(active.symbol) ? active.symbol : "BTC/USD");
  const [period, setPeriod] = useState("1H");
  const [open, setOpen] = useState(false);
  const inst = instruments.find((i) => i.symbol === symbol) ?? instruments[0];
  const reportRef = useRef<HTMLDivElement>(null);
  const show = (rec: KlineRecord) => {
    setActiveId(rec.id);
    window.setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  return (
    <div className="kw">
      <section className="kw-new">
        <div className="kw-new-head">
          <span className="mt-kline-icon">
            <Crop size={18} />
          </span>
          <div>
            <b>{t("新建 K 线分析", "New chart analysis")}</b>
            <p>{t("选择品种与周期，框选 K 线后由 AI 生成形态、关键点位与交易计划。", "Pick a symbol and period, select candles, and get patterns, levels and plans.")}</p>
          </div>
        </div>
        <div className="kw-chips" role="group" aria-label={t("品种", "Symbol")}>
          {WS_SYMBOLS.filter((s) => instruments.some((i) => i.symbol === s)).map((s) => (
            <button key={s} className="ui-chip" aria-pressed={symbol === s} onClick={() => setSymbol(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="kw-row">
          <div className="ui-seg" role="group" aria-label={t("周期", "Period")}>
            {WS_PERIODS.map((p) => (
              <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {periodLabel(p, lang)}
              </button>
            ))}
          </div>
          <QuotaPill />
          <button className="mb-cta kw-go" onClick={() => setOpen(true)}>
            <Crop size={15} />
            {t("框选 K 线分析", "Select candles")}
          </button>
        </div>
      </section>

      <KlineHistory
        lang={lang}
        activeId={active?.id}
        onOpen={show}
        title={t("分析记录 · 交易台与 Ace智搜共用", "Records · shared with the trading desk")}
        empty={
          <>
            <Sparkles size={18} />
            <span>
              {t(
                "还没有分析记录。在这里新建，或在交易台的「K线分析」中框选 K 线，结果都会保存在这里。",
                "No records yet. Start one here or from the desk's K线分析 tab — both are saved here.",
              )}
            </span>
          </>
        }
      />

      {active && (
        <div className="kw-report" ref={reportRef}>
          <h3 className="kw-report-title">
            {t(`【${active.symbol} · ${periodLabel(active.period, lang)}】K线分析`, `${active.symbol} · ${active.period} chart analysis`)}
            <small>
              {barSpan(active.fromTime, active.toTime, active.period)} · {t(`${active.result.count} 根`, `${active.result.count} candles`)}
            </small>
          </h3>
          <KlineReport record={active} lang={lang} onTrade={(rec, side) => onTrade(rec.symbol, side)} />
        </div>
      )}

      {open && (
        <KlineFlow
          instrument={inst}
          period={period}
          source="ace"
          lang={lang}
          inline
          onClose={() => setOpen(false)}
          onSaved={show}
        />
      )}
    </div>
  );
}
