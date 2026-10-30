import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Star,
  Bell,
  Sliders,
  Crosshair,
  TrendingUp,
  GitBranch,
  Percent,
  Hash,
  Square,
  Triangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Smile,
  Ruler,
  Magnet,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Camera,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  LayoutGrid,
  Columns,
  Maximize2,
  Wifi,
  Clock,
  Activity,
  BarChart2,
  Check,
  Undo2,
} from 'lucide-react';
import { Instrument } from '../data/marketData';
import { AssetLogo } from './AssetLogo';
import { AicoinRightDrawer } from './AicoinRightDrawer';

interface AicoinMarketTerminalViewProps {
  instruments: Instrument[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  lang: 'zh' | 'en';
  theme: 'dark' | 'light';
  onOpenAiModal: () => void;
  onShowToast: (msg: string) => void;
}

// Primary tabs WITHOUT '平台' as explicitly requested by user:
// "行情顶部的标签，去掉'平台'，保留其它内容"
type PrimaryMarketTab = 'favorites' | 'crypto' | 'indices' | 'stocks' | 'forex' | 'commodities';

type DrawingToolType =
  | 'crosshair'
  | 'trendline'
  | 'ray'
  | 'hline'
  | 'channel'
  | 'fib'
  | 'gann'
  | 'rect'
  | 'elliott'
  | 'harmonic'
  | 'long_rr'
  | 'short_rr'
  | 'text'
  | 'measure';

interface UserDrawing {
  id: string;
  type: DrawingToolType;
  x1: number; // SVG coordinate 0..860
  y1: number; // SVG coordinate 0..320
  x2: number;
  y2: number;
  price1: number;
  price2: number;
  label?: string;
  color: string;
}

interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVol: number;
  sellVol: number;
  obv: number;
  macd: number;
  signal: number;
  hist: number;
  rsi: number;
  kdjK: number;
  kdjD: number;
  kdjJ: number;
  aiSignal?: 'BUY' | 'SELL' | null;
}

