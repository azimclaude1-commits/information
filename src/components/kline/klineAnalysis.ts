/**
 * K线分析: reads a cropped range of candles and returns structured findings (no text), so records can be
 * shown in either language later. Pure functions only — covered by `scripts/kline-analysis.test.ts`.
 * Indicators warm up on the bars before the selection; levels, patterns and plans use the selection.
 */

export type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type Tone = "bull" | "bear" | "neutral";
export type PatternId =
  | "bull_engulf"
  | "bear_engulf"
  | "hammer"
  | "shooting_star"
  | "doji"
  | "three_white"
  | "three_black"
  | "double_bottom"
  | "double_top"
  | "breakout_up"
  | "breakout_down";
export type Pattern = { id: PatternId; tone: Tone; /** index inside the selection */ index: number };
export type Plan = { entry: number; stop: number; target: number; rr: number };

export type KlineResult = {
  count: number;
  first: number;
  last: number;
  high: number;
  low: number;
  /** % change from the first open to the last close */
  change: number;
  /** % range of the selection relative to its low */
  amplitude: number;
  /** regression slope in % of price per bar */
  slope: number;
  trend: "up" | "down" | "flat";
  /** where the last close sits inside the selection range, 0–1 */
  position: number;
  atr: number;
  levels: { r2: number; r1: number; pivot: number; s1: number; s2: number };
  /** price band of the crop box, when the viewer narrowed it vertically */
  focus?: { lo: number; hi: number };
  patterns: Pattern[];
  ma: { ma5: number; ma10: number; ma20: number; order: "bull" | "bear" | "mixed" };
  macd: { dif: number; dea: number; hist: number; cross: "golden" | "dead" | null; crossAgo: number };
  rsi: number;
  kdj: { k: number; d: number; j: number };
  volume: { ratio: number; trend: "expand" | "shrink" | "flat" };
  score: number;
  stance: "bull" | "bear" | "range";
  plans: { long: Plan; short: Plan };
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
function sma(v: number[], n: number) {
  return v.map((_, i) => avg(v.slice(Math.max(0, i - n + 1), i + 1)));
}
function ema(v: number[], n: number) {
  const k = 2 / (n + 1);
  let prev = v[0] ?? 0;
  return v.map((x) => (prev = x * k + prev * (1 - k)));
}
function rsi(closes: number[], n = 14) {
  let gain = 0,
    loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = Math.max(0, d),
      l = Math.max(0, -d);
    if (i <= n) {
      gain += g / n;
      loss += l / n;
    } else {
      gain = (gain * (n - 1) + g) / n;
      loss = (loss * (n - 1) + l) / n;
    }
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}
function kdj(bars: Bar[], n = 9) {
  let k = 50,
    d = 50;
  bars.forEach((b, i) => {
    const w = bars.slice(Math.max(0, i - n + 1), i + 1);
    const hi = Math.max(...w.map((x) => x.high)),
      lo = Math.min(...w.map((x) => x.low));
    const rsv = hi === lo ? 50 : ((b.close - lo) / (hi - lo)) * 100;
    k = (2 * k + rsv) / 3;
    d = (2 * d + k) / 3;
  });
  return { k, d, j: 3 * k - 2 * d };
}
function atrOf(bars: Bar[], n = 14) {
  const tr = bars.map((b, i) =>
    i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)),
  );
  return avg(tr.slice(-n));
}
function slopePct(closes: number[]) {
  const n = closes.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2,
    my = avg(closes);
  let num = 0,
    den = 0;
  closes.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return ((num / den) / my) * 100;
}

/** Local swing points (bar higher/lower than `w` bars on each side). */
function swings(bars: Bar[], w = 2) {
  const highs: number[] = [],
    lows: number[] = [];
  for (let i = w; i < bars.length - w; i++) {
    const around = bars.slice(i - w, i + w + 1);
    if (bars[i].high === Math.max(...around.map((b) => b.high))) highs.push(i);
    if (bars[i].low === Math.min(...around.map((b) => b.low))) lows.push(i);
  }
  return { highs, lows };
}

