// Demo (paper) trading engine shared by CFD trading, perpetual futures, the asset page and the header.
// All funds are virtual: there are no deposits or withdrawals in this prototype.
import { useEffect, useMemo } from "react";
import { Instrument } from "../data/marketData";
import { useSavedState } from "./marketModel";

export type MarketKind = "cfd" | "perp";
export type Side = "buy" | "sell";
export type MarginMode = "cross" | "isolated";
export type OrderType = "market" | "limit";
export type CloseReason = "manual" | "tp" | "sl" | "liq";
export type AccountKey = "cash" | "stock" | "reward";
export type DemoAccounts = Record<AccountKey, Record<string, number>>;

/** Check-in and rating bonuses are flat USDT amounts and land in the reward account */
export const CHECK_IN_REWARD_USDT = 10;
export const RATING_REWARD_USDT = 15;
/** Extra bonus on the 7th consecutive check-in day */
export const STREAK_BONUS_USDT = 20;
export const REWARD_WITHDRAW_FEE_USDT = 1;

export interface DemoPosition {
  id: string;
  market: MarketKind;
  symbol: string;
  side: Side;
  qty: number;
  entryPrice: number;
  leverage: number;
  marginMode: MarginMode;
  takeProfit?: number;
  stopLoss?: number;
  openedAt: number;
}

export interface DemoOrder {
  id: string;
  market: MarketKind;
  symbol: string;
  side: Side;
  qty: number;
  price: number;
  leverage: number;
  marginMode: MarginMode;
  takeProfit?: number;
  stopLoss?: number;
  createdAt: number;
}

export interface DemoFill {
  id: string;
  market: MarketKind;
  symbol: string;
  side: Side;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  leverage: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
  reason: CloseReason;
}

/** Same shape as the asset page's funding records */
export interface LedgerRecord {
  id: string;
  time: string;
  coin: string;
  network: string;
  address: string;
  amount: number;
  fee: number;
  statusZh: string;
  statusEn: string;
  txId: string;
}

