import React, { useEffect, useState } from "react";
import { Flame, Calendar, Calculator, Sparkles } from "lucide-react";
import { Instrument, DIVIDEND_DATA } from "../data/marketData";
import { AssetLogo } from "./AssetLogo";

interface DividendsAndHotViewProps {
  instruments: Instrument[];
  lang: "zh" | "en";
  onQuickTrade: (symbol: string, side: "buy" | "sell") => void;
  onOpenAiDiagnose: (symbol: string) => void;
}

type PageTab = "hot" | "dividends";

export const DividendsAndHotView: React.FC<DividendsAndHotViewProps> = ({
  instruments,
  lang,
  onQuickTrade,
  onOpenAiDiagnose,
}) => {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [pageTab, setPageTab] = useState<PageTab>(() =>
    window.location.hash.split("/")[1] === "dividends" ? "dividends" : "hot",
  );
  const [hotCat, setHotCat] = useState<"all" | "crypto" | "stocks" | "macro">(
    "all",
  );
  const [divTab, setDivTab] = useState<"upcoming" | "history">("upcoming");
  const [calcSymbol, setCalcSymbol] = useState<string>("KO");
  const [calcLots, setCalcLots] = useState<number>(5);
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [hotCat]);

  const switchPage = (tab: PageTab) => {
    setPageTab(tab);
    window.history.replaceState(
      null,
      "",
      tab === "dividends" ? "#dividends/dividends" : "#dividends",
    );
  };

  const hotInstruments = instruments.filter((i) => {
    if (hotCat === "crypto") return i.category === "crypto";
    if (hotCat === "stocks") return i.category === "stocks";
    if (hotCat === "macro")
      return (
        i.category === "commodities" ||
        i.category === "forex" ||
        i.category === "indices"
      );
    return true;
  });

  const filteredDividends = DIVIDEND_DATA.filter((d) => d.status === divTab);
  const selectedDivEvent =
    DIVIDEND_DATA.find((d) => d.symbol === calcSymbol) || DIVIDEND_DATA[0];

  const cryptoCount = instruments.filter((i) => i.category === "crypto").length;
  const stockCount = instruments.filter((i) => i.category === "stocks").length;

  return (
    <div className="hot-page w-full min-w-0">
      <div className="ui-subnav">
        <div className="ui-subnav-inner">
          <div role="tablist" className="ui-tabs">
            <button
              role="tab"
              aria-selected={pageTab === "hot"}
              onClick={() => switchPage("hot")}
              className="ui-tab"
            >
              <Flame className="w-4 h-4 text-amber-500" />
              {t("热门品种", "Trending")}
              <span className="ui-tab-count">{instruments.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={pageTab === "dividends"}
              onClick={() => switchPage("dividends")}
              className="ui-tab"
            >
              <Calendar className="w-4 h-4 text-brand" />
              {t("分红中心", "Dividend Center")}
              <span className="ui-tab-count">{DIVIDEND_DATA.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="ui-page">
        {pageTab === "hot" ? (
          <section className="ui-fade-in">
            <div className="ui-page-head">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {t(
                      "全市场热门交易排行榜 · 涵盖加密货币永续、美股龙头、黄金外汇与指数",
                      "Hot trading leaderboard · crypto perpetuals, US equities, gold & forex",
                    )}
                  </span>
                </div>
                <h1 className="ui-page-title mt-1">
                  {t("热门品种与高热度加密合约精选", "Trending crypto, stocks & macro movers")}
                  <span className="ml-2 text-[14px] font-medium text-ink-3">
                    {t(
                      `${hotInstruments.length} 个热门标的`,
                      `${hotInstruments.length} assets`,
                    )}
                  </span>
                </h1>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full">
                {[
                  {
                    id: "all",
                    zh: "全部热门",
                    en: "All",
                    count: instruments.length,
                  },
                  {
                    id: "crypto",
                    zh: "🔥 热门加密货币",
                    en: "🔥 Crypto",
                    count: cryptoCount,
                  },
                  {
                    id: "stocks",
                    zh: "热门美股",
                    en: "Stocks",
                    count: stockCount,
                  },
                  { id: "macro", zh: "黄金 / 外汇 / 股指", en: "Gold / FX / Indices" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    aria-pressed={hotCat === tab.id}
                    onClick={() => setHotCat(tab.id as typeof hotCat)}
                    className="ui-chip"
                  >
                    {lang === "zh" ? tab.zh : tab.en}
                    {tab.count !== undefined && (
                      <span className="text-[11px] opacity-60">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {hotInstruments.slice(0, visibleCount).map((item) => {
                const isUp = item.changePercent24h >= 0;
                const isCrypto = item.category === "crypto";
                return (
                  <div
                    key={item.symbol}
                    className="ui-card ui-card-hover p-3.5 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AssetLogo
                          symbol={item.symbol}
                          category={item.category}
                          logoUrl={item.logoUrl}
                          baseFlag={item.baseFlag}
                          quoteFlag={item.quoteFlag}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[14px] font-semibold text-ink truncate">
                              {isCrypto
                                ? item.symbol.replace("/USD", "USDT")
                                : item.symbol}
                            </span>
                            <span
                              className={`ui-badge h-[18px] px-1.5 text-[10px] shrink-0 ${
                                isCrypto
                                  ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                                  : "ui-badge-brand"
                              }`}
                            >
                              {isCrypto
                                ? `${item.leverage}x ${t("永续", "Perp")}`
                                : `${item.leverage}x CFD`}
                            </span>
                          </div>
                          <div className="text-[12px] text-ink-3 truncate">
                            {lang === "zh" ? item.nameZh : item.nameEn}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[14px] font-semibold text-ink">
                          {item.price.toFixed(item.decimals)}
                        </div>
                        <div
                          className={`text-[12px] font-semibold ${
                            isUp ? "text-up" : "text-down"
                          }`}
                        >
                          {isUp ? "+" : ""}
                          {item.changePercent24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 text-[12px] text-ink-2 truncate">
                      {lang === "zh"
                        ? item.hotTagZh || "机构高频活跃品种 · 极窄点差"
                        : item.hotTagEn || "High Institutional Liquidity"}
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-up">
                          {item.longRatio}% {t("做多", "Long")}
                        </span>
                        <span className="text-ink-3">Vol {item.volume24h}</span>
                        <span className="font-medium text-down">
                          {100 - item.longRatio}% {t("做空", "Short")}
                        </span>
                      </div>
                      <div className="mt-1 flex h-1 rounded-full overflow-hidden bg-down/30">
                        <div
                          className="h-full bg-up rounded-full"
                          style={{ width: `${item.longRatio}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-3.5 pt-3 border-t border-line">
                      <button
                        onClick={() => onQuickTrade(item.symbol, "buy")}
                        className="h-7 rounded-md bg-up-soft text-up hover:bg-up hover:text-white text-[12px] font-semibold transition-colors"
                      >
                        {lang === "zh" ? (isCrypto ? "开多" : "做多") : "Buy"}
                      </button>
                      <button
                        onClick={() => onQuickTrade(item.symbol, "sell")}
                        className="h-7 rounded-md bg-down-soft text-down hover:bg-down hover:text-white text-[12px] font-semibold transition-colors"
                      >
                        {lang === "zh" ? (isCrypto ? "开空" : "做空") : "Sell"}
                      </button>
                      <button
                        onClick={() => onOpenAiDiagnose(item.symbol)}
                        className="h-7 rounded-md bg-surface-3 text-ink-2 hover:bg-brand hover:text-white text-[12px] font-medium transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        {lang === "zh" ? "AI解读" : "AI"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-2 mt-5 text-[12px] text-ink-3">
              <span>
                {t(
                  `已显示 ${Math.min(visibleCount, hotInstruments.length)} / ${hotInstruments.length} 个热门标的`,
                  `Showing ${Math.min(visibleCount, hotInstruments.length)} of ${hotInstruments.length}`,
                )}
              </span>
              {visibleCount < hotInstruments.length && (
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="ui-btn h-9 px-5"
                >
                  {t(
                    `加载更多（剩余 ${hotInstruments.length - visibleCount} 个）`,
                    `Load more (${hotInstruments.length - visibleCount} left)`,
                  )}
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="ui-fade-in">
            <div className="ui-page-head">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-brand">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {t(
                      "美股 CFD 股息分红中心 · 除权日现金调整明细",
                      "CFD dividend center · ex-dividend cash adjustments",
                    )}
                  </span>
                </div>
                <h1 className="ui-page-title mt-1">
                  {t(
                    "即将分红与历史分红全览",
                    "Upcoming dividends & historical payout ledger",
                  )}
                </h1>
              </div>

              <div className="ui-seg">
                <button
                  aria-pressed={divTab === "upcoming"}
                  onClick={() => setDivTab("upcoming")}
                >
                  {t("即将分红", "Upcoming")}
                </button>
                <button
                  aria-pressed={divTab === "history"}
                  onClick={() => setDivTab("history")}
                >
                  {t("历史分红记录", "Historical")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 ui-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>{t("股票代码 / 公司", "Symbol / Company")}</th>
                        <th>{t("除息日", "Ex-Date")}</th>
                        <th>{t("派息日", "Pay Date")}</th>
                        <th>{t("每股派息", "Div / Share")}</th>
                        <th>{t("年化股息率", "Annual Yield")}</th>
                        <th>{t("多头每手补贴", "Long Credit/Lot")}</th>
                        <th>{t("操作", "Action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDividends.map((div) => {
                        const inst = instruments.find(
                          (i) => i.symbol === div.symbol,
                        );
                        return (
                          <tr key={div.id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <AssetLogo
                                  symbol={div.symbol}
                                  category="stocks"
                                  logoUrl={inst?.logoUrl}
                                  size="sm"
                                />
                                <div>
                                  <div className="text-[13px] font-semibold text-ink">
                                    {div.symbol}
                                  </div>
                                  <div className="text-[12px] text-ink-3">
                                    {lang === "zh"
                                      ? div.companyZh
                                      : div.companyEn}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="text-ink">{div.exDate}</td>
                            <td className="text-ink-3">{div.payDate}</td>
                            <td className="font-semibold text-ink">
                              ${div.amountPerShare.toFixed(2)}
                            </td>
                            <td className="font-semibold text-brand">
                              {div.annualYield.toFixed(2)}%
                            </td>
                            <td className="font-semibold text-up">
                              +${div.longAdjustmentPerLot.toFixed(2)}
                            </td>
                            <td>
                              <button
                                onClick={() => onQuickTrade(div.symbol, "buy")}
                                className="ui-btn ui-btn-primary h-7 px-2.5 text-[12px]"
                              >
                                {t("买多吃息", "Trade CFD")}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-4 ui-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                    <Calculator className="w-4 h-4" />
                  </span>
                  {t("CFD 除息日分红补贴试算器", "CFD Dividend Adjustment Calculator")}
                </div>
                <p className="text-[12px] leading-[1.7] text-ink-3">
                  {t(
                    "在除息日（Ex-Dividend Date）收盘前持有美股 CFD 多单，账户将在除息日自动获得等额现金股息补贴。",
                    "Hold a long Stock CFD position prior to market close on the Ex-Dividend date to receive direct cash dividend credits.",
                  )}
                </p>

                <label className="block">
                  <span className="block mb-1.5 text-[12px] font-medium text-ink-2">
                    {t("选择分红股票品种", "Select Dividend Stock")}
                  </span>
                  <select
                    value={calcSymbol}
                    onChange={(e) => setCalcSymbol(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg text-[13px] bg-surface-2 border border-line text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand-soft transition-shadow"
                  >
                    {DIVIDEND_DATA.map((d) => (
                      <option key={d.id} value={d.symbol}>
                        {d.symbol} - {lang === "zh" ? d.companyZh : d.companyEn}{" "}
                        (${d.amountPerShare}/sh)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block mb-1.5 text-[12px] font-medium text-ink-2">
                    {t("持有 CFD 手数 (1手 = 100股)", "CFD Lots Held (1 Lot = 100 Shares)")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={calcLots}
                    onChange={(e) =>
                      setCalcLots(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full h-9 px-3 rounded-lg text-[13px] bg-surface-2 border border-line text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand-soft transition-shadow"
                  />
                </label>

                <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2.5">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink-3">
                      {t("预计多单到账股息", "Est. Long Cash Credit")}
                    </span>
                    <span className="font-semibold text-up">
                      +$
                      {(selectedDivEvent.longAdjustmentPerLot * calcLots).toFixed(
                        2,
                      )}{" "}
                      USD
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink-3">
                      {t("除息结算日", "Ex-Dividend Date")}
                    </span>
                    <span className="text-ink">{selectedDivEvent.exDate}</span>
                  </div>
                  <button
                    onClick={() => onQuickTrade(selectedDivEvent.symbol, "buy")}
                    className="ui-btn ui-btn-primary w-full h-9 mt-1"
                  >
                    {t(
                      `立即建仓 ${selectedDivEvent.symbol} 锁定分红`,
                      `Open ${selectedDivEvent.symbol} Long Position`,
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
