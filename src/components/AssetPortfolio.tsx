import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Bitcoin,
  CandlestickChart,
  ChevronRight,
  Gem,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react';
import type { AssetCategory, Instrument } from '../data/marketData';
import { AssetLogo } from './AssetLogo';
import {
  displaySymbol,
  type AccountSummary,
  type DemoAccounts,
  type DemoOrder,
  type MarketKind,
  type PositionRow,
} from './demoTrading';

type Lang = 'zh' | 'en';
type Tab = 'overview' | AssetCategory;

/** Same categories as the trading desk watchlist. */
const CATEGORIES: {
  id: AssetCategory;
  zh: string;
  en: string;
  color: string;
  icon: React.ReactNode;
  symbol: string;
}[] = [
  { id: 'stocks', zh: '股票', en: 'Stocks', color: '#3b82f6', icon: <TrendingUp size={16} />, symbol: 'NVDA' },
  { id: 'crypto', zh: '加密货币', en: 'Crypto', color: '#f97316', icon: <Bitcoin size={16} />, symbol: 'BTC/USD' },
  { id: 'forex', zh: '外汇', en: 'Forex', color: '#14b8a6', icon: <ArrowLeftRight size={16} />, symbol: 'EUR/USD' },
  { id: 'commodities', zh: '大宗商品', en: 'Commodities', color: '#f59e0b', icon: <Gem size={16} />, symbol: 'XAU/USD' },
  { id: 'indices', zh: '指数', en: 'Indices', color: '#8b5cf6', icon: <BarChart3 size={16} />, symbol: 'NAS100' },
];
const CASH_COLOR = '#94a3b8';
const REWARD_COLOR = '#ec4899';
const STABLE = ['USD', 'USDT', 'USDC'];
/** Coins without a live quote in the demo feed. */
const FALLBACK_PRICE: Record<string, number> = { BCH: 468.5, LTC: 94.2, DOT: 6.85 };
const COIN_NAME: Record<string, [string, string]> = {
  BTC: ['比特币', 'Bitcoin'],
  ETH: ['以太坊', 'Ethereum'],
  SOL: ['索拉纳', 'Solana'],
  XRP: ['瑞波币', 'XRP'],
  DOGE: ['狗狗币', 'Dogecoin'],
  BCH: ['比特现金', 'Bitcoin Cash'],
  LTC: ['莱特币', 'Litecoin'],
  DOT: ['波卡', 'Polkadot'],
};

export type Portfolio = ReturnType<typeof buildPortfolio>;

/**
 * Values every asset in USD (USD ≈ USDT 1:1). Positions count at margin + unrealized P&L;
 * the rest of the trading equity, stablecoins and rewards sit under cash so nothing is double-counted.
 */