export interface OrderRequest {
  market: MarketKind;
  symbol: string;
  side: Side;
  type: OrderType;
  qty: number;
  leverage: number;
  marginMode: MarginMode;
  price?: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface PositionRow extends DemoPosition {
  instrument?: Instrument;
  markPrice: number;
  pnl: number;
  roe: number;
  margin: number;
  liqPrice?: number;
  decimals: number;
}

export interface AccountSummary {
  market: MarketKind;
  coin: "USD" | "USDT";
  balance: number;
  unrealized: number;
  equity: number;
  usedMargin: number;
  frozenMargin: number;
  freeMargin: number;
  marginLevel: number | null;
  positions: number;
  orders: number;
}

/**
 * `coin` receives realized P&L; `collateral` coins count 1:1 towards margin.
 * One trading account backs both markets, split by currency so the two views never
 * double-count: USD collateralises CFDs, USDT collateralises perpetuals.
 */
export const ACCOUNT_FOR: Record<
  MarketKind,
  { key: AccountKey; coin: "USD" | "USDT"; collateral: string[] }
> = {
  cfd: { key: "stock", coin: "USD", collateral: ["USD"] },
  perp: { key: "stock", coin: "USDT", collateral: ["USDT"] },
};

export const marketOf = (i: Pick<Instrument, "category">): MarketKind =>
  i.category === "crypto" ? "perp" : "cfd";

/** Quote currency is not USD → P&L must be converted at the current rate */
const NON_USD_QUOTE = new Set(["USD/JPY", "USD/CAD", "USD/CHF"]);

/** Units per lot (CFD) or per contract unit (perp: 1 coin) */
export const contractSize = (i: Pick<Instrument, "category">) =>
  i.category === "crypto"
    ? 1
    : i.category === "forex"
      ? 10000
      : i.category === "indices"
        ? 10
        : 100;

export const notionalUsd = (
  i: Pick<Instrument, "category" | "symbol">,
  qty: number,
  price: number,
) => {
  const raw = price * qty * contractSize(i);
  return NON_USD_QUOTE.has(i.symbol) ? raw / price : raw;
};

export const requiredMargin = (
  i: Pick<Instrument, "category" | "symbol">,
  qty: number,
  price: number,
  leverage: number,
) => notionalUsd(i, qty, price) / Math.max(1, leverage);

/** Move-to-USD for a 1.0 price change on the given size */
export const pointValue = (
  i: Pick<Instrument, "category" | "symbol" | "price">,
  qty: number,
) => {
  const raw = qty * contractSize(i);
  return NON_USD_QUOTE.has(i.symbol) ? raw / i.price : raw;
};

export const pnlAt = (
  p: Pick<DemoPosition, "side" | "entryPrice" | "qty" | "symbol">,
  i: Pick<Instrument, "category" | "symbol">,
  price: number,
) => {
  const diff = p.side === "buy" ? price - p.entryPrice : p.entryPrice - price;
  const raw = diff * p.qty * contractSize(i);
  return NON_USD_QUOTE.has(p.symbol) ? raw / price : raw;
};

/** Simplified isolated-margin liquidation with 0.5% maintenance margin */
export const liquidationPrice = (side: Side, entry: number, leverage: number) => {
  const buffer = Math.max(0.001, 1 / Math.max(1, leverage) - 0.005);
  return side === "buy" ? entry * (1 - buffer) : entry * (1 + buffer);
};

export const qtyStep = (i: Pick<Instrument, "category" | "price">) =>
  i.category !== "crypto"
    ? 0.01
    : i.price >= 10000
      ? 0.001
      : i.price >= 100
        ? 0.01
        : i.price >= 1
          ? 0.1
          : 1;

export const stepDecimals = (step: number) =>
  step >= 1 ? 0 : Math.round(-Math.log10(step));

export const roundTo = (value: number, step: number) =>
  Number((Math.round(value / step) * step).toFixed(stepDecimals(step)));

export const leveragePresets = (max: number, market: MarketKind) => {
  const base =
    market === "perp" ? [5, 10, 20, 50, 75, 100, 125] : [5, 10, 20, 50, 100, 200];
  const list = base.filter((v) => v < max);
  return [...list.slice(-4), max];
};

export const defaultLeverage = (i: Pick<Instrument, "leverage" | "category">) =>
  i.category === "crypto" ? Math.min(20, i.leverage) : i.leverage;

export const displaySymbol = (symbol: string, market: MarketKind) =>
  market === "perp" ? symbol.replace("/USD", "USDT") : symbol;

/** Price used to close / mark an open position (longs exit at bid, shorts at ask) */
export const exitPriceOf = (side: Side, i: Pick<Instrument, "bid" | "ask">) =>
  side === "buy" ? i.bid : i.ask;

export const stamp = (ts: number) => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

const todayAt = (hms: string) => {
  const [h, m, s] = hms.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d.getTime();
};
const daysAgo = (days: number, hms: string) => todayAt(hms) - days * 86400000;

export const INITIAL_DEMO_ACCOUNTS: DemoAccounts = {
  cash: {
    USD: 0,
    USDT: 1000000,
    BTC: 0.45,
    ETH: 4.8,
    BCH: 0,
    XRP: 12500,
    LTC: 0,
    DOGE: 50000,
    DOT: 0,
    SOL: 65,
    USDC: 28500,
  },
  stock: {
    USD: 28450,
    USDT: 128450,
    BTC: 0.2,
    ETH: 1.5,
    BCH: 0,
    XRP: 0,
    LTC: 0,
    DOGE: 0,
    DOT: 0,
    SOL: 20,
    USDC: 12000,
  },
  reward: { USD: 0, USDT: 0 },
};

const INITIAL_POSITIONS = (): DemoPosition[] => [
  {
    id: "CFD-901",
    market: "cfd",
    symbol: "XAU/USD",
    side: "buy",
    qty: 2,
    entryPrice: 4128.4,
    leverage: 100,
    marginMode: "cross",
    takeProfit: 4185,
    stopLoss: 4105,
    openedAt: todayAt("09:15:22"),
  },
  {
    id: "CFD-902",
    market: "cfd",
    symbol: "NVDA",
    side: "buy",
    qty: 5,
    entryPrice: 231.2,
    leverage: 20,
    marginMode: "cross",
    takeProfit: 260,
    stopLoss: 222,
    openedAt: todayAt("09:42:10"),
  },
  {
    id: "CFD-903",
    market: "cfd",
    symbol: "EUR/USD",
    side: "sell",
    qty: 3,
    entryPrice: 1.1268,
    leverage: 200,
    marginMode: "cross",
    takeProfit: 1.119,
    stopLoss: 1.131,
    openedAt: todayAt("10:04:51"),
  },
  {
    id: "PERP-301",
    market: "perp",
    symbol: "BTC/USD",
    side: "buy",
    qty: 1.2,
    entryPrice: 83950,
    leverage: 50,
    marginMode: "cross",
    takeProfit: 88500,
    stopLoss: 82900,
    openedAt: todayAt("08:31:07"),
  },
  {
    id: "PERP-302",
    market: "perp",
    symbol: "SOL/USD",
    side: "buy",
    qty: 25,
    entryPrice: 198.4,
    leverage: 25,
    marginMode: "isolated",
    takeProfit: 224,
    stopLoss: 192,
    openedAt: todayAt("09:58:44"),
  },
  {
    id: "PERP-303",
    market: "perp",
    symbol: "TAO/USD",
    side: "buy",
    qty: 4,
    entryPrice: 525,
    leverage: 50,
    marginMode: "cross",
    takeProfit: 585,
    stopLoss: 518,
    openedAt: todayAt("10:20:16"),
  },
];

const INITIAL_FILLS = (): DemoFill[] => [
  {
    id: "CFD-874",
    market: "cfd",
    symbol: "AAPL",
    side: "buy",
    qty: 3,
    entryPrice: 326.4,
    exitPrice: 330.1,
    leverage: 20,
    pnl: 1110,
    openedAt: daysAgo(1, "14:02:11"),
    closedAt: daysAgo(1, "21:48:30"),
    reason: "tp",
  },
  {
    id: "CFD-861",
    market: "cfd",
    symbol: "USD/JPY",
    side: "sell",
    qty: 2,
    entryPrice: 144.2,
    exitPrice: 143.9,
    leverage: 200,
    pnl: 41.7,
    openedAt: daysAgo(2, "09:12:40"),
    closedAt: daysAgo(2, "16:35:02"),
    reason: "manual",
  },
  {
    id: "PERP-288",
    market: "perp",
    symbol: "ETH/USD",
    side: "buy",
    qty: 5,
    entryPrice: 3120,
    exitPrice: 3168,
    leverage: 20,
    pnl: 240,
    openedAt: daysAgo(1, "10:22:18"),
    closedAt: daysAgo(1, "23:05:44"),
    reason: "manual",
  },
  {
    id: "PERP-276",
    market: "perp",
    symbol: "PEPE/USD",
    side: "sell",
    qty: 200000,
    entryPrice: 0.01102,
    exitPrice: 0.01121,
    leverage: 20,
    pnl: -38,
    openedAt: daysAgo(3, "13:40:00"),
    closedAt: daysAgo(3, "15:12:26"),
    reason: "sl",
  },
];

const INITIAL_LEDGER: LedgerRecord[] = [
  {
    id: "TR-20261003892",
    time: "2026-10-03 18:12:04",
    coin: "USDT",
    network: "CASH → FUTURES (划转)",
    address: "Internal Transfer",
    amount: 25000,
    fee: 0,
    statusZh: "已完成",
    statusEn: "Completed",
    txId: "INTERNAL-0FEE",
  },
  {
    id: "TR-20260929410",
    time: "2026-09-29 11:05:39",
    coin: "USDT",
    network: "CASH → STOCK (划转)",
    address: "Internal Transfer",
    amount: 50000,
    fee: 0,
    statusZh: "已完成",
    statusEn: "Completed",
    txId: "INTERNAL-0FEE",
  },
  {
    id: "DV-20260921108",
    time: "2026-09-21 15:44:10",
    coin: "USD",
    network: "模拟持仓股息派发 · NVDA",
    address: "模拟 CFD 账户",
    amount: 420.5,
    fee: 0,
    statusZh: "已发放",
    statusEn: "Credited",
    txId: "DIV-NVDA-Q3",
  },
  {
    id: "DC-20260918001",
    time: "2026-09-18 10:00:00",
    coin: "USDT",
    network: "模拟账户开通 · 体验金发放",
    address: "模拟资金账户",
    amount: 1000000,
    fee: 0,
    statusZh: "已发放",
    statusEn: "Credited",
    txId: "DEMO-WELCOME",
  },
];

export const REASON_LABEL: Record<CloseReason, [string, string]> = {
  manual: ["手动平仓", "Manual"],
  tp: ["止盈触发", "Take profit"],
  sl: ["止损触发", "Stop loss"],
  liq: ["强制平仓", "Liquidated"],
};

const KEYS = {
  // v2: the perpetual wallet folded into the single trading account
  accounts: "alphapulse.demo.accounts.v2",
  positions: "alphapulse.demo.positions.v1",
  orders: "alphapulse.demo.orders.v1",
  fills: "alphapulse.demo.fills.v1",
  ledger: "alphapulse.demo.ledger.v1",
};

export function useDemoTrading(
  instruments: Instrument[],
  lang: "zh" | "en",
  notify: (message: string) => void,
) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [accounts, setAccounts] = useSavedState<DemoAccounts>(
    KEYS.accounts,
    INITIAL_DEMO_ACCOUNTS,
  );
  const [positions, setPositions] = useSavedState<DemoPosition[]>(
    KEYS.positions,
    INITIAL_POSITIONS(),
  );
  const [orders, setOrders] = useSavedState<DemoOrder[]>(KEYS.orders, []);
  const [fills, setFills] = useSavedState<DemoFill[]>(KEYS.fills, INITIAL_FILLS());
  const [ledger, setLedger] = useSavedState<LedgerRecord[]>(
    KEYS.ledger,
    INITIAL_LEDGER,
  );

