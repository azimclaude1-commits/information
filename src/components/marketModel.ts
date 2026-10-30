import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { INITIAL_INSTRUMENTS, Instrument } from '../data/marketData';

/** Layout branch helper: true from `px` viewport width up */
export function useMinWidth(px: number) {
  const query = `(min-width:${px}px)`;
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

const savedStores = new Map<string, { value: unknown; listeners: Set<() => void> }>();
export function useSavedState<T>(key: string, initial: T) {
  const store = useMemo(() => {
    if (!savedStores.has(key)) {
      let value = initial;
      try { const saved = localStorage.getItem(key); if (saved) value = JSON.parse(saved); } catch { /* Keep defaults if storage is unavailable. */ }
      savedStores.set(key, { value, listeners: new Set() });
    }
    return savedStores.get(key)!;
  }, [key]);
  const subscribe = useCallback((listener: () => void) => { store.listeners.add(listener); return () => { store.listeners.delete(listener); }; }, [store]);
  const value = useSyncExternalStore(subscribe, () => store.value as T);
  const setValue = useCallback((action: SetStateAction<T>) => {
    store.value = typeof action === 'function' ? (action as (old: T) => T)(store.value as T) : action;
    try { localStorage.setItem(key, JSON.stringify(store.value)); } catch { /* Retain in-memory state. */ }
    store.listeners.forEach(listener => listener());
  }, [store, key]);
  return [value, setValue] as const;
}

/** Watchlist shared by the trading desk and the live-room market panel. */
export const FAVORITES_KEY = 'alphapulse.favorites.v2';
export const DEFAULT_FAVORITES = ['NVDA', 'AAPL', 'TSLA', 'XAU/USD', 'BTC/USD', 'ETH/USD', 'SOL/USD', 'NAS100'];

export const PERIODS = [
  ['1m', '1分', 60], ['5m', '5分', 300], ['15m', '15分', 900], ['30m', '30分', 1800],
  ['1H', '1时', 3600], ['4H', '4时', 14400], ['1D', '1日', 86400], ['1W', '1周', 604800], ['1M', '1月', 2592000],
] as const;

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }
export function makeCandles(instrument: Instrument, period: string, now: number): Candle[] {
  const base = INITIAL_INSTRUMENTS.find(i => i.symbol === instrument.symbol)?.price ?? instrument.price;
  const seconds = PERIODS.find(p => p[0] === period)?.[2] ?? 14400;
  let seed = [...instrument.symbol + period].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const volatility = base * Math.min(.024, .0009 * Math.sqrt(seconds / 60));
  const end = Math.floor(now / (seconds * 1000)) * seconds * 1000;
  let close = base;
  const bars: Candle[] = [];
  for (let i = 0; i < 240; i++) {
    const open = Math.max(base * .1, close - (rand() - .47) * volatility);
    bars.unshift({ time: end - i * seconds * 1000, open, close, high: Math.max(open, close) + rand() * volatility * .6, low: Math.max(base * .01, Math.min(open, close) - rand() * volatility * .6), volume: Math.round(2000 + rand() * 15000) });
    close = open;
  }
  return bars;
}

export function sma(values: number[], period: number) {
  return values.map((_, i) => { const sample = values.slice(Math.max(0, i - period + 1), i + 1); return sample.reduce((a, b) => a + b, 0) / sample.length; });
}
export function ema(values: number[], period: number) {
  let previous = values[0];
  return values.map(v => previous = v * 2 / (period + 1) + previous * (1 - 2 / (period + 1)));
}
export function indicators(bars: Candle[]) {
  const close = bars.map(c => c.close), e12 = ema(close, 12), e26 = ema(close, 26);
  const dif = close.map((_, i) => e12[i] - e26[i]), dea = ema(dif, 9);
  const mid = sma(close, 20);
  let obv = 0, k = 50, d = 50;
  return {
    MA: [sma(close, 5), sma(close, 10), sma(close, 30)],
    EMA: [ema(close, 7), ema(close, 25)],
    BOLL: [mid, mid.map((m, i) => m + deviation(i) * 2), mid.map((m, i) => m - deviation(i) * 2)],
    MACD: [dif, dea, dif.map((v, i) => (v - dea[i]) * 2)],
    RSI: [close.map((_, i) => {
      let gain = 0, loss = 0;
      for (let j = Math.max(1, i - 13); j <= i; j++) { const delta = close[j] - close[j - 1]; gain += Math.max(delta, 0); loss += Math.max(-delta, 0); }
      return gain + loss === 0 ? 50 : 100 * gain / (gain + loss);
    })],
    OBV: [bars.map((b, i) => obv += i === 0 ? 0 : b.close >= bars[i - 1].close ? b.volume : -b.volume)],
    KDJ: transpose(bars.map((b, i) => {
      const sample = bars.slice(Math.max(0, i - 8), i + 1), low = Math.min(...sample.map(c => c.low)), high = Math.max(...sample.map(c => c.high));
      k = k * 2 / 3 + (high === low ? 50 : (b.close - low) / (high - low) * 100) / 3; d = d * 2 / 3 + k / 3;
      return [k, d, 3 * k - 2 * d];
    })),
  };
  function deviation(i: number) { const sample = close.slice(Math.max(0, i - 19), i + 1); return Math.sqrt(sample.reduce((n, v) => n + (v - mid[i]) ** 2, 0) / sample.length); }
}
function transpose(values: number[][]) { return values[0].map((_, i) => values.map(v => v[i])); }
export const number = (value: number, decimals = 2) => value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const signed = (value: number, decimals = 2) => `${value >= 0 ? '+' : ''}${number(value, decimals)}`;

export const SECTORS = [
  { id: 'all', name: '全部', en: 'All', match: (_: Instrument) => true },
  { id: 'stocks', name: '美股', en: 'US stocks', match: (i: Instrument) => i.category === 'stocks' },
  { id: 'ai', name: 'AI', en: 'AI', match: (i: Instrument) => i.perpSector === 'ai' || ['NVDA', 'MSFT', 'GOOGL', 'META'].includes(i.symbol) },
  { id: 'meme', name: 'Meme', en: 'Meme', match: (i: Instrument) => i.perpSector === 'meme' },
  { id: 'l1', name: 'Layer 1', en: 'Layer 1', match: (i: Instrument) => i.perpSector === 'l1' },
  { id: 'l2', name: 'Layer 2', en: 'Layer 2', match: (i: Instrument) => i.perpSector === 'l2' },
  { id: 'defi', name: 'DeFi', en: 'DeFi', match: (i: Instrument) => i.perpSector === 'defi' },
  { id: 'rwa', name: 'RWA', en: 'RWA', match: (i: Instrument) => i.perpSector === 'rwa' },
  { id: 'gaming', name: 'GameFi', en: 'GameFi', match: (i: Instrument) => i.perpSector === 'gaming' },
  { id: 'forex', name: '外汇', en: 'Forex', match: (i: Instrument) => i.category === 'forex' },
  { id: 'commodities', name: '大宗商品', en: 'Commodities', match: (i: Instrument) => i.category === 'commodities' },
  { id: 'indices', name: '指数', en: 'Indices', match: (i: Instrument) => i.category === 'indices' },
];