export function buildPortfolio({
  accounts,
  positions,
  orders,
  summary,
  instruments,
}: {
  accounts: DemoAccounts;
  positions: PositionRow[];
  orders: DemoOrder[];
  summary: Record<MarketKind, AccountSummary>;
  instruments: Instrument[];
}) {
  const price = (coin: string) =>
    STABLE.includes(coin)
      ? 1
      : instruments.find((i) => i.symbol === `${coin}/USD`)?.price ?? FALLBACK_PRICE[coin] ?? 0;
  const categoryOf = (symbol: string) => instruments.find((i) => i.symbol === symbol)?.category;
  const coins = [...new Set([...Object.keys(accounts.cash), ...Object.keys(accounts.stock)])]
    .filter((c) => !STABLE.includes(c))
    .map((coin) => {
      const qty = (accounts.cash[coin] ?? 0) + (accounts.stock[coin] ?? 0);
      const instrument = instruments.find((i) => i.symbol === `${coin}/USD`);
      return { coin, qty, instrument, price: price(coin), value: qty * price(coin) };
    })
    .sort((a, b) => b.value - a.value);
  const spot = coins.reduce((n, c) => n + c.value, 0);
  const categories = CATEGORIES.map((c) => {
    const rows = positions.filter((p) => p.instrument?.category === c.id);
    const margin = rows.reduce((n, p) => n + p.margin, 0);
    const pnl = rows.reduce((n, p) => n + p.pnl, 0);
    return {
      ...c,
      rows,
      orders: orders.filter((o) => categoryOf(o.symbol) === c.id).length,
      margin,
      pnl,
      value: margin + pnl + (c.id === 'crypto' ? spot : 0),
    };
  });
  const inPositions = positions.reduce((n, p) => n + p.margin + p.pnl, 0);
  const equity = summary.cfd.equity + summary.perp.equity;
  const stable = STABLE.map((coin) => ({
    coin,
    qty: (accounts.cash[coin] ?? 0) + (accounts.stock[coin] ?? 0),
  }));
  const cash =
    equity -
    inPositions +
    STABLE.reduce((n, c) => n + (accounts.cash[c] ?? 0), 0) +
    (accounts.stock.USDC ?? 0);
  const reward = (accounts.reward.USDT ?? 0) + (accounts.reward.USD ?? 0);
  const total = categories.reduce((n, c) => n + c.value, 0) + cash + reward;
  /** Funding wallet alone: stablecoins plus spot coins at market value. */
  const funding = Object.entries(accounts.cash).reduce((n, [coin, qty]) => n + qty * price(coin), 0);
  return {
    categories,
    coins,
    stable,
    cash,
    reward,
    funding,
    total,
    trading: {
      equity,
      balance: summary.cfd.balance + summary.perp.balance,
      unrealized: summary.cfd.unrealized + summary.perp.unrealized,
      used: summary.cfd.usedMargin + summary.perp.usedMargin + summary.cfd.frozenMargin + summary.perp.frozenMargin,
      free: summary.cfd.freeMargin + summary.perp.freeMargin,
      positions: summary.cfd.positions + summary.perp.positions,
      orders: summary.cfd.orders + summary.perp.orders,
    },
  };
}