  const bySymbol = useMemo(
    () => new Map(instruments.map((i) => [i.symbol, i])),
    [instruments],
  );

  const rows: PositionRow[] = useMemo(
    () =>
      positions.map((p) => {
        const i = bySymbol.get(p.symbol);
        const markPrice = i ? exitPriceOf(p.side, i) : p.entryPrice;
        const pnl = i ? pnlAt(p, i, markPrice) : 0;
        const margin = i
          ? requiredMargin(i, p.qty, p.entryPrice, p.leverage)
          : 0;
        return {
          ...p,
          instrument: i,
          markPrice,
          pnl,
          margin,
          roe: margin ? (pnl / margin) * 100 : 0,
          liqPrice:
            p.market === "perp"
              ? liquidationPrice(p.side, p.entryPrice, p.leverage)
              : undefined,
          decimals: i?.decimals ?? 2,
        };
      }),
    [positions, bySymbol],
  );

  const orderMargin = (o: DemoOrder) => {
    const i = bySymbol.get(o.symbol);
    return i ? requiredMargin(i, o.qty, o.price, o.leverage) : 0;
  };

  const summaryOf = (market: MarketKind): AccountSummary => {
    const { key, coin, collateral } = ACCOUNT_FOR[market];
    const balance = collateral.reduce((n, c) => n + (accounts[key]?.[c] ?? 0), 0);
    const mine = rows.filter((r) => r.market === market);
    const pending = orders.filter((o) => o.market === market);
    const unrealized = mine.reduce((n, r) => n + r.pnl, 0);
    const usedMargin = mine.reduce((n, r) => n + r.margin, 0);
    const frozenMargin = pending.reduce((n, o) => n + orderMargin(o), 0);
    const equity = balance + unrealized;
    return {
      market,
      coin,
      balance,
      unrealized,
      equity,
      usedMargin,
      frozenMargin,
      freeMargin: equity - usedMargin - frozenMargin,
      marginLevel: usedMargin > 0 ? (equity / usedMargin) * 100 : null,
      positions: mine.length,
      orders: pending.length,
    };
  };
  const summary = { cfd: summaryOf("cfd"), perp: summaryOf("perp") };