export function detectPatterns(sel: Bar[], atr: number): Pattern[] {
  const found: Pattern[] = [];
  const push = (id: PatternId, tone: Tone, index: number) => {
    if (!found.some((p) => p.id === id)) found.push({ id, tone, index });
  };
  // Scan newest first so each pattern reports its most recent occurrence.
  for (let i = sel.length - 1; i >= 1; i--) {
    const b = sel[i],
      p = sel[i - 1];
    const body = Math.abs(b.close - b.open),
      range = b.high - b.low || 1e-9;
    const upper = b.high - Math.max(b.open, b.close),
      lower = Math.min(b.open, b.close) - b.low;
    const pBody = Math.abs(p.close - p.open);
    if (p.close < p.open && b.close > b.open && b.open <= p.close && b.close >= p.open && body > pBody) push("bull_engulf", "bull", i);
    if (p.close > p.open && b.close < b.open && b.open >= p.close && b.close <= p.open && body > pBody) push("bear_engulf", "bear", i);
    if (body > 0 && lower >= 2 * body && upper <= body * 0.6 && range > atr * 0.6) push("hammer", "bull", i);
    if (body > 0 && upper >= 2 * body && lower <= body * 0.6 && range > atr * 0.6) push("shooting_star", "bear", i);
    if (body <= range * 0.1 && range > atr * 0.4) push("doji", "neutral", i);
    if (i >= 2) {
      const a = sel[i - 2];
      if ([a, p, b].every((x) => x.close > x.open) && b.close > p.close && p.close > a.close) push("three_white", "bull", i);
      if ([a, p, b].every((x) => x.close < x.open) && b.close < p.close && p.close < a.close) push("three_black", "bear", i);
    }
    if (found.length >= 6) break;
  }
  // Double bottom / top: two swing extremes within 0.5 ATR, at least 5 bars apart, with a 1-ATR bounce between.
  const { highs, lows } = swings(sel);
  for (let a = lows.length - 2; a >= 0; a--) {
    const i = lows[a],
      j = lows[lows.length - 1];
    if (j - i < 5) continue;
    const peak = Math.max(...sel.slice(i, j + 1).map((b) => b.high));
    if (Math.abs(sel[i].low - sel[j].low) <= atr * 0.5 && peak - Math.max(sel[i].low, sel[j].low) >= atr) {
      push("double_bottom", "bull", j);
      break;
    }
  }
  for (let a = highs.length - 2; a >= 0; a--) {
    const i = highs[a],
      j = highs[highs.length - 1];
    if (j - i < 5) continue;
    const trough = Math.min(...sel.slice(i, j + 1).map((b) => b.low));
    if (Math.abs(sel[i].high - sel[j].high) <= atr * 0.5 && Math.min(sel[i].high, sel[j].high) - trough >= atr) {
      push("double_top", "bear", j);
      break;
    }
  }
  if (sel.length > 6) {
    const lastI = sel.length - 1;
    const before = sel.slice(0, -1);
    if (sel[lastI].close > Math.max(...before.map((b) => b.high))) push("breakout_up", "bull", lastI);
    if (sel[lastI].close < Math.min(...before.map((b) => b.low))) push("breakout_down", "bear", lastI);
  }
  return found.sort((x, y) => y.index - x.index).slice(0, 4);
}

function plan(entry: number, stop: number, target: number): Plan {
  const risk = Math.abs(entry - stop) || 1e-9;
  return { entry, stop, target, rr: Math.round((Math.abs(target - entry) / risk) * 10) / 10 };
}

/**
 * Analyse `series[from, to)`. `focus` is the crop box's price band (optional).
 * Throws when fewer than 5 bars are selected.
 */
