import React, { useState } from 'react';
import {
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Globe,
  BarChart2,
  Layers,
  Calendar,
  Radio,
  Cpu,
  Gift,
  ChevronRight,
  Flame,
  DollarSign,
} from 'lucide-react';
import { Instrument, DIVIDEND_DATA, NEWS_FLASH_DATA } from '../data/marketData';
import { AssetLogo } from './AssetLogo';

interface HomePortalViewProps {
  instruments: Instrument[];
  lang: 'zh' | 'en';
  onNavigate: (tab: any, subCategory?: string, symbol?: string) => void;
  onOpenCheckIn: () => void;
  onOpenAuth: () => void;
}

export const HomePortalView: React.FC<HomePortalViewProps> = ({
  instruments,
  lang,
  onNavigate,
  onOpenCheckIn,
  onOpenAuth,
}) => {
  const [marketTab, setMarketTab] = useState<'hot' | 'stocks' | 'forex' | 'commodities' | 'crypto'>('hot');

  const topTickers = instruments.slice(0, 6);

  const filteredList = instruments.filter((item) => {
    if (marketTab === 'hot') return Boolean(item.hotTagZh);
    return item.category === marketTab;
  });

  return (
    <div className="space-y-10 pb-14">
      {/* Live Market Scrolling Marquee Strip (bosss.club top ticker style) */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D111A] px-4 py-2 overflow-x-auto">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6 text-xs whitespace-nowrap">
          {topTickers.map((item) => {
            const isUp = item.changePercent24h >= 0;
            return (
              <button
                key={item.symbol}
                onClick={() => onNavigate('trade', item.category, item.symbol)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="font-bold text-slate-900 dark:text-white">{item.symbol}</span>
                <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                  {item.price.toFixed(item.decimals)}
                </span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    isUp ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {isUp ? '+' : ''}
                  {item.changePercent24h.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Section (bosss.club / Mitrade Exchange Portal Hero) */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>{lang === 'zh' ? '全球多资产差价合约 (CFD) 与数字资产综合交易平台' : 'GLOBAL MULTI-ASSET CFD & DIGITAL ASSET EXCHANGE'}</span>
              <span>·</span>
              <span>{lang === 'zh' ? '0佣金 · 毫秒级撮合' : '0% Commission · Sub-ms Execution'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {lang === 'zh'
                ? '一个账户，交易全球美股、外汇、黄金、原油与加密资产'
                : 'One Account to Trade Global US Stocks, Forex, Gold, Oil & Crypto CFDs'}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {lang === 'zh'
                ? '支持最高 200 倍灵活杠杆、TradingView 专业画线工具、五维智能诊股、美股除权分红补贴及实盘策略直播互动。仅需邮箱即可 30 秒极速开户。'
                : 'Access up to 200x flexible leverage, full TradingView drawing toolkit, 5-factor quant stock diagnosis, direct stock CFD dividend adjustments, and live analyst trading rooms.'}
            </p>

            {/* Quick Email Register Bar + Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <button
                onClick={() => onNavigate('trade', 'commodities', 'XAU/USD')}
                className="px-5 sm:px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{lang === 'zh' ? '立即进入交易终端' : 'Launch Trading Terminal'}</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                onClick={onOpenAuth}
                className="px-4 sm:px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {lang === 'zh' ? '邮箱极速注册' : 'Email Quick Register'}
              </button>

              <button
                onClick={onOpenCheckIn}
                className="px-4 py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Gift className="w-4 h-4 shrink-0" />
                <span>{lang === 'zh' ? '签到打分领 $25 赠金' : 'Check-In & Claim $25'}</span>
              </button>
            </div>

            {/* Platform Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              <div>
                <div className="text-xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">$48.6B+</div>
                <div className="text-xs text-slate-500 mt-0.5">{lang === 'zh' ? '24小时全市场成交量' : '24h Trading Volume'}</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">0.0 Pips</div>
                <div className="text-xs text-slate-500 mt-0.5">{lang === 'zh' ? '欧美点差低至 / 零手续费' : 'Tight Spreads / 0 Fee'}</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">300+</div>
                <div className="text-xs text-slate-500 mt-0.5">{lang === 'zh' ? '全球热门股票与外汇CFD' : 'Global CFD Instruments'}</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold tabular-nums text-emerald-500">&lt; 15ms</div>
                <div className="text-xs text-slate-500 mt-0.5">{lang === 'zh' ? '机构级极速订单撮合引擎' : 'Institutional Matching'}</div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Featured Market Spotlight Cards (bosss.club Bento Cards) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {['XAU/USD', 'NVDA', 'BTC/USD', 'EUR/USD'].map((sym) => {
              const inst = instruments.find((i) => i.symbol === sym) || instruments[0];
              const isUp = inst.changePercent24h >= 0;
              return (
                <div
                  key={inst.symbol}
                  onClick={() => onNavigate('trade', inst.category, inst.symbol)}
                  className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <AssetLogo
                        symbol={inst.symbol}
                        category={inst.category}
                        logoUrl={inst.logoUrl}
                        baseFlag={inst.baseFlag}
                        quoteFlag={inst.quoteFlag}
                        size="md"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{inst.symbol}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {lang === 'zh' ? inst.nameZh : inst.nameEn}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {inst.leverage}x
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {inst.price.toFixed(inst.decimals)}
                    </div>
                    <div
                      className={`text-xs font-mono font-bold tabular-nums ${
                        isUp ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {inst.changePercent24h.toFixed(2)}%
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{lang === 'zh' ? '多头情绪占比' : 'Long Ratio'}</span>
                      <span className="font-mono text-emerald-500 font-semibold">{inst.longRatio}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-rose-500/30 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${inst.longRatio}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Product Matrix (bosss.club Service Portal Grid) */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('diagnose')}
            className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {lang === 'zh' ? '01. AI 量化投研' : '01. QUANT DIAGNOSIS'}
              </span>
              <Cpu className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'zh' ? 'AI 五维诊股与暗池筹码' : 'AI Stock Diagnosis & Orderflow'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '覆盖美股龙头与黄金加密货币，实时测算目标止盈区间、防守止损位与机构资金净流入。'
                : 'Real-time 5-factor radar scoring, institutional dark-pool accumulation, and target price corridors.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('dividends')}
            className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {lang === 'zh' ? '02. 股息分红中心' : '02. DIVIDEND RADAR'}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'zh' ? '美股即将分红与历史派息' : 'Upcoming & Historical Dividends'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '持有多头美股 CFD 跨除息日直接享受现金分红补贴，内置每手分红收益实时试算器。'
                : 'Receive direct cash dividend adjustments on long stock CFD positions across ex-dividend dates.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('live')}
            className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {lang === 'zh' ? '03. 实盘策略直播' : '03. LIVE ANALYST ROOM'}
              </span>
              <Radio className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'zh' ? '首席分析师直播带单互动' : 'Live Trading Desk & Chat'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '欧盘美盘全天候实盘解盘，内置实时弹幕互动、敏感关键词自动屏蔽与风控禁言管理。'
                : 'Interactive macro desk streaming with one-click copy trade, keyword filtering, and user mute controls.'}
            </p>
          </div>

          <div
            onClick={() => onNavigate('news')}
            className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500">
                {lang === 'zh' ? '04. 资讯与财经日历' : '04. NEWS & CALENDAR'}
              </span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'zh' ? '7×24 快讯电报与非农日历' : '24/7 Wire & Macro Calendar'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '实时追踪美联储利率决议、非农就业、CPI数据公布前值/预测/今值及利多利空品种映射。'
                : 'Track Fed rate decisions, NFP, and CPI releases with instant bullish/bearish asset impact mapping.'}
            </p>
          </div>
        </div>
      </section>

      {/* Multi-Asset Market Overview Table (bosss.club / quotes section) */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {lang === 'zh' ? '全球多资产实时行情列表' : 'Global Multi-Asset Live Markets'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'zh'
                ? '覆盖热门美股、主要外汇货币对、现货黄金白银、原油及主流加密货币差价合约'
                : 'Real-time institutional CFD quotes across US Equities, Forex, Precious Metals, Commodities & Crypto'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-lg text-xs font-semibold overflow-x-auto">
            {[
              { id: 'hot', zh: '热门精选', en: 'Hot Movers' },
              { id: 'stocks', zh: '美股 CFD', en: 'US Stocks' },
              { id: 'forex', zh: '外汇货币', en: 'Forex' },
              { id: 'commodities', zh: '黄金/原油', en: 'Metals & Oil' },
              { id: 'crypto', zh: '加密资产', en: 'Crypto' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMarketTab(tab.id as typeof marketTab)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  marketTab === tab.id
                    ? 'bg-white dark:bg-[#111622] text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'zh' ? tab.zh : tab.en}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 whitespace-nowrap">
                  <th className="py-3.5 px-4 font-semibold">{lang === 'zh' ? '交易品种' : 'Instrument'}</th>
                  <th className="py-3.5 px-3 font-semibold text-right">{lang === 'zh' ? '最新价 (USD)' : 'Last Price'}</th>
                  <th className="py-3.5 px-3 font-semibold text-right">{lang === 'zh' ? '24h 涨跌幅' : '24h Change'}</th>
                  <th className="py-3.5 px-3 font-semibold text-right hidden md:table-cell">{lang === 'zh' ? '24h 最高 / 最低' : '24h High / Low'}</th>
                  <th className="py-3.5 px-3 font-semibold text-right hidden sm:table-cell">{lang === 'zh' ? '点差 / 杠杆' : 'Spread / Lev'}</th>
                  <th className="py-3.5 px-3 font-semibold hidden lg:table-cell">{lang === 'zh' ? '多空持仓情绪' : 'Client Sentiment'}</th>
                  <th className="py-3.5 px-4 font-semibold text-right">{lang === 'zh' ? '操作' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredList.map((item) => {
                  const isUp = item.changePercent24h >= 0;
                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onNavigate('trade', item.category, item.symbol)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <AssetLogo
                            symbol={item.symbol}
                            category={item.category}
                            logoUrl={item.logoUrl}
                            baseFlag={item.baseFlag}
                            quoteFlag={item.quoteFlag}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">{item.symbol}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[110px] sm:max-w-[180px]">
                              {lang === 'zh' ? item.nameZh : item.nameEn}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                        {item.price.toFixed(item.decimals)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          isUp ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {item.changePercent24h.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 hidden md:table-cell whitespace-nowrap">
                        {item.high24h.toFixed(item.decimals)} / {item.low24h.toFixed(item.decimals)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 hidden sm:table-cell whitespace-nowrap">
                        {item.spreadPips} pips · <span className="text-blue-500 font-bold">{item.leverage}x</span>
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono whitespace-nowrap">
                            <span className="text-emerald-500">{item.longRatio}% 多</span>
                            <span className="text-rose-500">{100 - item.longRatio}% 空</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-rose-500/30 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${item.longRatio}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onNavigate('diagnose', undefined, item.symbol)}
                            className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {lang === 'zh' ? 'AI诊股' : 'Diagnose'}
                          </button>
                          <button
                            onClick={() => onNavigate('trade', item.category, item.symbol)}
                            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {lang === 'zh' ? '去交易' : 'Trade'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