  const credit = (key: AccountKey, coin: string, amount: number) =>
    setAccounts((old) => ({
      ...old,
      [key]: { ...old[key], [coin]: (old[key]?.[coin] ?? 0) + amount },
    }));

  const settle = (p: DemoPosition, exitPrice: number, reason: CloseReason) => {
    const i = bySymbol.get(p.symbol);
    if (!i) return 0;
    const pnl = pnlAt(p, i, exitPrice);
    const now = Date.now();
    const { key, coin } = ACCOUNT_FOR[p.market];
    setPositions((old) => old.filter((x) => x.id !== p.id));
    setFills((old) => [
      {
        id: p.id,
        market: p.market,
        symbol: p.symbol,
        side: p.side,
        qty: p.qty,
        entryPrice: p.entryPrice,
        exitPrice,
        leverage: p.leverage,
        pnl,
        openedAt: p.openedAt,
        closedAt: now,
        reason,
      },
      ...old,
    ]);
    credit(key, coin, pnl);
    setLedger((old) => [
      {
        id: `TS-${now}${Math.floor(Math.random() * 90 + 10)}`,
        time: stamp(now),
        coin,
        network: `${p.market === "cfd" ? "CFD 平仓结算" : "合约平仓结算"} · ${displaySymbol(p.symbol, p.market)}`,
        address: `${REASON_LABEL[reason][0]} · ${p.side === "buy" ? "多" : "空"} ${p.qty}`,
        amount: Number(pnl.toFixed(2)),
        fee: 0,
        statusZh: "已结算",
        statusEn: "Settled",
        txId: p.id,
      },
      ...old,
    ]);
    return pnl;
  };

