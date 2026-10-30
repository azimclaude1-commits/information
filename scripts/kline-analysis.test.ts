import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_KLINE_RECORDS,
  addRecord,
  analyseKline,
  detectPatterns,
  selectionKey,
  type Bar,
  type KlineRecord,
} from "../src/components/kline/klineAnalysis";

const t0 = Date.UTC(2026, 9, 30, 0, 0);
/** Bars that follow `path` closes with a small, deterministic wiggle. */
const series = (path: (i: number) => number, n = 120): Bar[] =>
  Array.from({ length: n }, (_, i) => {
    const close = path(i);
    const open = path(i - 1) ?? close;
    const wig = Math.abs(Math.sin(i * 1.7)) * 0.4 + 0.2;
    return {
      time: t0 + i * 900_000,
      open,
      close,
      high: Math.max(open, close) + wig,
      low: Math.min(open, close) - wig,
      volume: 1000 + (i % 7) * 120,
    };
  });

test("a steady rally reads bullish with a long plan above its stop", () => {
  const s = series((i) => 100 + i * 0.35 + Math.sin(i / 3) * 0.6);
  const r = analyseKline(s, 80, 120);
  assert.equal(r.count, 40);
  assert.equal(r.trend, "up");
  assert.equal(r.stance, "bull");
  assert.ok(r.score >= 60);
  assert.equal(r.ma.order, "bull");
  assert.ok(r.plans.long.stop < r.plans.long.entry && r.plans.long.entry < r.plans.long.target);
  assert.ok(r.plans.short.stop > r.plans.short.entry && r.plans.short.target < r.plans.short.entry);
  assert.ok(r.plans.long.rr > 0);
});

test("a steady decline reads bearish", () => {
  const s = series((i) => 200 - i * 0.4 + Math.sin(i / 3) * 0.6);
  const r = analyseKline(s, 70, 120);
  assert.equal(r.trend, "down");
  assert.equal(r.stance, "bear");
  assert.ok(r.score <= 40);
  assert.ok(r.change < 0);
});

test("levels bracket the last close", () => {
  const s = series((i) => 150 + Math.sin(i / 4) * 3);
  const r = analyseKline(s, 60, 120);
  const { r2, r1, s1, s2 } = r.levels;
  assert.ok(s2 <= s1 && s1 < r.last && r.last < r1 && r1 <= r2, JSON.stringify(r.levels));
  assert.ok(r.position >= 0 && r.position <= 1);
});

test("engulfing candles are detected on the newest occurrence", () => {
  const bars: Bar[] = [
    { time: 1, open: 10, close: 9.6, high: 10.1, low: 9.5, volume: 1 },
    { time: 2, open: 9.6, close: 9.3, high: 9.7, low: 9.2, volume: 1 },
    { time: 3, open: 9.25, close: 9.8, high: 9.9, low: 9.2, volume: 1 },
    { time: 4, open: 9.8, close: 9.9, high: 10, low: 9.7, volume: 1 },
    { time: 5, open: 9.9, close: 9.95, high: 10, low: 9.85, volume: 1 },
  ];
  const ids = detectPatterns(bars, 0.3).map((p) => p.id);
  assert.ok(ids.includes("bull_engulf"), ids.join());
});

test("fewer than five candles is rejected", () => {
  const s = series((i) => 100 + i, 10);
  assert.throws(() => analyseKline(s, 6, 10));
});

test("records are newest first, de-duplicated and capped", () => {
  const rec = (id: string): KlineRecord =>
    ({ id, key: selectionKey("AAPL", "15m", 1, 2), source: "desk" }) as KlineRecord;
  let list: KlineRecord[] = [];
  for (let i = 0; i < MAX_KLINE_RECORDS + 5; i++) list = addRecord(list, rec(`r${i}`));
  assert.equal(list.length, MAX_KLINE_RECORDS);
  assert.equal(list[0].id, `r${MAX_KLINE_RECORDS + 4}`);
  list = addRecord(list, rec("r10"));
  assert.equal(list[0].id, "r10");
  assert.equal(list.filter((r) => r.id === "r10").length, 1);
});
