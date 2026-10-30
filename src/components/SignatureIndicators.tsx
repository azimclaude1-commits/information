import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { Instrument } from "../data/marketData";
import { makeCandles, number, type Candle } from "./marketModel";
import {
  bbiBox,
  HIST_COLOR,
  mkrTrio,
  obvDivergence,
  trioResonance,
  type HistState,
} from "./signatureMath";
import "./signature.css";

type Lang = "zh" | "en";
type T = (zh: string, en: string) => string;

const AXIS = 58;
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Shared x geometry for the three panes: the same window of bars and the same hover index. */
type Frame = {
  start: number;
  count: number;
  bars: Candle[];
  hover: number | null;
  setHover: (i: number | null) => void;
  timeLabel: (i: number) => string;
};

function Pane({
  frame,
  height,
  min,
  max,
  ticks,
  format,
  label,
  children,
}: {
  frame: Frame;
  height: number;
  min: number;
  max: number;
  ticks: number[];
  format: (v: number) => string;
  label: string;
  children: (g: { x: (i: number) => number; y: (v: number) => number; bw: number; w: number }) => React.ReactNode;
}) {
  const [ref, w] = useWidth();
  const pw = w - AXIS;
  const bw = pw / frame.count;
  const x = (i: number) => (i - frame.start + 0.5) * bw;
  const top = 10, bottom = height - 22;
  const y = (v: number) => top + (bottom - top) * (1 - (v - min) / (max - min || 1));
  const hi = frame.hover;
  const timeTicks = [0.08, 0.3, 0.52, 0.74, 0.94].map((f) => frame.start + Math.floor(f * frame.count));
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = frame.start + Math.floor(((e.clientX - rect.left) / pw) * frame.count);
    frame.setHover(i >= frame.start && i < frame.start + frame.count ? i : null);
  };
  return (
    <div className="sig-pane" ref={ref}>
      <svg
        width={w}
        height={height}
        role="img"
        aria-label={label}
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => frame.setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line className="sig-gridline" x1={0} x2={pw} y1={y(v)} y2={y(v)} />
            <text className="sig-axis" x={pw + 6} y={y(v) + 3}>
              {format(v)}
            </text>
          </g>
        ))}
        {timeTicks.map((i) => (
          <text key={i} className="sig-axis" x={x(i)} y={height - 6} textAnchor="middle">
            {frame.timeLabel(i)}
          </text>
        ))}
        {children({ x, y, bw, w: pw })}
        {hi != null && <line className="sig-cross" x1={x(hi)} x2={x(hi)} y1={top} y2={bottom} />}
      </svg>
    </div>
  );
}