  // Price-driven automation: limit fills, then take-profit / stop-loss / liquidation
  useEffect(() => {
    const due = orders.filter((o) => {
      const i = bySymbol.get(o.symbol);
      return i && (o.side === "buy" ? i.ask <= o.price : i.bid >= o.price);
    });
    if (due.length) {
      setOrders((old) => old.filter((o) => !due.some((d) => d.id === o.id)));
      setPositions((old) => [
        ...due.map(
          (o): DemoPosition => ({
            id: o.id,
            market: o.market,
            symbol: o.symbol,
            side: o.side,
            qty: o.qty,
            entryPrice:
              o.side === "buy"
                ? Math.min(o.price, bySymbol.get(o.symbol)!.ask)
                : Math.max(o.price, bySymbol.get(o.symbol)!.bid),
            leverage: o.leverage,
            marginMode: o.marginMode,
            takeProfit: o.takeProfit,
            stopLoss: o.stopLoss,
            openedAt: Date.now(),
          }),
        ),
        ...old,
      ]);
      const o = due[0];
      notify(
        t(
          `限价单已成交：${o.side === "buy" ? "买入" : "卖出"} ${o.qty} ${displaySymbol(o.symbol, o.market)} @ ${o.price}`,
          `Limit order filled: ${o.side.toUpperCase()} ${o.qty} ${displaySymbol(o.symbol, o.market)} @ ${o.price}`,
        ),
      );
    }
    for (const p of positions) {
      const i = bySymbol.get(p.symbol);
      if (!i) continue;
      const px = exitPriceOf(p.side, i);
      const long = p.side === "buy";
      const liq =
        p.market === "perp"
          ? liquidationPrice(p.side, p.entryPrice, p.leverage)
          : undefined;
      // TP / SL execute at the prevailing exit price; liquidation closes at the liquidation level
      const hit: [number, CloseReason] | null =
        p.takeProfit && (long ? px >= p.takeProfit : px <= p.takeProfit)
          ? [px, "tp"]
          : p.stopLoss && (long ? px <= p.stopLoss : px >= p.stopLoss)
            ? [px, "sl"]
            : liq && (long ? px <= liq : px >= liq)
              ? [liq, "liq"]
              : null;
      if (!hit) continue;
      const pnl = settle(p, hit[0], hit[1]);
      notify(
        t(
          `${REASON_LABEL[hit[1]][0]}：${displaySymbol(p.symbol, p.market)} ${long ? "多单" : "空单"}已平仓，盈亏 ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
          `${REASON_LABEL[hit[1]][1]}: ${displaySymbol(p.symbol, p.market)} closed, P&L ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
        ),
      );
    }
  }, [instruments]);

