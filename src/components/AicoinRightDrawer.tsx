import React, { useState } from 'react';
import {
  ListOrdered,
  FileText,
  DollarSign,
  TrendingUp,
  BarChart2,
  Layers,
  Bot,
  ArrowLeftRight,
  Sparkles,
  RefreshCw,
  Bell,
  Star,
  Copy,
  Settings,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { Instrument } from '../data/marketData';

export type RightRailTab = 'orderbook' | 'news' | 'inflow' | 'ai_ta' | 'data' | 'etf' | 'ace_agent';

interface AicoinRightDrawerProps {
  instrument: Instrument;
  lang: 'zh' | 'en';
  onOpenAiModal: () => void;
  onShowToast: (msg: string) => void;
}

export const AicoinRightDrawer: React.FC<AicoinRightDrawerProps> = ({
  instrument,
  lang,
  onOpenAiModal,
  onShowToast,
}) => {
  const [rightTab, setRightTab] = useState<RightRailTab>('orderbook');
  const [bookMode, setBookMode] = useState<'both' | 'bids' | 'asks'>('both');
  const [whaleOrderToggle, setWhaleOrderToggle] = useState<boolean>(false);
  const [tradeListMode, setTradeListMode] = useState<'latest' | 'large'>('latest');
  const [eventRange, setEventRange] = useState<'today' | '7d' | '30d'>('today');
  const [aceMode, setAceMode] = useState<'agent' | 'chat'>('agent');
  const [aceChatInput, setAceChatInput] = useState<string>('');
  const [aceChatHistory, setAceChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: `您好！我是您的私有交易 Ace Agent。当前正在实时监控 ${instrument.symbol} 的主力大单、资金费率与筹码分布，您可以直接用一句话创建自动盯盘策略。`,
    },
  ]);
  const [strategyBatchIdx, setStrategyBatchIdx] = useState<number>(0);
  const [isFav, setIsFav] = useState<boolean>(true);

  const p = instrument.price;
  const dec = instrument.decimals;
  const step = Math.max(p * 0.0004, Math.pow(10, -dec));

  const asks = [6, 5, 4, 3, 2, 1].map((i) => {
    const price = p + step * i;
    const qty = Number(((180 / i) * (1 + (i % 3) * 0.35)).toFixed(4));
    const totalK = ((price * qty) / 1000).toFixed(3);
    return { price, qty, totalK, ratio: Math.min(100, (10 - i) * 14) };
  });

  const bids = [1, 2, 3, 4, 5, 6].map((i) => {
    const price = Math.max(step, p - step * i);
    const qty = Number(((210 / i) * (1 + (i % 2) * 0.45)).toFixed(4));
    const totalK = ((price * qty) / 1000).toFixed(3);
    return { price, qty, totalK, ratio: Math.min(100, (10 - i) * 15) };
  });

  const latestTrades = [
    { price: p, qty: '3.230221', time: '22:00:36', side: 'buy' },
    { price: p - step, qty: '0.100000', time: '22:00:36', side: 'sell' },
    { price: p, qty: '0.556133', time: '22:00:36', side: 'sell' },
    { price: p + step, qty: '0.100000', time: '22:00:36', side: 'buy' },
    { price: p + step, qty: '2.490570', time: '22:00:35', side: 'sell' },
    { price: p + step, qty: '12.563499', time: '22:00:35', side: 'buy' },
    { price: p, qty: '0.209877', time: '22:00:35', side: 'sell' },
    { price: p, qty: '0.100000', time: '22:00:34', side: 'sell' },
    { price: p + step, qty: '0.011000', time: '22:00:34', side: 'buy' },
    { price: p, qty: '0.100000', time: '22:00:33', side: 'sell' },
    { price: p + step, qty: '7.627931', time: '22:00:32', side: 'buy' },
    { price: p + step * 2, qty: '4.440000', time: '22:00:32', side: 'sell' },
    { price: p + step * 3, qty: '6.169713', time: '22:00:31', side: 'buy' },
  ];

  const inflowWindows = [
    { time: '20:00-22:01', inVal: 5.53, outVal: 51.08 },
    { time: '17:00-20:00', inVal: 21.51, outVal: 23.4 },
    { time: '14:00-17:00', inVal: 36.26, outVal: 26.13 },
    { time: '11:00-14:00', inVal: 12.98, outVal: 43.93 },
    { time: '08:00-11:00', inVal: 11.79, outVal: 27.08 },
    { time: '05:00-08:00', inVal: 12.43, outVal: 84.45 },
    { time: '02:00-05:00', inVal: 5.06, outVal: 26.4 },
    { time: '23:00-02:00', inVal: 51.94, outVal: 0 },
  ];

  const strategyBatches = [
    [
      {
        title: `${instrument.symbol.split('/')[0]}生态追踪`,
        desc: `追踪 ${instrument.symbol.split('/')[0]} 生态热点项目和主力资金流向，在生态爆发初期自动布局相关高弹性标的。`,
        winRate: '89%',
        pair: instrument.symbol.includes('/') ? instrument.symbol : `${instrument.symbol}/USDT`,
        tf: '4小时',
        risk: '中风险',
        triggers: '8次触发',
      },
      {
        title: '费率套利',
        desc: '监控永续合约资金费率异常，在极端正负费率时进行反向对冲操作获取均值回归收益。',
        winRate: '87%',
        pair: 'BTC/USDT',
        tf: '4小时',
        risk: '中风险',
        triggers: '11次触发',
      },
      {
        title: '山寨轮动',
        desc: '追踪BTC资金外溢到山寨币与热门板块的轮动规律，在轮动初期布局龙头标的。',
        winRate: '90%',
        pair: 'SOL/USDT',
        tf: '4小时',
        risk: '中风险',
        triggers: '9次触发',
      },
    ],
    [
      {
        title: '主力大单吸筹跟随',
        desc: '实时监测委单区超过 500 万美元的机构冰山挂单，当主力吃单突破阻力位时顺势跟进。',
        winRate: '91%',
        pair: instrument.symbol,
        tf: '1小时',
        risk: '低风险',
        triggers: '14次触发',
      },
      {
        title: 'TD九转+RSI超卖反弹',
        desc: '结合 AICoin 特色 TD 序列底部 9 转信号与 4H 级别 RSI 底背离自动分批建仓。',
        winRate: '86%',
        pair: 'ETH/USDT',
        tf: '4小时',
        risk: '中风险',
        triggers: '6次触发',
      },
      {
        title: '美股盘前波动率突破',
        desc: '针对美股合约与黄金在纽盘开盘前后的流动性激增区间，捕捉日内趋势波段。',
        winRate: '88%',
        pair: 'XAU/USDT',
        tf: '15分',
        risk: '中风险',
        triggers: '19次触发',
      },
    ],
  ];

  const currentStrategies = strategyBatches[strategyBatchIdx % strategyBatches.length];

  return (
    <div className="flex h-full shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] select-none">
      {/* Drawer Main Content Area (300px width on desktop) */}
      <div className="w-72 xl:w-80 flex flex-col h-full overflow-hidden">
        {/* TAB 1: ORDER BOOK & LATEST TRADES (Screenshot 1 Right Panel) */}
        {rightTab === 'orderbook' && (
          <div className="flex flex-col h-full text-xs overflow-y-auto">
            {/* Top Asset Summary Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                  <span>{instrument.symbol.includes('/') ? instrument.symbol : `${instrument.symbol}/USDT`}</span>
                  <button
                    onClick={() => onShowToast(lang === 'zh' ? '已复制交易对代码' : 'Copied Symbol')}
                    className="text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  {instrument.category === 'stocks' ? '美股合约 >' : '欧易OKX >'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div>
                  {lang === 'zh' ? '今日成交额($) : ' : '24h Vol: '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">{instrument.volume24h}</span>
                </div>
                <div className="text-right">
                  {lang === 'zh' ? '今日最高: ' : 'High: '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    ${instrument.high24h.toFixed(dec)}
                  </span>
                </div>
                <div>
                  {lang === 'zh' ? '今日净流入($) : ' : 'Net Inflow: '}
                  <span className="font-mono text-rose-500">-526万</span>
                </div>
                <div className="text-right">
                  {lang === 'zh' ? '今日最低: ' : 'Low: '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    ${instrument.low24h.toFixed(dec)}
                  </span>
                </div>
                <div className="col-span-2">
                  {lang === 'zh' ? '流通市值($) : ' : 'Market Cap: '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">659.93亿</span>
                </div>
              </div>

              {/* 4 Quick Action Buttons: 加预警 | 已自选 | 策略 | 简况 */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  onClick={() => onShowToast(lang === 'zh' ? `已为 ${instrument.symbol} 开启价格异动预警` : 'Alert added')}
                  className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {lang === 'zh' ? '加预警' : 'Alert'}
                </button>
                <button
                  onClick={() => {
                    setIsFav(!isFav);
                    onShowToast(isFav ? '已从自选移除' : '已加入自选列表');
                  }}
                  className={`py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    isFav
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isFav ? (lang === 'zh' ? '已自选' : 'Saved') : lang === 'zh' ? '+自选' : '+Watch'}
                </button>
                <button
                  onClick={() => setRightTab('ace_agent')}
                  className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {lang === 'zh' ? '策略' : 'Bot'}
                </button>
                <button
                  onClick={() => setRightTab('inflow')}
                  className="py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {lang === 'zh' ? '简况' : 'Profile'}
                </button>
              </div>
            </div>

            {/* Order Book Controls & Whale Order Toggle */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(['both', 'bids', 'asks'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setBookMode(m)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                        bookMode === m
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {m === 'both' ? '买卖盘' : m === 'bids' ? '买盘' : '卖盘'}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {dec}位小数 ▾
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {lang === 'zh' ? '查看主力挂单情况 >' : 'Whale Limit Orders >'}
                </span>
                <button
                  onClick={() => setWhaleOrderToggle(!whaleOrderToggle)}
                  className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                    whaleOrderToggle ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                      whaleOrderToggle ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">
                  {lang === 'zh' ? '委比: ' : 'Ratio: '}
                  <strong className="text-emerald-500">+8.51%</strong>
                </span>
                <span className="text-slate-500">
                  {lang === 'zh' ? '委差: ' : 'Diff: '}
                  <strong className="text-emerald-500">+1681.3948</strong>
                </span>
              </div>
            </div>

            {/* Order Book Table */}
            <div className="px-3 py-1.5 space-y-1">
              <div className="grid grid-cols-3 text-[10px] text-slate-400 pb-1">
                <span>{lang === 'zh' ? '价格(USDT)' : 'Price'}</span>
                <span className="text-right">{lang === 'zh' ? '数量' : 'Qty'}</span>
                <span className="text-right">{lang === 'zh' ? '委托额 ▾' : 'Total'}</span>
              </div>

              {bookMode !== 'bids' && (
                <div className="space-y-0.5">
                  {asks.map((a, i) => (
                    <div key={`ask-${i}`} className="relative grid grid-cols-3 py-0.5 text-[11px] font-mono items-center">
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-rose-500/12 pointer-events-none"
                        style={{ width: `${a.ratio}%` }}
                      />
                      <span className="text-rose-500 font-medium z-10">{a.price.toFixed(dec)}</span>
                      <span className="text-right text-slate-700 dark:text-slate-300 z-10">{a.qty}</span>
                      <span className="text-right text-slate-700 dark:text-slate-300 z-10">
                        {whaleOrderToggle && i === 5 ? '🐋 ' : ''}
                        {a.totalK}K
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Mid Price Banner */}
              <div className="py-2 my-1 border-y border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono">
                <div>
                  <div
                    className={`text-base font-bold ${
                      instrument.changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {p.toFixed(dec)}
                  </div>
                  <div className="text-[10px] text-slate-400">${p.toFixed(dec)}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-[11px] font-semibold ${
                      instrument.changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {instrument.changePercent24h >= 0 ? '+' : ''}
                    {instrument.changePercent24h.toFixed(2)}%
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      instrument.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {instrument.change24h >= 0 ? '+' : ''}
                    {instrument.change24h.toFixed(dec)}
                  </div>
                </div>
              </div>

              {bookMode !== 'asks' && (
                <div className="space-y-0.5">
                  {bids.map((b, i) => (
                    <div key={`bid-${i}`} className="relative grid grid-cols-3 py-0.5 text-[11px] font-mono items-center">
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-emerald-500/12 pointer-events-none"
                        style={{ width: `${b.ratio}%` }}
                      />
                      <span className="text-emerald-500 font-medium z-10">{b.price.toFixed(dec)}</span>
                      <span className="text-right text-slate-700 dark:text-slate-300 z-10">{b.qty}</span>
                      <span className="text-right text-slate-700 dark:text-slate-300 z-10">
                        {whaleOrderToggle && i === 3 ? '🐋 ' : ''}
                        {b.totalK}K
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Latest Trades / Large Trades Section */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 px-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTradeListMode('latest')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      tradeListMode === 'latest'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    {lang === 'zh' ? '最新成交' : 'Trades'}
                  </button>
                  <button
                    onClick={() => setTradeListMode('large')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      tradeListMode === 'large'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    {lang === 'zh' ? '大额' : 'Large'}
                  </button>
                </div>
                <label className="flex items-center gap-1 text-[10px] text-slate-400">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>{lang === 'zh' ? '极速' : 'Fast'}</span>
                </label>
              </div>

              <div className="grid grid-cols-3 text-[10px] text-slate-400 pb-1">
                <span>{lang === 'zh' ? '价格(USDT)' : 'Price'}</span>
                <span className="text-right">{lang === 'zh' ? '数量 ▾' : 'Amount'}</span>
                <span className="text-right">{lang === 'zh' ? '成交时间' : 'Time'}</span>
              </div>

              <div className="space-y-0.5 pb-3">
                {latestTrades
                  .filter((t) => (tradeListMode === 'large' ? parseFloat(t.qty) >= 2.0 : true))
                  .map((t, idx) => (
                    <div key={idx} className="grid grid-cols-3 py-0.5 text-[11px] font-mono">
                      <span className={t.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'}>
                        {t.price.toFixed(dec)}
                      </span>
                      <span className="text-right text-slate-700 dark:text-slate-300">{t.qty}</span>
                      <span className="text-right text-slate-400">{t.time}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 推特 + 快讯 + 大事件 (Screenshot 2) */}
        {rightTab === 'news' && (
          <div className="flex flex-col h-full p-3.5 space-y-5 overflow-y-auto text-xs">
            {/* Section 1: 推特 */}
            <div className="space-y-3">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {instrument.symbol.split('/')[0]} {lang === 'zh' ? '推特' : 'Twitter Feed'}
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px] font-bold">
                      TB
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">The Block</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
                          媒体
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">8分钟前</div>
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    THE BLOCK: DeFi Development Corp. 表示初步的第三季度估算显示，截至9月30日，与8月12日相比，每股{instrument.symbol.split('/')[0]}增长达到...
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-900 text-teal-300 flex items-center justify-center font-mono text-[10px] font-bold">
                      SZ
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">TraderSZ</div>
                      <div className="text-[10px] text-slate-400">1小时前</div>
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    宏观流动性持续向高 Beta 资产聚集，当前 {instrument.symbol} 在 4H 级别关键支撑位出现明显买盘承接...
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-1">
                <button
                  onClick={() => onShowToast('已加载更多实时推特流')}
                  className="px-5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 text-[11px] cursor-pointer"
                >
                  查看更多
                </button>
              </div>
            </div>

            {/* Section 2: 快讯 */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {instrument.symbol.split('/')[0]} {lang === 'zh' ? '快讯' : 'Flash News'}
              </div>

              {[
                {
                  title: `${instrument.symbol.split('/')[0]} 连续 5 周 DEX 交易量位居所有 L1 和 L2 链之首`,
                  time: '1分钟前',
                },
                {
                  title: `DeFi Dev Corp. 增持 2.62 万枚 ${instrument.symbol.split('/')[0]}，总持仓达 256.4 万枚`,
                  time: '33分钟前',
                },
                {
                  title: `DFDV 上周增持 2.62 万枚 ${instrument.symbol.split('/')[0]}，机构总持仓创季度新高`,
                  time: '40分钟前',
                },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white leading-snug">{item.title}</div>
                  <div className="text-[11px] text-slate-400">{item.time}</div>
                </div>
              ))}

              <div className="flex justify-center pt-1">
                <button
                  onClick={() => onShowToast('已展开全部快讯')}
                  className="px-5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 text-[11px] cursor-pointer"
                >
                  查看更多
                </button>
              </div>
            </div>

            {/* Section 3: 大事件 */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'zh' ? '大事件' : 'Major Events'}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  {[
                    { id: 'today', zh: '今天' },
                    { id: '7d', zh: '7天' },
                    { id: '30d', zh: '30天' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setEventRange(r.id as typeof eventRange)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                        eventRange === r.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {r.zh}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  打开日历 &gt; <ExternalLink className="w-3 h-3" />
                </span>
              </div>

              {eventRange === 'today' ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <Calendar className="w-5 h-5 mx-auto opacity-40" />
                  <div>
                    暂无事件，
                    <button
                      onClick={() => setEventRange('7d')}
                      className="underline text-slate-600 dark:text-slate-300 cursor-pointer ml-1"
                    >
                      更多日期
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-mono text-blue-600">2026-10-08 20:30</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    美联储 FOMC 货币政策会议纪要 & {instrument.symbol.split('/')[0]} 生态开发者峰会
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 24H净流入 & 主力增减仓 & 资金流向分布饼图 (Screenshot 3) */}
        {rightTab === 'inflow' && (
          <div className="flex flex-col h-full p-3.5 space-y-4 overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                24H净流入{' '}
                <span className="font-normal text-slate-500 ml-1">
                  主力 <strong className="font-mono text-rose-500 font-bold">-124.95万</strong> 美元
                </span>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>

            {/* 主力增减仓($) Table */}
            <div className="space-y-1.5">
              <div className="text-slate-700 dark:text-slate-300 font-semibold">主力增减仓($)</div>
              <div className="grid grid-cols-3 text-[11px] text-slate-400 pb-1">
                <span>时间</span>
                <span>流入</span>
                <span>流出</span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {inflowWindows.map((w, idx) => (
                  <div key={idx} className="grid grid-cols-3 items-center py-0.5">
                    <span className="text-slate-500">{w.time}</span>
                    <div className="relative flex items-center">
                      <div
                        className="h-4 bg-emerald-500/20 rounded-xs"
                        style={{ width: `${Math.min(100, w.inVal * 1.6)}%` }}
                      />
                      <span className="relative z-10 pl-1 text-slate-800 dark:text-slate-200">{w.inVal}万</span>
                    </div>
                    <div className="relative flex items-center">
                      <div
                        className="h-4 bg-rose-500/20 rounded-xs"
                        style={{ width: `${Math.min(100, w.outVal * 1.1)}%` }}
                      />
                      <span className="relative z-10 pl-1 text-slate-800 dark:text-slate-200">
                        {w.outVal === 0 ? '0' : `${w.outVal}万`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 资金流向分布($) Donut Chart + Breakdown */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-slate-700 dark:text-slate-300 font-semibold">资金流向分布($)</div>
              <div className="grid grid-cols-3 text-center text-[11px]">
                <div>
                  <div className="text-slate-400">主力净流入</div>
                  <div className="font-mono font-bold text-rose-500 mt-0.5">-124.95万</div>
                </div>
                <div>
                  <div className="text-slate-400">散户净流入</div>
                  <div className="font-mono font-bold text-rose-500 mt-0.5">-340.47万</div>
                </div>
                <div>
                  <div className="text-slate-400">总净流入</div>
                  <div className="font-mono font-bold text-rose-500 mt-0.5">-465.42万</div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                {/* SVG Donut */}
                <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#F87171" strokeWidth="22" strokeDasharray="112 226" />
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="22"
                    strokeDasharray="98 226"
                    strokeDashoffset="-112"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="22"
                    strokeDasharray="16 226"
                    strokeDashoffset="-210"
                  />
                  <text x="18" y="53" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    49.1%
                  </text>
                  <text x="58" y="64" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    42.7%
                  </text>
                </svg>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>主力流入 157.51万</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>主力流出 282.47万</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>散户流入 2279.14万</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>散户流出 2619.61万</span>
                  </div>
                </div>
              </div>

              {/* 净大单 / 净中单 / 净小单 Bar */}
              <div className="grid grid-cols-3 text-center pt-1 text-[11px]">
                <div>
                  <div className="font-mono text-rose-500">-45.36万</div>
                  <div className="h-2 w-8 mx-auto bg-rose-300/70 my-1" />
                  <div className="text-slate-400">净大单</div>
                </div>
                <div>
                  <div className="font-mono text-rose-500">-79.6万</div>
                  <div className="h-3 w-8 mx-auto bg-rose-300/70 my-1" />
                  <div className="text-slate-400">净中单</div>
                </div>
                <div>
                  <div className="font-mono text-rose-500">-340.47万</div>
                  <div className="h-7 w-8 mx-auto bg-rose-300/70 my-1" />
                  <div className="text-slate-400">净小单</div>
                </div>
              </div>
            </div>

            {/* 净流入($) Smooth Area Curve */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-slate-700 dark:text-slate-300 font-semibold">净流入($)</div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0B0E14]">
                <div className="text-[10px] font-mono text-slate-400">92.35万</div>
                <svg viewBox="0 0 240 80" className="w-full h-20">
                  <line x1="0" y1="30" x2="240" y2="30" stroke="#F59E0B" strokeDasharray="2 2" strokeWidth="0.8" />
                  <path
                    d="M 0 20 Q 15 45, 30 35 T 60 40 T 90 25 T 120 65 T 150 20 T 180 55 T 210 18 T 240 48 L 240 80 L 0 80 Z"
                    fill="rgba(59, 130, 246, 0.14)"
                  />
                  <path
                    d="M 0 20 Q 15 45, 30 35 T 60 40 T 90 25 T 120 65 T 150 20 T 180 55 T 210 18 T 240 48"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                  />
                </svg>
                <div className="text-[10px] font-mono text-slate-400">-203.65万</div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
                  <span>23:00</span>
                  <span>04:00</span>
                  <span>09:00</span>
                  <span>14:00</span>
                  <span>22:01</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI技术分析 & 精彩分析 (Screenshot 4) */}
        {rightTab === 'ai_ta' && (
          <div className="flex flex-col h-full p-3.5 space-y-3.5 overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                AI技术分析 <span className="text-[11px] font-normal text-slate-400 ml-1">实时形态识别</span>
              </div>
              <button
                onClick={onOpenAiModal}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
              >
                AI画线解读 &gt;
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-slate-800 dark:text-slate-200">精彩分析</span>
              <button
                onClick={() => onShowToast('已打开社区动态K线发布器')}
                className="px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500 cursor-pointer"
              >
                我要上榜
              </button>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
              ⓘ 点击打开动态K线图，还可以复制同款
            </div>

            {[
              {
                title: '头肩',
                desc: `有头肩！完整分析如下：🦅 ${instrument.symbol} | 12:...`,
                tag: '看跌',
                tf: '4时',
                author: '宝总666666',
                ago: '4个月前',
              },
              {
                title: '头肩顶部',
                desc: `${instrument.symbol} 4小时级别出现标准右肩回抽确认颈线位结构`,
                tag: '看跌',
                tf: '4时',
                author: '宝总666666',
                ago: '4个月前',
              },
              {
                title: '通道突破做多模型',
                desc: `BOLL布林带收口后放量站稳上轨，主力大单持续净流入`,
                tag: '看涨',
                tf: '1时',
                author: '量化猎手Pro',
                ago: '1小时前',
              },
            ].map((card, i) => (
              <div
                key={i}
                onClick={() => onShowToast(`已加载「${card.title}」同款画线与指标模板`)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 transition-colors space-y-2.5 cursor-pointer"
              >
                {/* Mini Chart Preview SVG */}
                <div className="h-24 rounded-lg bg-slate-50 dark:bg-[#0B0E14] border border-slate-100 dark:border-slate-800/80 p-2 relative overflow-hidden">
                  <svg viewBox="0 0 220 70" className="w-full h-full">
                    <path
                      d="M 5 50 Q 45 30, 80 42 T 135 12 T 175 35 T 215 18"
                      fill="rgba(139, 92, 246, 0.12)"
                      stroke="#8B5CF6"
                      strokeWidth="1.5"
                    />
                    <polyline
                      points="120,25 140,8 160,28 180,15 205,48"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                  </svg>
                </div>

                <div className="font-bold text-sm text-slate-900 dark:text-white">{card.title}</div>
                <div className="text-[11px] text-slate-500 truncate">{card.desc}</div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      card.tag === '看跌'
                        ? 'border-rose-400 text-rose-500 bg-rose-500/5'
                        : 'border-emerald-400 text-emerald-500 bg-emerald-500/5'
                    }`}
                  >
                    {card.tag}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {card.tf}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center">
                      V
                    </span>
                    <span>{card.author}</span>
                  </span>
                  <span>{card.ago}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5 & 6: 链上数据 / ETF 监控 */}
        {(rightTab === 'data' || rightTab === 'etf') && (
          <div className="flex flex-col h-full p-3.5 space-y-4 overflow-y-auto text-xs">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {rightTab === 'etf' ? '全球现货 ETF 实时净流入监控' : `${instrument.symbol} 多空持仓比与链上清算地图`}
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'IBIT (贝莱德现货ETF)', val: '+$3.42亿', pct: '+2.14%', up: true },
                { label: 'FBTC (富达现货ETF)', val: '+$1.18亿', pct: '+1.65%', up: true },
                { label: '全网合约未平仓量 (OI)', val: '$482.6亿', pct: '+4.82%', up: true },
                { label: '大户多空持仓人数比', val: '1.38 (多头占优)', pct: '+0.12', up: true },
                { label: '24H 全网爆仓总额', val: '$1.84亿', pct: '空单占比 68%', up: false },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{row.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{row.pct}</div>
                  </div>
                  <div className={`font-mono font-bold ${row.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {row.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ACE AGENT (Screenshots 5, 6, 7, 8) */}
        {rightTab === 'ace_agent' && (
          <div className="flex flex-col h-full p-3.5 overflow-y-auto text-xs">
            {/* Top Header: Ace Agent • | Agent / Chat toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-base text-slate-900 dark:text-white">
                <span>Ace Agent</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setAceMode('agent')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    aceMode === 'agent'
                      ? 'bg-white dark:bg-[#161C28] text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Agent
                </button>
                <button
                  onClick={() => setAceMode('chat')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    aceMode === 'chat'
                      ? 'bg-white dark:bg-[#161C28] text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Chat
                </button>
              </div>
            </div>

            {aceMode === 'agent' ? (
              <div className="space-y-4 pt-4">
                {/* Hero Orb & Slogan */}
                <div className="text-center space-y-2.5 px-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-400 to-purple-500 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-white/90 dark:bg-slate-900/80 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    用一句话，让 AI 帮你交易
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    你的私有交易Agent。描述你的买卖逻辑，AI 24小时盯盘，自动执行。无需编程，无需量化背景
                  </p>
                  <button
                    onClick={() => setAceMode('chat')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-sm cursor-pointer transition-opacity"
                  >
                    创建我的策略
                  </button>
                </div>

                {/* Strategy Cards Header */}
                <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                  <span>试试这些策略：</span>
                  <button
                    onClick={() => setStrategyBatchIdx((i) => i + 1)}
                    className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>换一批</span>
                  </button>
                </div>

                {/* 3 Strategy Cards */}
                <div className="space-y-3">
                  {currentStrategies.map((st, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        onShowToast(`已启动 AI 策略「${st.title}」(${st.pair} · 预测胜率 ${st.winRate})`)
                      }
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 bg-white dark:bg-[#111622] space-y-2.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{st.title}</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {st.desc}
                      </p>

                      <div className="flex items-end justify-between pt-1">
                        <div>
                          <div className="text-[10px] text-slate-400">AI预测未来胜率</div>
                          <div className="text-xl font-mono font-bold text-emerald-500">{st.winRate}</div>
                        </div>
                        <svg viewBox="0 0 90 28" className="w-24 h-7">
                          <polyline
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="1.8"
                            points="2,24 18,19 32,21 48,13 64,15 78,7 88,4"
                          />
                        </svg>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{st.pair}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{st.tf}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{st.risk}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{st.triggers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Ace Agent Interactive Chat Mode */
              <div className="flex flex-col flex-1 justify-between pt-3 space-y-3">
                <div className="space-y-2.5 overflow-y-auto pr-1">
                  {aceChatHistory.map((m, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl leading-relaxed ${
                        m.role === 'ai'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          : 'bg-blue-600 text-white ml-4'
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!aceChatInput.trim()) return;
                    const q = aceChatInput.trim();
                    setAceChatInput('');
                    setAceChatHistory((prev) => [
                      ...prev,
                      { role: 'user', text: q },
                      {
                        role: 'ai',
                        text: `已为您生成【${instrument.symbol} 智能盯盘策略】：当 4H 级别出现主力净流入 > 500万美元且突破 EMA20 时自动触发提醒并挂单执行，回测胜率 89.4%。`,
                      },
                    ]);
                  }}
                  className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                >
                  <input
                    type="text"
                    value={aceChatInput}
                    onChange={(e) => setAceChatInput(e.target.value)}
                    placeholder="输入您的策略逻辑，如：跌破布林带下轨定投..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
                  >
                    生成并部署 AI 策略
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Far-Right Vertical Icon Strip (Exact AICoin Right Rail in All 8 Screenshots) */}
      <div className="w-10 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] flex flex-col items-center justify-between py-2">
        <div className="flex flex-col items-center gap-2">
          {[
            { id: 'orderbook', icon: ListOrdered, title: '盘口与成交' },
            { id: 'news', icon: FileText, title: '推特与快讯' },
            { id: 'inflow', icon: DollarSign, title: '24H主力资金流向' },
            { id: 'ai_ta', icon: TrendingUp, title: 'AI技术分析与精彩分析' },
            { id: 'data', icon: BarChart2, title: '多空持仓与链上数据' },
            { id: 'etf', icon: Layers, title: 'ETF实时净流入' },
            { id: 'ace_agent', icon: Bot, title: 'Ace Agent 智能策略' },
          ].map((item) => {
            const Icon = item.icon;
            const active = rightTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setRightTab(item.id as RightRailTab)}
                title={item.title}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2.5 text-slate-400">
          <button
            onClick={onOpenAiModal}
            title="AI 智能解读"
            className="w-7 h-7 rounded-full bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