const path = (idx: number[], x: (i: number) => number, y: (v: number) => number, s: number[]) =>
  idx
    .filter((i) => Number.isFinite(s[i]))
    .map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(s[i]).toFixed(1)}`)
    .join("");
/** Line whose segment colour depends on the bar (Pine's per-bar plot colours). */
function Segments({ idx, x, y, s, color, width = 1.5 }: { idx: number[]; x: (i: number) => number; y: (v: number) => number; s: number[]; color: (i: number) => string; width?: number }) {
  return (
    <>
      {idx.slice(1).map((i) =>
        Number.isFinite(s[i]) && Number.isFinite(s[i - 1]) ? (
          <line key={i} x1={x(i - 1)} y1={y(s[i - 1])} x2={x(i)} y2={y(s[i])} stroke={color(i)} strokeWidth={width} strokeLinecap="round" />
        ) : null,
      )}
    </>
  );
}
function niceTicks(min: number, max: number, n = 4) {
  const step = (max - min) / n;
  return Array.from({ length: n + 1 }, (_, k) => min + step * k).slice(1, -1);
}
const Readout = ({ items }: { items: [string, string, string?][] }) => (
  <div className="sig-readout">
    {items.map(([k, v, c]) => (
      <span key={k}>
        <i style={{ background: c }} />
        {k} <b>{v}</b>
      </span>
    ))}
  </div>
);

export function SignatureIndicators({
  instrument,
  period,
  lang,
  mobile = false,
}: {
  instrument: Instrument;
  period: string;
  lang: Lang;
  mobile?: boolean;
}) {
  const t: T = (zh, en) => (lang === "zh" ? zh : en);
  const [now] = useState(Date.now);
  const [hover, setHover] = useState<number | null>(null);
  const source = useMemo(() => makeCandles(instrument, period, now), [instrument.symbol, period, now]);
  const bars = useMemo(
    () =>
      source.map((c, i) =>
        i !== source.length - 1
          ? c
          : { ...c, close: instrument.price, high: Math.max(c.high, instrument.price), low: Math.min(c.low, instrument.price) },
      ),
    [source, instrument.price],
  );
  const box = useMemo(() => bbiBox(bars), [bars]);
  const trio = useMemo(() => mkrTrio(bars), [bars]);
  const obv = useMemo(() => obvDivergence(bars), [bars]);
  const count = mobile ? 56 : 110;
  const start = bars.length - count;
  const daily = ["1D", "1W", "1M"].includes(period);
  const frame: Frame = {
    start,
    count,
    bars,
    hover,
    setHover,
    timeLabel: (i) => {
      const d = new Date(bars[i]?.time ?? 0);
      const p = (n: number) => String(n).padStart(2, "0");
      const day = `${p(d.getMonth() + 1)}-${p(d.getDate())}`,
        time = `${p(d.getHours())}:${p(d.getMinutes())}`;
      return period === "1M"
        ? `${d.getFullYear()}-${p(d.getMonth() + 1)}`
        : daily
          ? day
          : period.endsWith("H")
            ? `${day} ${time}`
            : time;
    },
  };
  useEffect(() => setHover(null), [instrument.symbol, period]);
  const idx = Array.from({ length: count }, (_, k) => start + k);
  const at = hover ?? bars.length - 1;
  const dec = instrument.decimals;
  const ago = (i: number) => bars.length - 1 - i;

  /* ---------- 金眼主图 ---------- */
  const vis = idx.map((i) => bars[i]);
  const pMin = Math.min(...vis.map((b) => b.low), ...idx.map((i) => box.boxBottom[i]).filter(Number.isFinite));
  const pMax = Math.max(...vis.map((b) => b.high), ...idx.map((i) => box.boxTop[i]).filter(Number.isFinite));
  const pad = (pMax - pMin) * 0.12;
  const visLabels = box.labels.filter((l) => l.index >= start);
  const lastSignal = [...box.labels].reverse().find((l) => l.kind === "B" || l.kind === "S");
  const lastAdd = [...box.labels].reverse().find((l) => l.kind === "add-long" || l.kind === "add-short");
  const uptrend = bars[at].close > box.safe[at];
  const boxPos = ((bars[at].close - box.boxBottom[at]) / (box.boxTop[at] - box.boxBottom[at] || 1)) * 100;

  /* ---------- 三合一 ---------- */
  const trioVals = idx.flatMap((i) => [trio.dif[i], trio.dea[i], trio.macd[i], trio.j[i]]).filter(Number.isFinite);
  const tMin = Math.min(0, ...trioVals) - 4, tMax = Math.max(100, ...trioVals) + 4;
  const res = trioResonance(trio);
  const histName: Record<HistState, string> = {
    "bull-accel": t("多头加速", "Bull accelerating"),
    "bull-fade": t("多头滞涨", "Bull fading"),
    "bear-rebound": t("空头反弹", "Bear rebounding"),
    "bear-accel": t("空头加速", "Bear accelerating"),
  };

  /* ---------- 背离 ---------- */
  const visDivs = obv.labels.filter((l) => l.index >= start);
  const placed: { x: number; y: number; h: number; bull: boolean }[] = [];
  const lastDiv = obv.labels.at(-1);

  return (
    <section className={`sig-panel${mobile ? " is-mobile" : ""}`} aria-label={t("特色指标", "Signature indicators")}>
      <header className="sig-panel-head">
        <div>
          <h2>
            <Sparkles size={16} />
            {t("特色指标", "Signature indicators")}
          </h2>
          <p>
            {instrument.symbol} · {period} · {t("与上方 K 线同周期，十字光标联动", "Same period as the chart above, linked crosshair")}
          </p>
        </div>
      </header>

      <div className="sig-grid">
        {/* 金眼主图 */}
        <article className="sig-card sig-card-main">
          <header className="sig-head">
            <div className="sig-title">
              <span className="sig-tag">{t("主图", "Overlay")}</span>
              <h3>{t("金眼主图", "Golden Eye")}</h3>
              <small>BBI Box System</small>
            </div>
            <div className="sig-chips">
              <span className={uptrend ? "is-up" : "is-down"}>
                {uptrend ? t("安全线上方 · 多头", "Above safe line · bullish") : t("安全线下方 · 空头", "Below safe line · bearish")}
              </span>
              {lastSignal && (
                <span className={lastSignal.kind === "B" ? "is-up" : "is-down"}>
                  {t("最近信号", "Last signal")} {lastSignal.kind} · {ago(lastSignal.index)} {t("根前", "bars ago")}
                </span>
              )}
              {lastAdd && (
                <span className="is-warn">
                  {lastAdd.kind === "add-long" ? "▲" : "▼"} {t("加仓提示", "Add-on")} · {ago(lastAdd.index)} {t("根前", "bars ago")}
                </span>
              )}
            </div>
          </header>
          <Readout
            items={[
              ["BBI", number(box.bbi[at], dec), "#9ca3af"],
              [t("安全线", "Safe line"), number(box.safe[at], dec), "#22d3ee"],
              [t("箱顶", "Box top"), number(box.boxTop[at], dec), "#f87171"],
              [t("箱底", "Box bottom"), number(box.boxBottom[at], dec), "#4ade80"],
              [t("箱体位置", "In box"), `${Math.round(boxPos)}%`],
            ]}
          />
          <Pane
            frame={frame}
            height={mobile ? 250 : 320}
            min={pMin - pad}
            max={pMax + pad}
            ticks={niceTicks(pMin - pad, pMax + pad)}
            format={(v) => number(v, dec)}
            label={t("金眼主图", "Golden Eye overlay")}
          >
            {({ x, y, bw, w }) => (
              <>
                {idx.map((i) => {
                  const b = bars[i], up = b.close >= b.open;
                  return (
                    <g key={i} className={up ? "sig-up" : "sig-down"}>
                      <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} />
                      <rect x={x(i) - bw * 0.32} width={Math.max(1, bw * 0.64)} y={y(Math.max(b.open, b.close))} height={Math.max(1, Math.abs(y(b.open) - y(b.close)))} />
                    </g>
                  );
                })}
                <path d={path(idx, x, y, box.boxTop)} className="sig-line" stroke="#f87171" strokeOpacity={0.75} />
                <path d={path(idx, x, y, box.boxBottom)} className="sig-line" stroke="#4ade80" strokeOpacity={0.75} />
                <path d={path(idx, x, y, box.bbi)} className="sig-line" stroke="#9ca3af" />
                <path d={path(idx, x, y, box.safe)} className="sig-line sig-dots" stroke="#22d3ee" />
                <line className="sig-last" x1={0} x2={w} y1={y(instrument.price)} y2={y(instrument.price)} />
                <rect className="sig-last-tag" x={w + 2} y={y(instrument.price) - 8} width={AXIS - 4} height={16} rx={3} />
                <text className="sig-last-text" x={w + 6} y={y(instrument.price) + 3.5}>
                  {number(instrument.price, dec)}
                </text>
                {visLabels.map((l) => {
                  const cx = x(l.index);
                  if (l.kind === "add-long" || l.kind === "add-short") {
                    const long = l.kind === "add-long";
                    return (
                      <text key={`${l.kind}${l.index}`} className="sig-add" x={cx} y={long ? y(l.price) + 15 : y(l.price) - 7} textAnchor="middle">
                        {long ? "▲" : "▼"}
                      </text>
                    );
                  }
                  const buy = l.kind === "B";
                  const ty = buy ? y(l.price) + 8 : y(l.price) - 24;
                  return (
                    <g key={`${l.kind}${l.index}`} className={buy ? "sig-b" : "sig-s"}>
                      <path d={buy ? `M${cx},${ty - 5}l-4,5h8z` : `M${cx},${ty + 21}l-4,-5h8z`} />
                      <rect x={cx - 8} y={ty} width={16} height={16} rx={3} />
                      <text x={cx} y={ty + 11.5} textAnchor="middle">
                        {l.kind}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </Pane>
          <details className="sig-help">
            <summary>{t("使用说明", "How to use")}</summary>
            <ul>
              <li>{t("B / S：多头动能爆发或底部确立出 B，可考虑做多；空头动能爆发或顶部确立出 S，可考虑平多或做空。", "B / S: B marks a bullish breakout or confirmed bottom; S marks a bearish breakout or confirmed top.")}</li>
              <li>{t("黄色 ▲ / ▼：趋势中的顺势加仓、回调低吸或反弹高抛提示。", "Yellow ▲ / ▼: add-on hints within the prevailing trend.")}</li>
              <li>{t("趋势跟踪：价格在青色安全线上方出现 B 做多，途中 ▲ 可加仓；在安全线下方出现 S 做空，途中 ▼ 可加空。", "Trend: go long on B above the cyan safe line (add on ▲); go short on S below it (add on ▼).")}</li>
              <li>{t("箱体高抛低吸：价格在红色箱顶与绿色箱底之间震荡时，近下轨出现 B / ▲ 低吸，近上轨出现 S / ▼ 高抛。", "Range: inside the red top and green bottom, buy B / ▲ near the bottom and sell S / ▼ near the top.")}</li>
              <li>{t("拐点信号需右侧 3 根 K 线确认后回标在极值处，无未来函数；同类信号 3 根内不重复标注。", "Pivot signals are confirmed 3 bars later and drawn on the extreme; duplicates within 3 bars are suppressed.")}</li>
            </ul>
          </details>
        </article>

        {/* 三合一副图 */}
        <article className="sig-card">
          <header className="sig-head">
            <div className="sig-title">
              <span className="sig-tag">{t("副图", "Pane")}</span>
              <h3>{t("三合一副图", "Trio oscillator")}</h3>
              <small>MACD · KDJ · RSI</small>
            </div>
            <div className="sig-chips">
              <span style={{ color: HIST_COLOR[trio.state[at]], borderColor: `${HIST_COLOR[trio.state[at]]}55`, background: `${HIST_COLOR[trio.state[at]]}14` }}>
                {histName[trio.state[at]]}
              </span>
              <span className={trio.dif[at] >= trio.dea[at] ? "is-warn" : ""}>
                {trio.dif[at] >= trio.dea[at] ? t("橙带 · 多头控盘", "Amber band · bulls") : t("深色带 · 空头控盘", "Dark band · bears")}
              </span>
            </div>
          </header>
          <Readout
            items={[
              ["DIF", trio.dif[at].toFixed(2), "#dca01e"],
              ["DEA", trio.dea[at].toFixed(2), "#94a3b8"],
              ["MACD", trio.macd[at].toFixed(2), HIST_COLOR[trio.state[at]]],
              ["K", trio.k[at].toFixed(1), "#8d6e63"],
              ["D", trio.d[at].toFixed(1), "#64748b"],
              ["J", trio.j[at].toFixed(1), "#ef4444"],
              ["RSI24", trio.rsi[at].toFixed(1), trio.rsi[at] > 40 ? "#f87171" : "#38bdf8"],
            ]}
          />
          <Pane frame={frame} height={mobile ? 190 : 220} min={tMin} max={tMax} ticks={[0, 20, 80, 100]} format={(v) => String(v)} label={t("三合一副图", "Trio oscillator")}>
            {({ x, y, bw, w }) => (
              <>
                <line className="sig-hl-strong" x1={0} x2={w} y1={y(100)} y2={y(100)} />
                <line className="sig-hl-strong" x1={0} x2={w} y1={y(0)} y2={y(0)} />
                <line className="sig-hl" x1={0} x2={w} y1={y(80)} y2={y(80)} />
                <line className="sig-hl" x1={0} x2={w} y1={y(20)} y2={y(20)} />
                {idx.slice(1).map((i) => (
                  <polygon
                    key={`b${i}`}
                    points={`${x(i - 1)},${y(trio.dif[i - 1])} ${x(i)},${y(trio.dif[i])} ${x(i)},${y(trio.dea[i])} ${x(i - 1)},${y(trio.dea[i - 1])}`}
                    fill={trio.dif[i] >= trio.dea[i] ? "#dca01e" : "#3c465a"}
                    fillOpacity={0.3}
                  />
                ))}
                {idx.map((i) => (
                  <rect
                    key={`h${i}`}
                    x={x(i) - bw * 0.3}
                    width={Math.max(1, bw * 0.6)}
                    y={Math.min(y(0), y(trio.macd[i]))}
                    height={Math.max(0.5, Math.abs(y(0) - y(trio.macd[i])))}
                    fill={HIST_COLOR[trio.state[i]]}
                    fillOpacity={0.85}
                  />
                ))}
                <path d={path(idx, x, y, trio.k)} className="sig-line" stroke="#8d6e63" />
                <path d={path(idx, x, y, trio.d)} className="sig-line" stroke="#64748b" />
                <path d={path(idx, x, y, trio.j)} className="sig-line" stroke="#ef4444" strokeWidth={1.8} />
                <path d={path(idx, x, y, trio.dea)} className="sig-line" stroke="#94a3b8" />
                <path d={path(idx, x, y, trio.dif)} className="sig-line" stroke="#dca01e" strokeWidth={2} />
                <Segments idx={idx} x={x} y={y} s={trio.rsi} color={(i) => (trio.rsi[i] > 40 ? "#f87171" : "#38bdf8")} width={1.8} />
              </>
            )}
          </Pane>
          <div className="sig-res">
            {(
              [
                ["bottom", t("三重底共振", "Triple-bottom"), res.bottom, [t("超卖探底", "Oversold"), t("KDJ 低位金叉", "KDJ low cross"), t("动能柱转色 / 水下金叉", "Histogram turn"), t("RSI 站上 40", "RSI > 40")]],
                ["top", t("三重顶共振", "Triple-top"), res.top, [t("超买警示", "Overbought"), t("KDJ 高位死叉", "KDJ high cross"), t("动能衰竭 / 死叉", "Momentum fade"), t("RSI 跌破 40", "RSI < 40")]],
              ] as const
            ).map(([id, name, checks, labels]) => {
              const n = checks.filter((c) => c.ok).length;
              return (
                <div key={id} className={`sig-res-row is-${id}${n >= 3 ? " is-hit" : ""}`}>
                  <b>
                    {name} <em>{n}/4</em>
                  </b>
                  <ul>
                    {checks.map((c, k) => (
                      <li key={c.id} className={c.ok ? "ok" : ""}>
                        <Check size={11} strokeWidth={3} />
                        {labels[k]}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <details className="sig-help">
            <summary>{t("使用说明", "How to use")}</summary>
            <ul>
              <li>{t("DIF 按价格自适应放大，与 KDJ、RSI 共用 0–100 刻度；橙色带为多头控盘，深色带为空头控盘。", "DIF is scaled to share the 0–100 axis with KDJ and RSI; amber band = bulls in control, dark band = bears.")}</li>
              <li>{t("四色动能柱：红 = 多头加速，蓝 = 多头滞涨（警惕回调），品红 = 空头反弹（筑底），绿 = 空头加速。", "Four-colour histogram: red bull accelerating, blue bull fading, magenta bear rebounding, green bear accelerating.")}</li>
              <li>{t("三重底共振：J 下探 20 以下、KDJ 低位金叉、动能柱由绿转品红或 DIF 水下金叉、RSI 上穿 40 转红，满足越多反转概率越高。", "Triple bottom: J below 20, KDJ low golden cross, histogram turns magenta or DIF crosses up, RSI crosses 40.")}</li>
              <li>{t("三重顶共振：J 进入 80–100、柱体由红转蓝（顶背离征兆）、KDJ 高位死叉后 DIF 下穿 DEA。", "Triple top: J in 80–100, histogram red→blue, KDJ dead cross above 80 then DIF crosses down.")}</li>
              <li>{t("顺势加仓：DIF、DEA 在 0 轴上方且保持橙带，KDJ 回落至 40–50 重新金叉、蓝柱重新转红。", "Add-on: DIF/DEA above zero with amber band, KDJ re-crosses near 40–50 and the histogram turns red again.")}</li>
            </ul>
          </details>
        </article>

        {/* 背离副图 */}
        <article className="sig-card">
          <header className="sig-head">
            <div className="sig-title">
              <span className="sig-tag">{t("副图", "Pane")}</span>
              <h3>{t("背离副图", "Divergence")}</h3>
              <small>OBV-MACD · Multi-Div</small>
            </div>
            <div className="sig-chips">
              <span className={obv.diffUp[at] ? "is-violet" : "is-pink"}>
                {obv.diffUp[at] ? t("紫带 · 资金流入", "Violet · inflow") : t("粉带 · 资金流出", "Pink · outflow")}
              </span>
              {lastDiv && (
                <span className={lastDiv.bull ? "is-up" : "is-down"}>
                  {lastDiv.tags.join("·")} {lastDiv.bull ? t("底背离", "bullish div.") : t("顶背离", "bearish div.")} · {ago(lastDiv.index)} {t("根前", "bars ago")}
                </span>
              )}
            </div>
          </header>
          <Readout
            items={[
              ["DIFF", obv.diff[at].toFixed(2), obv.diffUp[at] ? "#cc00ff" : "#ff9999"],
              ["DEA", obv.dea[at].toFixed(2), obv.deaUp[at] ? "#0066ff" : "#00c853"],
              [t("柱", "Hist"), obv.hist[at].toFixed(2), obv.histUp[at] ? "#cc00ff" : "#ff9999"],
            ]}
          />
          <Pane frame={frame} height={mobile ? 190 : 220} min={-78} max={78} ticks={[-50, 0, 50]} format={(v) => String(v)} label={t("背离副图", "Divergence pane")}>
            {({ x, y, bw, w }) => (
              <>
                <line className="sig-hl" x1={0} x2={w} y1={y(0)} y2={y(0)} />
                {idx.slice(1).map((i) => (
                  <polygon
                    key={`r${i}`}
                    points={`${x(i - 1)},${y(obv.diff[i - 1])} ${x(i)},${y(obv.diff[i])} ${x(i)},${y(obv.dea[i])} ${x(i - 1)},${y(obv.dea[i - 1])}`}
                    fill={obv.diffUp[i] ? "#cc00ff" : "#ff9999"}
                    fillOpacity={0.14}
                  />
                ))}
                {idx.map((i) => (
                  <rect
                    key={`h${i}`}
                    x={x(i) - bw * 0.3}
                    width={Math.max(1, bw * 0.6)}
                    y={Math.min(y(0), y(obv.hist[i]))}
                    height={Math.max(0.5, Math.abs(y(0) - y(obv.hist[i])))}
                    fill={obv.histUp[i] ? "#cc00ff" : "#ff9999"}
                    fillOpacity={0.7}
                  />
                ))}
                <Segments idx={idx} x={x} y={y} s={obv.diff} color={(i) => (obv.diffUp[i] ? "#cc00ff" : "#ff9999")} width={2} />
                <Segments idx={idx} x={x} y={y} s={obv.dea} color={(i) => (obv.deaUp[i] ? "#0066ff" : "#00c853")} width={1.2} />
                {visDivs.map((l, k) => {
                  const cx = x(l.index);
                  const h = l.tags.length * 10 + 6;
                  const width = mobile ? 30 : 36;
                  const lo = y(78), hi = y(-78) - h;
                  const clamp = (v: number) => Math.max(lo, Math.min(v, hi));
                  let ty = clamp(l.bull ? y(obv.diff[l.index] - 15) : y(obv.diff[l.index] + 15) - h);
                  // Stagger bubbles that collide with earlier ones; flip direction at the pane edge.
                  let dir = l.bull ? 1 : -1;
                  for (let tries = 0; tries < 8; tries++) {
                    const hit = placed.find((p) => Math.abs(p.x - cx) <= width + 2 && ty < p.y + p.h + 2 && ty + h > p.y - 2);
                    if (!hit) break;
                    let next = dir > 0 ? hit.y + hit.h + 2 : hit.y - h - 2;
                    if (next < lo || next > hi) {
                      dir = -dir;
                      next = dir > 0 ? hit.y + hit.h + 2 : hit.y - h - 2;
                    }
                    ty = clamp(next);
                  }
                  placed[k] = { x: cx, y: ty, h, bull: l.bull };
                  return (
                    <g key={`${l.bull}${l.index}`} className={l.bull ? "sig-div-bull" : "sig-div-bear"}>
                      <rect x={cx - width / 2} y={ty} width={width} height={h} rx={3} />
                      {l.tags.map((tag, k) => (
                        <text key={tag} x={cx} y={ty + 11 + k * 10} textAnchor="middle">
                          {tag}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </>
            )}
          </Pane>
          <details className="sig-help">
            <summary>{t("使用说明", "How to use")}</summary>
            <ul>
              <li>{t("OBV-MACD 把价格方向与成交量结合，并按近 100 根 K 线归一化到 ±50，巨量时比例尺也不会被压缩。", "OBV-MACD combines price direction with volume and is normalised to ±50 over 100 bars, so volume spikes never squash the scale.")}</li>
              <li>{t("紫色丝带 / 柱：资金流入、买盘支撑，多头强势；粉色：动能衰减或资金流出。", "Violet ribbon/bars: inflow and bullish strength; pink: fading momentum or outflow.")}</li>
              <li>{t("绿色气泡（MACD / KDJ / RSI / DMI）为底背离：价格新低而指标未新低，可分批逢低吸纳。", "Green bubbles are bullish divergences: price makes a lower low while the indicator does not.")}</li>
              <li>{t("红色气泡为顶背离：价格新高而指标未新高，建议获利了结、减仓或尝试高位做空。", "Red bubbles are bearish divergences: price makes a higher high while the indicator does not.")}</li>
              <li>{t("同一气泡出现多个指标即多指标共振，反转成功率与爆发力更高。", "Several indicators in one bubble means resonance — a stronger reversal signal.")}</li>
            </ul>
          </details>
        </article>
      </div>
      <p className="sig-note">
        {t("指标基于模拟行情计算，信号仅供学习参考，不构成投资建议。", "Indicators are computed on demo quotes. Signals are for education only, not investment advice.")}
      </p>
    </section>
  );
}
