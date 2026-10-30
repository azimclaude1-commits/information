// Ports of the three signature Pine Script indicators (金眼主图 / 三合一副图 / 背离副图).
// Series use NaN where Pine would return `na` during warm-up.
import type { Candle } from "./marketModel";

type S = number[];
const nz = (v: number, d = 0) => (Number.isFinite(v) ? v : d);

export function sma(src: S, n: number): S {
  return src.map((_, i) => {
    if (i < n - 1) return NaN;
    let sum = 0;
    for (let j = i - n + 1; j <= i; j++) sum += src[j];
    return sum / n;
  });
}
/** Pine ta.ema: seeded with the first valid value. */
export function ema(src: S, n: number): S {
  const a = 2 / (n + 1);
  let prev = NaN;
  return src.map((v) => {
    if (!Number.isFinite(v)) return prev;
    prev = Number.isFinite(prev) ? a * v + (1 - a) * prev : v;
    return prev;
  });
}
/** Pine ta.rma (Wilder): SMA seed over the first n valid values, then 1/n smoothing. */
export function rma(src: S, n: number): S {
  let prev = NaN,
    count = 0,
    sum = 0;
  return src.map((v) => {
    if (!Number.isFinite(v)) return prev;
    if (!Number.isFinite(prev)) {
      sum += v;
      count++;
      if (count === n) prev = sum / n;
      return prev;
    }
    prev = (v + (n - 1) * prev) / n;
    return prev;
  });
}
const rolling = (src: S, n: number, pick: (xs: S) => number): S =>
  src.map((_, i) => (i < n - 1 ? NaN : pick(src.slice(i - n + 1, i + 1))));
export const highest = (src: S, n: number) => rolling(src, n, (xs) => Math.max(...xs));
export const lowest = (src: S, n: number) => rolling(src, n, (xs) => Math.min(...xs));
const shift = (src: S, k = 1): S => src.map((_, i) => (i - k >= 0 ? src[i - k] : NaN));
const cross = (a: S, b: S, up: boolean) =>
  a.map((_, i) =>
    i > 0 && [a[i], b[i], a[i - 1], b[i - 1]].every(Number.isFinite)
      ? up
        ? a[i] > b[i] && a[i - 1] <= b[i - 1]
        : a[i] < b[i] && a[i - 1] >= b[i - 1]
      : false,
  );
export const crossover = (a: S, b: S) => cross(a, b, true);
export const crossunder = (a: S, b: S) => cross(a, b, false);
const lvl = (v: number, len: number): S => Array(len).fill(v);
const diffOf = (a: S, b: S): S => a.map((v, i) => v - b[i]);
export function rsi(src: S, n: number): S {
  const ch = src.map((v, i) => (i ? v - src[i - 1] : NaN));
  const up = rma(ch.map((c) => (Number.isFinite(c) ? Math.max(c, 0) : NaN)), n);
  const dn = rma(ch.map((c) => (Number.isFinite(c) ? Math.max(-c, 0) : NaN)), n);
  return up.map((u, i) =>
    !Number.isFinite(u) ? NaN : dn[i] === 0 ? 100 : u === 0 ? 0 : 100 - 100 / (1 + u / dn[i]),
  );
}
/** Least-squares slope over the last `len` bars (= linreg(…,0) − linreg(…,1)). */
function regressionSlope(src: S, len: number): S {
  const mx = (len - 1) / 2;
  let den = 0;
  for (let x = 0; x < len; x++) den += (x - mx) ** 2;
  return src.map((_, i) => {
    if (i < len - 1) return NaN;
    let num = 0,
      my = 0;
    for (let x = 0; x < len; x++) my += src[i - len + 1 + x];
    my /= len;
    for (let x = 0; x < len; x++) num += (x - mx) * (src[i - len + 1 + x] - my);
    return num / den;
  });
}
/** Pine ta.pivotlow/high(left, right): true on the confirming bar (center = i − right). */
function pivots(src: S, left: number, right: number, low: boolean) {
  return src.map((_, i) => {
    const c = i - right;
    if (c - left < 0) return false;
    for (let j = c - left; j <= i; j++)
      if (j !== c && (low ? src[j] <= src[c] : src[j] >= src[c])) return false;
    return true;
  });
}
/** Pine ta.valuewhen(cond, src, 1) evaluated on the bars where `cond` fires. */
function previousWhen(cond: boolean[], src: S) {
  let last = NaN;
  return cond.map((c, i) => {
    if (!c) return NaN;
    const prev = last;
    last = src[i];
    return prev;
  });
}