export function analyseKline(series: Bar[], from: number, to: number, focus?: { lo: number; hi: number }): KlineResult {
  const sel = series.slice(from, to);
  if (sel.length < 5) throw new Error("select at least 5 candles");
  const upto = series.slice(0, to);
  const closes = upto.map((b) => b.close);
  const selCloses = sel.map((b) => b.close);
  const high = Math.max(...sel.map((b) => b.high)),
    low = Math.min(...sel.map((b) => b.low));
  const first = sel[0].open,
    last = sel[sel.length - 1].close;
  const atr = Math.max(atrOf(sel), (high - low) * 0.02, last * 0.0002);

  // Levels: nearest swing high above / swing low below the last close, then the range extremes.
  const { highs, lows } = swings(sel);
  const above = highs.map((i) => sel[i].high).filter((v) => v > last).sort((a, b) => a - b);
  const below = lows.map((i) => sel[i].low).filter((v) => v < last).sort((a, b) => b - a);
  const r1 = above[0] ?? (high > last ? high : last + atr);
  const r2 = Math.max(high, r1 + atr * 0.5);
  const s1 = below[0] ?? (low < last ? low : last - atr);
  const s2 = Math.min(low, s1 - atr * 0.5);
  const pivot = (high + low + last) / 3;

  const ma5 = sma(closes, 5).at(-1)!,
    ma10 = sma(closes, 10).at(-1)!,
    ma20 = sma(closes, 20).at(-1)!;
  const order = ma5 > ma10 && ma10 > ma20 ? "bull" : ma5 < ma10 && ma10 < ma20 ? "bear" : "mixed";

  const e12 = ema(closes, 12),
    e26 = ema(closes, 26);
  const dif = closes.map((_, i) => e12[i] - e26[i]);
  const dea = ema(dif, 9);
  let cross: "golden" | "dead" | null = null,
    crossAgo = -1;
  for (let k = 0; k < Math.min(8, sel.length - 1); k++) {
    const i = dif.length - 1 - k;
    const now = dif[i] - dea[i],
      prev = dif[i - 1] - dea[i - 1];
    if (prev <= 0 && now > 0) {
      cross = "golden";
      crossAgo = k;
      break;
    }
    if (prev >= 0 && now < 0) {
      cross = "dead";
      crossAgo = k;
      break;
    }
  }
  const macd = { dif: dif.at(-1)!, dea: dea.at(-1)!, hist: (dif.at(-1)! - dea.at(-1)!) * 2, cross, crossAgo };

  const r = rsi(closes);
  const kd = kdj(upto);
  const volAll = avg(sel.map((b) => b.volume)),
    volRecent = avg(sel.slice(-5).map((b) => b.volume));
  const ratio = volRecent / (volAll || 1);
  const volume = { ratio, trend: (ratio > 1.15 ? "expand" : ratio < 0.85 ? "shrink" : "flat") as "expand" | "shrink" | "flat" };

  const slope = slopePct(selCloses);
  // Trending when the regression line covers at least 30% of the range (and moves at least 0.1%).
  const move = slope * sel.length;
  const strength = Math.abs(move) / Math.max(((high - low) / low) * 100, 1e-9);
  const trend = strength >= 0.3 && Math.abs(move) >= 0.1 ? (move > 0 ? "up" : "down") : "flat";
  const position = high === low ? 0.5 : (last - low) / (high - low);
  const patterns = detectPatterns(sel, atr);

  let score = 50;
  score += trend === "up" ? 12 : trend === "down" ? -12 : 0;
  score += order === "bull" ? 8 : order === "bear" ? -8 : 0;
  score += macd.hist > 0 ? 6 : -6;
  score += cross === "golden" ? 5 : cross === "dead" ? -5 : 0;
  score += r > 55 ? 5 : r < 45 ? -5 : 0;
  score += r > 75 ? -4 : r < 25 ? 4 : 0;
  score += (position - 0.5) * 10;
  patterns.slice(0, 2).forEach((p) => (score += p.tone === "bull" ? 4 : p.tone === "bear" ? -4 : 0));
  score = Math.round(Math.max(5, Math.min(95, score)));
  const stance = score >= 60 ? "bull" : score <= 40 ? "bear" : "range";

  const longEntry = Math.min(last, s1 + atr * 0.25);
  const shortEntry = Math.max(last, r1 - atr * 0.25);
  const long = plan(longEntry, s1 - atr * 0.75, r1 > longEntry + atr * 0.5 ? r1 : longEntry + atr * 2);
  const short = plan(shortEntry, r1 + atr * 0.75, s1 < shortEntry - atr * 0.5 ? s1 : shortEntry - atr * 2);

  return {
    count: sel.length,
    first,
    last,
    high,
    low,
    change: ((last - first) / first) * 100,
    amplitude: ((high - low) / low) * 100,
    slope,
    trend,
    position,
    atr,
    levels: { r2, r1, pivot, s1, s2 },
    focus,
    patterns,
    ma: { ma5, ma10, ma20, order },
    macd,
    rsi: r,
    kdj: kd,
    volume,
    score,
    stance,
    plans: { long, short },
  };
}

/* ---------------- Records (shared by the trading desk and Ace智搜) ---------------- */

export const KLINE_RECORDS_KEY = "alphapulse.kline.v1";
export const MAX_KLINE_RECORDS = 40;

export type KlineRecord = {
  id: string;
  /** symbol + period + selected time span; the same key on the same day reopens without charging */
  key: string;
  source: "desk" | "ace";
  symbol: string;
  nameZh: string;
  nameEn: string;
  decimals: number;
  period: string;
  createdAt: number;
  fromTime: number;
  toTime: number;
  /** selected candles, kept so the snapshot can be redrawn */
  bars: Bar[];
  result: KlineResult;
};

export const selectionKey = (symbol: string, period: string, fromTime: number, toTime: number) =>
  `kline:${symbol}:${period}:${fromTime}-${toTime}`;

const tidy = (v: number) => Number(v.toPrecision(8));
export const compactBars = (bars: Bar[]): Bar[] =>
  bars.map((b) => ({
    time: b.time,
    open: tidy(b.open),
    high: tidy(b.high),
    low: tidy(b.low),
    close: tidy(b.close),
    volume: Math.round(b.volume),
  }));

/** Newest first, de-duplicated by id, capped so localStorage stays small. */
export function addRecord(list: KlineRecord[], rec: KlineRecord): KlineRecord[] {
  return [rec, ...list.filter((r) => r.id !== rec.id)].slice(0, MAX_KLINE_RECORDS);
}
