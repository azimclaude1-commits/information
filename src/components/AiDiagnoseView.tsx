import React, { useState, useEffect } from 'react';
import {
  Radar,
  RefreshCw,
  BarChart3,
  Layers,
  DollarSign,
  ShieldAlert,
  Search,
  ChevronLeft,
  Sparkles,
  ArrowUpRight,
  LayoutGrid,
} from 'lucide-react';
import { Instrument } from '../data/marketData';
import { AssetLogo } from './AssetLogo';
import { MarketOverviewView } from './MarketOverviewView';

interface AiDiagnoseModalProps {
  instruments: Instrument[];
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  onQuickTrade: (sym: string, side: 'buy' | 'sell') => void;
  lang: 'zh' | 'en';
  onBackToMarketOverview?: () => void;
  onNavigateTab?: (tab: any) => void;
}

interface DiagnosisReport {
  overallScore: number;
  stance: string;
  shortTermOrderNote: string;
  upsideExpectationNote: string;
  longTermInvestNote: string;
  targetPriceHigh: number;
  targetPriceLow: number;
  stopLossPrice: number;
  summary: string;
  technicalNote: string;
  fundamentalNote: string;
  capitalFlowNote: string;
  riskWarning: string;
  scores: {
    technical: number;
    fundamental: number;
    capitalFlow: number;
    sentiment: number;
    dividendValue: number;
  };
}