/* ==================== 金眼主图 · BBI Box System ==================== */
export type BoxLabel = { index: number; kind: "B" | "S" | "add-long" | "add-short"; price: number };
export function bbiBox(bars: Candle[]) {
  const close = bars.map((b) => b.close),
    open = bars.map((b) => b.open),
    high = bars.map((b) => b.high),
    low = bars.map((b) => b.low);
  const s3 = sma(close, 3), s6 = sma(close, 6), s12 = sma(close, 12), s24 = sma(close, 24);
  const bbi = close.map((_, i) => (s3[i] + s6[i] + s12[i] + s24[i]) / 4);
  const safe = sma(close, 30);
  const prevClose = shift(close);
  const boxTop = sma(highest(prevClose, 30), 2);
  const boxBottom = sma(lowest(prevClose, 30), 2);
  const aVal = ema(bars.map((b) => (b.open + b.high + b.low) / 3), 4);
  const e8 = ema(close, 8), e20 = ema(close, 20);
  const up820 = crossover(e8, e20), dn820 = crossunder(e8, e20);
  const pl = pivots(low, 5, 3, true), ph = pivots(high, 5, 3, false);
  const r6 = rsi(close, 6);
  const dip = crossover(r6, lvl(11, close.length)), peak = crossunder(r6, lvl(84, close.length));
  const buyLine = ema(close, 2);
  const slope = regressionSlope(close, 21);
  const sellLine = ema(close.map((c, i) => (Number.isFinite(slope[i]) ? slope[i] * 20 + c : NaN)), 42);
  const fUp = crossover(buyLine, sellLine), fDn = crossunder(buyLine, sellLine);
  const labels: BoxLabel[] = [];
  let lastB = -1000, lastS = -1000, lastAddB = -1000, lastAddS = -1000;
  for (let i = 0; i < bars.length; i++) {
    const a = nz(aVal[i - 1]);
    const mainBuy = up820[i] && close[i] >= open[i] && aVal[i] > a;
    const mainSell = dn820[i] && close[i] <= open[i] && aVal[i] < a;
    const superBuy = pl[i] && close[i] > e8[i];
    const superSell = ph[i] && close[i] < e8[i];
    const followBuy = fUp[i] && boxTop[i] >= nz(boxTop[i - 1]);
    const followSell = fDn[i] && boxBottom[i] <= nz(boxBottom[i - 1]);
    const addLong = (dip[i] || followBuy) && close[i] > safe[i];
    const addShort = (peak[i] || followSell) && close[i] < safe[i];
    if (superBuy && i - 3 - lastB >= 3) {
      labels.push({ index: i - 3, kind: "B", price: low[i - 3] });
      lastB = i - 3;
    }
    if (superSell && i - 3 - lastS >= 3) {
      labels.push({ index: i - 3, kind: "S", price: high[i - 3] });
      lastS = i - 3;
    }
    if (mainBuy && i - lastB >= 3) {
      labels.push({ index: i, kind: "B", price: low[i] });
      lastB = i;
    }
    if (mainSell && i - lastS >= 3) {
      labels.push({ index: i, kind: "S", price: high[i] });
      lastS = i;
    }
    if (addLong && i !== lastB && i - lastAddB >= 3) {
      labels.push({ index: i, kind: "add-long", price: low[i] });
      lastAddB = i;
    }
    if (addShort && i !== lastS && i - lastAddS >= 3) {
      labels.push({ index: i, kind: "add-short", price: high[i] });
      lastAddS = i;
    }
  }
  return { bbi, safe, boxTop, boxBottom, labels };
}

/* ==================== 三合一副图 · MACD KDJ RSI Trio ==================== */
export type HistState = "bull-accel" | "bull-fade" | "bear-rebound" | "bear-accel";
export const HIST_COLOR: Record<HistState, string> = {
  "bull-accel": "#f43f5e",
  "bull-fade": "#3b82f6",
  "bear-rebound": "#d946ef",
  "bear-accel": "#22c55e",
};
/**
 * The script scales DIF by a fixed ×150 so it shares the 0–100 axis with KDJ/RSI — tuned for
 * low-priced A-shares. Here the multiplier adapts to price so the same scale works for BTC and FX.
 */
export function mkrTrio(bars: Candle[], scaleWindow = 120) {
  const close = bars.map((b) => b.close);
  const raw = diffOf(ema(close, 12), ema(close, 26));
  const recent = raw.slice(-scaleWindow).map(Math.abs).filter(Number.isFinite);
  const mult = 40 / Math.max(...recent, 1e-9);
  const dif = raw.map((v) => v * mult);
  const dea = ema(dif, 9);
  const macd = dif.map((v, i) => (v - dea[i]) * 2);
  const state: HistState[] = macd.map((m, i) => {
    const inc = m > nz(macd[i - 1], m);
    return dif[i] > 0 ? (inc ? "bull-accel" : "bull-fade") : inc ? "bear-rebound" : "bear-accel";
  });
  const ll = lowest(bars.map((b) => b.low), 9), hh = highest(bars.map((b) => b.high), 9);
  const rsv = close.map((c, i) => (hh[i] - ll[i] !== 0 && Number.isFinite(hh[i]) ? ((c - ll[i]) / (hh[i] - ll[i])) * 100 : 50));
  const k = rma(rsv, 3), d = rma(k, 3);
  const j = k.map((v, i) => 3 * v - 2 * d[i]);
  const r24 = rsi(close, 24);
  return { dif, dea, macd, state, k, d, j, rsi: r24, mult };
}

