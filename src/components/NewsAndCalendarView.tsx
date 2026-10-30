import React, { useState } from 'react';
import { Newspaper, Calendar, ArrowUpRight } from 'lucide-react';
import { NEWS_FLASH_DATA, ECONOMIC_CALENDAR_DATA } from '../data/marketData';

interface NewsAndCalendarViewProps {
  lang: 'zh' | 'en';
  onQuickTrade: (symbol: string, side: 'buy' | 'sell') => void;
}

export const NewsAndCalendarView: React.FC<NewsAndCalendarViewProps> = ({
  lang,
  onQuickTrade,
}) => {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const [newsCategory, setNewsCategory] = useState<'all' | 'macro' | 'stocks' | 'forex' | 'crypto'>('all');
  const [onlyImportant, setOnlyImportant] = useState<boolean>(false);
  const [importanceFilter, setImportanceFilter] = useState<number>(0);
  // Phones show one column at a time; desktop shows both side by side
  const [mobileView, setMobileView] = useState<'news' | 'calendar'>('news');

  const filteredNews = NEWS_FLASH_DATA.filter((item) => {
    if (newsCategory !== 'all' && item.category !== newsCategory) return false;
    if (onlyImportant && !item.important) return false;
    return true;
  });

  const filteredCalendar = ECONOMIC_CALENDAR_DATA.filter((ev) => {
    if (importanceFilter === 3 && ev.importance < 3) return false;
    return true;
  });

  return (
    <div className="ui-page">
      <div className="ui-page-head">
        <div>
          <h1 className="ui-page-title">{t('资讯与财经日历', 'News & Economic Calendar')}</h1>
          <p className="ui-page-desc">
            {t(
              '7×24 全球机构快讯电报 · 宏观数据与央行利率决议',
              '24/7 institutional news wire · macro data & central bank decisions',
            )}
          </p>
        </div>
        <div className="ui-seg lg:hidden">
          <button aria-pressed={mobileView === 'news'} onClick={() => setMobileView('news')}>
            {t('快讯电报', 'News Wire')}
          </button>
          <button aria-pressed={mobileView === 'calendar'} onClick={() => setMobileView('calendar')}>
            {t('财经日历', 'Calendar')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* 7x24 Real-time Financial Telegraph (AICoin / Jin10 Style) */}
        <section className={`ui-card overflow-hidden ${mobileView === 'news' ? '' : 'hidden lg:block'}`}>
          <div className="ui-card-head">
            <h2 className="ui-card-title">
              <Newspaper className="w-4 h-4 text-brand" />
              {t('7×24 全球机构快讯电报', '24/7 Global Institutional News Wire')}
            </h2>
            <label className="flex items-center gap-1.5 text-[12px] font-medium text-down cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyImportant}
                onChange={(e) => setOnlyImportant(e.target.checked)}
                className="w-3.5 h-3.5 accent-[var(--ui-down)]"
              />
              {t('只看重要异动', 'High Impact Only')}
            </label>
          </div>

          <div className="flex gap-2 px-4 py-3 border-b border-line overflow-x-auto no-scrollbar">
            {[
              { id: 'all', zh: '全部快讯', en: 'All Wire' },
              { id: 'macro', zh: '宏观央行', en: 'Macro & Fed' },
              { id: 'stocks', zh: '美股研报', en: 'US Equities' },
              { id: 'forex', zh: '外汇汇市', en: 'Forex' },
              { id: 'crypto', zh: '数字资产', en: 'Crypto' },
            ].map((cat) => (
              <button
                key={cat.id}
                aria-pressed={newsCategory === cat.id}
                onClick={() => setNewsCategory(cat.id as typeof newsCategory)}
                className="ui-chip"
              >
                {lang === 'zh' ? cat.zh : cat.en}
              </button>
            ))}
          </div>

          <ol className="px-4 pt-4 pb-2">
            {filteredNews.map((item, idx) => {
              const bullish = item.sentiment === 'bullish';
              return (
                <li key={item.id} className="relative pl-6 pb-5">
                  {idx < filteredNews.length - 1 && (
                    <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" />
                  )}
                  <span
                    className={`absolute left-0 top-[5px] w-[11px] h-[11px] rounded-full border-2 border-surface ${
                      item.important ? 'bg-down' : 'bg-brand'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <time className="text-ink-3">{item.time}</time>
                    <span className={`ui-badge ${bullish ? 'ui-badge-up' : 'ui-badge-down'}`}>
                      {item.relatedSymbol} · {bullish ? t('利多', 'Bullish') : t('利空', 'Bearish')}
                    </span>
                  </div>
                  <h3
                    className={`mt-1.5 text-[14px] font-semibold leading-[1.55] ${
                      item.important ? 'text-down' : 'text-ink'
                    }`}
                  >
                    {lang === 'zh' ? item.titleZh : item.titleEn}
                  </h3>
                  <p className="mt-1 text-[13px] leading-[1.7] text-ink-2">
                    {lang === 'zh' ? item.summaryZh : item.summaryEn}
                  </p>
                  <button
                    onClick={() => onQuickTrade(item.relatedSymbol, bullish ? 'buy' : 'sell')}
                    className="mt-2 inline-flex items-center gap-0.5 text-[12px] font-medium text-brand hover:underline"
                  >
                    {t(`前往交易 ${item.relatedSymbol}`, `Trade ${item.relatedSymbol}`)}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
            {!filteredNews.length && (
              <li className="ui-empty">{t('当前筛选下暂无快讯', 'No news for this filter')}</li>
            )}
          </ol>
        </section>

        {/* Global Macroeconomic Calendar (Mitrade Style) */}
        <section className={`ui-card overflow-hidden ${mobileView === 'calendar' ? '' : 'hidden lg:block'}`}>
          <div className="ui-card-head">
            <h2 className="ui-card-title">
              <Calendar className="w-4 h-4 text-brand" />
              {t('全球宏观财经日历与利率决议', 'Macro Calendar & Central Bank Watch')}
            </h2>
            <div className="ui-seg">
              <button aria-pressed={importanceFilter === 0} onClick={() => setImportanceFilter(0)}>
                {t('全部等级', 'All')}
              </button>
              <button aria-pressed={importanceFilter === 3} onClick={() => setImportanceFilter(3)}>
                <span className="text-amber-500">★</span> {t('三星重磅', '3-Star')}
              </button>
            </div>
          </div>

          <ul className="divide-y divide-line">
            {filteredCalendar.map((ev) => (
              <li key={ev.id} className="px-4 py-4">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-semibold text-ink">{ev.time}</span>
                  <img
                    src={`https://flagcdn.com/w40/${ev.countryFlag}.png`}
                    alt={ev.currency}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover ring-1 ring-line"
                  />
                  <span className="font-medium text-ink-2">{ev.currency}</span>
                  <span className="text-amber-500 tracking-[-1px]">
                    {'★'.repeat(ev.importance)}
                    <span className="text-line-2">{'★'.repeat(3 - ev.importance)}</span>
                  </span>
                  <span
                    className={`ml-auto font-semibold ${
                      ev.impactType === 'bullish'
                        ? 'text-up'
                        : ev.impactType === 'bearish'
                          ? 'text-down'
                          : 'text-amber-500'
                    }`}
                  >
                    {lang === 'zh' ? ev.impactZh : ev.impactEn}
                  </span>
                </div>

                <div className="mt-1.5 text-[14px] font-semibold text-ink">
                  {lang === 'zh' ? ev.eventZh : ev.eventEn}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: t('前值', 'Prev'), value: ev.previous, cls: 'text-ink' },
                    { label: t('预测', 'Fcst'), value: ev.forecast, cls: 'text-ink' },
                    { label: t('今值', 'Actual'), value: ev.actual, cls: 'text-brand' },
                  ].map((cell) => (
                    <div key={cell.label} className="rounded-lg bg-surface-2 border border-line px-3 py-2">
                      <div className="text-[11px] text-ink-3">{cell.label}</div>
                      <div className={`mt-0.5 text-[14px] font-semibold ${cell.cls}`}>{cell.value}</div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