export const AiDiagnoseView: React.FC<AiDiagnoseModalProps> = ({
  instruments,
  selectedSymbol,
  onSelectSymbol,
  onQuickTrade,
  lang,
  onBackToMarketOverview,
  onNavigateTab,
}) => {
  const [subMode, setSubMode] = useState<'market_overview' | 'ai_diagnose'>('market_overview');
  const currentInst = instruments.find((i) => i.symbol === selectedSymbol) || instruments[0];

  const [searchInput, setSearchInput] = useState(currentInst.symbol);
  const [activeBottomTab, setActiveBottomTab] = useState<'quotes' | 'diagnose' | 'flash' | 'indicators'>('quotes');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DiagnosisReport | null>(null);

  useEffect(() => {
    setSearchInput(currentInst.symbol);
  }, [currentInst.symbol]);

  const buildDeterministicReport = (inst: Instrument): DiagnosisReport => {
    const isBull = inst.changePercent24h >= 0;
    const baseScore = inst.symbol === 'NVDA' ? 91 : inst.symbol === 'AAPL' ? 86 : inst.symbol === 'KO' ? 84 : isBull ? 83 : 64;
    const supLow = (inst.price * 0.968).toFixed(inst.decimals);
    const supHigh = (inst.price * 0.982).toFixed(inst.decimals);
    const resLow = (inst.price * 1.028).toFixed(inst.decimals);
    const resHigh = (inst.price * 1.055).toFixed(inst.decimals);

    return {
      overallScore: baseScore,
      stance: isBull
        ? lang === 'zh'
          ? '今日看涨 📈'
          : 'Bullish Today 📈'
        : lang === 'zh'
        ? '今日看跌 📉'
        : 'Bearish Today 📉',
      summary:
        lang === 'zh'
          ? `${inst.symbol} (${inst.nameZh}) 正处于关键趋势加速点，当前价格 $${inst.price.toFixed(inst.decimals)}，日内涨跌幅 ${inst.changePercent24h >= 0 ? '+' : ''}${inst.changePercent24h.toFixed(2)}%。技术面与主力订单流数据${isBull ? '显著偏多，向上突破概率 72%' : '短期承压，向下回测支撑概率 65%'}（目标区间 $${resLow}-$${resHigh}），下方防守支撑位于 $${supLow}-$${supHigh}。全市场多头持仓占比达 ${inst.longRatio}%，主力暗池资金净流入强劲。`
          : `${inst.symbol} (${inst.nameEn}) is at a key inflection point at $${inst.price.toFixed(inst.decimals)} (${inst.changePercent24h >= 0 ? '+' : ''}${inst.changePercent24h.toFixed(2)}%). Technicals and institutional orderflow lean ${isBull ? 'strongly bullish with 72% upside breakout probability' : 'cautious with 65% support retest probability'} (target zone $${resLow}-$${resHigh}), while primary support sits at $${supLow}-$${supHigh}.`,
      shortTermOrderNote:
        lang === 'zh'
          ? `若放量跌破 $${supLow}-$${supHigh}，可考虑顺势做空或等待更低位接多；若放量突破并站稳 $${resLow}，可顺势追多，日内第一止盈看至 $${resHigh}。`
          : `If volume breaks below $${supLow}-$${supHigh}, consider tactical shorts; if price breaks and holds above $${resLow}, add momentum longs targeting $${resHigh}.`,
      upsideExpectationNote:
        lang === 'zh'
          ? `中长期基本面稳健，行业龙头溢价与机构资金净流入提供坚实支撑。短期内突破 $${resLow} 关键颈线位将直接决定波段加速幅度。`
          : `Medium-to-long-term fundamentals remain solid with institutional accumulation providing structural support.`,
      longTermInvestNote:
        lang === 'zh'
          ? `建议在回调至 $${supLow}-$${supHigh} 区间时分批建立多头底仓，或配合除息日分红补贴策略中线持有，风险收益比极佳。`
          : `Accumulate in tranches on pullbacks toward the $${supLow}-$${supHigh} support zone with strict margin sizing.`,
      targetPriceHigh: Number(resHigh),
      targetPriceLow: Number(resLow),
      stopLossPrice: Number(supLow),
      technicalNote:
        lang === 'zh'
          ? `15m与4H周期呈现多头排列，RSI(14)位于 58.4 健康强势区；下方第一支撑位 $${supHigh}，上方突破阻力位 $${resLow}。`
          : `15m and 4H timeframes maintain trend alignment with RSI(14) at 58.4; primary support at $${supHigh}.`,
      fundamentalNote:
        lang === 'zh'
          ? `远期市盈率 ${inst.peRatio || 28.5}x，自由现金流充沛，季度营收增速高于同业中位数，机构评级维持超配。`
          : `Forward P/E at ${inst.peRatio || 28.5}x with robust free cash flow and positive earnings revisions.`,
      capitalFlowNote:
        lang === 'zh'
          ? `AICoin 订单流监控显示主动买盘成交占比 64.2%，对冲基金席位在 $${supHigh} 附近密集挂出大额冰山承接单。`
          : `Orderflow telemetry indicates 64.2% aggressive buyer volume with institutional iceberg bids near $${supHigh}.`,
      riskWarning:
        lang === 'zh'
          ? `需留意美债收益率波动及宏观数据公布引起的瞬时点差扩大，建议单笔 CFD 保证金敞口控制在账户净值的 15% 以内。`
          : `Monitor macro releases and maintain single-position CFD margin exposure below 15% of account equity.`,
      scores: {
        technical: Math.min(96, baseScore + 4),
        fundamental: Math.min(95, baseScore + 2),
        capitalFlow: inst.longRatio,
        sentiment: Math.min(94, inst.longRatio + 8),
        dividendValue: inst.dividendYield && inst.dividendYield > 1.5 ? 90 : 76,
      },
    };
  };

  const runDiagnosis = async (inst: Instrument) => {
    setLoading(true);
    const fallback = buildDeterministicReport(inst);
    try {
      // The published prototype runs without the local Express API.
      if (import.meta.env.PROD) {
        setReport(fallback);
        return;
      }
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: inst.symbol,
          name: lang === 'zh' ? inst.nameZh : inst.nameEn,
          price: inst.price,
          changePercent: inst.changePercent24h,
          lang,
        }),
      });
      const data = await res.json();
      if (data && !data.fallback && data.overallScore) {
        setReport({
          ...fallback,
          ...data,
          scores: fallback.scores,
        });
      } else {
        setReport(fallback);
      }
    } catch {
      setReport(fallback);
    } finally {
      setTimeout(() => setLoading(false), 450);
    }
  };

  useEffect(() => {
    runDiagnosis(currentInst);
  }, [currentInst.symbol, lang]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim().toUpperCase();
    const match = instruments.find(
      (i) => i.symbol.toUpperCase().includes(q) || i.nameZh.includes(q) || i.nameEn.toUpperCase().includes(q)
    );
    if (match) {
      onSelectSymbol(match.symbol);
    }
  };

  const activeReport = report || buildDeterministicReport(currentInst);

  // Build Cross-Platform Trading Pairs matrix (Column 1 of Screenshot 2)
  const crossExchangePairs = [
    { pair: `${currentInst.symbol}/USD`, platform: 'AlphaPulse CFD 零佣金永续', price: currentInst.price, change: currentInst.changePercent24h },
    { pair: `${currentInst.symbol}/USD`, platform: 'Mitrade 国际差价合约', price: Number((currentInst.price * 1.0002).toFixed(currentInst.decimals)), change: Number((currentInst.changePercent24h + 0.04).toFixed(2)) },
    { pair: `${currentInst.symbol}/USDT`, platform: '欧易 OKX USDT 永续', price: Number((currentInst.price * 0.9997).toFixed(currentInst.decimals)), change: Number((currentInst.changePercent24h - 0.05).toFixed(2)) },
    { pair: `${currentInst.symbol}/USDT`, platform: '币安 Binance 永续合约', price: Number((currentInst.price * 1.0005).toFixed(currentInst.decimals)), change: Number((currentInst.changePercent24h + 0.08).toFixed(2)) },
    { pair: `${currentInst.symbol}/USDT`, platform: 'Bybit 衍生品合约', price: Number((currentInst.price * 0.9995).toFixed(currentInst.decimals)), change: Number((currentInst.changePercent24h + 0.02).toFixed(2)) },
    { pair: `${currentInst.symbol}/USD`, platform: '盈透证券 IBKR 机构暗池', price: Number((currentInst.price * 1.0001).toFixed(currentInst.decimals)), change: Number((currentInst.changePercent24h + 0.01).toFixed(2)) },
    { pair: `${currentInst.symbol}/USD`, platform: '纳斯达克 / 伦敦现货主池', price: currentInst.price, change: currentInst.changePercent24h },
  ];

  // Build Related Derivatives & Leveraged Tokens (Column 2 of Screenshot 2)
  const relatedTokens = [
    { code: currentInst.symbol, name: `${currentInst.nameEn} Spot / CFD`, price: currentInst.price, change: currentInst.changePercent24h },
    { code: `${currentInst.symbol}3L`, name: `${currentInst.symbol} 3x Long 三倍做多ETF`, price: Number((currentInst.price * 0.12).toFixed(2)), change: Number((currentInst.changePercent24h * 3).toFixed(2)) },
    { code: `${currentInst.symbol}3S`, name: `${currentInst.symbol} 3x Short 三倍做空ETF`, price: Number((currentInst.price * 0.08).toFixed(2)), change: Number((-currentInst.changePercent24h * 3).toFixed(2)) },
    { code: `${currentInst.symbol}-PERP`, name: `${currentInst.symbol} Institutional Perpetual`, price: Number((currentInst.price * 1.0004).toFixed(currentInst.decimals)), change: currentInst.changePercent24h },
    { code: `${currentInst.symbol}-OPT`, name: `${currentInst.symbol} 月度看涨期权主力合约`, price: Number((currentInst.price * 0.045).toFixed(2)), change: Number((currentInst.changePercent24h * 4.2).toFixed(2)) },
  ];

  // Build Correlated Sector Board (Column 3 of Screenshot 2)
  const sectorBoards = [
    { nameZh: 'AI算力与半导体龙头板块', nameEn: 'AI Compute & Semiconductors', avgChange: '+2.38%', leader: 'NVDA +1.40%' },
    { nameZh: '纳斯达克百强科技巨头 (Mag 7)', nameEn: 'Nasdaq Mega-Cap Tech', avgChange: '+1.12%', leader: 'META +1.41%' },
    { nameZh: '全球大宗避险贵金属板块', nameEn: 'Precious Metals Safe-Haven', avgChange: '+1.01%', leader: 'XAG/USD +1.33%' },
    { nameZh: '美股高股息现金流防御板块', nameEn: 'US High-Dividend Aristocrats', avgChange: '+0.68%', leader: 'JPM +0.79%' },
    { nameZh: '主流现货ETF加密合约板块', nameEn: 'Spot ETF Crypto Majors', avgChange: '+1.74%', leader: 'SOL/USD +3.30%' },
  ];

  const radarAxes = [
    { key: 'technical', zh: '技术形态', en: 'Technicals', angle: -90 },
    { key: 'fundamental', zh: '基本面盈利', en: 'Fundamentals', angle: -18 },
    { key: 'capitalFlow', zh: '主力资金流', en: 'Orderflow', angle: 54 },
    { key: 'sentiment', zh: '多空情绪', en: 'Sentiment', angle: 126 },
    { key: 'dividendValue', zh: '估值与股息', en: 'Valuation', angle: 198 },
  ] as const;

  return (
    <div className="pb-10">
      <div className="max-w-[1440px] mx-auto px-3 md:px-6 pt-5 space-y-5">
        {/* Top Search & Quick Switch Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            {onBackToMarketOverview && (
              <button
                onClick={onBackToMarketOverview}
                className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                title={lang === 'zh' ? '返回市场概览' : 'Back to Market Overview'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <form onSubmit={handleSearch} className="flex-1 relative min-w-0">
              <Search className="w-4 h-4 text-ink-3 absolute left-4 top-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={lang === 'zh' ? '输入股票/外汇/加密代码进行 AI 概览与深度诊股...' : 'Enter symbol for AI Overview & Stock Diagnosis...'}
                className="w-full h-10 pl-11 pr-28 rounded-xl text-[13px] sm:text-sm font-medium bg-surface border border-line text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand focus:ring-3 focus:ring-brand-soft transition-shadow"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 h-7 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <span>{lang === 'zh' ? 'AI分析' : 'AI Analyze'}</span>
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center shrink-0">
                  AI
                </span>
              </button>
            </form>
          </div>

          {/* Quick Asset Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['NVDA', 'AAPL', 'TSLA', 'MSFT', 'KO', 'XAU/USD', 'BTC/USD', 'EUR/USD'].map((sym) => {
              const active = sym === currentInst.symbol;
              return (
                <button
                  key={sym}
                  aria-pressed={active}
                  onClick={() => onSelectSymbol(sym)}
                  className="ui-chip"
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Overview + Stock Diagnosis Fused Card (Exact Screenshot 2 AI Robot Bubble + 5-Factor Radar Fusion) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 8 Cols: Screenshot 2 Style AI 解读今日走势 & 下单信息 Card */}
          <div className="lg:col-span-8 ui-card p-4 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Top AI Avatar & Bubble Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                    AI
                  </div>
                  <div className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {lang === 'zh' ? `解读 ${currentInst.symbol} 今日走势` : `Decoding ${currentInst.symbol} Price Action`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold whitespace-nowrap shrink-0">
                      {lang === 'zh' ? 'AI解读 · 诊股融合' : 'AI Overview'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => runDiagnosis(currentInst)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span>{lang === 'zh' ? '刷新实时诊断' : 'Refresh AI'}</span>
                </button>
              </div>

              {/* Main Structured AI Narrative Box (Matching Screenshot 2 Grey Bubble Box) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200/70 dark:border-slate-800/90 space-y-3 text-xs sm:text-sm leading-relaxed">
                <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>{lang === 'zh' ? '总体：' : 'Overall Stance: '}</span>
                  <span
                    className={
                      currentInst.changePercent24h >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    {activeReport.stance}
                  </span>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    ({lang === 'zh' ? `五维综合评分: ${activeReport.overallScore}/100` : `Quant Score: ${activeReport.overallScore}/100`})
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300">{activeReport.summary}</p>

                <div className="pt-2 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {lang === 'zh' ? '下单信息与策略建议：' : 'Execution & Order Strategy:'}
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                    <li>
                      <strong className="text-slate-900 dark:text-white">
                        {lang === 'zh' ? '短期交易：' : 'Short-Term Execution: '}
                      </strong>
                      {activeReport.shortTermOrderNote}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">
                        {lang === 'zh' ? `${currentInst.symbol} 上涨预期：` : `${currentInst.symbol} Upside Outlook: `}
                      </strong>
                      {activeReport.upsideExpectationNote}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">
                        {lang === 'zh' ? '中长期配置：' : 'Long-Term Positioning: '}
                      </strong>
                      {activeReport.longTermInvestNote}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Key Target Price Strip + One-Click Trade Execution */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
                <div className="whitespace-nowrap">
                  <span className="text-slate-400 mr-1.5">{lang === 'zh' ? '当前价:' : 'Spot:'}</span>
                  <strong className="text-slate-900 dark:text-white">${currentInst.price.toFixed(currentInst.decimals)}</strong>
                </div>
                <div className="whitespace-nowrap">
                  <span className="text-slate-400 mr-1.5">{lang === 'zh' ? '目标止盈区间:' : 'Target Zone:'}</span>
                  <strong className="text-emerald-500">
                    ${activeReport.targetPriceLow.toFixed(currentInst.decimals)} - ${activeReport.targetPriceHigh.toFixed(currentInst.decimals)}
                  </strong>
                </div>
                <div className="whitespace-nowrap">
                  <span className="text-slate-400 mr-1.5">{lang === 'zh' ? '防守止损位:' : 'Stop-Loss:'}</span>
                  <strong className="text-rose-500">${activeReport.stopLossPrice.toFixed(currentInst.decimals)}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onQuickTrade(currentInst.symbol, 'buy')}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  {lang === 'zh' ? `一键做多 ${currentInst.symbol}` : `Long ${currentInst.symbol}`}
                </button>
                <button
                  onClick={() => onQuickTrade(currentInst.symbol, 'sell')}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  {lang === 'zh' ? `一键做空 ${currentInst.symbol}` : `Short ${currentInst.symbol}`}
                </button>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: 5-Factor Radar & Institutional Score Card */}
          <div className="lg:col-span-4 ui-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <AssetLogo
                  symbol={currentInst.symbol}
                  category={currentInst.category}
                  logoUrl={currentInst.logoUrl}
                  baseFlag={currentInst.baseFlag}
                  quoteFlag={currentInst.quoteFlag}
                  size="md"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{currentInst.symbol} 五维诊断模型</div>
                  <div className="text-[11px] text-slate-400">{lang === 'zh' ? currentInst.nameZh : currentInst.nameEn}</div>
                </div>
              </div>
              <span className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                {activeReport.overallScore}分
              </span>
            </div>

            <div className="my-3 flex items-center justify-center">
              <div className="relative w-full max-w-[360px] h-[255px] sm:h-[270px] flex items-center justify-center">
                <svg viewBox="0 0 360 270" className="w-full h-full overflow-visible">
                  {[0.35, 0.68, 1.0].map((scale, sIdx) => {
                    const pts = radarAxes
                      .map((ax) => {
                        const rad = (ax.angle * Math.PI) / 180;
                        const r = 90 * scale;
                        return `${180 + r * Math.cos(rad)},${142 + r * Math.sin(rad)}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={sIdx}
                        points={pts}
                        fill="none"
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeWidth="1.2"
                      />
                    );
                  })}
                  {radarAxes.map((ax, idx) => {
                    const rad = (ax.angle * Math.PI) / 180;
                    const x2 = 180 + 90 * Math.cos(rad);
                    const y2 = 142 + 90 * Math.sin(rad);
                    const val = activeReport.scores[ax.key];

                    // Position labels with ample margin so no text is ever clipped
                    let lx = 180 + 108 * Math.cos(rad);
                    let ly = 142 + 108 * Math.sin(rad);
                    let anchor: 'middle' | 'start' | 'end' = 'middle';

                    if (ax.angle === -90) {
                      ly = 142 - 104;
                      anchor = 'middle';
                    } else if (ax.angle === -18) {
                      lx = 180 + 90 * Math.cos(rad) + 10;
                      ly = 142 + 90 * Math.sin(rad);
                      anchor = 'start';
                    } else if (ax.angle === 198) {
                      lx = 180 + 90 * Math.cos(rad) - 10;
                      ly = 142 + 90 * Math.sin(rad);
                      anchor = 'end';
                    } else if (ax.angle === 54) {
                      lx = 180 + 108 * Math.cos(rad) + 6;
                      ly = 142 + 110 * Math.sin(rad);
                      anchor = 'middle';
                    } else if (ax.angle === 126) {
                      lx = 180 + 108 * Math.cos(rad) - 6;
                      ly = 142 + 110 * Math.sin(rad);
                      anchor = 'middle';
                    }

                    return (
                      <g key={idx}>
                        <line
                          x1={180}
                          y1={142}
                          x2={x2}
                          y2={y2}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="1.2"
                        />
                        <text
                          x={lx}
                          y={ly}
                          textAnchor={anchor}
                          dominantBaseline="middle"
                          className="fill-slate-700 dark:fill-slate-300 text-[11.5px] font-semibold"
                        >
                          {lang === 'zh' ? ax.zh : ax.en}({val})
                        </text>
                      </g>
                    );
                  })}
                  <polygon
                    points={radarAxes
                      .map((ax) => {
                        const rad = (ax.angle * Math.PI) / 180;
                        const r = 90 * (activeReport.scores[ax.key] / 100);
                        return `${180 + r * Math.cos(rad)},${142 + r * Math.sin(rad)}`;
                      })
                      .join(' ')}
                    fill="rgba(37, 99, 235, 0.24)"
                    stroke="#2962FF"
                    strokeWidth="2.4"
                  />
                  {radarAxes.map((ax, idx) => {
                    const rad = (ax.angle * Math.PI) / 180;
                    const r = 90 * (activeReport.scores[ax.key] / 100);
                    const px = 180 + r * Math.cos(rad);
                    const py = 142 + r * Math.sin(rad);
                    return (
                      <circle
                        key={`pt-${idx}`}
                        cx={px}
                        cy={py}
                        r="3.5"
                        className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-[#111722]"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
              <span>{lang === 'zh' ? '客户多头情绪占比' : 'Client Long Positioning'}</span>
              <strong className="font-mono text-emerald-500">{currentInst.longRatio}% LONG</strong>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs (Matching Screenshot 2: 行情 | 深度诊断 | 快讯 | 社区指标) */}
        <div role="tablist" className="ui-tabs ui-tabs-lg border-b border-line">
          {[
            { id: 'quotes', zh: '全网行情与板块', en: 'Cross-Market Quotes & Sectors', hintZh: '交易对 / 衍生品 / 板块' },
            { id: 'diagnose', zh: '四维机构研报拆解', en: '4-Pillar Institutional Breakdown', hintZh: '技术 / 暗池 / 财报 / 风控' },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeBottomTab === t.id}
              onClick={() => setActiveBottomTab(t.id as any)}
              className="ui-tab"
            >
              {lang === 'zh' ? t.zh : t.en}
              {lang === 'zh' && <span className="ui-tab-count">{t.hintZh}</span>}
            </button>
          ))}
        </div>

        {/* Bottom 3-Column Matrix (Exact Screenshot 2: 交易对 | 币种/衍生标的 | 板块) */}
        {activeBottomTab === 'quotes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1 (4 Cols): 交易对 (Trading Pairs across platforms) */}
            <div className="lg:col-span-4 ui-card p-4 sm:p-5 space-y-3 overflow-hidden">
              <div className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="border-b-2 border-rose-500 pb-2.5">{lang === 'zh' ? '交易对' : 'Trading Pairs'}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                      <th className="py-2 pr-2 font-normal">{lang === 'zh' ? '标的' : 'Pair'}</th>
                      <th className="py-2 px-2 font-normal">{lang === 'zh' ? '交易平台/通道' : 'Venue'}</th>
                      <th className="py-2 px-2 font-normal text-right">{lang === 'zh' ? '最新价' : 'Price'}</th>
                      <th className="py-2 pl-2 font-normal text-right">{lang === 'zh' ? '今日涨幅' : '24h Chg'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {crossExchangePairs.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onQuickTrade(currentInst.symbol, 'buy')}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="py-2.5 pr-2 font-mono font-bold text-rose-500">{row.pair}</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{row.platform}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {row.price.toFixed(currentInst.decimals)}
                        </td>
                        <td
                          className={`py-2.5 pl-2 text-right font-mono tabular-nums font-semibold ${
                            row.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {row.change >= 0 ? '+' : ''}
                          {row.change.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 2 (4 Cols): 币种 / 关联杠杆衍生品 (Related Instruments) */}
            <div className="lg:col-span-4 ui-card p-4 sm:p-5 space-y-3 overflow-hidden">
              <div className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="border-b-2 border-rose-500 pb-2.5">{lang === 'zh' ? '关联标的与杠杆ETF' : 'Related Instruments'}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                      <th className="py-2 pr-2 font-normal">{lang === 'zh' ? '名称' : 'Name'}</th>
                      <th className="py-2 px-2 font-normal text-right">{lang === 'zh' ? '最新价' : 'Last'}</th>
                      <th className="py-2 pl-2 font-normal text-right">{lang === 'zh' ? '今日涨幅' : '24h Chg'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {relatedTokens.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onQuickTrade(currentInst.symbol, item.change >= 0 ? 'buy' : 'sell')}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <AssetLogo
                              symbol={currentInst.symbol}
                              category={currentInst.category}
                              logoUrl={currentInst.logoUrl}
                              size="sm"
                            />
                            <div>
                              <span className="font-mono font-bold text-rose-500 mr-1.5">{item.code}</span>
                              <span className="text-slate-500 text-[11px]">{item.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                          {item.price}
                        </td>
                        <td
                          className={`py-2.5 pl-2 text-right font-mono tabular-nums font-semibold ${
                            item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {item.change >= 0 ? '+' : ''}
                          {item.change.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 3 (4 Cols): 板块 (Sector Correlation & Leading Assets) */}
            <div className="lg:col-span-4 ui-card p-4 sm:p-5 space-y-3 overflow-hidden">
              <div className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="border-b-2 border-rose-500 pb-2.5">{lang === 'zh' ? '所属与联动板块' : 'Correlated Sectors'}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                      <th className="py-2 pr-2 font-normal">{lang === 'zh' ? '板块名称' : 'Sector'}</th>
                      <th className="py-2 px-2 font-normal text-right">{lang === 'zh' ? '24H平均涨幅' : '24h Avg'}</th>
                      <th className="py-2 pl-2 font-normal text-right">{lang === 'zh' ? '领涨标的' : 'Leader'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {sectorBoards.map((sec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-2 font-medium text-slate-800 dark:text-slate-200">
                          {lang === 'zh' ? sec.nameZh : sec.nameEn}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-emerald-500">{sec.avgChange}</td>
                        <td className="py-3 pl-2 text-right font-mono text-slate-600 dark:text-slate-400">{sec.leader}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* 4-Pillar Deep Breakdown Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="ui-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  {lang === 'zh' ? '01. 技术面与趋势结构' : '01. Technical & Trend Structure'}
                </span>
                <span className="text-xs font-mono text-emerald-500 font-semibold">
                  {activeReport.scores.technical}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{activeReport.technicalNote}</p>
            </div>

            <div className="ui-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  {lang === 'zh' ? '02. 主力暗池与大单资金流' : '02. Dark-Pool & Institutional Orderflow'}
                </span>
                <span className="text-xs font-mono text-emerald-500 font-semibold">
                  {activeReport.scores.capitalFlow}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{activeReport.capitalFlowNote}</p>
            </div>

            <div className="ui-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  {lang === 'zh' ? '03. 财报基本面与估值安全边际' : '03. Fundamental & Valuation Margin'}
                </span>
                <span className="text-xs font-mono text-emerald-500 font-semibold">
                  {activeReport.scores.fundamental}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{activeReport.fundamentalNote}</p>
            </div>

            <div className="ui-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  {lang === 'zh' ? '04. 风险敞口与仓位管理建议' : '04. Risk Exposure & Position Sizing'}
                </span>
                <span className="text-xs font-mono text-amber-500 font-semibold">
                  {lang === 'zh' ? '风控必读' : 'Risk Controls'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{activeReport.riskWarning}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