/** Checklists for the doc's triple-bottom / triple-top resonance, evaluated on the last `look` bars. */
export function trioResonance(t: ReturnType<typeof mkrTrio>, look = 6) {
  const n = t.j.length;
  const from = n - look;
  const any = (f: (i: number) => boolean) => {
    for (let i = from; i < n; i++) if (f(i)) return true;
    return false;
  };
  const kUpD = crossover(t.j, t.k), kDnD = crossunder(t.j, t.k);
  const difUp = crossover(t.dif, t.dea), difDn = crossunder(t.dif, t.dea);
  const rsiUp = crossover(t.rsi, lvl(40, n));
  return {
    bottom: [
      { id: "oversold", ok: any((i) => t.j[i] < 20 || t.rsi[i] < 25) },
      { id: "kdj", ok: any((i) => kUpD[i] && t.k[i] < 50) },
      { id: "macd", ok: any((i) => difUp[i] || (t.state[i] === "bear-rebound" && t.state[i - 1] === "bear-accel")) },
      { id: "rsi", ok: any((i) => rsiUp[i]) || t.rsi[n - 1] > 40 },
    ],
    top: [
      { id: "overbought", ok: any((i) => t.j[i] > 80 || t.rsi[i] > 75) },
      { id: "kdj", ok: any((i) => kDnD[i] && t.k[i] > 50) },
      { id: "macd", ok: any((i) => difDn[i] || (t.state[i] === "bull-fade" && t.state[i - 1] === "bull-accel")) },
      { id: "rsi", ok: t.rsi[n - 1] < 40 },
    ],
  };
}

/* ==================== 背离副图 · OBV MACD Multi-Div ==================== */
export type DivLabel = { index: number; bull: boolean; tags: string[] };
export function obvDivergence(bars: Candle[]) {
  const close = bars.map((b) => b.close),
    high = bars.map((b) => b.high),
    low = bars.map((b) => b.low);
  let cum = 0;
  const obv = bars.map((b, i) => (cum += Math.sign(b.close - nz(close[i - 1], b.close)) * (b.volume || 1)));
  const rawDiff = diffOf(ema(obv, 12), ema(obv, 26));
  const mx = highest(rawDiff, 100), mn = lowest(rawDiff, 100);
  const diff = rawDiff.map((v, i) =>
    !Number.isFinite(mx[i]) ? NaN : mx[i] - mn[i] !== 0 ? ((v - mn[i]) / (mx[i] - mn[i])) * 100 - 50 : 0,
  );
  const dea = ema(diff, 9);
  const hist = diff.map((v, i) => v - dea[i]);
  const rising = (s: S) => s.map((v, i) => v - nz(s[i - 1], v) > 0);

  const div = (a: S, b: S) => {
    const up = crossover(a, b), dn = crossunder(a, b);
    const cUp = previousWhen(up, close), aUp = previousWhen(up, a);
    const cDn = previousWhen(dn, close), aDn = previousWhen(dn, a);
    return {
      bull: up.map((x, i) => x && close[i] < cUp[i] && a[i] > aUp[i]),
      bear: dn.map((x, i) => x && close[i] > cDn[i] && a[i] < aDn[i]),
    };
  };
  const mDif = diffOf(ema(close, 12), ema(close, 26));
  const macdDiv = div(mDif, ema(mDif, 9));
  const ll = lowest(low, 9), hh = highest(high, 9);
  const stoch = close.map((c, i) => (hh[i] - ll[i] ? ((c - ll[i]) / (hh[i] - ll[i])) * 100 : NaN));
  const kk = sma(stoch, 3);
  const kdjDiv = div(kk, sma(kk, 3));
  const rsiDiv = div(rsi(close, 6), rsi(close, 12));
  const tr = bars.map((b, i) => (i ? Math.max(b.high - b.low, Math.abs(b.high - close[i - 1]), Math.abs(b.low - close[i - 1])) : b.high - b.low));
  const pdm = bars.map((b, i) => {
    if (!i) return 0;
    const u = b.high - high[i - 1], d = low[i - 1] - b.low;
    return u > d && u > 0 ? u : 0;
  });
  const mdm = bars.map((b, i) => {
    if (!i) return 0;
    const u = b.high - high[i - 1], d = low[i - 1] - b.low;
    return d > u && d > 0 ? d : 0;
  });
  const atr = rma(tr, 14);
  const pdi = rma(pdm, 14).map((v, i) => (100 * v) / atr[i]);
  const mdi = rma(mdm, 14).map((v, i) => (100 * v) / atr[i]);
  const dmiDiv = div(pdi, mdi);
  const engines = [
    ["MACD", macdDiv],
    ["KDJ", kdjDiv],
    ["RSI", rsiDiv],
    ["DMI", dmiDiv],
  ] as const;
  const labels: DivLabel[] = [];
  for (let i = 0; i < bars.length; i++) {
    const bull = engines.filter(([, e]) => e.bull[i]).map(([n]) => n);
    const bear = engines.filter(([, e]) => e.bear[i]).map(([n]) => n);
    if (bull.length) labels.push({ index: i, bull: true, tags: bull });
    if (bear.length) labels.push({ index: i, bull: false, tags: bear });
  }
  return { diff, dea, hist, histUp: rising(hist), diffUp: rising(diff), deaUp: rising(dea), labels };
}
