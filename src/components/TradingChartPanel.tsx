import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Crosshair,
  TrendingUp,
  GitBranch,
  Percent,
  Hash,
  Square,
  Triangle,
  RefreshCw,
  ArrowUpRight,
  Smile,
  Ruler,
  ZoomIn,
  Magnet,
  Edit3,
  Lock,
  Eye,
  Trash2,
  Maximize2,
  Camera,
  Sliders,
  Activity,
  Layers,
  Info,
} from 'lucide-react';
import { Instrument } from '../data/marketData';
import { AssetLogo } from './AssetLogo';

interface TradingChartPanelProps {
  instrument: Instrument;
  lang: 'zh' | 'en';
  theme: 'dark' | 'light';
  onOpenAiDiagnose: (symbol: string) => void;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVol: number;
  sellVol: number;
  signal?: 'BUY' | 'SELL' | null;
}

export const TradingChartPanel: React.FC<TradingChartPanelProps> = ({
  instrument,
  lang,
  theme,
  onOpenAiDiagnose,
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W'>('15m');
  const [activeTool, setActiveTool] = useState<string>('crosshair');
  const [magnetEnabled, setMagnetEnabled] = useState<boolean>(true);
  const [stayInDrawingMode, setStayInDrawingMode] = useState<boolean>(false);
  const [drawingsLocked, setDrawingsLocked] = useState<boolean>(false);
  const [drawingsVisible, setDrawingsVisible] = useState<boolean>(true);
  const [toolNotice, setToolNotice] = useState<string | null>(null);

  // Signature Indicators (AICoin / Mitrade style)
  const [mainIndicators, setMainIndicators] = useState<string[]>(['EMA', 'BOLL', 'PRO_SIGNAL']);
  const [subIndicator, setSubIndicator] = useState<'MACD' | 'RSI' | 'ORDERFLOW' | 'SENTIMENT'>('ORDERFLOW');

  // Interactive hover state on SVG chart
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Complete 18-icon TradingView Left Drawing Toolbar definition
  const tvDrawingTools = [
    { id: 'crosshair', icon: Crosshair, zh: '十字光标 (Crosshair)', en: 'Crosshair', pro: false },
    { id: 'trendline', icon: TrendingUp, zh: '趋势线 / 射线 / 平行通道', en: 'Trend Line / Ray / Parallel Channel', pro: false },
    { id: 'hline', icon: Sliders, zh: '水平支撑阻力线 (Horizontal Ray)', en: 'Horizontal Support/Resistance Line', pro: false },
    { id: 'pitchfork', icon: GitBranch, zh: '安德鲁分叉线 / 希夫分叉线 (Pitchfork)', en: 'Andrews Pitchfork / Schiff Pitchfork', pro: true },
    { id: 'fib', icon: Percent, zh: '斐波那契回撤 / 扩展 / 时间周期', en: 'Fibonacci Retracement & Extension', pro: false },
    { id: 'gann', icon: Hash, zh: '江恩箱 / 江恩角度扇形 (Gann Fan)', en: 'Gann Box / Gann Square / Gann Fan', pro: true },
    { id: 'shapes', icon: Square, zh: '几何形状 / 矩形 / 椭圆 / 路径', en: 'Geometric Shapes / Rectangle / Path', pro: false },
    { id: 'elliott', icon: Activity, zh: '艾略特五浪脉冲 / 三角谐波形态', en: 'Elliott Impulse Wave (12345) / XABCD Pattern', pro: true },
    { id: 'harmonic', icon: Triangle, zh: '加特利 / 蝙蝠谐波形态 (Harmonic)', en: 'Cypher & Gartley Harmonic Pattern', pro: true },
    { id: 'cycles', icon: RefreshCw, zh: '周期线 / 正弦波时间周期 (Time Cycles)', en: 'Cyclic Lines / Sine Line', pro: true },
    { id: 'position', icon: ArrowUpRight, zh: '多头/空头盈亏比预测工具 (Long/Short RR)', en: 'Long / Short Risk-Reward Projection', pro: false },
    { id: 'annotation', icon: Smile, zh: '文本批注 / 价格标签 / 旗标', en: 'Text Callout / Price Note / Flag Mark', pro: false },
    { id: 'measure', icon: Ruler, zh: '价格与K线周期测量尺 (Measure)', en: 'Price & Date Range Ruler', pro: false },
    { id: 'zoom', icon: ZoomIn, zh: '局部框选放大 (Zoom In)', en: 'Area Zoom In', pro: false },
  ];

  // Generate deterministic realistic candlestick series anchored to current instrument.price
  const candles: CandleData[] = useMemo(() => {
    const count = 58;
    const result: CandleData[] = [];
    const stepVolatility = instrument.price * (timeframe === '1m' ? 0.0012 : timeframe === '15m' ? 0.0028 : 0.006);

    // Seed based on symbol + timeframe
    let seed = instrument.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + timeframe.charCodeAt(0);
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Build backwards from current live price
    let cursorClose = instrument.price;
    const rawList: { open: number; high: number; low: number; close: number; volume: number; buyVol: number; sellVol: number }[] = [];

    for (let i = 0; i < count; i++) {
      if (i === 0) {
        const delta = (rand() - 0.46) * stepVolatility;
        const open = cursorClose - delta;
        const high = Math.max(open, cursorClose) + rand() * stepVolatility * 0.65;
        const low = Math.min(open, cursorClose) - rand() * stepVolatility * 0.65;
        const vol = Math.floor(1200 + rand() * 4800);
        const buyRatio = cursorClose >= open ? 0.55 + rand() * 0.3 : 0.2 + rand() * 0.25;
        rawList.unshift({
          open,
          high,
          low,
          close: cursorClose,
          volume: vol,
          buyVol: Math.round(vol * buyRatio),
          sellVol: Math.round(vol * (1 - buyRatio)),
        });
        cursorClose = open;
      } else {
        const close = cursorClose;
        const delta = (rand() - 0.485) * stepVolatility;
        const open = close - delta;
        const high = Math.max(open, close) + rand() * stepVolatility * 0.75;
        const low = Math.min(open, close) - rand() * stepVolatility * 0.75;
        const vol = Math.floor(900 + rand() * 5200);
        const buyRatio = close >= open ? 0.52 + rand() * 0.35 : 0.18 + rand() * 0.3;
        rawList.unshift({
          open,
          high,
          low,
          close,
          volume: vol,
          buyVol: Math.round(vol * buyRatio),
          sellVol: Math.round(vol * (1 - buyRatio)),
        });
        cursorClose = open;
      }
    }

    const now = new Date();
    return rawList.map((item, idx) => {
      const t = new Date(now.getTime() - (count - 1 - idx) * 15 * 60000);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      let signal: 'BUY' | 'SELL' | null = null;
      if (idx === 14) signal = 'BUY';
      if (idx === 33) signal = 'SELL';
      if (idx === 44) signal = 'BUY';
      return {
        ...item,
        time: `${hh}:${mm}`,
        signal,
      };
    });
  }, [instrument.symbol, instrument.price, timeframe]);

  useEffect(() => {
    if (!toolNotice) return;
    const timer = setTimeout(() => setToolNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [toolNotice]);

  const handleSelectTool = (tool: typeof tvDrawingTools[0]) => {
    setActiveTool(tool.id);
    if (tool.pro) {
      setToolNotice(
        lang === 'zh'
          ? `已切换至「${tool.zh}」— 高级机构画线组件 (TradingView Pro 授权模块预览)`
          : `Selected "${tool.en}" — TradingView Pro Institutional Drawing Module`
      );
    } else if (tool.id !== 'crosshair') {
      setToolNotice(
        lang === 'zh'
          ? `画线工具已就绪：${tool.zh}`
          : `Drawing tool active: ${tool.en}`
      );
    }
  };

  const toggleMainIndicator = (ind: string) => {
    setMainIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  };

  // Compute min/max for SVG scaling
  const minPrice = useMemo(() => Math.min(...candles.map((c) => c.low)), [candles]);
  const maxPrice = useMemo(() => Math.max(...candles.map((c) => c.high)), [candles]);
  const priceRange = Math.max(maxPrice - minPrice, 0.00001);

  const chartWidth = 860;
  const mainChartHeight = 310;
  const subChartTop = 335;
  const subChartHeight = 95;
  const totalHeight = 445;

  const priceToY = (p: number) => {
    const pad = 22;
    const usable = mainChartHeight - pad * 2;
    return pad + usable * (1 - (p - minPrice) / priceRange);
  };

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

  // Calculate EMA20 & Bollinger paths
  const emaPoints = useMemo(() => {
    const pts: string[] = [];
    let ema = candles[0]?.close || instrument.price;
    const k = 2 / (12 + 1);
    candles.forEach((c, i) => {
      ema = c.close * k + ema * (1 - k);
      const x = 16 + i * ((chartWidth - 90) / candles.length);
      const y = priceToY(ema);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    return pts.join(' ');
  }, [candles, minPrice, maxPrice]);

  const bollBands = useMemo(() => {
    const upper: string[] = [];
    const lower: string[] = [];
    let ma = candles[0]?.close || instrument.price;
    const offset = priceRange * 0.14;
    candles.forEach((c, i) => {
      ma = ma * 0.82 + c.close * 0.18;
      const x = 16 + i * ((chartWidth - 90) / candles.length);
      upper.push(`${x.toFixed(1)},${priceToY(ma + offset).toFixed(1)}`);
      lower.push(`${x.toFixed(1)},${priceToY(ma - offset).toFixed(1)}`);
    });
    return { upper: upper.join(' '), lower: lower.join(' ') };
  }, [candles, minPrice, maxPrice]);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * chartWidth;
    const relY = ((e.clientY - rect.top) / rect.height) * totalHeight;
    setMousePos({ x: relX, y: relY });

    const usableWidth = chartWidth - 90;
    const idx = Math.floor(((relX - 10) / usableWidth) * candles.length);
    if (idx >= 0 && idx < candles.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0E14] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/90 select-none">
      {/* Instrument Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/60 dark:bg-[#0F131C]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <AssetLogo
            symbol={instrument.symbol}
            category={instrument.category}
            logoUrl={instrument.logoUrl}
            baseFlag={instrument.baseFlag}
            quoteFlag={instrument.quoteFlag}
            size="md"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {instrument.symbol}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[110px] sm:max-w-none">
                {lang === 'zh' ? instrument.nameZh : instrument.nameEn}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">·</span>
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                {instrument.leverage}x
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              <span>{lang === 'zh' ? '点差' : 'Spread'}: {instrument.spreadPips} pips</span>
              <span>·</span>
              <span>
                {lang === 'zh' ? '多空情绪' : 'Sentiment'}:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{instrument.longRatio}% {lang === 'zh' ? '做多' : 'Long'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Live Price & 24h Telemetry */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0 ml-auto">
          <div className="text-right whitespace-nowrap">
            <div
              className={`text-base sm:text-xl font-bold font-mono tabular-nums tracking-tight ${
                instrument.changePercent24h >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {instrument.price.toFixed(instrument.decimals)}
            </div>
            <div
              className={`text-[11px] sm:text-xs font-mono tabular-nums ${
                instrument.changePercent24h >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {instrument.change24h >= 0 ? '+' : ''}
              {instrument.change24h.toFixed(instrument.decimals)} (
              {instrument.changePercent24h >= 0 ? '+' : ''}
              {instrument.changePercent24h.toFixed(2)}%)
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-4 text-xs border-l border-slate-200 dark:border-slate-800 pl-4 whitespace-nowrap">
            <div>
              <div className="text-slate-400 dark:text-slate-500">{lang === 'zh' ? '24h最高' : '24h High'}</div>
              <div className="font-mono tabular-nums text-slate-800 dark:text-slate-200 font-medium">
                {instrument.high24h.toFixed(instrument.decimals)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500">{lang === 'zh' ? '24h最低' : '24h Low'}</div>
              <div className="font-mono tabular-nums text-slate-800 dark:text-slate-200 font-medium">
                {instrument.low24h.toFixed(instrument.decimals)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500">{lang === 'zh' ? '24h成交额' : '24h Turnover'}</div>
              <div className="font-mono tabular-nums text-slate-800 dark:text-slate-200 font-medium">
                ${instrument.volume24h}
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenAiDiagnose(instrument.symbol)}
            className="px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-mono shrink-0">
              AI
            </span>
            <span>{lang === 'zh' ? 'AI解读' : 'AI Insight'}</span>
          </button>
        </div>
      </div>

      {/* Top Chart Controls: Timeframes + Characteristic Indicators */}
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0E14] text-xs overflow-x-auto">
        <div className="flex items-center gap-1 shrink-0">
          {(['1m', '5m', '15m', '1H', '4H', '1D', '1W'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 rounded font-mono font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tf}
            </button>
          ))}
          <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>

          {/* Main Overlay Characteristic Indicators */}
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline whitespace-nowrap">
            {lang === 'zh' ? '特色主图:' : 'Overlays:'}
          </span>
          {[
            { id: 'EMA', zh: 'EMA均线', en: 'EMA 20' },
            { id: 'BOLL', zh: 'BOLL布林带', en: 'Bollinger' },
            { id: 'PRO_SIGNAL', zh: 'AICoin多空B/S信号', en: 'AICoin B/S Signal' },
            { id: 'VP', zh: '筹码峰分布 (VPVR)', en: 'Volume Profile' },
          ].map((ind) => {
            const active = mainIndicators.includes(ind.id);
            return (
              <button
                key={ind.id}
                onClick={() => toggleMainIndicator(ind.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {lang === 'zh' ? ind.zh : ind.en}
              </button>
            );
          })}
        </div>

        {/* Sub-chart Indicator Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1 hidden md:inline whitespace-nowrap">
            {lang === 'zh' ? '副图指标:' : 'Sub-pane:'}
          </span>
          {[
            { id: 'ORDERFLOW', zh: '主力净流入Delta', en: 'Orderflow Delta' },
            { id: 'MACD', zh: 'MACD趋势', en: 'MACD' },
            { id: 'RSI', zh: 'RSI强弱', en: 'RSI (14)' },
            { id: 'SENTIMENT', zh: '客户多空持仓比', en: 'Client Positioning' },
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubIndicator(sub.id as typeof subIndicator)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subIndicator === sub.id
                  ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {lang === 'zh' ? sub.zh : sub.en}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Body: Left Complete TradingView Drawing Toolbar + Right Interactive Chart Canvas */}
      <div className="flex flex-1 min-h-[430px] relative overflow-hidden">
        {/* Left Complete TradingView Drawing Toolbar (Requirement #12) */}
        <div className="w-11 shrink-0 border-r border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0F131C] flex flex-col items-center py-1.5 gap-0.5 overflow-y-auto z-20">
          {tvDrawingTools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleSelectTool(tool)}
                title={lang === 'zh' ? tool.zh : tool.en}
                className={`relative w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tool.pro && (
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}

          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

          {/* Magnet Mode */}
          <button
            onClick={() => {
              setMagnetEnabled(!magnetEnabled);
              setToolNotice(
                lang === 'zh'
                  ? `磁铁吸附模式已${!magnetEnabled ? '开启 (自动吸附OHLC顶点)' : '关闭'}`
                  : `Weak/Strong Magnet ${!magnetEnabled ? 'Enabled' : 'Disabled'}`
              );
            }}
            title={lang === 'zh' ? '磁铁吸附模式 (Magnet Mode)' : 'Magnet Mode'}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
              magnetEnabled
                ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Magnet className="w-4 h-4" />
          </button>

          {/* Keep Drawing Mode */}
          <button
            onClick={() => setStayInDrawingMode(!stayInDrawingMode)}
            title={lang === 'zh' ? '保持绘图模式 (Stay in Drawing Mode)' : 'Stay in Drawing Mode'}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
              stayInDrawingMode
                ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Lock All Drawings */}
          <button
            onClick={() => setDrawingsLocked(!drawingsLocked)}
            title={lang === 'zh' ? '锁定所有画线 (Lock All Drawing Tools)' : 'Lock All Drawing Tools'}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
              drawingsLocked
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Hide/Show Drawings */}
          <button
            onClick={() => setDrawingsVisible(!drawingsVisible)}
            title={lang === 'zh' ? '隐藏/显示画线与指标图形' : 'Hide / Show All Drawings'}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
              !drawingsVisible
                ? 'text-rose-500 bg-rose-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Clear Drawings */}
          <button
            onClick={() => {
              setActiveTool('crosshair');
              setToolNotice(lang === 'zh' ? '画布自定义标记已重置' : 'Canvas user drawings reset');
            }}
            title={lang === 'zh' ? '移除绘图对象 (Remove Objects)' : 'Remove Objects'}
            className="w-8 h-8 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Candlestick & Indicator SVG Canvas */}
        <div className="flex-1 relative flex flex-col bg-white dark:bg-[#0B0E14] overflow-hidden">
          {/* OHLCV Live Readout Overlay */}
          <div className="absolute top-2 left-3 right-20 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono pointer-events-none">
            <span className="font-sans font-semibold text-slate-700 dark:text-slate-300">
              {instrument.symbol} · {timeframe}
            </span>
            <span className="text-slate-500">
              O <strong className="text-slate-900 dark:text-slate-100">{activeCandle.open.toFixed(instrument.decimals)}</strong>
            </span>
            <span className="text-slate-500">
              H <strong className="text-slate-900 dark:text-slate-100">{activeCandle.high.toFixed(instrument.decimals)}</strong>
            </span>
            <span className="text-slate-500">
              L <strong className="text-slate-900 dark:text-slate-100">{activeCandle.low.toFixed(instrument.decimals)}</strong>
            </span>
            <span className="text-slate-500">
              C{' '}
              <strong
                className={
                  activeCandle.close >= activeCandle.open
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {activeCandle.close.toFixed(instrument.decimals)}
              </strong>
            </span>
            <span className="text-blue-500">EMA(20): {(activeCandle.close * 0.9985).toFixed(instrument.decimals)}</span>
            {mainIndicators.includes('BOLL') && (
              <span className="text-amber-500">
                BOLL(20,2): {(activeCandle.close * 1.004).toFixed(instrument.decimals)} / {(activeCandle.close * 0.996).toFixed(instrument.decimals)}
              </span>
            )}
          </div>

          {/* Floating Tool Notice Banner when user clicks TradingView Drawing tools */}
          {toolNotice && (
            <div className="absolute top-9 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs shadow-md border border-slate-700">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{toolNotice}</span>
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${totalHeight}`}
            preserveAspectRatio="none"
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={() => {
              setHoverIndex(null);
              setMousePos(null);
            }}
            className="w-full h-full flex-1 cursor-crosshair"
          >
            {/* Horizontal Price Grid Lines */}
            {[0.15, 0.35, 0.55, 0.75, 0.92].map((ratio, idx) => {
              const y = mainChartHeight * ratio;
              const p = maxPrice - ratio * priceRange;
              return (
                <g key={idx}>
                  <line
                    x1={0}
                    y1={y}
                    x2={chartWidth - 72}
                    y2={y}
                    stroke={theme === 'dark' ? '#1E2433' : '#F1F5F9'}
                    strokeWidth="1"
                  />
                  <text
                    x={chartWidth - 66}
                    y={y + 4}
                    fill={theme === 'dark' ? '#64748B' : '#94A3B8'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {p.toFixed(instrument.decimals)}
                  </text>
                </g>
              );
            })}

            {/* Right Price Axis Divider */}
            <line
              x1={chartWidth - 72}
              y1={0}
              x2={chartWidth - 72}
              y2={totalHeight}
              stroke={theme === 'dark' ? '#1E2433' : '#E2E8F0'}
              strokeWidth="1"
            />

            {/* Volume Profile (VPVR) Horizontal Bars on Left-Right if active */}
            {mainIndicators.includes('VP') &&
              [0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((r, idx) => {
                const y = mainChartHeight * r;
                const w = idx === 2 || idx === 3 ? 115 : 55 + (idx * 17) % 45;
                return (
                  <g key={`vp-${idx}`} opacity={0.22}>
                    <rect
                      x={chartWidth - 72 - w}
                      y={y - 7}
                      width={w * 0.6}
                      height={12}
                      fill="#10B981"
                    />
                    <rect
                      x={chartWidth - 72 - w * 0.4}
                      y={y - 7}
                      width={w * 0.4}
                      height={12}
                      fill="#F43F5E"
                    />
                  </g>
                );
              })}

            {/* Bollinger Bands Overlay */}
            {mainIndicators.includes('BOLL') && (
              <g>
                <polyline
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.7"
                  points={bollBands.upper}
                />
                <polyline
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.7"
                  points={bollBands.lower}
                />
              </g>
            )}

            {/* EMA 20 Line Overlay */}
            {mainIndicators.includes('EMA') && (
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="1.75"
                points={emaPoints}
              />
            )}

            {/* Interactive Drawing Preview if user selected Fib / Trendline / Position */}
            {drawingsVisible && activeTool === 'fib' && (
              <g opacity="0.85">
                {[
                  { lvl: '0.000', ratio: 0.22, color: '#64748B' },
                  { lvl: '0.382', ratio: 0.42, color: '#10B981' },
                  { lvl: '0.618 (Golden)', ratio: 0.58, color: '#F59E0B' },
                  { lvl: '1.000', ratio: 0.78, color: '#3B82F6' },
                ].map((f, i) => {
                  const y = mainChartHeight * f.ratio;
                  return (
                    <g key={i}>
                      <line
                        x1={140}
                        y1={y}
                        x2={chartWidth - 95}
                        y2={y}
                        stroke={f.color}
                        strokeWidth="1.2"
                        strokeDasharray="4 2"
                      />
                      <text
                        x={145}
                        y={y - 4}
                        fill={f.color}
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Fib {f.lvl} ({(maxPrice - f.ratio * priceRange).toFixed(instrument.decimals)})
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {drawingsVisible && activeTool === 'trendline' && (
              <g>
                <line
                  x1={120}
                  y1={mainChartHeight * 0.76}
                  x2={chartWidth - 130}
                  y2={mainChartHeight * 0.28}
                  stroke="#3B82F6"
                  strokeWidth="2"
                />
                <circle cx={120} cy={mainChartHeight * 0.76} r="4" fill="#3B82F6" />
                <circle cx={chartWidth - 130} cy={mainChartHeight * 0.28} r="4" fill="#3B82F6" />
              </g>
            )}

            {drawingsVisible && activeTool === 'position' && (
              <g opacity="0.85">
                <rect
                  x={460}
                  y={mainChartHeight * 0.22}
                  width={210}
                  height={mainChartHeight * 0.28}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10B981"
                  strokeWidth="1"
                />
                <rect
                  x={460}
                  y={mainChartHeight * 0.5}
                  width={210}
                  height={mainChartHeight * 0.14}
                  fill="rgba(244, 63, 94, 0.16)"
                  stroke="#F43F5E"
                  strokeWidth="1"
                />
                <text x={468} y={mainChartHeight * 0.22 + 14} fill="#10B981" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  TP Target · R/R 2.0:1
                </text>
              </g>
            )}

            {/* Candlesticks + AICoin B/S Signals */}
            {candles.map((c, i) => {
              const stepX = (chartWidth - 90) / candles.length;
              const x = 16 + i * stepX;
              const isBull = c.close >= c.open;
              const color = isBull ? '#10B981' : '#F43F5E';
              const yOpen = priceToY(c.open);
              const yClose = priceToY(c.close);
              const yHigh = priceToY(c.high);
              const yLow = priceToY(c.low);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

              return (
                <g key={i}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                  <rect
                    x={x - stepX * 0.34}
                    y={bodyTop}
                    width={stepX * 0.68}
                    height={bodyHeight}
                    fill={color}
                    rx="0.5"
                  />

                  {/* Characteristic AICoin Institutional B/S Signal Tag */}
                  {mainIndicators.includes('PRO_SIGNAL') && c.signal === 'BUY' && (
                    <g transform={`translate(${x - 9}, ${yLow + 6})`}>
                      <rect width="18" height="14" rx="3" fill="#10B981" />
                      <text x="9" y="10.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
                        B
                      </text>
                    </g>
                  )}
                  {mainIndicators.includes('PRO_SIGNAL') && c.signal === 'SELL' && (
                    <g transform={`translate(${x - 9}, ${yHigh - 20})`}>
                      <rect width="18" height="14" rx="3" fill="#F43F5E" />
                      <text x="9" y="10.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
                        S
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Current Live Price Horizontal Dashed Line & Tag */}
            {(() => {
              const curY = priceToY(instrument.price);
              const isUp = instrument.changePercent24h >= 0;
              const badgeColor = isUp ? '#10B981' : '#F43F5E';
              return (
                <g>
                  <line
                    x1={0}
                    y1={curY}
                    x2={chartWidth - 72}
                    y2={curY}
                    stroke={badgeColor}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={chartWidth - 72}
                    y={curY - 9}
                    width={70}
                    height={18}
                    rx="2"
                    fill={badgeColor}
                  />
                  <text
                    x={chartWidth - 37}
                    y={curY + 3.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {instrument.price.toFixed(instrument.decimals)}
                  </text>
                </g>
              );
            })()}

            {/* Sub-Pane Separator Line & Header */}
            <line
              x1={0}
              y1={mainChartHeight + 8}
              x2={chartWidth}
              y2={mainChartHeight + 8}
              stroke={theme === 'dark' ? '#1E2433' : '#E2E8F0'}
              strokeWidth="1"
            />
            <text
              x={12}
              y={mainChartHeight + 22}
              fill={theme === 'dark' ? '#94A3B8' : '#64748B'}
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {subIndicator === 'ORDERFLOW' &&
                (lang === 'zh'
                  ? 'AICoin 主力净流入 Delta (主动买盘 vs 主动卖盘)'
                  : 'AICoin Institutional Orderflow Delta (Buy vs Sell Vol)')}
              {subIndicator === 'MACD' && 'MACD (12, 26, 9) Histogram & DIF/DEA'}
              {subIndicator === 'RSI' && 'RSI (14) Relative Strength Index — Overbought 70 / Oversold 30'}
              {subIndicator === 'SENTIMENT' &&
                (lang === 'zh'
                  ? `客户实时多空持仓分布 (${instrument.longRatio}% 多头 vs ${100 - instrument.longRatio}% 空头)`
                  : `Live Client Sentiment (${instrument.longRatio}% Long vs ${100 - instrument.longRatio}% Short)`)}
            </text>

            {/* Sub-Pane Data Rendering */}
            {candles.map((c, i) => {
              const stepX = (chartWidth - 90) / candles.length;
              const x = 16 + i * stepX;
              const delta = c.buyVol - c.sellVol;
              const maxVol = 4000;
              const barH = Math.min(Math.abs(delta) / maxVol, 1) * (subChartHeight * 0.42);
              const midY = subChartTop + subChartHeight * 0.52;

              if (subIndicator === 'ORDERFLOW' || subIndicator === 'MACD') {
                const isPos = delta >= 0;
                return (
                  <rect
                    key={`sub-${i}`}
                    x={x - stepX * 0.3}
                    y={isPos ? midY - barH : midY}
                    width={stepX * 0.6}
                    height={Math.max(barH, 2)}
                    fill={isPos ? '#10B981' : '#F43F5E'}
                    opacity="0.85"
                  />
                );
              }

              if (subIndicator === 'SENTIMENT') {
                const totalH = subChartHeight * 0.65;
                const topY = subChartTop + 18;
                const longRatioDynamic = Math.min(Math.max(instrument.longRatio + ((i % 7) - 3), 20), 88);
                const longH = (longRatioDynamic / 100) * totalH;
                return (
                  <g key={`sent-${i}`}>
                    <rect
                      x={x - stepX * 0.28}
                      y={topY}
                      width={stepX * 0.56}
                      height={totalH - longH}
                      fill="#F43F5E"
                      opacity="0.45"
                    />
                    <rect
                      x={x - stepX * 0.28}
                      y={topY + (totalH - longH)}
                      width={stepX * 0.56}
                      height={longH}
                      fill="#10B981"
                      opacity="0.8"
                    />
                  </g>
                );
              }

              return null;
            })}

            {/* RSI Polyline if RSI selected */}
            {subIndicator === 'RSI' && (
              <g>
                <line
                  x1={0}
                  y1={subChartTop + 22}
                  x2={chartWidth - 72}
                  y2={subChartTop + 22}
                  stroke="#F43F5E"
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />
                <line
                  x1={0}
                  y1={subChartTop + subChartHeight - 18}
                  x2={chartWidth - 72}
                  y2={subChartTop + subChartHeight - 18}
                  stroke="#10B981"
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />
                <polyline
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="1.6"
                  points={candles
                    .map((c, i) => {
                      const x = 16 + i * ((chartWidth - 90) / candles.length);
                      const norm = (c.close - minPrice) / priceRange;
                      const y = subChartTop + subChartHeight - 12 - norm * (subChartHeight - 28);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              </g>
            )}

            {/* Interactive Crosshair Lines */}
            {mousePos && (
              <g pointerEvents="none">
                <line
                  x1={mousePos.x}
                  y1={0}
                  x2={mousePos.x}
                  y2={totalHeight}
                  stroke={theme === 'dark' ? '#475569' : '#94A3B8'}
                  strokeWidth="0.9"
                  strokeDasharray="4 4"
                />
                <line
                  x1={0}
                  y1={mousePos.y}
                  x2={chartWidth - 72}
                  y2={mousePos.y}
                  stroke={theme === 'dark' ? '#475569' : '#94A3B8'}
                  strokeWidth="0.9"
                  strokeDasharray="4 4"
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