const usd = (v: number, digits = 2) =>
  `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const signed = (v: number) => `${v >= 0 ? '+' : ''}${usd(v)}`;
const pct = (v: number, total: number) => (total > 0 ? (v / total) * 100 : 0);

export function AssetPortfolio({
  lang,
  portfolio: pf,
  onOpenTrade,
  onTransfer,
}: {
  lang: Lang;
  portfolio: Portfolio;
  onOpenTrade: (market: MarketKind, symbol?: string) => void;
  onTransfer: () => void;
}) {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const [tab, setTab] = useState<Tab>('overview');
  const [hideZero, setHideZero] = useState(true);
  const tr = pf.trading;
  const active = pf.categories.find((c) => c.id === tab);
  const allRows = pf.categories
    .flatMap((c) => c.rows.map((p) => ({ p, c })))
    .sort((a, b) => b.p.margin + b.p.pnl - (a.p.margin + a.p.pnl));
  const positionList = (
    rows: PositionRow[] | { p: PositionRow; c: (typeof pf.categories)[number] }[],
    empty: string,
    withCategory = false,
  ) =>
    rows.length ? (
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const { p, c } = 'p' in row ? row : { p: row, c: undefined };
          return (
            <li key={p.id} className="py-3 flex items-center gap-3">
              {p.instrument ? <AssetLogo {...p.instrument} size="md" /> : <span className="w-8 h-8 rounded-full bg-surface-3" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14px] font-semibold text-ink">{displaySymbol(p.symbol, p.market)}</span>
                  <span className={`text-[11px] font-semibold px-1.5 rounded ${p.side === 'buy' ? 'bg-up-soft text-up' : 'bg-down-soft text-down'}`}>
                    {p.side === 'buy' ? t('多', 'Long') : t('空', 'Short')} {p.leverage}x
                  </span>
                  {withCategory && c && (
                    <span className="text-[11px] px-1.5 rounded" style={{ color: c.color, background: `${c.color}1a` }}>
                      {t(c.zh, c.en)}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-ink-3 tabular-nums truncate">
                  {p.qty} {p.market === 'perp' ? p.symbol.split('/')[0] : t('手', 'lots')} · {p.entryPrice.toFixed(p.decimals)} → {p.markPrice.toFixed(p.decimals)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[14px] font-semibold tabular-nums ${p.pnl >= 0 ? 'text-up' : 'text-down'}`}>{signed(p.pnl)}</div>
                <div className="text-[11px] text-ink-3 tabular-nums">
                  {p.roe >= 0 ? '+' : ''}
                  {p.roe.toFixed(2)}% · {t('保证金', 'Margin')} {usd(p.margin)}
                </div>
              </div>
              <button onClick={() => onOpenTrade(p.market, p.symbol)} className="hidden sm:inline-flex ui-btn h-7 px-2.5 text-[12px] shrink-0">
                {t('交易', 'Trade')}
              </button>
            </li>
          );
        })}
      </ul>
    ) : (
      <div className="py-6 text-center text-[13px] text-ink-3">{empty}</div>
    );

  return (
    <>
      {/* One trading account: every market shares the same margin */}
      <div className="ui-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-brand-soft text-brand">
              <CandlestickChart className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0 text-[14px] font-semibold text-ink">{t('交易账户 (模拟)', 'Trading account (demo)')}</div>
          </div>
          <button onClick={() => onOpenTrade('cfd')} className="ui-btn ui-btn-soft h-8 text-[12px] shrink-0">
            {t('前往交易', 'Trade')}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[12px] text-ink-3">{t('账户权益', 'Equity')}</div>
            <div className="text-[24px] font-semibold text-ink tracking-tight tabular-nums">{usd(tr.equity)}</div>
          </div>
          <div className={`text-right text-[14px] font-semibold tabular-nums ${tr.unrealized >= 0 ? 'text-up' : 'text-down'}`}>
            <div className="text-[12px] font-normal text-ink-3">{t('浮动盈亏', 'Unrealized')}</div>
            {signed(tr.unrealized)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-3 pt-3 border-t border-line text-[12px]">
          {[
            [t('账户余额', 'Balance'), usd(tr.balance)],
            [t('已用保证金', 'Used margin'), usd(tr.used)],
            [t('可用保证金', 'Free margin'), usd(tr.free)],
            [t('持仓 / 委托', 'Pos. / orders'), `${tr.positions} / ${tr.orders}`],
          ].map(([k, v]) => (
            <div key={k} className="even:text-right sm:[&:nth-child(2)]:text-left">
              <div className="text-ink-3">{k}</div>
              <div className="mt-0.5 font-semibold text-ink tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings grouped like the market categories */}
      <div className="ui-card overflow-hidden">
        <div className="ui-card-head overflow-x-auto no-scrollbar">
          <div className="ui-tabs flex-nowrap" role="tablist" aria-label={t('资产分类', 'Asset categories')}>
            {(
              [
                ['overview', t('总览', 'Overview'), <LayoutGrid key="o" size={14} />],
                ...pf.categories.map((c) => [c.id, t(c.zh, c.en), null] as const),
              ] as const
            ).map(([id, name, icon]) => (
              <button
                key={id}
                role="tab"
                className="ui-tab whitespace-nowrap shrink-0 gap-1.5"
                aria-selected={tab === id}
                onClick={() => setTab(id as Tab)}
              >
                {icon}
                {name}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' ? (
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-ink-3">{t('资产分布', 'Allocation')}</span>
                <span className="text-[12px] text-ink-3 tabular-nums">
                  {t('合计', 'Total')} <b className="text-ink font-semibold">{usd(pf.total)}</b>
                </span>
              </div>
              <div className="mt-2 flex h-2.5 rounded-full overflow-hidden bg-surface-3" aria-hidden="true">
                {[...pf.categories.map((c) => [c.color, c.value] as const), [CASH_COLOR, pf.cash] as const, [REWARD_COLOR, pf.reward] as const]
                  .filter(([, v]) => v > 0)
                  .map(([color, v], i) => (
                    <span key={i} style={{ width: `${pct(v, pf.total)}%`, background: color }} />
                  ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 -mt-2">
              {[
                ...pf.categories.map((c) => [c.id, t(c.zh, c.en), c.color, c.value] as const),
                ['cash', t('现金', 'Cash'), CASH_COLOR, pf.cash] as const,
                ['reward', t('奖励', 'Rewards'), REWARD_COLOR, pf.reward] as const,
              ]
                .filter(([, , , v]) => v > 0)
                .map(([id, name, color, v]) => (
                  <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-ink-3 tabular-nums">
                    <i className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {name} {pct(v, pf.total).toFixed(1)}%
                  </span>
                ))}
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-[12px] font-medium text-ink-2">
                  {t('当前持仓', 'Open positions')} ({allRows.length})
                </span>
                {allRows.length > 0 && (
                  <span className={`text-[12px] font-semibold tabular-nums ${tr.unrealized >= 0 ? 'text-up' : 'text-down'}`}>
                    {t('浮动盈亏', 'Unrealized')} {signed(tr.unrealized)}
                  </span>
                )}
              </div>
              {positionList(allRows, t('暂无持仓', 'No open positions'), true)}
            </div>
          </div>
        ) : (
          active && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  [t('资产价值', 'Value'), usd(active.value), ''],
                  [t('占用保证金', 'Margin'), usd(active.margin), ''],
                  [t('浮动盈亏', 'Unrealized'), signed(active.pnl), active.pnl >= 0 ? 'text-up' : 'text-down'],
                  [t('持仓 / 委托', 'Pos. / orders'), `${active.rows.length} / ${active.orders}`, ''],
                ].map(([k, v, cls]) => (
                  <div key={k} className="rounded-xl bg-surface-2 px-3 py-2.5">
                    <div className="text-[11px] text-ink-3">{k}</div>
                    <div className={`mt-0.5 text-[14px] font-semibold tabular-nums ${cls || 'text-ink'}`}>{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[12px] font-medium text-ink-2 mb-1">
                  {active.id === 'crypto' ? t('合约持仓', 'Perpetual positions') : t('持仓', 'Positions')}
                </div>
                {positionList(active.rows, t(`暂无${active.zh}持仓`, `No ${active.en.toLowerCase()} positions`))}
              </div>

              {active.id === 'crypto' && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[12px] font-medium text-ink-2">{t('现货资产', 'Spot holdings')}</span>
                    <label className="flex items-center gap-1.5 text-[12px] text-ink-3 cursor-pointer">
                      <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
                      {t('隐藏 0 余额', 'Hide zero balances')}
                    </label>
                  </div>
                  <ul className="divide-y divide-line">
                    {pf.coins
                      .filter((c) => !hideZero || c.qty > 0)
                      .map((c) => (
                        <li key={c.coin} className="py-3 flex items-center gap-3">
                          {c.instrument ? (
                            <AssetLogo {...c.instrument} size="md" />
                          ) : (
                            <AssetLogo symbol={`${c.coin}/USD`} category="crypto" size="md" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-ink">{c.coin}</div>
                            <div className="text-[12px] text-ink-3 truncate">
                              {COIN_NAME[c.coin] ? t(...COIN_NAME[c.coin]) : c.coin} · {usd(c.price, c.price < 1 ? 4 : 2)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[14px] font-semibold text-ink tabular-nums">
                              {c.qty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                            </div>
                            <div className="text-[11px] text-ink-3 tabular-nums">≈ {usd(c.value)}</div>
                          </div>
                          <button onClick={onTransfer} className="hidden sm:inline-flex ui-btn h-7 px-2.5 text-[12px] shrink-0">
                            {t('划转', 'Transfer')}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => onOpenTrade(active.id === 'crypto' ? 'perp' : 'cfd', active.symbol)}
                className="ui-btn ui-btn-soft w-full h-10 text-[13px]"
              >
                {t(`去交易${active.zh}`, `Trade ${active.en.toLowerCase()}`)}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )
        )}
      </div>
    </>
  );
}
