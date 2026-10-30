import React, { useState } from 'react';

interface AssetLogoProps {
  symbol: string;
  category: 'stocks' | 'forex' | 'crypto' | 'commodities' | 'indices';
  logoUrl?: string;
  baseFlag?: string;
  quoteFlag?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AssetLogo: React.FC<AssetLogoProps> = ({
  symbol,
  category,
  logoUrl,
  baseFlag,
  quoteFlag,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);
  const [baseError, setBaseError] = useState(false);
  const [quoteError, setQuoteError] = useState(false);

  const dims = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

  // Dual overlapping flag circles for Forex pairs (like Mitrade)
  if (category === 'forex' && baseFlag && quoteFlag && !baseError && !quoteError) {
    const flagDim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
    return (
      <div className={`relative flex items-center shrink-0 ${dims}`}>
        <img
          src={`https://flagcdn.com/w80/${baseFlag}.png`}
          alt={symbol.slice(0, 3)}
          referrerPolicy="no-referrer"
          onError={() => setBaseError(true)}
          className={`${flagDim} rounded-full object-cover ring-1 ring-black/20 dark:ring-white/20 z-10 shadow-xs`}
        />
        <img
          src={`https://flagcdn.com/w80/${quoteFlag}.png`}
          alt={symbol.slice(3, 6)}
          referrerPolicy="no-referrer"
          onError={() => setQuoteError(true)}
          className={`${flagDim} rounded-full object-cover ring-1 ring-black/20 dark:ring-white/20 -ml-2 mt-1.5`}
        />
      </div>
    );
  }

  // Commodities & Indices tailored authentic vector badges if no logoUrl or on fallback
  if (category === 'commodities' || category === 'indices') {
    if (symbol.includes('XAU')) {
      return (
        <div className={`${dims} rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-xs ring-1 ring-amber-400/40`}>
          Au
        </div>
      );
    }
    if (symbol.includes('XAG')) {
      return (
        <div className={`${dims} rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-xs ring-1 ring-slate-300/40`}>
          Ag
        </div>
      );
    }
    if (symbol.includes('WTI') || symbol.includes('BRENT')) {
      return (
        <div className={`${dims} rounded-full bg-gradient-to-br from-slate-700 to-slate-950 text-amber-400 font-bold flex items-center justify-center shrink-0 shadow-xs ring-1 ring-slate-600`}>
          OIL
        </div>
      );
    }
    if (symbol.includes('NAS100')) {
      return (
        <div className={`${dims} rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white font-bold flex items-center justify-center shrink-0 shadow-xs`}>
          100
        </div>
      );
    }
    if (symbol.includes('US500')) {
      return (
        <div className={`${dims} rounded-full bg-gradient-to-br from-rose-600 to-red-800 text-white font-bold flex items-center justify-center shrink-0 shadow-xs`}>
          500
        </div>
      );
    }
    if (symbol.includes('HK50')) {
      return (
        <div className={`${dims} rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white font-bold flex items-center justify-center shrink-0 shadow-xs`}>
          HK
        </div>
      );
    }
  }

  if (logoUrl && !imgError) {
    return (
      <div className={`${dims} rounded-full bg-white dark:bg-slate-800 p-0.5 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700/80`}>
        <img
          src={logoUrl}
          alt={symbol}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-full"
        />
      </div>
    );
  }

  // Resilient branded monogram fallback
  const colors: Record<string, string> = {
    NVDA: 'from-lime-500 to-emerald-700 text-white',
    AAPL: 'from-slate-700 to-slate-950 text-white',
    TSLA: 'from-red-600 to-rose-700 text-white',
    MSFT: 'from-sky-500 to-blue-700 text-white',
    AMZN: 'from-amber-500 to-orange-600 text-white',
    META: 'from-blue-600 to-indigo-700 text-white',
    GOOGL: 'from-blue-500 to-emerald-600 text-white',
    AMD: 'from-emerald-600 to-teal-800 text-white',
    NFLX: 'from-red-600 to-black text-white',
    COIN: 'from-blue-600 to-blue-800 text-white',
  };

  const bgClass = colors[symbol] || 'from-blue-600 to-indigo-800 text-white';

  return (
    <div className={`${dims} rounded-full bg-gradient-to-br ${bgClass} font-bold flex items-center justify-center shrink-0 shadow-xs`}>
      {symbol.slice(0, 3)}
    </div>
  );
};