  const placeOrder = (req: OrderRequest): { ok: boolean; message: string } => {
    const i = bySymbol.get(req.symbol);
    if (!i) return { ok: false, message: t("品种不存在", "Unknown instrument") };
    if (!(req.qty > 0))
      return { ok: false, message: t("请输入有效数量", "Enter a valid size") };
    if (req.type === "limit" && !(req.price && req.price > 0))
      return { ok: false, message: t("请输入有效的限价", "Enter a valid limit price") };
    const name = displaySymbol(i.symbol, req.market);
    const market = req.side === "buy" ? i.ask : i.bid;
    const marketable =
      req.type === "market" ||
      (req.side === "buy" ? req.price! >= i.ask : req.price! <= i.bid);
    const execPrice = marketable ? market : req.price!;
    const margin = requiredMargin(i, req.qty, execPrice, req.leverage);
    const free = summaryOf(req.market).freeMargin;
    if (margin > free)
      return {
        ok: false,
        message: t(
          `可用保证金不足：需要 ${margin.toFixed(2)}，可用 ${Math.max(0, free).toFixed(2)}。可减少数量或在模拟资产中划转资金`,
          `Insufficient margin: ${margin.toFixed(2)} required, ${Math.max(0, free).toFixed(2)} available`,
        ),
      };
    const base = {
      id: uid(req.market === "cfd" ? "CFD" : "PERP"),
      market: req.market,
      symbol: i.symbol,
      side: req.side,
      qty: req.qty,
      leverage: req.leverage,
      marginMode: req.marginMode,
      takeProfit: req.takeProfit,
      stopLoss: req.stopLoss,
    };
    const verb =
      req.market === "perp"
        ? req.side === "buy"
          ? t("开多", "Long")
          : t("开空", "Short")
        : req.side === "buy"
          ? t("买入做多", "Buy")
          : t("卖出做空", "Sell");
    const unit = req.market === "cfd" ? t(" 手", " lots") : "";
    if (marketable) {
      setPositions((old) => [
        { ...base, entryPrice: execPrice, openedAt: Date.now() },
        ...old,
      ]);
      return {
        ok: true,
        message: t(
          `模拟订单已成交：${verb} ${req.qty}${unit} ${name} @ ${execPrice.toFixed(i.decimals)}`,
          `Demo order filled: ${verb} ${req.qty}${unit} ${name} @ ${execPrice.toFixed(i.decimals)}`,
        ),
      };
    }
    setOrders((old) => [
      { ...base, price: req.price!, createdAt: Date.now() },
      ...old,
    ]);
    return {
      ok: true,
      message: t(
        `模拟限价单已挂出：${verb} ${req.qty}${unit} ${name} @ ${req.price!.toFixed(i.decimals)}`,
        `Demo limit order placed: ${verb} ${req.qty}${unit} ${name} @ ${req.price!.toFixed(i.decimals)}`,
      ),
    };
  };

  const closePosition = (id: string) => {
    const p = positions.find((x) => x.id === id);
    const i = p && bySymbol.get(p.symbol);
    if (!p || !i) return;
    const pnl = settle(p, exitPriceOf(p.side, i), "manual");
    notify(
      t(
        `已平仓模拟头寸 ${displaySymbol(p.symbol, p.market)}，结算盈亏 ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ${ACCOUNT_FOR[p.market].coin}`,
        `Closed demo ${displaySymbol(p.symbol, p.market)}, settled ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ${ACCOUNT_FOR[p.market].coin}`,
      ),
    );
  };

