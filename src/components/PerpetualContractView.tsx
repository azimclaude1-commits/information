import React, { useState, useMemo } from 'react';
import {
  Search,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { Instrument, CryptoPerpSector } from '../data/marketData';
import { AssetLogo } from './AssetLogo';
import { TradingChartPanel } from './TradingChartPanel';
import { AiChartInsightModal } from './AiChartInsightModal';

interface PerpetualContractViewProps {
  instruments: Instrument[];
  lang: 'zh' | 'en';
  theme: 'dark' | 'light';
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onNavigateWithdraw: () => void;
  onTriggerToast: (msg: string) => void;
}

interface PerpPosition {
  id: string;
  symbol: string;
  marginMode: 'cross' | 'isolated';
  side: 'buy' | 'sell';
  contracts: number;
  entryPrice: number;
  leverage: number;
  liqPrice: number;
  takeProfit?: number;
  stopLoss?: number;
}

export const PerpetualContractView: React.FC<PerpetualContractViewProps> = ({
  instruments,
  lang,
  theme,
  balance,
  onUpdateBalance,
  onNavigateWithdraw,
  onTriggerToast,
}) => {
  const cryptoPerps = useMemo(
    () => instruments.filter((i) => i.category === 'crypto'),
    [instruments]
  );

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const [selectedSector, setSelectedSector] = useState<'all' | CryptoPerpSector>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [leverage, setLeverage] = useState<number>(50);
  const [contractQty, setContractQty] = useState<number>(1.5);
  const [tpEnabled, setTpEnabled] = useState<boolean>(true);
  const [slEnabled, setSlEnabled] = useState<boolean>(true);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  const [perpPositions, setPerpPositions] = useState<PerpPosition[]>([
    {
      id: 'PERP-301',
      symbol: 'BTC/USD',
      marginMode: 'cross',
      side: 'buy',
      contracts: 1.2,
      entryPrice: 83950.0,
      leverage: 50,
      liqPrice: 81420.0,
      takeProfit: 88500.0,
      stopLoss: 82500.0,
    },
    {
      id: 'PERP-302',
      symbol: 'SOL/USD',
      marginMode: 'isolated',
      side: 'buy',
      contracts: 25.0,
      entryPrice: 198.4,
      leverage: 25,
      liqPrice: 186.2,
      takeProfit: 224.0,
      stopLoss: 192.0,
    },
    {
      id: 'PERP-303',
      symbol: 'TAO/USD',
      marginMode: 'cross',
      side: 'buy',
      contracts: 4.0,
      entryPrice: 525.0,
      leverage: 50,
      liqPrice: 498.5,
      takeProfit: 585.0,
      stopLoss: 510.0,
    },
  ]);

  const activePerp = useMemo(
    () => cryptoPerps.find((c) => c.symbol === selectedSymbol) || cryptoPerps[0],
    [cryptoPerps, selectedSymbol]
  );

  const filteredPerps = useMemo(() => {
    return cryptoPerps.filter((c) => {
      if (selectedSector !== 'all' && c.perpSector !== selectedSector) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.symbol.toLowerCase().includes(q) ||
          c.nameZh.toLowerCase().includes(q) ||
          c.nameEn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cryptoPerps, selectedSector, searchQuery]);

  // Dense 9-level Asks & 9-level Bids Order Book with Cumulative Sum & Depth Bars (Requirement #1: Fill Order Book without blank space)
  const { asks, bids, maxTotal } = useMemo(() => {
    const step =
      activePerp.decimals >= 4
        ? 0.00012
        : activePerp.decimals === 3
        ? 0.004
        : activePerp.price > 1000
        ? 1.5
        : 0.05;
    const rawAsks: { price: number; size: number; total: number }[] = [];
    const rawBids: { price: number; size: number; total: number }[] = [];

    let askCum = 0;
    const tempAsks: { price: number; size: number; total: number }[] = [];
    for (let i = 1; i <= 9; i++) {
      const sz = Number((1.4 + ((i * 7 + Math.floor(activePerp.price)) % 13) * 1.15).toFixed(2));
      askCum = Number((askCum + sz).toFixed(2));
      tempAsks.push({
        price: Number((activePerp.ask + i * step).toFixed(activePerp.decimals)),
        size: sz,
        total: askCum,
      });
    }
    for (let i = tempAsks.length - 1; i >= 0; i--) {
      rawAsks.push(tempAsks[i]);
    }

    let bidCum = 0;
    for (let i = 1; i <= 9; i++) {
      const sz = Number((1.6 + ((i * 5 + Math.floor(activePerp.price)) % 14) * 1.25).toFixed(2));
      bidCum = Number((bidCum + sz).toFixed(2));
      rawBids.push({
        price: Number((activePerp.bid - i * step).toFixed(activePerp.decimals)),
        size: sz,
        total: bidCum,
      });
    }

    const maxT = Math.max(askCum, bidCum, 1);
    return { asks: rawAsks, bids: rawBids, maxTotal: maxT };
  }, [activePerp]);

  const positionsWithPnl = useMemo(() => {
    return perpPositions.map((pos) => {
      const inst = cryptoPerps.find((c) => c.symbol === pos.symbol);
      const markPrice = inst ? inst.price : pos.entryPrice;
      const decimals = inst ? inst.decimals : 2;
      const diff = pos.side === 'buy' ? markPrice - pos.entryPrice : pos.entryPrice - markPrice;
      const multiplier = pos.symbol.startsWith('BTC') ? 1 : pos.symbol.startsWith('ETH') ? 5 : 20;
      const pnl = diff * pos.contracts * multiplier;
      return { ...pos, markPrice, decimals, pnl };
    });
  }, [perpPositions, cryptoPerps]);

  const totalPerpPnl = positionsWithPnl.reduce((acc, p) => acc + p.pnl, 0);

  const handleOpenPerpOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const execPrice = orderSide === 'buy' ? activePerp.ask : activePerp.bid;
    const liq = Number(
      (execPrice * (orderSide === 'buy' ? 1 - 0.9 / leverage : 1 + 0.9 / leverage)).toFixed(
        activePerp.decimals
      )
    );
    const tp = tpEnabled
      ? Number((execPrice * (orderSide === 'buy' ? 1.035 : 0.965)).toFixed(activePerp.decimals))
      : undefined;
    const sl = slEnabled
      ? Number((execPrice * (orderSide === 'buy' ? 0.982 : 1.018)).toFixed(activePerp.decimals))
      : undefined;

    setPerpPositions((prev) => [
      {
        id: `PERP-${Math.floor(100 + Math.random() * 900)}`,
        symbol: activePerp.symbol,
        marginMode,
        side: orderSide,
        contracts: contractQty,
        entryPrice: execPrice,
        leverage,
        liqPrice: liq,
        takeProfit: tp,
        stopLoss: sl,
      },
      ...prev,
    ]);

    onTriggerToast(
      lang === 'zh'
        ? `永续合约建仓成功：${marginMode === 'cross' ? '全仓' : '逐仓'} ${leverage}x ${
            orderSide === 'buy' ? '开多' : '开空'
          } ${contractQty} 张 ${activePerp.symbol.replace('/USD', 'USDT')}`
        : `Perpetual Order Filled: ${marginMode.toUpperCase()} ${leverage}x ${orderSide.toUpperCase()} ${contractQty} ${activePerp.symbol}`
    );
  };

  const handleClosePerp = (id: string, pnl: number, symbol: string) => {
    setPerpPositions((prev) => prev.filter((p) => p.id !== id));
    onUpdateBalance(pnl);
    onTriggerToast(
      lang === 'zh'
        ? `永续合约已平仓 ${symbol}，结算盈亏 ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`
        : `Closed ${symbol} Perpetual, settled ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`
    );
  };

  const sectorLabels: Record<CryptoPerpSector, { zh: string; en: string }> = {
    l1: { zh: '公链 L1', en: 'Layer 1' },
    ai: { zh: 'AI 人工智能', en: 'AI' },
    meme: { zh: 'MEME 迷因', en: 'MEME' },
    l2: { zh: 'Layer 2', en: 'Layer 2' },
    defi: { zh: 'DeFi 金融', en: 'DeFi' },
    rwa: { zh: 'RWA 现实资产', en: 'RWA' },
    gaming: { zh: 'GameFi 链游', en: 'Gaming' },
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Perpetual Contract Funding Rate & Index Telemetry Bar */}
      <div className="bg-slate-900 text-white px-4 lg:px-6 py-2 border-b border-slate-800 flex items-center justify-between gap-4 text-xs overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-5 whitespace-nowrap shrink-0">
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold whitespace-nowrap">
            {lang === 'zh' ? 'USDT 本位永续合约 (Perpetual)' : 'USDT-M Perpetual Futures'}
          </span>
          <div className="flex items-center gap-1.5 font-mono whitespace-nowrap">
            <span className="text-slate-400">{lang === 'zh' ? '标记价格:' : 'Mark Price:'}</span>
            <strong className="text-white">{activePerp.price.toFixed(activePerp.decimals)}</strong>
          </div>
          <div className="flex items-center gap-1.5 font-mono whitespace-nowrap">
            <span className="text-slate-400">{lang === 'zh' ? '指数价格:' : 'Index Price:'}</span>
            <strong className="text-slate-200">
              {(activePerp.price * 0.9998).toFixed(activePerp.decimals)}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 font-mono whitespace-nowrap">
            <span className="text-slate-400">{lang === 'zh' ? '资金费率 / 倒计时:' : 'Funding / Countdown:'}</span>
            <strong className="text-emerald-400">+0.0100% / 03:41:18</strong>
          </div>
          <div className="flex items-center gap-1.5 font-mono whitespace-nowrap">
            <span className="text-slate-400">{lang === 'zh' ? '24h未平仓合约 (OI):' : '24h Open Interest:'}</span>
            <strong className="text-white">$4.82B USDT</strong>
          </div>
        </div>

        <button
          onClick={() => setAiModalOpen(true)}
          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          <span>{lang === 'zh' ? `AI解读 ${activePerp.symbol.replace('/USD', 'USDT')}` : `AI Insight ${activePerp.symbol}`}</span>
        </button>
      </div>

      {/* Main 3-Column Perpetual Contract Terminal */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:min-h-[calc(100vh-6rem)]">
        {/* Left Watchlist: Crypto Perpetual Contracts Grouped by Sector (Requirement #2) */}
        <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F131C] flex flex-col max-h-[360px] lg:max-h-[calc(100vh-6rem)]">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {lang === 'zh' ? '永续合约板块分组 (Binance Zones)' : 'Perpetual Sector Zones'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">{filteredPerps.length} Pairs</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'zh' ? '搜索合约 (BTC, TAO, PEPE, ARB, ONDO)...' : 'Search Perpetual Pair...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Binance / OKX Style Sector Category Tabs (All, L1, AI, MEME, Layer2, DeFi, RWA, Gaming) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold pt-0.5">
              {[
                { id: 'all', zh: '全部合约', en: 'All' },
                { id: 'l1', zh: '主力公链 L1', en: 'Layer 1' },
                { id: 'ai', zh: 'AI 人工智能', en: 'AI' },
                { id: 'meme', zh: 'MEME 迷因', en: 'MEME' },
                { id: 'l2', zh: 'Layer 2', en: 'Layer 2' },
                { id: 'defi', zh: 'DeFi', en: 'DeFi' },
                { id: 'rwa', zh: 'RWA', en: 'RWA' },
                { id: 'gaming', zh: 'GameFi', en: 'Gaming' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSector(sec.id as any)}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSector === sec.id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'zh' ? sec.zh : sec.en}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/70">
            <div className="col-span-6">{lang === 'zh' ? '合约 / 板块标签' : 'Perp / Sector'}</div>
            <div className="col-span-3 text-right">{lang === 'zh' ? '标记价' : 'Mark'}</div>
            <div className="col-span-3 text-right">{lang === 'zh' ? '24h涨跌' : '24h Chg'}</div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredPerps.map((item) => {
              const isSelected = item.symbol === selectedSymbol;
              const isUp = item.changePercent24h >= 0;
              const secInfo = item.perpSector ? sectorLabels[item.perpSector] : { zh: '永续', en: 'Perp' };
              return (
                <div
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className={`grid grid-cols-12 items-center px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/35 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                    <AssetLogo
                      symbol={item.symbol}
                      category={item.category}
                      logoUrl={item.logoUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.symbol.replace('/USD', 'USDT')}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
                          {item.leverage}x
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                          {lang === 'zh' ? secInfo.zh : secInfo.en}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {lang === 'zh' ? item.nameZh : item.nameEn}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`col-span-3 text-right font-mono text-xs font-bold tabular-nums ${
                      isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.price.toFixed(item.decimals)}
                  </div>

                  <div className="col-span-3 text-right">
                    <span
                      className={`inline-block font-mono text-xs font-semibold tabular-nums ${
                        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {item.changePercent24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Chart + Perpetual Positions Blotter (6 Cols) */}
        <section className="lg:col-span-6 flex flex-col lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="flex-1 min-h-[420px] sm:min-h-[470px]">
            <TradingChartPanel
              instrument={activePerp}
              lang={lang}
              theme={theme}
              onOpenAiDiagnose={() => setAiModalOpen(true)}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F131C] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  {lang === 'zh'
                    ? `永续合约持仓 (${positionsWithPnl.length})`
                    : `Perpetual Positions (${positionsWithPnl.length})`}
                </span>
                <span className="text-slate-500 whitespace-nowrap">
                  {lang === 'zh' ? '合约未实现盈亏:' : 'Perp Unrealized PnL:'}{' '}
                  <strong
                    className={`font-mono ${
                      totalPerpPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {totalPerpPnl >= 0 ? '+' : ''}${totalPerpPnl.toFixed(2)} USDT
                  </strong>
                </span>
              </div>

              <button
                onClick={onNavigateWithdraw}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                {lang === 'zh' ? '划转 / 提币中心 →' : 'Transfer & Withdraw →'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/70">
                    <th className="py-1.5 pr-2 font-medium">{lang === 'zh' ? '合约 / 模式' : 'Contract'}</th>
                    <th className="py-1.5 px-2 font-medium text-right">{lang === 'zh' ? '张数' : 'Size'}</th>
                    <th className="py-1.5 px-2 font-medium text-right">{lang === 'zh' ? '开仓均价' : 'Entry'}</th>
                    <th className="py-1.5 px-2 font-medium text-right">{lang === 'zh' ? '标记价格' : 'Mark'}</th>
                    <th className="py-1.5 px-2 font-medium text-right">{lang === 'zh' ? '强平价格' : 'Liq. Price'}</th>
                    <th className="py-1.5 px-2 font-medium text-right">{lang === 'zh' ? '未实现盈亏' : 'PnL (USDT)'}</th>
                    <th className="py-1.5 pl-2 font-medium text-right">{lang === 'zh' ? '操作' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {positionsWithPnl.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={`font-bold uppercase ${
                              pos.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {pos.side === 'buy' ? (lang === 'zh' ? '多' : 'LONG') : lang === 'zh' ? '空' : 'SHORT'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {pos.symbol.replace('/USD', 'USDT')}
                          </span>
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {pos.marginMode === 'cross' ? (lang === 'zh' ? '全仓' : 'Cross') : lang === 'zh' ? '逐仓' : 'Iso'}{' '}
                            {pos.leverage}x
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{pos.contracts}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {pos.entryPrice.toFixed(pos.decimals)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold">
                        {pos.markPrice.toFixed(pos.decimals)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums text-amber-500">
                        {pos.liqPrice.toFixed(pos.decimals)}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono tabular-nums font-bold ${
                          pos.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <button
                          onClick={() => handleClosePerp(pos.id, pos.pnl, pos.symbol)}
                          className="px-2.5 py-1 rounded bg-slate-200/80 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {lang === 'zh' ? '闪电平仓' : 'Flash Close'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right Column (3 Cols): Full-Height Dense Order Book + Execution Ticket (Requirement #1: No empty whitespace) */}
        <aside className="lg:col-span-3 bg-white dark:bg-[#0F131C] p-3.5 flex flex-col gap-3 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
          {/* Cross / Isolated Margin Mode + Leverage Selector */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-100 dark:bg-[#0B0E14] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMarginMode('cross')}
                className={`py-1 rounded-md cursor-pointer ${
                  marginMode === 'cross'
                    ? 'bg-white dark:bg-[#161C28] text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                {lang === 'zh' ? '全仓 Cross' : 'Cross'}
              </button>
              <button
                type="button"
                onClick={() => setMarginMode('isolated')}
                className={`py-1 rounded-md cursor-pointer ${
                  marginMode === 'isolated'
                    ? 'bg-white dark:bg-[#161C28] text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                {lang === 'zh' ? '逐仓 Iso' : 'Isolated'}
              </button>
            </div>

            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0B0E14] text-xs font-mono font-bold text-amber-500">
              <span>{lang === 'zh' ? '杠杆' : 'Lev'}</span>
              <span>{leverage}x</span>
            </div>
          </div>

          {/* Full-Height Dense Level-2 Order Book (9 Asks + Spread Banner + 9 Bids + Depth Bars + Buy/Sell Ratio) */}
          <div className="flex-1 flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono min-h-[360px]">
            <div className="grid grid-cols-3 text-slate-400 font-sans font-semibold pb-1.5 border-b border-slate-200 dark:border-slate-800">
              <span>{lang === 'zh' ? '价格(USDT)' : 'Price(USDT)'}</span>
              <span className="text-right">{lang === 'zh' ? '数量(张)' : 'Size'}</span>
              <span className="text-right">{lang === 'zh' ? '累计(张)' : 'Sum'}</span>
            </div>

            {/* 9 Ask Levels with Visual Depth Bar */}
            <div className="space-y-0.5 py-1">
              {asks.map((a, idx) => {
                const pct = Math.min(100, Math.round((a.total / maxTotal) * 100));
                return (
                  <div
                    key={`p-ask-${idx}`}
                    className="grid grid-cols-3 items-center py-0.5 px-1 relative overflow-hidden rounded-xs"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/12 pointer-events-none"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="text-rose-500 font-medium relative z-10">
                      {a.price.toFixed(activePerp.decimals)}
                    </span>
                    <span className="text-right text-slate-700 dark:text-slate-300 relative z-10">
                      {a.size.toFixed(2)}
                    </span>
                    <span className="text-right text-slate-400 relative z-10">
                      {a.total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Center Mark Price & Spread Banner */}
            <div className="py-1.5 px-2 flex items-center justify-between border-y border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#111622]">
              <span
                className={`text-sm font-bold ${
                  activePerp.changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {activePerp.price.toFixed(activePerp.decimals)}
              </span>
              <span className="text-[10px] text-slate-400">
                {lang === 'zh' ? '标记价' : 'Mark'} {(activePerp.price * 0.9999).toFixed(activePerp.decimals)}
              </span>
            </div>

            {/* 9 Bid Levels with Visual Depth Bar */}
            <div className="space-y-0.5 py-1">
              {bids.map((b, idx) => {
                const pct = Math.min(100, Math.round((b.total / maxTotal) * 100));
                return (
                  <div
                    key={`p-bid-${idx}`}
                    className="grid grid-cols-3 items-center py-0.5 px-1 relative overflow-hidden rounded-xs"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/12 pointer-events-none"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="text-emerald-500 font-medium relative z-10">
                      {b.price.toFixed(activePerp.decimals)}
                    </span>
                    <span className="text-right text-slate-700 dark:text-slate-300 relative z-10">
                      {b.size.toFixed(2)}
                    </span>
                    <span className="text-right text-slate-400 relative z-10">
                      {b.total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Order Book Buy/Sell Depth Ratio Bar */}
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-emerald-500 font-bold">B {activePerp.longRatio}%</span>
                <span className="text-slate-400 font-sans">{lang === 'zh' ? '盘口买卖比' : 'Bid/Ask Ratio'}</span>
                <span className="text-rose-500 font-bold">{100 - activePerp.longRatio}% S</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-rose-500/30 overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${activePerp.longRatio}%` }} />
              </div>
            </div>
          </div>

          {/* Order Execution Form */}
          <form onSubmit={handleOpenPerpOrder} className="space-y-2.5 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderSide('buy')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  orderSide === 'buy'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <div className="text-[11px] font-semibold opacity-85">
                  {lang === 'zh' ? '买入开多 (Long)' : 'Open Long'}
                </div>
                <div className="text-sm font-mono font-bold tabular-nums mt-0.5">
                  {activePerp.ask.toFixed(activePerp.decimals)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOrderSide('sell')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  orderSide === 'sell'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="text-[11px] font-semibold opacity-85">
                  {lang === 'zh' ? '卖出开空 (Short)' : 'Open Short'}
                </div>
                <div className="text-sm font-mono font-bold tabular-nums mt-0.5">
                  {activePerp.bid.toFixed(activePerp.decimals)}
                </div>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1 text-xs font-mono">
              {[10, 20, 50, 100, 125].map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  className={`py-1 rounded border cursor-pointer ${
                    leverage === lev
                      ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">{lang === 'zh' ? '委托数量 (张)' : 'Contracts'}</span>
                <span className="font-mono text-slate-400">{activePerp.symbol.replace('/USD', 'USDT')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContractQty((q) => Math.max(0.1, Number((q - 0.5).toFixed(1))))}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={contractQty}
                  onChange={(e) => setContractQty(Math.max(0.1, Number(e.target.value)))}
                  className="flex-1 h-8 text-center font-mono font-bold text-xs rounded-lg bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setContractQty((q) => Number((q + 0.5).toFixed(1)))}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{lang === 'zh' ? '占用保证金:' : 'Initial Margin:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ${((activePerp.price * contractQty) / leverage).toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{lang === 'zh' ? '可用保证金:' : 'Available USDT:'}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                </span>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-colors cursor-pointer ${
                orderSide === 'buy'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {orderSide === 'buy'
                ? lang === 'zh'
                  ? `买入开多 ${activePerp.symbol.replace('/USD', 'USDT')}`
                  : `OPEN LONG ${activePerp.symbol.replace('/USD', 'USDT')}`
                : lang === 'zh'
                ? `卖出开空 ${activePerp.symbol.replace('/USD', 'USDT')}`
                : `OPEN SHORT ${activePerp.symbol.replace('/USD', 'USDT')}`}
            </button>
          </form>
        </aside>
      </main>

      <AiChartInsightModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        instrument={activePerp}
        lang={lang}
        onQuickOrder={(side) => {
          setOrderSide(side);
          onTriggerToast(
            lang === 'zh'
              ? `已根据 AI解读带入 ${activePerp.symbol} ${side === 'buy' ? '开多' : '开空'}参数`
              : `Applied AI ${side.toUpperCase()} setup for ${activePerp.symbol}`
          );
        }}
      />
    </div>
  );
};
