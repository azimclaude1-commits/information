import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  CandlestickChart,
  ChevronRight,
  Eye,
  EyeOff,
  Gift,
  ReceiptText,
  RotateCcw,
} from 'lucide-react';
import { useSavedState } from './marketModel';
import type { MarketKind } from './demoTrading';
import type { Portfolio } from './AssetPortfolio';
import { AssetLogo } from './AssetLogo';
import { displaySymbol } from './demoTrading';
import { ConfirmSheet } from './ui/Sheet';

type Lang = 'zh' | 'en';
type Account = 'trading' | 'funding' | 'reward';

const fmt = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedFmt = (v: number) => `${v >= 0 ? '+' : '-'}${fmt(Math.abs(v))}`;

/** Clean asset landing: one balance card, quick actions, and a compact card per account. */
export function AssetHome({
  lang,
  portfolio: pf,
  accountId,
  onClaim,
  onTransfer,
  onRewardWithdraw,
  onRecords,
  onDetails,
  onOpenTrade,
  onReset,
}: {
  lang: Lang;
  portfolio: Portfolio;
  accountId: string;
  onClaim: () => void;
  onTransfer: () => void;
  onRewardWithdraw: () => void;
  onRecords: () => void;
  onDetails: () => void;
  onOpenTrade: (market: MarketKind, symbol?: string) => void;
  onReset: () => void;
}) {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const [hidden, setHidden] = useSavedState('alphapulse.assets.hidden.v1', false);
  const [account, setAccount] = useState<Account>('trading');
  const [confirmReset, setConfirmReset] = useState(false);
  const holdings = pf.categories
    .flatMap((c) => c.rows.map((p) => ({ p, c })))
    .sort((a, b) => b.p.margin + b.p.pnl - (a.p.margin + a.p.pnl));
  const money = (v: number) => (hidden ? '******' : fmt(v));
  const tr = pf.trading;
  const marginLevel = tr.used > 0 ? (tr.equity / tr.used) * 100 : null;

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <h1 className="text-[22px] font-semibold text-ink px-1">{t('资产', 'Assets')}</h1>

      <section className="rounded-2xl overflow-hidden bg-surface shadow-[0_14px_36px_-20px_rgba(29,58,168,0.55)] ring-1 ring-line">
        <div className="relative overflow-hidden px-5 pt-5 pb-6 text-white bg-[radial-gradient(120%_150%_at_100%_0%,#3d7bff_0%,#1f4fe0_40%,#0b1f8a_100%)]">
          <div className="absolute -right-10 -top-14 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute right-6 bottom-3 w-24 h-28 rounded-2xl bg-white/10 rotate-12 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <button
              onClick={() => setHidden(!hidden)}
              className="flex items-center gap-1.5 text-[13px] text-white/85 cursor-pointer"
              aria-label={hidden ? t('显示金额', 'Show amounts') : t('隐藏金额', 'Hide amounts')}
            >
              {t('总资产', 'Total assets')}
              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={onDetails} className="flex items-center gap-0.5 text-[13px] text-white/85 hover:text-white cursor-pointer">
              {t('资产明细', 'Breakdown')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mt-1.5 text-[30px] sm:text-[34px] font-bold tracking-tight tabular-nums">
            {money(pf.total)} <span className="text-[15px] font-semibold text-white/85">USD</span>
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] text-white/70">{t('可用保证金 (USD)', 'Free margin (USD)')}</div>
              <div className="mt-0.5 text-[17px] font-semibold tabular-nums">{money(tr.free)}</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] text-white/70">{t('浮动盈亏 (USD)', 'Unrealized P&L (USD)')}</div>
              <div className="mt-0.5 text-[17px] font-semibold tabular-nums">{hidden ? '******' : signedFmt(tr.unrealized)}</div>
            </div>
          </div>
          <span className="relative mt-3 inline-block px-2 py-0.5 rounded-md bg-white/15 text-[11px] text-white/85">
            {t('模拟账户 · 虚拟资金', 'Demo account · virtual funds')}
          </span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-line">
          {[
            [<Gift key="g" className="w-[18px] h-[18px]" />, t('领模拟金', 'Claim'), onClaim],
            [<ArrowLeftRight key="t" className="w-[18px] h-[18px]" />, t('划转', 'Transfer'), onTransfer],
            [<ArrowUpRight key="w" className="w-[18px] h-[18px]" />, t('奖励提现', 'Withdraw'), onRewardWithdraw],
            [<ReceiptText key="r" className="w-[18px] h-[18px]" />, t('资金记录', 'History'), onRecords],
          ].map(([icon, label, onClick]) => (
            <button
              key={label as string}
              onClick={onClick as () => void}
              className="flex items-center justify-center gap-1.5 h-12 text-[13px] font-medium text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <span className="text-ink-2">{icon as React.ReactNode}</span>
              <span className="whitespace-nowrap">{label as string}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-6 px-1 pt-2" role="tablist">
        {(
          [
            ['trading', t('交易账户', 'Trading')],
            ['funding', t('资金账户', 'Funding')],
            ['reward', t('奖励账户', 'Rewards')],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            role="tab"
            aria-selected={account === id}
            onClick={() => setAccount(id)}
            className={`relative pb-2 text-[15px] cursor-pointer transition-colors ${
              account === id ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {name}
            <span className={`absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-ink transition-opacity ${account === id ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        ))}
      </div>

      <section className="ui-card p-5">
        {account === 'trading' ? (
          <>
            <div className="flex items-center justify-between gap-3 text-[12px] text-ink-3">
              <span>{t('账户权益', 'Equity')}</span>
              <span className="whitespace-nowrap">
                {t('模拟账户 ID', 'Demo ID')}: {accountId}
              </span>
            </div>
            <div className="mt-1 text-[22px] font-semibold text-ink tabular-nums">{money(tr.equity)} USD</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] text-ink-3">{t('盈亏', 'P&L')}</div>
                <div className={`mt-0.5 text-[15px] font-semibold tabular-nums ${tr.unrealized >= 0 ? 'text-up' : 'text-down'}`}>
                  {hidden ? '******' : signedFmt(tr.unrealized)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] text-ink-3">{t('保证金水平', 'Margin level')}</div>
                <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-up">
                  {marginLevel == null ? '--' : `${marginLevel.toFixed(2)}%`}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => onOpenTrade('cfd')} className="h-11 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-line transition-colors cursor-pointer">
                {t('去交易', 'Trade')}
              </button>
              <button onClick={onDetails} className="h-11 rounded-xl bg-brand text-white text-[14px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
                {t('资产明细', 'Breakdown')}
              </button>
            </div>
            <div className="mt-5 pt-4 border-t border-line">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-ink">
                  {t('当前持仓', 'Open positions')} <span className="text-ink-3 font-normal">({holdings.length})</span>
                </span>
                {holdings.length > 5 && (
                  <button onClick={onDetails} className="flex items-center text-[12px] text-ink-3 hover:text-ink-2 cursor-pointer">
                    {t('全部', 'All')}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {holdings.length ? (
                <ul className="mt-1 divide-y divide-line">
                  {holdings.slice(0, 5).map(({ p, c }) => (
                    <li key={p.id}>
                      <button onClick={() => onOpenTrade(p.market, p.symbol)} className="w-full py-3 flex items-center gap-3 text-left cursor-pointer">
                        {p.instrument ? <AssetLogo {...p.instrument} size="md" /> : <span className="w-8 h-8 rounded-full bg-surface-3" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold text-ink">{displaySymbol(p.symbol, p.market)}</span>
                            <span className={`text-[11px] font-semibold px-1.5 rounded ${p.side === 'buy' ? 'bg-up-soft text-up' : 'bg-down-soft text-down'}`}>
                              {p.side === 'buy' ? t('多', 'Long') : t('空', 'Short')} {p.leverage}x
                            </span>
                            <span className="text-[11px] px-1.5 rounded whitespace-nowrap" style={{ color: c.color, background: `${c.color}1a` }}>
                              {t(c.zh, c.en)}
                            </span>
                          </div>
                          <div className="text-[12px] text-ink-3 tabular-nums truncate">
                            {p.qty} {p.market === 'perp' ? p.symbol.split('/')[0] : t('手', 'lots')} · {t('开仓', 'Entry')} {p.entryPrice.toFixed(p.decimals)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-[14px] font-semibold tabular-nums ${p.pnl >= 0 ? 'text-up' : 'text-down'}`}>{hidden ? '****' : signedFmt(p.pnl)}</div>
                          <div className="text-[11px] text-ink-3 tabular-nums">
                            {p.roe >= 0 ? '+' : ''}
                            {p.roe.toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-7 flex flex-col items-center text-center">
                  <span className="w-12 h-12 rounded-full bg-surface-3 text-ink-3 flex items-center justify-center">
                    <CandlestickChart className="w-5 h-5" />
                  </span>
                  <div className="mt-2.5 text-[14px] font-semibold text-ink">{t('暂无持仓', 'No open positions')}</div>
                  <div className="mt-1 text-[12px] text-ink-3">{t('去交易页选择品种，开启第一笔模拟交易', 'Pick an instrument to open your first demo trade')}</div>
                  <button onClick={() => onOpenTrade('cfd')} className="mt-3 h-9 px-5 rounded-full bg-brand text-white text-[13px] font-medium cursor-pointer">
                    {t('去开仓', 'Open a trade')}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : account === 'funding' ? (
          <>
            <div className="text-[12px] text-ink-3">{t('资金账户估值', 'Funding value')}</div>
            <div className="mt-1 text-[22px] font-semibold text-ink tabular-nums">{money(pf.funding)} USD</div>
            <p className="mt-3 text-[13px] text-ink-3 leading-6">
              {t('存放模拟金与现货币种，划转到交易账户后即可作为保证金下单。', 'Holds demo funds and spot coins. Transfer to the trading account to use as margin.')}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={onDetails} className="h-11 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-line transition-colors cursor-pointer">
                {t('资产明细', 'Breakdown')}
              </button>
              <button onClick={onTransfer} className="h-11 rounded-xl bg-brand text-white text-[14px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
                {t('划转', 'Transfer')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-[12px] text-ink-3">{t('可提现奖励', 'Withdrawable rewards')}</div>
            <div className="mt-1 text-[22px] font-semibold text-ink tabular-nums">{money(pf.reward)} USDT</div>
            <p className="mt-3 text-[13px] text-ink-3 leading-6">
              {t('签到与评分奖励会发放到这里，可单独提现。', 'Check-in and rating bonuses land here and can be withdrawn separately.')}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={onRecords} className="h-11 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-line transition-colors cursor-pointer">
                {t('资金记录', 'History')}
              </button>
              <button onClick={onRewardWithdraw} className="h-11 rounded-xl bg-brand text-white text-[14px] font-medium hover:opacity-90 transition-opacity cursor-pointer">
                {t('奖励提现', 'Withdraw')}
              </button>
            </div>
          </>
        )}
      </section>

      <div className="flex justify-center pt-1">
        <button
          onClick={() => setConfirmReset(true)}
          className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors text-ink-3 hover:text-ink-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('重置模拟账户', 'Reset demo account')}
        </button>
      </div>
      {confirmReset && (
        <ConfirmSheet
          danger
          title={t('重置模拟账户？', 'Reset demo account?')}
          confirm={t('确认重置', 'Reset')}
          cancel={t('取消', 'Cancel')}
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            onReset();
          }}
        >
          <p className="text-[13.5px] leading-6 text-ink-2">
            {t('重置后账户将恢复到初始状态，此操作不可撤销：', 'Your demo account returns to its starting state. This cannot be undone:')}
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-ink-2">
            {[
              t(`当前 ${tr.positions} 个持仓和 ${tr.orders} 个委托将被清除，并恢复初始示例持仓`, `${tr.positions} positions and ${tr.orders} orders are replaced by the starter positions`),
              t('资金账户与交易账户恢复初始模拟资金', 'Funding and trading balances return to the starting demo funds'),
              t(`奖励账户余额 ${pf.reward.toFixed(2)} USDT 将清零`, `Reward balance of ${pf.reward.toFixed(2)} USDT is cleared`),
              t('资金记录和历史成交将重置', 'Funding history and closed trades are reset'),
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-2 w-1 h-1 rounded-full bg-down shrink-0" />
                {x}
              </li>
            ))}
          </ul>
        </ConfirmSheet>
      )}
    </div>
  );
}