export const AicoinMarketTerminalView: React.FC<AicoinMarketTerminalViewProps> = ({
  instruments,
  selectedSymbol,
  onSelectSymbol,
  lang,
  onOpenAiModal,
  onShowToast,
}) => {
  // Left Sidebar State
  const [primaryTab, setPrimaryTab] = useState<PrimaryMarketTab>('favorites');
  const [subFilter, setSubFilter] = useState<string>('default');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([
    'ETH/USDT',
    'BTC/USDT',
    'SOL/USDT',
    'XAU/USD',
    'NVDA',
    'DOGE/USDT',
    'BNB/USDT',
    'XRP/USDT',
    'PEPE/USDT',
    'SPX500',
    'EUR/USD',
  ]);
  const [sortField, setSortField] = useState<'turnover' | 'price' | 'change'>('turnover');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [relatedExpanded, setRelatedExpanded] = useState<boolean>(true);

  // Center Chart State
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [chartLayout, setChartLayout] = useState<'1x1' | '2x1' | '2x2'>('1x1');
  const [activeTool, setActiveTool] = useState<DrawingToolType>('crosshair');
  const [magnetMode, setMagnetMode] = useState<boolean>(true);
  const [lockDrawings, setLockDrawings] = useState<boolean>(false);
  const [showDrawings, setShowDrawings] = useState<boolean>(true);
  const [logScale, setLogScale] = useState<boolean>(false);
  const [autoScale, setAutoScale] = useState<boolean>(true);

  // Main & Sub Indicators
  const [mainIndicators, setMainIndicators] = useState<string[]>(['MA', 'BOLL', 'VPVR', 'AI_SIGNAL']);
  const [subIndicator1, setSubIndicator1] = useState<'VOL' | 'OI'>('VOL');
  const [subIndicator2, setSubIndicator2] = useState<'OBV' | 'MACD' | 'KDJ' | 'RSI'>('OBV');

  // Interactive Drawing State on SVG
  const [userDrawings, setUserDrawings] = useState<UserDrawing[]>([]);
  const [pendingStart, setPendingStart] = useState<{ x: number; y: number; price: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [customGroupModal, setCustomGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('22:01:36');

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
          now.getSeconds()
        ).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedInstrument = useMemo(
    () => instruments.find((i) => i.symbol === selectedSymbol) || instruments[0],
    [instruments, selectedSymbol]
  );

  // Sub-filter definitions matching AICoin Screenshot 1
  const subFilterOptions = useMemo(() => {
    if (primaryTab === 'favorites') {
      return [
        { id: 'default', zh: '默认', en: 'Default' },
        { id: 'hot', zh: '热门', en: 'Hot' },
        { id: 'btc_eco', zh: '比特币及生态', en: 'BTC & Eco' },
        ...customGroups.map((g) => ({ id: `custom_${g}`, zh: g, en: g })),
      ];
    }
    if (primaryTab === 'crypto') {
      return [
        { id: 'default', zh: '全部', en: 'All' },
        { id: 'perp', zh: '永续合约', en: 'Perpetual' },
        { id: 'spot', zh: '现货', en: 'Spot' },
        { id: 'ai', zh: 'AI板块', en: 'AI' },
        { id: 'meme', zh: 'Meme', en: 'Meme' },
        { id: 'l1', zh: 'Layer1/L2', en: 'L1/L2' },
      ];
    }
    return [
      { id: 'default', zh: '全部', en: 'All' },
      { id: 'hot', zh: '主力热门', en: 'Hot' },
      { id: 'high_vol', zh: '高波动', en: 'High Vol' },
    ];
  }, [primaryTab, customGroups]);

  // Filter & Sort Left Watchlist
  const watchlistItems = useMemo(() => {
    let list = instruments.filter((inst) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inst.symbol.toLowerCase().includes(q) ||
          inst.nameZh.toLowerCase().includes(q) ||
          inst.nameEn.toLowerCase().includes(q)
        );
      }
      if (primaryTab === 'favorites') {
        if (subFilter === 'btc_eco') {
          return ['BTC/USDT', 'SOL/USDT', 'ETH/USDT', 'DOGE/USDT'].includes(inst.symbol);
        }
        if (subFilter === 'hot') {
          return Math.abs(inst.changePercent24h) > 0.4;
        }
        return favorites.includes(inst.symbol);
      }
      if (primaryTab === 'crypto') {
        if (inst.category !== 'crypto') return false;
        if (subFilter === 'ai') return ['FET/USDT', 'RNDR/USDT', 'WLD/USDT', 'NEAR/USDT', 'TAO/USDT'].includes(inst.symbol);
        if (subFilter === 'meme') return ['DOGE/USDT', 'PEPE/USDT', 'SHIB/USDT', 'WIF/USDT', 'BONK/USDT'].includes(inst.symbol);
        if (subFilter === 'l1') return ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'SUI/USDT', 'AVAX/USDT', 'ARB/USDT', 'OP/USDT'].includes(inst.symbol);
        return true;
      }
      if (primaryTab === 'indices') return inst.category === 'indices';
      if (primaryTab === 'stocks') return inst.category === 'stocks';
      if (primaryTab === 'forex') return inst.category === 'forex';
      if (primaryTab === 'commodities') return inst.category === 'commodities';
      return true;
    });

    // Deterministic turnover calculation for sorting & display
    const getTurnoverNum = (s: string, p: number) => {
      if (s.startsWith('BTC')) return 96.16;
      if (s.startsWith('ETH')) return 31.9;
      if (s.startsWith('SOL')) return 12.66;
      if (s.startsWith('XAU')) return 42.8;
      if (s.startsWith('NVDA')) return 68.4;
      const hash = s.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      return Number(((hash % 25) + 1.2 + (p % 5)).toFixed(2));
    };

    list = [...list].sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sortField === 'turnover') {
        va = getTurnoverNum(a.symbol, a.price);
        vb = getTurnoverNum(b.symbol, b.price);
      } else if (sortField === 'price') {
        va = a.price;
        vb = b.price;
      } else {
        va = a.changePercent24h;
        vb = b.changePercent24h;
      }
      return sortAsc ? va - vb : vb - va;
    });

    return list;
  }, [instruments, primaryTab, subFilter, searchQuery, favorites, sortField, sortAsc]);

  const toggleFavorite = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(sym) ? prev.filter((item) => item !== sym) : [...prev, sym]
    );
  };

  // Base asset name for "相关币种" bottom panel
  const baseAssetCode = useMemo(() => {
    return selectedInstrument.symbol.split('/')[0];
  }, [selectedInstrument.symbol]);

  const relatedContracts = useMemo(() => {
    const p = selectedInstrument.price;
    const dec = selectedInstrument.decimals;
    const chg = selectedInstrument.changePercent24h;
    return [
      {
        title: `${baseAssetCode}/USDT`,
        tag: '永续',
        venue: 'Binance',
        vol: '$31.9亿',
        price: p.toFixed(dec),
        rmb: `¥${(p * 6.91).toFixed(dec > 2 ? 2 : 1)}`,
        chg: chg,
      },
      {
        title: `${baseAssetCode}/USDT`,
        tag: '现货',
        venue: 'Binance',
        vol: '$18.14亿',
        price: (p * 0.9998).toFixed(dec),
        rmb: `¥${(p * 6.91).toFixed(dec > 2 ? 2 : 1)}`,
        chg: Number((chg - 0.02).toFixed(2)),
      },
      {
        title: `${baseAssetCode}/USD`,
        tag: '币本位永续',
        venue: 'OKX',
        vol: '$6.42亿',
        price: (p * 1.0004).toFixed(dec),
        rmb: `¥${(p * 6.91).toFixed(dec > 2 ? 2 : 1)}`,
        chg: Number((chg + 0.04).toFixed(2)),
      },
      {
        title: `${baseAssetCode}/USDC`,
        tag: '永续',
        venue: 'Bybit',
        vol: '$4.18亿',
        price: (p * 0.9999).toFixed(dec),
        rmb: `¥${(p * 6.91).toFixed(dec > 2 ? 2 : 1)}`,
        chg: chg,
      },
      {
        title: `${baseAssetCode} 当季 1226`,
        tag: '交割',
        venue: 'Binance',
        vol: '$1.85亿',
        price: (p * 1.012).toFixed(dec),
        rmb: `¥${(p * 6.99).toFixed(dec > 2 ? 2 : 1)}`,
        chg: Number((chg + 0.15).toFixed(2)),
      },
    ];
  }, [baseAssetCode, selectedInstrument]);

  // Generate 68 realistic candles + OBV + MACD + RSI + KDJ for AICoin Chart
  const candles: CandlePoint[] = useMemo(() => {
    const count = 68;
    const tfMult =
      timeframe === '1m'
        ? 0.001
        : timeframe === '5m'
        ? 0.0018
        : timeframe === '15m'
        ? 0.0028
        : timeframe === '1H'
        ? 0.0045
        : timeframe === '4H'
        ? 0.008
        : 0.014;
    const stepVol = selectedInstrument.price * tfMult;

    let seed =
      selectedInstrument.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) +
      timeframe.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    let cursorClose = selectedInstrument.price;
    const raw: {
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      buyVol: number;
      sellVol: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const close = cursorClose;
      const delta = (rand() - 0.482) * stepVol;
      const open = close - delta;
      const high = Math.max(open, close) + rand() * stepVol * 0.78;
      const low = Math.min(open, close) - rand() * stepVol * 0.78;
      const vol = Math.floor(1500 + rand() * 8400);
      const buyRatio = close >= open ? 0.54 + rand() * 0.32 : 0.18 + rand() * 0.28;
      raw.unshift({
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

    let obvAcc = 23100000;
    let ema12 = raw[0].close;
    let ema26 = raw[0].close;
    let dea = 0;

    return raw.map((r, idx) => {
      obvAcc += r.close >= r.open ? r.volume * 12 : -r.volume * 11;
      ema12 = r.close * (2 / 13) + ema12 * (11 / 13);
      ema26 = r.close * (2 / 27) + ema26 * (25 / 27);
      const dif = ema12 - ema26;
      dea = dif * 0.2 + dea * 0.8;
      const hist = (dif - dea) * 2;

      const rsi = Math.min(88, Math.max(18, 50 + ((r.close - r.open) / stepVol) * 24));
      const kdjK = Math.min(92, Math.max(12, 52 + Math.sin(idx * 0.35) * 28));
      const kdjD = Math.min(88, Math.max(15, 50 + Math.sin(idx * 0.35 - 0.4) * 24));
      const kdjJ = 3 * kdjK - 2 * kdjD;

      const d = new Date(Date.now() - (count - 1 - idx) * 86400000);
      const timeStr =
        timeframe === '1D' || timeframe === '1W'
          ? `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : `${String((9 + Math.floor(idx / 4)) % 24).padStart(2, '0')}:${String((idx % 4) * 15).padStart(2, '0')}`;

      let aiSignal: 'BUY' | 'SELL' | null = null;
      if (idx === 16 || idx === 48) aiSignal = 'BUY';
      if (idx === 31 || idx === 57) aiSignal = 'SELL';

      return {
        ...r,
        time: timeStr,
        obv: obvAcc,
        macd: dif,
        signal: dea,
        hist,
        rsi,
        kdjK,
        kdjD,
        kdjJ,
        aiSignal,
      };
    });
  }, [selectedInstrument.symbol, selectedInstrument.price, timeframe]);

  // Chart Geometry & Scaling
  const chartWidth = 880;
  const mainChartH = 315;
  const sub1Top = 328;
  const sub1H = 68;
  const sub2Top = 408;
  const sub2H = 72;
  const totalSvgH = 500;
  const rightAxisWidth = 74;
  const plotWidth = chartWidth - rightAxisWidth;

  const { minPrice, maxPrice, maxVol, minObv, maxObv } = useMemo(() => {
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const vols = candles.map((c) => c.volume);
    const obvs = candles.map((c) => c.obv);
    return {
      minPrice: Math.min(...lows),
      maxPrice: Math.max(...highs),
      maxVol: Math.max(...vols, 1),
      minObv: Math.min(...obvs),
      maxObv: Math.max(...obvs),
    };
  }, [candles]);

  const priceRange = Math.max(maxPrice - minPrice, 0.000001);

  const priceToY = (p: number) => {
    const pad = 20;
    const usable = mainChartH - pad * 2;
    return pad + usable * (1 - (p - minPrice) / priceRange);
  };

  const yToPrice = (y: number) => {
    const pad = 20;
    const usable = mainChartH - pad * 2;
    const ratio = 1 - (y - pad) / usable;
    return minPrice + ratio * priceRange;
  };

  // Moving Averages & Bollinger Bands
  const { ma5Path, ma10Path, ma30Path, bollUpPath, bollLowPath } = useMemo(() => {
    const m5: string[] = [];
    const m10: string[] = [];
    const m30: string[] = [];
    const bUp: string[] = [];
    const bLow: string[] = [];

    candles.forEach((c, idx) => {
      const x = 12 + idx * ((plotWidth - 24) / candles.length);
      const slice5 = candles.slice(Math.max(0, idx - 4), idx + 1);
      const avg5 = slice5.reduce((s, k) => s + k.close, 0) / slice5.length;
      m5.push(`${x.toFixed(1)},${priceToY(avg5).toFixed(1)}`);

      const slice10 = candles.slice(Math.max(0, idx - 9), idx + 1);
      const avg10 = slice10.reduce((s, k) => s + k.close, 0) / slice10.length;
      m10.push(`${x.toFixed(1)},${priceToY(avg10).toFixed(1)}`);

      const slice20 = candles.slice(Math.max(0, idx - 19), idx + 1);
      const avg20 = slice20.reduce((s, k) => s + k.close, 0) / slice20.length;
      m30.push(`${x.toFixed(1)},${priceToY(avg20).toFixed(1)}`);

      const offset = priceRange * 0.13;
      bUp.push(`${x.toFixed(1)},${priceToY(avg20 + offset).toFixed(1)}`);
      bLow.push(`${x.toFixed(1)},${priceToY(avg20 - offset).toFixed(1)}`);
    });

    return {
      ma5Path: m5.join(' '),
      ma10Path: m10.join(' '),
      ma30Path: m30.join(' '),
      bollUpPath: bUp.join(' '),
      bollLowPath: bLow.join(' '),
    };
  }, [candles, minPrice, maxPrice]);

  // Volume Profile (VPVR) 14 horizontal price buckets on the right side of the chart
  const vpvrBuckets = useMemo(() => {
    const count = 14;
    const step = priceRange / count;
    return Array.from({ length: count }, (_, i) => {
      const bucketPrice = minPrice + step * (i + 0.5);
      const distFromMid = Math.abs(i - 6.5) / 7;
      const totalWidth = Math.max(18, Math.round((1 - distFromMid * 0.72) * 95));
      const buyW = Math.round(totalWidth * (i % 2 === 0 ? 0.58 : 0.44));
      return {
        y: priceToY(bucketPrice) - 5,
        totalWidth,
        buyW,
        isPoc: i === 6,
      };
    });
  }, [minPrice, priceRange]);

  const activeCandle =
    hoverIdx !== null && candles[hoverIdx] ? candles[hoverIdx] : candles[candles.length - 1];

  // AICoin Left Vertical Drawing Tools List
  const drawingTools: {
    id: DrawingToolType;
    icon: React.FC<{ className?: string }>;
    zh: string;
    en: string;
    color: string;
  }[] = [
    { id: 'crosshair', icon: Crosshair, zh: '十字光标', en: 'Crosshair', color: '#3b82f6' },
    { id: 'trendline', icon: TrendingUp, zh: '趋势线 (点击两点绘制)', en: 'Trendline (2-Click)', color: '#3b82f6' },
    { id: 'ray', icon: ArrowUpRight, zh: '射线 / 延长趋势线', en: 'Trend Ray', color: '#06b6d4' },
    { id: 'hline', icon: Sliders, zh: '水平支撑阻力线 (单击绘制)', en: 'Horizontal Line (1-Click)', color: '#f59e0b' },
    { id: 'channel', icon: GitBranch, zh: '平行通道 (点击两点绘制)', en: 'Parallel Channel', color: '#8b5cf6' },
    { id: 'fib', icon: Percent, zh: '斐波那契回撤 (点击高低点)', en: 'Fibonacci Retracement', color: '#eab308' },
    { id: 'gann', icon: Hash, zh: '江恩角度扇形 (Gann Fan)', en: 'Gann Fan', color: '#ec4899' },
    { id: 'rect', icon: Square, zh: '矩形筹码框选 (点击对角)', en: 'Rectangle Zone', color: '#6366f1' },
    { id: 'elliott', icon: Activity, zh: '艾略特五浪脉冲 (1-2-3-4-5)', en: 'Elliott Impulse Wave', color: '#14b8a6' },
    { id: 'harmonic', icon: Triangle, zh: 'XABCD 加特利谐波形态', en: 'XABCD Harmonic', color: '#a855f7' },
    { id: 'long_rr', icon: ArrowUpRight, zh: '多头盈亏比测算 (Long RR)', en: 'Long Position RR', color: '#10b981' },
    { id: 'short_rr', icon: ArrowDownRight, zh: '空头盈亏比测算 (Short RR)', en: 'Short Position RR', color: '#f43f5e' },
    { id: 'text', icon: Smile, zh: '文字策略批注 (单击添加)', en: 'Text Callout', color: '#f97316' },
    { id: 'measure', icon: Ruler, zh: '涨跌幅与K线周期测量尺', en: 'Price & Bar Ruler', color: '#0ea5e9' },
  ];

  // Mouse Move & Interactive Drawing on SVG Canvas
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = chartWidth / rect.width;
    const scaleY = totalSvgH / rect.height;
    let rawX = (e.clientX - rect.left) * scaleX;
    let rawY = (e.clientY - rect.top) * scaleY;

    const idx = Math.min(
      candles.length - 1,
      Math.max(0, Math.floor(((rawX - 12) / (plotWidth - 24)) * candles.length))
    );
    setHoverIdx(idx);

    // If Magnet Mode is enabled and cursor is in main chart area, snap Y to candle High/Low/Close
    if (magnetMode && rawY < mainChartH && candles[idx]) {
      const c = candles[idx];
      const yH = priceToY(c.high);
      const yL = priceToY(c.low);
      const yC = priceToY(c.close);
      if (Math.abs(rawY - yH) < 12) rawY = yH;
      else if (Math.abs(rawY - yL) < 12) rawY = yL;
      else if (Math.abs(rawY - yC) < 10) rawY = yC;
    }

    setMousePos({ x: rawX, y: rawY });
  };

  const handleSvgClick = () => {
    if (lockDrawings || activeTool === 'crosshair' || !mousePos) return;
    if (mousePos.y > mainChartH || mousePos.x > plotWidth) return;

    const clickedPrice = yToPrice(mousePos.y);
    const toolMeta = drawingTools.find((t) => t.id === activeTool);
    const color = toolMeta?.color || '#3b82f6';

    // Single-click tools: Horizontal Line or Text Callout
    if (activeTool === 'hline' || activeTool === 'text') {
      const newD: UserDrawing = {
        id: `draw-${Date.now()}`,
        type: activeTool,
        x1: 16,
        y1: mousePos.y,
        x2: plotWidth - 8,
        y2: mousePos.y,
        price1: clickedPrice,
        price2: clickedPrice,
        label:
          activeTool === 'text'
            ? `主力关键位 ${clickedPrice.toFixed(selectedInstrument.decimals)}`
            : undefined,
        color,
      };
      setUserDrawings((prev) => [...prev, newD]);
      onShowToast(
        lang === 'zh'
          ? `已在 ${clickedPrice.toFixed(selectedInstrument.decimals)} 处添加${toolMeta?.zh.split(' ')[0]}`
          : `Placed ${toolMeta?.en} at ${clickedPrice.toFixed(selectedInstrument.decimals)}`
      );
      return;
    }

    // Two-click interactive tools
    if (!pendingStart) {
      setPendingStart({ x: mousePos.x, y: mousePos.y, price: clickedPrice });
    } else {
      const newD: UserDrawing = {
        id: `draw-${Date.now()}`,
        type: activeTool,
        x1: pendingStart.x,
        y1: pendingStart.y,
        x2: mousePos.x,
        y2: mousePos.y,
        price1: pendingStart.price,
        price2: clickedPrice,
        color,
      };
      setUserDrawings((prev) => [...prev, newD]);
      setPendingStart(null);
      onShowToast(
        lang === 'zh'
          ? `已完成绘制：${toolMeta?.zh.split(' ')[0]}`
          : `Completed drawing: ${toolMeta?.en}`
      );
    }
  };

  // Helper to render any UserDrawing (either completed or live preview while dragging)
  const renderDrawingObject = (d: UserDrawing, isPreview = false) => {
    const dec = selectedInstrument.decimals;
    const opacity = isPreview ? 0.75 : 1;

    if (d.type === 'hline') {
      return (
        <g key={d.id} opacity={opacity}>
          <line
            x1={12}
            y1={d.y1}
            x2={plotWidth}
            y2={d.y1}
            stroke={d.color}
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <rect x={plotWidth - 95} y={d.y1 - 16} width="90" height="15" rx="3" fill={d.color} />
          <text x={plotWidth - 50} y={d.y1 - 5} textAnchor="middle" fill="#fff" className="text-[9px] font-mono font-bold">
            H-Line {d.price1.toFixed(dec)}
          </text>
        </g>
      );
    }

    if (d.type === 'text') {
      return (
        <g key={d.id} opacity={opacity}>
          <rect
            x={Math.min(d.x1, plotWidth - 140)}
            y={d.y1 - 22}
            width="135"
            height="20"
            rx="4"
            fill="#f97316"
          />
          <text
            x={Math.min(d.x1, plotWidth - 140) + 67}
            y={d.y1 - 9}
            textAnchor="middle"
            fill="#fff"
            className="text-[10px] font-bold"
          >
            📌 {d.label}
          </text>
        </g>
      );
    }

    if (d.type === 'fib') {
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const minX = Math.min(d.x1, d.x2);
      const maxX = Math.max(d.x1, d.x2, minX + 120);
      return (
        <g key={d.id} opacity={opacity}>
          <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#eab308" strokeWidth="1" strokeDasharray="3 3" />
          {levels.map((lv) => {
            const y = d.y1 + (d.y2 - d.y1) * lv;
            const p = d.price1 + (d.price2 - d.price1) * lv;
            return (
              <g key={lv}>
                <line x1={minX} y1={y} x2={maxX} y2={y} stroke="#eab308" strokeWidth="1" strokeOpacity="0.75" />
                <text x={maxX + 4} y={y + 3} fill="#eab308" className="text-[9px] font-mono font-semibold">
                  {lv.toFixed(3)} ({p.toFixed(dec)})
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    if (d.type === 'rect') {
      const rx = Math.min(d.x1, d.x2);
      const ry = Math.min(d.y1, d.y2);
      const rw = Math.max(8, Math.abs(d.x2 - d.x1));
      const rh = Math.max(8, Math.abs(d.y2 - d.y1));
      return (
        <g key={d.id} opacity={opacity}>
          <rect
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            fill="#6366f1"
            fillOpacity="0.16"
            stroke="#6366f1"
            strokeWidth="1.5"
          />
          <text x={rx + 6} y={ry + 12} fill="#818cf8" className="text-[9px] font-mono font-bold">
            筹码密集成交区 ({d.price1.toFixed(dec)} ~ {d.price2.toFixed(dec)})
          </text>
        </g>
      );
    }

    if (d.type === 'channel') {
      const dy = 28;
      return (
        <g key={d.id} opacity={opacity}>
          <polygon
            points={`${d.x1},${d.y1} ${d.x2},${d.y2} ${d.x2},${d.y2 + dy} ${d.x1},${d.y1 + dy}`}
            fill="#8b5cf6"
            fillOpacity="0.12"
          />
          <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#8b5cf6" strokeWidth="1.8" />
          <line x1={d.x1} y1={d.y1 + dy} x2={d.x2} y2={d.y2 + dy} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" />
        </g>
      );
    }

    if (d.type === 'long_rr' || d.type === 'short_rr') {
      const isLong = d.type === 'long_rr';
      const rx = Math.min(d.x1, d.x2);
      const rw = Math.max(85, Math.abs(d.x2 - d.x1));
      const entryY = d.y1;
      const targetY = d.y2;
      const stopY = isLong ? Math.min(mainChartH - 10, entryY + Math.abs(entryY - targetY) * 0.45) : Math.max(10, entryY - Math.abs(entryY - targetY) * 0.45);
      return (
        <g key={d.id} opacity={opacity}>
          <rect
            x={rx}
            y={Math.min(entryY, targetY)}
            width={rw}
            height={Math.max(6, Math.abs(targetY - entryY))}
            fill="#10b981"
            fillOpacity="0.2"
            stroke="#10b981"
            strokeWidth="1"
          />
          <rect
            x={rx}
            y={Math.min(entryY, stopY)}
            width={rw}
            height={Math.max(6, Math.abs(stopY - entryY))}
            fill="#f43f5e"
            fillOpacity="0.2"
            stroke="#f43f5e"
            strokeWidth="1"
          />
          <line x1={rx} y1={entryY} x2={rx + rw} y2={entryY} stroke="#ffffff" strokeWidth="1.5" />
          <text x={rx + 6} y={entryY - 4} fill="#10b981" className="text-[9px] font-mono font-bold">
            {isLong ? 'LONG 盈亏比 2.25:1' : 'SHORT 盈亏比 2.25:1'}
          </text>
        </g>
      );
    }

    if (d.type === 'measure') {
      const pct = (((d.price2 - d.price1) / d.price1) * 100).toFixed(2);
      const rx = Math.min(d.x1, d.x2);
      const ry = Math.min(d.y1, d.y2);
      const rw = Math.max(12, Math.abs(d.x2 - d.x1));
      const rh = Math.max(12, Math.abs(d.y2 - d.y1));
      return (
        <g key={d.id} opacity={opacity}>
          <rect x={rx} y={ry} width={rw} height={rh} fill="#0ea5e9" fillOpacity="0.18" stroke="#0ea5e9" strokeWidth="1.2" strokeDasharray="3 3" />
          <rect x={rx + rw / 2 - 52} y={ry + rh / 2 - 10} width="104" height="20" rx="4" fill="#0ea5e9" />
          <text x={rx + rw / 2} y={ry + rh / 2 + 3} textAnchor="middle" fill="#fff" className="text-[9px] font-mono font-bold">
            {Number(pct) >= 0 ? `+${pct}%` : `${pct}%`} ({(d.price2 - d.price1).toFixed(dec)})
          </text>
        </g>
      );
    }

    if (d.type === 'gann') {
      return (
        <g key={d.id} opacity={opacity}>
          {[0.4, 0.7, 1, 1.35, 1.8].map((mult, i) => (
            <line
              key={i}
              x1={d.x1}
              y1={d.y1}
              x2={d.x2}
              y2={d.y1 + (d.y2 - d.y1) * mult}
              stroke="#ec4899"
              strokeWidth={mult === 1 ? '1.8' : '1'}
              strokeDasharray={mult === 1 ? undefined : '3 3'}
            />
          ))}
          <circle cx={d.x1} cy={d.y1} r="3.5" fill="#ec4899" />
        </g>
      );
    }

    if (d.type === 'elliott' || d.type === 'harmonic') {
      const dx = (d.x2 - d.x1) / 4;
      const dy = d.y2 - d.y1;
      const p0 = `${d.x1},${d.y1}`;
      const p1 = `${d.x1 + dx},${d.y1 + dy * 0.45}`;
      const p2 = `${d.x1 + dx * 2},${d.y1 + dy * 0.15}`;
      const p3 = `${d.x1 + dx * 3},${d.y1 + dy * 0.85}`;
      const p4 = `${d.x1 + dx * 3.5},${d.y1 + dy * 0.52}`;
      const p5 = `${d.x2},${d.y2}`;
      return (
        <g key={d.id} opacity={opacity}>
          <polyline
            fill="none"
            stroke={d.color}
            strokeWidth="2"
            points={`${p0} ${p1} ${p2} ${p3} ${p4} ${p5}`}
          />
          {[
            { x: d.x1, y: d.y1, t: '(0)' },
            { x: d.x1 + dx, y: d.y1 + dy * 0.45, t: '(1)' },
            { x: d.x1 + dx * 2, y: d.y1 + dy * 0.15, t: '(2)' },
            { x: d.x1 + dx * 3, y: d.y1 + dy * 0.85, t: '(3)' },
            { x: d.x1 + dx * 3.5, y: d.y1 + dy * 0.52, t: '(4)' },
            { x: d.x2, y: d.y2, t: '(5)' },
          ].map((pt, i) => (
            <text key={i} x={pt.x} y={pt.y - 6} fill={d.color} className="text-[9px] font-mono font-bold">
              {pt.t}
            </text>
          ))}
        </g>
      );
    }

    // Default: Trendline or Ray
    const endX = d.type === 'ray' ? plotWidth : d.x2;
    const slope = d.x2 !== d.x1 ? (d.y2 - d.y1) / (d.x2 - d.x1) : 0;
    const endY = d.type === 'ray' ? d.y1 + slope * (plotWidth - d.x1) : d.y2;

    return (
      <g key={d.id} opacity={opacity}>
        <line x1={d.x1} y1={d.y1} x2={endX} y2={endY} stroke={d.color} strokeWidth="2" />
        <circle cx={d.x1} cy={d.y1} r="3.5" fill="#fff" stroke={d.color} strokeWidth="2" />
        <circle cx={d.x2} cy={d.y2} r="3.5" fill="#fff" stroke={d.color} strokeWidth="2" />
      </g>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 select-none overflow-hidden">
      {/* MAIN 3-COLUMN AICOIN TERMINAL WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-5.5rem)] lg:h-[calc(100vh-5.5rem)] overflow-y-auto lg:overflow-hidden">
        {/* ============================================================
            COLUMN 1: LEFT AICOIN WATCHLIST & RELATED INSTRUMENTS
           ============================================================ */}
        <aside className="w-full lg:w-[310px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F131C] flex flex-col max-h-[420px] lg:max-h-none">
          {/* Search Input + Quick Bell */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'zh' ? '搜索币种、股票、指数、外汇...' : 'Search symbol, pair...'}
                className="w-full pl-8 pr-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() =>
                onShowToast(
                  lang === 'zh' ? '已开启全市场异动雷达推送' : 'Market anomaly radar alerts enabled'
                )
              }
              className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 cursor-pointer shrink-0"
              title="异动提醒"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary Market Category Tabs — '平台' removed per user instruction */}
          <div className="flex items-center gap-3.5 px-3 border-b border-slate-200 dark:border-slate-800 text-xs font-medium overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'favorites', zh: '自选', en: 'Favs' },
              { id: 'crypto', zh: '加密货币', en: 'Crypto' },
              { id: 'indices', zh: '指数', en: 'Indices' },
              { id: 'stocks', zh: '股票', en: 'Stocks' },
              { id: 'forex', zh: '外汇', en: 'Forex' },
              { id: 'commodities', zh: '大宗商品', en: 'Commodities' },
            ].map((t) => {
              const active = primaryTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setPrimaryTab(t.id as PrimaryMarketTab);
                    setSubFilter('default');
                  }}
                  className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {lang === 'zh' ? t.zh : t.en}
                </button>
              );
            })}
          </div>

          {/* Secondary Sub-Category Pills (默认 | 热门 | 比特币及生态 | +新建分组) */}
          <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {subFilterOptions.map((sf) => {
              const active = subFilter === sf.id;
              return (
                <button
                  key={sf.id}
                  onClick={() => setSubFilter(sf.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {lang === 'zh' ? sf.zh : sf.en}
                </button>
              );
            })}
            {primaryTab === 'favorites' && (
              <button
                onClick={() => setCustomGroupModal(true)}
                className="px-1.5 py-0.5 rounded text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-0.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'zh' ? '分组' : 'Group'}</span>
              </button>
            )}
          </div>

          {/* Sortable Column Headers: 币种/成交额 | 最新价($) | 涨跌幅 */}
          <div className="grid grid-cols-12 px-3 py-1.5 text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-800/70 shrink-0">
            <button
              onClick={() => {
                if (sortField === 'turnover') setSortAsc(!sortAsc);
                else {
                  setSortField('turnover');
                  setSortAsc(false);
                }
              }}
              className="col-span-5 text-left flex items-center gap-0.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <span>{lang === 'zh' ? '币种/成交额' : 'Asset/Vol'}</span>
              <span className="text-[9px]">{sortField === 'turnover' ? (sortAsc ? '▲' : '▼') : '↕'}</span>
            </button>
            <button
              onClick={() => {
                if (sortField === 'price') setSortAsc(!sortAsc);
                else {
                  setSortField('price');
                  setSortAsc(false);
                }
              }}
              className="col-span-4 text-right flex items-center justify-end gap-0.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <span>{lang === 'zh' ? '最新价($)' : 'Last($)'}</span>
              <span className="text-[9px]">{sortField === 'price' ? (sortAsc ? '▲' : '▼') : '↕'}</span>
            </button>
            <button
              onClick={() => {
                if (sortField === 'change') setSortAsc(!sortAsc);
                else {
                  setSortField('change');
                  setSortAsc(false);
                }
              }}
              className="col-span-3 text-right flex items-center justify-end gap-0.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <span>{lang === 'zh' ? '涨跌幅' : '24h%'}</span>
              <span className="text-[9px]">{sortField === 'change' ? (sortAsc ? '▲' : '▼') : '↕'}</span>
            </button>
          </div>

          {/* Main Watchlist Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {watchlistItems.map((item) => {
              const isSelected = item.symbol === selectedSymbol;
              const isUp = item.changePercent24h >= 0;
              const isFav = favorites.includes(item.symbol);
              const volNum =
                item.symbol.startsWith('BTC')
                  ? '96.16亿'
                  : item.symbol.startsWith('ETH')
                  ? '31.9亿'
                  : item.symbol.startsWith('SOL')
                  ? '12.66亿'
                  : item.symbol.startsWith('XAU')
                  ? '42.8亿'
                  : `${((item.price * 13) % 18 + 1.4).toFixed(2)}亿`;
              const rmbStr =
                item.price >= 1500
                  ? `¥${((item.price * 6.91) / 10000).toFixed(2)}万`
                  : `¥${(item.price * 6.91).toFixed(item.decimals > 2 ? 2 : 2)}`;

              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`grid grid-cols-12 items-center px-2.5 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={(e) => toggleFavorite(item.symbol, e)}
                      className={`shrink-0 cursor-pointer ${
                        isFav ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700 hover:text-amber-400'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <AssetLogo
                      symbol={item.symbol}
                      category={item.category}
                      logoUrl={item.logoUrl}
                      baseFlag={item.baseFlag}
                      quoteFlag={item.quoteFlag}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.symbol}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-mono shrink-0">
                          {item.category === 'crypto' ? '永续' : `${item.leverage}x`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {lang === 'zh' ? item.nameZh : item.nameEn} · ${volNum}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 text-right font-mono pr-1">
                    <div
                      className={`text-xs font-bold tabular-nums ${
                        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.price.toLocaleString('en-US', {
                        minimumFractionDigits: item.decimals,
                        maximumFractionDigits: item.decimals,
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400 tabular-nums">{rmbStr}</div>
                  </div>

                  <div className="col-span-3 flex justify-end">
                    <span
                      className={`px-1.5 py-1 rounded text-[11px] font-mono font-bold text-white tabular-nums min-w-[56px] text-center ${
                        isUp ? 'bg-emerald-500' : 'bg-rose-500'
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

          {/* Bottom Sub-Panel: 相关币种 (Related Instruments & Contracts for Selected Symbol) */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] shrink-0">
            <button
              onClick={() => setRelatedExpanded(!relatedExpanded)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer"
            >
              <span>
                {lang === 'zh' ? `相关币种 ${baseAssetCode}` : `Related ${baseAssetCode} Markets`}
              </span>
              {relatedExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {relatedExpanded && (
              <div className="max-h-[165px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 border-t border-slate-200/70 dark:border-slate-800">
                {relatedContracts.map((rc, idx) => {
                  const isUp = rc.chg >= 0;
                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        onShowToast(
                          lang === 'zh'
                            ? `已切换行情源至 ${rc.venue} · ${rc.title} (${rc.tag})`
                            : `Switched feed to ${rc.venue} ${rc.title}`
                        )
                      }
                      className="grid grid-cols-12 items-center px-3 py-1.5 text-[11px] hover:bg-white dark:hover:bg-slate-800/50 cursor-pointer"
                    >
                      <div className="col-span-6 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {rc.title}
                          </span>
                          <span className="px-1 rounded bg-slate-200 dark:bg-slate-800 text-[9px] text-slate-600 dark:text-slate-400 shrink-0">
                            {rc.tag}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {rc.venue} · {rc.vol}
                        </div>
                      </div>
                      <div className="col-span-3 text-right font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{rc.price}</div>
                        <div className="text-[9px] text-slate-400">{rc.rmb}</div>
                      </div>
                      <div className="col-span-3 text-right font-mono font-bold">
                        <span className={isUp ? 'text-emerald-500' : 'text-rose-500'}>
                          {isUp ? '+' : ''}
                          {rc.chg}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ============================================================
            COLUMN 2: CENTER AICOIN CHARTING & DRAWING WORKBENCH
           ============================================================ */}
        <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0B0E14] overflow-hidden">
          {/* Top Ticker Header Bar */}
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0F131C] shrink-0">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <AssetLogo
                  symbol={selectedInstrument.symbol}
                  category={selectedInstrument.category}
                  logoUrl={selectedInstrument.logoUrl}
                  baseFlag={selectedInstrument.baseFlag}
                  quoteFlag={selectedInstrument.quoteFlag}
                  size="sm"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedInstrument.symbol}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                      {selectedInstrument.category === 'crypto' ? '永续 · 指数' : `${selectedInstrument.leverage}x`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'zh' ? selectedInstrument.nameZh : selectedInstrument.nameEn}
                  </div>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className={`text-lg sm:text-xl font-mono font-extrabold tabular-nums ${
                    selectedInstrument.changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {selectedInstrument.price.toLocaleString('en-US', {
                    minimumFractionDigits: selectedInstrument.decimals,
                    maximumFractionDigits: selectedInstrument.decimals,
                  })}
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    selectedInstrument.changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {selectedInstrument.changePercent24h >= 0 ? '+' : ''}
                  {selectedInstrument.changePercent24h.toFixed(2)}%
                </span>
              </div>

              <div className="hidden xl:flex items-center gap-4 text-[11px] border-l border-slate-200 dark:border-slate-800 pl-4">
                <div>
                  <div className="text-slate-400">{lang === 'zh' ? '24H最高' : '24H High'}</div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedInstrument.high24h.toFixed(selectedInstrument.decimals)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">{lang === 'zh' ? '24H最低' : '24H Low'}</div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedInstrument.low24h.toFixed(selectedInstrument.decimals)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">{lang === 'zh' ? '24H成交额' : '24H Turnover'}</div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">$21.41亿</div>
                </div>
                <div>
                  <div className="text-slate-400">{lang === 'zh' ? '资金费率' : 'Funding'}</div>
                  <div className="font-mono font-semibold text-emerald-500">+0.0085%</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenAiModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? 'AI 画线解读' : 'AI Chart Analysis'}</span>
              </button>
            </div>
          </div>

          {/* Second Row: AICoin Timeframe Strip + Drawing Controls + Multi-Chart Layout Switcher */}
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#0D111A] text-xs shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: '1m', zh: '1分', en: '1m' },
                { id: '5m', zh: '5分', en: '5m' },
                { id: '15m', zh: '15分', en: '15m' },
                { id: '30m', zh: '30分', en: '30m' },
                { id: '1H', zh: '1时', en: '1H' },
                { id: '4H', zh: '4时', en: '4H' },
                { id: '1D', zh: '1日', en: '1D' },
                { id: '1W', zh: '1周', en: '1W' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    timeframe === tf.id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {lang === 'zh' ? tf.zh : tf.en}
                </button>
              ))}

              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              {/* Quick Indicator Toggles in Top Bar */}
              {[
                { id: 'MA', label: 'MA均线' },
                { id: 'BOLL', label: 'BOLL布林' },
                { id: 'VPVR', label: '筹码分布VPVR' },
                { id: 'AI_SIGNAL', label: 'PRO主力信号' },
              ].map((ind) => {
                const on = mainIndicators.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    onClick={() =>
                      setMainIndicators((prev) =>
                        prev.includes(ind.id) ? prev.filter((x) => x !== ind.id) : [...prev, ind.id]
                      )
                    }
                    className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                      on
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30'
                        : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    {ind.label}
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Undo / Clear Drawings + Multi-screen Split View */}
            <div className="flex items-center gap-1.5 shrink-0">
              {userDrawings.length > 0 && (
                <button
                  onClick={() => setUserDrawings((prev) => prev.slice(0, -1))}
                  className="px-2 py-1 rounded bg-slate-200/70 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                  title="撤销上一步画线"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>{lang === 'zh' ? `撤销(${userDrawings.length})` : 'Undo'}</span>
                </button>
              )}

              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg">
                {[
                  { id: '1x1', label: '单图', icon: Maximize2 },
                  { id: '2x1', label: '双图', icon: Columns },
                  { id: '2x2', label: '四图', icon: LayoutGrid },
                ].map((ly) => {
                  const Icon = ly.icon;
                  return (
                    <button
                      key={ly.id}
                      onClick={() => setChartLayout(ly.id as typeof chartLayout)}
                      className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 cursor-pointer ${
                        chartLayout === ly.id
                          ? 'bg-white dark:bg-[#161C28] text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{ly.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Body: Left Vertical Drawing Toolbar + Main Interactive K-Line Canvas */}
          <div className="flex-1 flex min-h-[460px] overflow-hidden relative">
            {/* LEFT VERTICAL AICOIN DRAWING TOOLBAR */}
            <div className="w-11 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col items-center py-2 gap-1 overflow-y-auto no-scrollbar z-10">
              {drawingTools.map((tool) => {
                const Icon = tool.icon;
                const active = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setPendingStart(null);
                    }}
                    title={lang === 'zh' ? tool.zh : tool.en}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}

              <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

              {/* Magnet Mode */}
              <button
                onClick={() => setMagnetMode(!magnetMode)}
                title={lang === 'zh' ? '弱磁吸/强磁吸自动吸附K线高低点' : 'Magnet Snap to OHLC'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${
                  magnetMode
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Magnet className="w-4 h-4" />
              </button>

              {/* Lock Drawings */}
              <button
                onClick={() => setLockDrawings(!lockDrawings)}
                title={lang === 'zh' ? '锁定所有画线' : 'Lock All Drawings'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${
                  lockDrawings
                    ? 'bg-rose-500/15 text-rose-500'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Lock className="w-4 h-4" />
              </button>

              {/* Show / Hide Drawings */}
              <button
                onClick={() => setShowDrawings(!showDrawings)}
                title={lang === 'zh' ? '显示/隐藏画线图层' : 'Toggle Drawings Visibility'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${
                  !showDrawings
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {showDrawings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Clear All Drawings */}
              <button
                onClick={() => {
                  setUserDrawings([]);
                  setPendingStart(null);
                  onShowToast(lang === 'zh' ? '已清空画布上所有自绘线条' : 'Cleared all custom drawings');
                }}
                title={lang === 'zh' ? '清空全部自绘线' : 'Clear All Drawings'}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* CHART CANVAS AREA (Supports 1x1 Full Interactive Canvas, or 2x1 / 2x2 Multi-Chart Split) */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#0B0E14] relative overflow-hidden">
              {/* Active Drawing Instruction Floating Banner */}
              {activeTool !== 'crosshair' && (
                <div className="absolute top-9 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/95 text-white text-xs font-semibold shadow-md">
                  <span>
                    {pendingStart
                      ? lang === 'zh'
                        ? '请移动鼠标并在K线图上点击第二个锚点完成绘制'
                        : 'Click second point on chart to finish drawing'
                      : lang === 'zh'
                      ? `当前工具：${drawingTools.find((t) => t.id === activeTool)?.zh} — 直接在K线画布点击即可画线`
                      : `Active Tool: ${drawingTools.find((t) => t.id === activeTool)?.en} — Click on canvas to draw`}
                  </span>
                  <button
                    onClick={() => {
                      setActiveTool('crosshair');
                      setPendingStart(null);
                    }}
                    className="px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] cursor-pointer"
                  >
                    {lang === 'zh' ? '退出画线' : 'Exit'}
                  </button>
                </div>
              )}

              {/* OHLC + MA Legend Overlay at Top-Left of Canvas */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono bg-white/90 dark:bg-[#0B0E14]/90 z-10">
                <span className="font-sans font-bold text-slate-700 dark:text-slate-300">
                  {selectedInstrument.symbol} · {timeframe}
                </span>
                <span>
                  O <strong className="text-slate-900 dark:text-white">{activeCandle.open.toFixed(selectedInstrument.decimals)}</strong>
                </span>
                <span>
                  H <strong className="text-emerald-500">{activeCandle.high.toFixed(selectedInstrument.decimals)}</strong>
                </span>
                <span>
                  L <strong className="text-rose-500">{activeCandle.low.toFixed(selectedInstrument.decimals)}</strong>
                </span>
                <span>
                  C <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-500' : 'text-rose-500'}>{activeCandle.close.toFixed(selectedInstrument.decimals)}</strong>
                </span>
                {mainIndicators.includes('MA') && (
                  <>
                    <span className="text-amber-500">MA5: {(activeCandle.close * 0.998).toFixed(selectedInstrument.decimals)}</span>
                    <span className="text-blue-500">MA10: {(activeCandle.close * 0.994).toFixed(selectedInstrument.decimals)}</span>
                    <span className="text-purple-500">MA30: {(activeCandle.close * 0.986).toFixed(selectedInstrument.decimals)}</span>
                  </>
                )}
              </div>

              {chartLayout === '1x1' ? (
                <div className="flex-1 w-full h-full relative">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${chartWidth} ${totalSvgH}`}
                    preserveAspectRatio="none"
                    onMouseMove={handleSvgMouseMove}
                    onMouseLeave={() => {
                      setHoverIdx(null);
                      setMousePos(null);
                    }}
                    onClick={handleSvgClick}
                    className={`w-full h-full block ${
                      activeTool === 'crosshair' ? 'cursor-crosshair' : 'cursor-pointer'
                    }`}
                  >
                    {/* Horizontal & Vertical Grid Lines */}
                    {[0.15, 0.35, 0.55, 0.75, 0.92].map((ratio, i) => {
                      const y = mainChartH * ratio;
                      const pVal = yToPrice(y);
                      return (
                        <g key={i}>
                          <line
                            x1={0}
                            y1={y}
                            x2={plotWidth}
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-100 dark:text-slate-800/70"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={plotWidth + 6}
                            y={y + 3}
                            fill="currentColor"
                            className="text-[10px] font-mono text-slate-400"
                          >
                            {pVal.toFixed(selectedInstrument.decimals)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Right Price Axis Divider */}
                    <line
                      x1={plotWidth}
                      y1={0}
                      x2={plotWidth}
                      y2={totalSvgH}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                    />

                    {/* Volume Profile (VPVR) Horizontal Histogram on Right Side */}
                    {mainIndicators.includes('VPVR') &&
                      vpvrBuckets.map((b, i) => (
                        <g key={`vpvr-${i}`} opacity={0.42}>
                          <rect
                            x={plotWidth - b.totalWidth}
                            y={b.y}
                            width={b.totalWidth}
                            height={9}
                            fill="#f43f5e"
                            rx="1"
                          />
                          <rect
                            x={plotWidth - b.buyW}
                            y={b.y}
                            width={b.buyW}
                            height={9}
                            fill="#10b981"
                            rx="1"
                          />
                          {b.isPoc && (
                            <line
                              x1={12}
                              y1={b.y + 4.5}
                              x2={plotWidth}
                              y2={b.y + 4.5}
                              stroke="#eab308"
                              strokeWidth="1.2"
                              strokeDasharray="4 4"
                            />
                          )}
                        </g>
                      ))}

                    {/* Bollinger Bands */}
                    {mainIndicators.includes('BOLL') && (
                      <g opacity={0.65}>
                        <polyline fill="none" stroke="#8b5cf6" strokeWidth="1.1" points={bollUpPath} />
                        <polyline fill="none" stroke="#8b5cf6" strokeWidth="1.1" points={bollLowPath} />
                      </g>
                    )}

                    {/* Moving Averages MA5 / MA10 / MA30 */}
                    {mainIndicators.includes('MA') && (
                      <g>
                        <polyline fill="none" stroke="#f59e0b" strokeWidth="1.4" points={ma5Path} />
                        <polyline fill="none" stroke="#3b82f6" strokeWidth="1.4" points={ma10Path} />
                        <polyline fill="none" stroke="#a855f7" strokeWidth="1.4" points={ma30Path} />
                      </g>
                    )}

                    {/* Candlesticks + AI BUY/SELL Signals */}
                    {candles.map((c, idx) => {
                      const x = 12 + idx * ((plotWidth - 24) / candles.length);
                      const isUp = c.close >= c.open;
                      const color = isUp ? '#10b981' : '#f43f5e';
                      const yHigh = priceToY(c.high);
                      const yLow = priceToY(c.low);
                      const yOpen = priceToY(c.open);
                      const yClose = priceToY(c.close);
                      const bodyTop = Math.min(yOpen, yClose);
                      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
                      const candleW = Math.max(4, ((plotWidth - 24) / candles.length) * 0.68);

                      return (
                        <g key={idx}>
                          <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                          <rect
                            x={x - candleW / 2}
                            y={bodyTop}
                            width={candleW}
                            height={bodyH}
                            fill={color}
                            rx="0.5"
                          />
                          {mainIndicators.includes('AI_SIGNAL') && c.aiSignal === 'BUY' && (
                            <g>
                              <rect x={x - 16} y={yLow + 5} width="32" height="14" rx="3" fill="#10b981" />
                              <text
                                x={x}
                                y={yLow + 14}
                                textAnchor="middle"
                                fill="#fff"
                                className="text-[8px] font-bold"
                              >
                                AI多
                              </text>
                            </g>
                          )}
                          {mainIndicators.includes('AI_SIGNAL') && c.aiSignal === 'SELL' && (
                            <g>
                              <rect x={x - 16} y={yHigh - 19} width="32" height="14" rx="3" fill="#f43f5e" />
                              <text
                                x={x}
                                y={yHigh - 9}
                                textAnchor="middle"
                                fill="#fff"
                                className="text-[8px] font-bold"
                              >
                                AI空
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Current Live Price Horizontal Dashed Line & Tag */}
                    {(() => {
                      const curY = priceToY(selectedInstrument.price);
                      const isUp = selectedInstrument.changePercent24h >= 0;
                      const col = isUp ? '#10b981' : '#f43f5e';
                      return (
                        <g>
                          <line
                            x1={0}
                            y1={curY}
                            x2={plotWidth}
                            y2={curY}
                            stroke={col}
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                          />
                          <rect x={plotWidth + 2} y={curY - 9} width={rightAxisWidth - 4} height="18" rx="3" fill={col} />
                          <text
                            x={plotWidth + rightAxisWidth / 2}
                            y={curY + 3}
                            textAnchor="middle"
                            fill="#fff"
                            className="text-[10px] font-mono font-bold"
                          >
                            {selectedInstrument.price.toFixed(selectedInstrument.decimals)}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Pre-loaded Institutional Reference Channel + All User Custom Drawings */}
                    {showDrawings && (
                      <g>
                        {/* Default AICoin Institutional Support/Resistance Annotation */}
                        <line
                          x1={80}
                          y1={priceToY(minPrice + priceRange * 0.22)}
                          x2={plotWidth - 20}
                          y2={priceToY(minPrice + priceRange * 0.28)}
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                          strokeDasharray="5 3"
                        />
                        <text
                          x={90}
                          y={priceToY(minPrice + priceRange * 0.22) - 5}
                          fill="#3b82f6"
                          className="text-[9px] font-mono font-bold"
                        >
                          主力趋势支撑线
                        </text>

                        {userDrawings.map((d) => renderDrawingObject(d))}

                        {/* Live Preview while moving mouse after first click */}
                        {pendingStart &&
                          mousePos &&
                          renderDrawingObject(
                            {
                              id: 'preview',
                              type: activeTool,
                              x1: pendingStart.x,
                              y1: pendingStart.y,
                              x2: mousePos.x,
                              y2: mousePos.y,
                              price1: pendingStart.price,
                              price2: yToPrice(mousePos.y),
                              color: drawingTools.find((t) => t.id === activeTool)?.color || '#3b82f6',
                            },
                            true
                          )}
                      </g>
                    )}

                    {/* SUB-PANE 1 DIVIDER & VOLUME BARS (matching AICoin Screenshot 1) */}
                    <line
                      x1={0}
                      y1={sub1Top - 6}
                      x2={chartWidth}
                      y2={sub1Top - 6}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                    />
                    <text
                      x={10}
                      y={sub1Top + 8}
                      fill="currentColor"
                      className="text-[10px] font-mono font-bold text-slate-500"
                    >
                      {subIndicator1 === 'VOL'
                        ? `VOL(5,10) 成交量: ${activeCandle.volume.toLocaleString()}   MA5: ${Math.round(
                            activeCandle.volume * 0.94
                          )}   MA10: ${Math.round(activeCandle.volume * 0.89)}`
                        : `OI 合约持仓量: $46.99亿 (+2.14%)`}
                    </text>

                    {candles.map((c, idx) => {
                      const x = 12 + idx * ((plotWidth - 24) / candles.length);
                      const isUp = c.close >= c.open;
                      const barH = Math.max(2, (c.volume / maxVol) * (sub1H - 18));
                      const barW = Math.max(3.5, ((plotWidth - 24) / candles.length) * 0.65);
                      return (
                        <rect
                          key={`vol-${idx}`}
                          x={x - barW / 2}
                          y={sub1Top + sub1H - barH}
                          width={barW}
                          height={barH}
                          fill={isUp ? '#10b981' : '#f43f5e'}
                          opacity={0.78}
                        />
                      );
                    })}

                    {/* SUB-PANE 2 DIVIDER & OBV / MACD / KDJ / RSI */}
                    <line
                      x1={0}
                      y1={sub2Top - 6}
                      x2={chartWidth}
                      y2={sub2Top - 6}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                    />
                    <text
                      x={10}
                      y={sub2Top + 8}
                      fill="currentColor"
                      className="text-[10px] font-mono font-bold text-amber-500"
                    >
                      {subIndicator2 === 'OBV' &&
                        `OBV(30) 能量潮: ${(activeCandle.obv / 1000000).toFixed(2)}M`}
                      {subIndicator2 === 'MACD' &&
                        `MACD(12,26,9) DIF: ${activeCandle.macd.toFixed(2)}  DEA: ${activeCandle.signal.toFixed(
                          2
                        )}  HIST: ${activeCandle.hist.toFixed(2)}`}
                      {subIndicator2 === 'KDJ' &&
                        `KDJ(9,3,3) K: ${activeCandle.kdjK.toFixed(1)}  D: ${activeCandle.kdjD.toFixed(
                          1
                        )}  J: ${activeCandle.kdjJ.toFixed(1)}`}
                      {subIndicator2 === 'RSI' && `RSI(14) 相对强弱: ${activeCandle.rsi.toFixed(1)}`}
                    </text>

                    {subIndicator2 === 'OBV' && (
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        points={candles
                          .map((c, idx) => {
                            const x = 12 + idx * ((plotWidth - 24) / candles.length);
                            const y =
                              sub2Top +
                              14 +
                              (sub2H - 20) * (1 - (c.obv - minObv) / Math.max(1, maxObv - minObv));
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ')}
                      />
                    )}

                    {subIndicator2 === 'MACD' &&
                      candles.map((c, idx) => {
                        const x = 12 + idx * ((plotWidth - 24) / candles.length);
                        const midY = sub2Top + sub2H / 2 + 4;
                        const h = Math.min(24, Math.max(2, Math.abs(c.hist) * 3));
                        return (
                          <rect
                            key={`macd-${idx}`}
                            x={x - 2}
                            y={c.hist >= 0 ? midY - h : midY}
                            width={4}
                            height={h}
                            fill={c.hist >= 0 ? '#10b981' : '#f43f5e'}
                          />
                        );
                      })}

                    {(subIndicator2 === 'KDJ' || subIndicator2 === 'RSI') && (
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        points={candles
                          .map((c, idx) => {
                            const x = 12 + idx * ((plotWidth - 24) / candles.length);
                            const val = subIndicator2 === 'RSI' ? c.rsi : c.kdjK;
                            const y = sub2Top + 14 + (sub2H - 20) * (1 - val / 100);
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ')}
                      />
                    )}

                    {/* Bottom X-Axis Timestamps */}
                    {candles.map((c, idx) => {
                      if (idx % 10 !== 0) return null;
                      const x = 12 + idx * ((plotWidth - 24) / candles.length);
                      return (
                        <text
                          key={`time-${idx}`}
                          x={x}
                          y={totalSvgH - 4}
                          textAnchor="middle"
                          fill="currentColor"
                          className="text-[9px] font-mono text-slate-400"
                        >
                          {c.time}
                        </text>
                      );
                    })}

                    {/* Interactive Crosshair & Price/Date Readout */}
                    {mousePos && mousePos.x <= plotWidth && (
                      <g>
                        <line
                          x1={mousePos.x}
                          y1={0}
                          x2={mousePos.x}
                          y2={totalSvgH - 16}
                          stroke="#64748b"
                          strokeWidth="0.9"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1={0}
                          y1={mousePos.y}
                          x2={plotWidth}
                          y2={mousePos.y}
                          stroke="#64748b"
                          strokeWidth="0.9"
                          strokeDasharray="3 3"
                        />
                        {mousePos.y <= mainChartH && (
                          <g>
                            <rect
                              x={plotWidth + 2}
                              y={mousePos.y - 9}
                              width={rightAxisWidth - 4}
                              height="18"
                              rx="3"
                              fill="#1e293b"
                            />
                            <text
                              x={plotWidth + rightAxisWidth / 2}
                              y={mousePos.y + 3}
                              textAnchor="middle"
                              fill="#fff"
                              className="text-[10px] font-mono font-bold"
                            >
                              {yToPrice(mousePos.y).toFixed(selectedInstrument.decimals)}
                            </text>
                          </g>
                        )}
                      </g>
                    )}
                  </svg>
                </div>
              ) : (
                /* MULTI-CHART SPLIT VIEW (2x1 or 2x2 like AICoin Pro Multi-Monitor) */
                <div
                  className={`flex-1 grid gap-1.5 p-1.5 bg-slate-100 dark:bg-[#080B10] ${
                    chartLayout === '2x1' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 md:grid-rows-2'
                  }`}
                >
                  {(chartLayout === '2x1'
                    ? ['BTC/USDT', 'ETH/USDT']
                    : ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XAU/USD']
                  ).map((sym) => {
                    const inst = instruments.find((i) => i.symbol === sym) || selectedInstrument;
                    const up = inst.changePercent24h >= 0;
                    return (
                      <div
                        key={sym}
                        onClick={() => onSelectSymbol(inst.symbol)}
                        className={`rounded-lg border p-3 flex flex-col justify-between bg-white dark:bg-[#0F131C] cursor-pointer ${
                          inst.symbol === selectedSymbol
                            ? 'border-blue-600 ring-1 ring-blue-600/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {inst.symbol}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {timeframe}
                            </span>
                          </div>
                          <div className={`text-xs font-mono font-bold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {inst.price.toFixed(inst.decimals)} ({up ? '+' : ''}
                            {inst.changePercent24h.toFixed(2)}%)
                          </div>
                        </div>

                        <svg viewBox="0 0 320 110" className="w-full h-28 my-2">
                          <polyline
                            fill="none"
                            stroke={up ? '#10b981' : '#f43f5e'}
                            strokeWidth="2"
                            points="5,80 40,68 75,74 110,50 145,56 180,35 215,42 250,24 285,30 315,14"
                          />
                        </svg>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>24H High: {inst.high24h.toFixed(inst.decimals)}</span>
                          <span>24H Low: {inst.low24h.toFixed(inst.decimals)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom AICoin Indicator & Timeframe Strip (1日 5日 1月 ... | MA BOLL VOL OBV MACD KDJ RSI | 对数 自动) */}
              <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {['1日', '5日', '1月', '3月', '6月', '年初至今', '1年', '全部'].map((rng) => (
                    <button
                      key={rng}
                      onClick={() =>
                        onShowToast(lang === 'zh' ? `已切换K线跨度至：${rng}` : `Switched range: ${rng}`)
                      }
                      className="px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
                    >
                      {rng}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <span className="text-slate-400 mr-1">{lang === 'zh' ? '副图指标:' : 'Sub:'}</span>
                  {(['OBV', 'MACD', 'KDJ', 'RSI'] as const).map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSubIndicator2(sub)}
                      className={`px-2 py-0.5 rounded font-mono font-semibold cursor-pointer ${
                        subIndicator2 === sub
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                  <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
                  <button
                    onClick={() => setLogScale(!logScale)}
                    className={`px-1.5 py-0.5 rounded font-mono cursor-pointer ${
                      logScale ? 'text-blue-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {lang === 'zh' ? '对数' : 'Log'}
                  </button>
                  <button
                    onClick={() => setAutoScale(!autoScale)}
                    className={`px-1.5 py-0.5 rounded font-mono cursor-pointer ${
                      autoScale ? 'text-blue-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {lang === 'zh' ? '自动' : 'Auto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            COLUMN 3: RIGHT AICOIN MULTI-TAB DRAWER + ICON RAIL
            (盘口 | 快讯 | 流入 | AI分析 | 数据 | ETF | Ace Agent)
           ============================================================ */}
        <AicoinRightDrawer
          instrument={selectedInstrument}
          lang={lang}
          onOpenAiModal={onOpenAiModal}
          onShowToast={onShowToast}
        />
      </div>

      {/* ============================================================
          BOTTOM AICOIN GLOBAL STATUS & LIVE TICKER BAR
         ============================================================ */}
      <footer className="h-8 px-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D111A] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-4 whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '行情专线极速连接 (14ms)' : 'Low-Latency Feed (14ms)'}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-4 font-mono">
            {instruments.slice(0, 4).map((inst) => {
              const up = inst.changePercent24h >= 0;
              return (
                <button
                  key={inst.symbol}
                  onClick={() => onSelectSymbol(inst.symbol)}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span className="font-bold">{inst.symbol}</span>
                  <span className={up ? 'text-emerald-500' : 'text-rose-500'}>
                    {inst.price.toFixed(inst.decimals)} ({up ? '+' : ''}
                    {inst.changePercent24h.toFixed(2)}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 whitespace-nowrap font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>UTC+8 {currentTimeStr}</span>
          </span>
        </div>
      </footer>

      {/* Custom Watchlist Group Creation Modal */}
      {customGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'zh' ? '新建自选分组' : 'Create Watchlist Group'}
            </h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={lang === 'zh' ? '输入分组名称 (如：重点盯盘、AI龙头)' : 'Group name...'}
              className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCustomGroupModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (newGroupName.trim()) {
                    setCustomGroups((prev) => [...prev, newGroupName.trim()]);
                    setSubFilter(`custom_${newGroupName.trim()}`);
                    setNewGroupName('');
                    setCustomGroupModal(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
              >
                {lang === 'zh' ? '保存分组' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