  const closeAll = (market: MarketKind) => {
    const mine = positions.filter((p) => p.market === market);
    let total = 0;
    for (const p of mine) {
      const i = bySymbol.get(p.symbol);
      if (i) total += settle(p, exitPriceOf(p.side, i), "manual");
    }
    if (mine.length)
      notify(
        t(
          `已一键平仓 ${mine.length} 笔模拟持仓，合计盈亏 ${total >= 0 ? "+" : ""}${total.toFixed(2)} ${ACCOUNT_FOR[market].coin}`,
          `Closed ${mine.length} demo positions, total ${total >= 0 ? "+" : ""}${total.toFixed(2)} ${ACCOUNT_FOR[market].coin}`,
        ),
      );
  };

  const updateProtection = (
    id: string,
    takeProfit?: number,
    stopLoss?: number,
  ) =>
    setPositions((old) =>
      old.map((p) => (p.id === id ? { ...p, takeProfit, stopLoss } : p)),
    );

  const cancelOrder = (id: string) => {
    const o = orders.find((x) => x.id === id);
    setOrders((old) => old.filter((x) => x.id !== id));
    if (o)
      notify(
        t(
          `已撤销限价单 ${displaySymbol(o.symbol, o.market)} @ ${o.price}`,
          `Cancelled limit order ${displaySymbol(o.symbol, o.market)} @ ${o.price}`,
        ),
      );
  };

  const claimDemoFunds = (amount = 10000) => {
    const now = Date.now();
    credit("cash", "USDT", amount);
    setLedger((old) => [
      {
        id: `DC-${now}`,
        time: stamp(now),
        coin: "USDT",
        network: "领取模拟金",
        address: "模拟资金账户",
        amount,
        fee: 0,
        statusZh: "已发放",
        statusEn: "Credited",
        txId: "DEMO-TOPUP",
      },
      ...old,
    ]);
  };

  const creditReward = (amount: number, note: string) => {
    const now = Date.now();
    credit("reward", "USDT", amount);
    setLedger((old) => [
      {
        id: `DC-${now}`,
        time: stamp(now),
        coin: "USDT",
        network: note,
        address: "奖励账户",
        amount,
        fee: 0,
        statusZh: "已发放",
        statusEn: "Credited",
        txId: "DEMO-REWARD",
      },
      ...old,
    ]);
  };

  /** The reward account is the one demo balance that can leave the account */
  const withdrawReward = (
    amount: number,
    fee: number,
    network: string,
    address: string,
  ) => {
    const balance = accounts.reward?.USDT ?? 0;
    if (!(amount > 0) || amount + fee > balance) return false;
    const now = Date.now();
    setAccounts((old) => ({
      ...old,
      reward: { ...old.reward, USDT: (old.reward?.USDT ?? 0) - amount - fee },
    }));
    setLedger((old) => [
      {
        id: `WD-${now}`,
        time: stamp(now),
        coin: "USDT",
        network: `奖励提现 · ${network}`,
        address,
        amount,
        fee,
        statusZh: "处理中",
        statusEn: "Processing",
        txId: `SIM-${now}`,
      },
      ...old,
    ]);
    return true;
  };

  const resetDemo = () => {
    setAccounts(INITIAL_DEMO_ACCOUNTS);
    setPositions(INITIAL_POSITIONS());
    setOrders([]);
    setFills(INITIAL_FILLS());
    setLedger(INITIAL_LEDGER);
  };

  return {
    accounts,
    setAccounts,
    ledger,
    setLedger,
    positions: rows,
    orders,
    fills,
    summary,
    orderMargin,
    placeOrder,
    closePosition,
    closeAll,
    cancelOrder,
    updateProtection,
    claimDemoFunds,
    creditReward,
    withdrawReward,
    resetDemo,
  };
}

export type DemoTrading = ReturnType<typeof useDemoTrading>;
