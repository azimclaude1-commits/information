import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, ChevronDown, Radio, Star, X } from "lucide-react";
import type { Instrument } from "../data/marketData";
import { MarketChart, type PriceLine } from "./MarketChart";
import { MarketDetails } from "./MarketDetails";
import { SignatureGate } from "./membership/SignatureGate";
import { displaySymbol, marketOf, type Side } from "./demoTrading";
import { number, signed } from "./marketModel";

type Props = {
  instrument: Instrument;
  lang: "zh" | "en";
  favorite: boolean;
  onFavorite: () => void;
  pickerOpen: boolean;
  onPicker: (open: boolean) => void;
  watchlist: React.ReactNode;
  ticket?: React.ReactNode;
  positions?: React.ReactNode;
  live?: React.ReactNode;
  priceLines?: PriceLine[];
  onTradeSide?: (side: Side) => void;
  onToast: (text: string) => void;
  onOpenAi: () => void;
  alertOpen: boolean;
  onAlert: () => void;
  onCloseAlert: () => void;
};
type Pane = "trade" | "chart" | "data" | "news" | "agent" | "live";

export function MobileTradingDesk({
  instrument: i,
  lang,
  favorite,
  onFavorite,
  pickerOpen,
  onPicker,
  watchlist,
  ticket,
  positions,
  live,
  priceLines,
  onTradeSide,
  onToast,
  onOpenAi,
  alertOpen,
  onAlert,
  onCloseAlert,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [pane, setPane] = useState<Pane>("trade");
  const [dataTab, setDataTab] = useState("data");
  const [period, setPeriod] = useState("15m");
  const [template, setTemplate] = useState<{ id: number; kind: string }>();
  const picker = useRef<HTMLDivElement>(null);
  const closePicker = useRef(onPicker);
  closePicker.current = onPicker;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  useEffect(() => {
    if (!pickerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    picker.current?.querySelector<HTMLInputElement>("input")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker.current(false);
      if (event.key !== "Tab") return;
      const controls = Array.from(
        picker.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input",
        ) || [],
      ).filter((el) => el.offsetParent !== null);
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === controls.at(-1)
      ) {
        event.preventDefault();
        controls[0]?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [pickerOpen]);
  const changePane = (next: Pane) => {
    setPane(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const detailsVisible = ["data", "news", "agent"].includes(pane);
  const openTrade = (side: Side) => {
    onTradeSide?.(side);
    changePane("trade");
  };
  const range = Math.max(
    0,
    Math.min(
      100,
      ((i.price - i.low24h) / Math.max(i.high24h - i.low24h, 0.00001)) * 100,
    ),
  );
  return (
    <div className={`mobile-trading-desk pane-${pane}`}>
      <header className="mt-instrument">
        <button
          className="mt-back"
          aria-label={t("品种列表", "Instrument list")}
          onClick={() => onPicker(true)}
        >
          <ArrowLeft size={19} />
        </button>
        <button
          className="mt-symbol"
          aria-label={t("切换交易品种", "Change instrument")}
          onClick={() => onPicker(true)}
        >
          <strong>
            {displaySymbol(i.symbol, marketOf(i))}
            <ChevronDown size={13} />
          </strong>
          <small>
            {t(i.nameZh, i.nameEn)
              .replace(/永续.*$/, "")
              .trim()}
          </small>
        </button>
        <button
          className={`mt-icon ${favorite ? "is-saved" : ""}`}
          aria-label={
            favorite
              ? t("取消自选", "Remove from watchlist")
              : t("加入自选", "Add to watchlist")
          }
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Star size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
        <button
          className="mt-icon"
          aria-label={t("价格预警", "Price alert")}
          onClick={onAlert}
        >
          <Bell size={18} />
        </button>
        {live && (
          <button
            className="mt-icon"
            aria-label={t("直播间", "Live rooms")}
            aria-pressed={pane === "live"}
            onClick={() => changePane("live")}
          >
            <Radio size={18} />
          </button>
        )}
      </header>
      <section className="mt-quote" aria-label={t("实时行情", "Live quote")}>
        <div className={`mt-last ${i.changePercent24h >= 0 ? "up" : "down"}`}>
          <strong>{number(i.price, i.decimals)}</strong>
          <span>
            {signed(i.change24h, i.decimals)}{" "}
            <b>({signed(i.changePercent24h)}%)</b>
          </span>
          <small>
            {t("模拟行情", "Demo quotes")} ·{" "}
            {marketOf(i) === "perp" ? "USDT" : "USD"}
          </small>
        </div>
        <div className="mt-market-stats">
          <div className="mt-position-label">
            <span>{t("多空分布", "Long / short")}</span>
            <b className="up">{i.longRatio}%</b>
            <b className="down">{100 - i.longRatio}%</b>
          </div>
          <div className="mt-ratio">
            <i style={{ width: `${i.longRatio}%` }} />
          </div>
          <div className="mt-range-label">
            <span>{t("日内区间", "Day range")}</span>
            <b>
              {number(i.low24h, i.decimals)} – {number(i.high24h, i.decimals)}
            </b>
          </div>
          <div className="mt-range">
            <i style={{ left: `${range}%` }} />
          </div>
        </div>
      </section>
      <nav
        className="mt-tabs"
        role="tablist"
        aria-label={t("交易内容", "Trading content")}
      >
        {(
          [
            ["trade", "交易", "Trade"],
            ["chart", "图表", "Chart"],
            ["data", "数据", "Data"],
            ["news", "信息", "News"],
            ["agent", "Agent 策略", "Agent"],
          ] as const
        ).map(([id, zh, en]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pane === id}
            onClick={() => changePane(id)}
          >
            {t(zh, en)}
          </button>
        ))}
      </nav>
      <div className="mt-trade-panel" hidden={pane !== "trade"}>
        {ticket}
        {positions}
      </div>
      {pane === "chart" && (
        <section
          className="mt-chart-panel"
          aria-label={t("交易图表", "Trading chart")}
        >
          <div className="mt-chart">
            <MarketChart
              mobile
              instrument={i}
              lang={lang}
              period={period}
              onPeriod={setPeriod}
              priceLines={priceLines}
              template={template}
              onTemplateApplied={() => setTemplate(undefined)}
            />
          </div>
          <SignatureGate instrument={i} period={period} lang={lang} mobile />
          <div className="mt-chart-trade">
            <button className="mt-buy" onClick={() => openTrade("buy")}>
              <span>{t("买入", "Buy")}</span>
              <b>{number(i.ask, i.decimals)}</b>
            </button>
            <span>{number(i.ask - i.bid, i.decimals)}</span>
            <button className="mt-sell" onClick={() => openTrade("sell")}>
              <span>{t("卖出", "Sell")}</span>
              <b>{number(i.bid, i.decimals)}</b>
            </button>
          </div>
        </section>
      )}
      {pane === "data" && (
        <nav
          className="mt-data-tabs"
          aria-label={t("市场数据分类", "Market data categories")}
        >
          {[
            ["data", "概览", "Overview"],
            ["book", "盘口", "Book"],
            ["flow", "资金流向", "Flow"],
            ["analysis", "技术分析", "Analysis"],
            ["etf", "ETF", "ETF"],
          ].map(([id, zh, en]) => (
            <button
              key={id}
              aria-pressed={dataTab === id}
              onClick={() => setDataTab(id)}
            >
              {t(zh, en)}
            </button>
          ))}
        </nav>
      )}
      <MarketDetails
        instrument={i}
        lang={lang}
        isFavorite={favorite}
        onToggleFavorite={onFavorite}
        onShowToast={onToast}
        onOpenAiModal={onOpenAi}
        alertOpen={alertOpen}
        onCloseAlert={onCloseAlert}
        embedded
        contentHidden={!detailsVisible}
        activeTab={pane === "news" || pane === "agent" ? pane : dataTab}
        onTabChange={(next) => {
          if (next === "news" || next === "agent") changePane(next);
          else {
            setDataTab(next);
            changePane("data");
          }
        }}
        onApplyTemplate={(kind) => {
          setPeriod("4H");
          setTemplate({ id: Date.now(), kind });
          changePane("chart");
        }}
      />
      {pane === "live" && <div className="mt-live-panel">{live}</div>}
      {pickerOpen && (
        <div
          className="mt-picker-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onPicker(false);
          }}
        >
          <div
            className="mt-picker"
            role="dialog"
            aria-modal="true"
            aria-label={t("选择交易品种", "Select instrument")}
            ref={picker}
          >
            <header>
              <strong>{t("选择交易品种", "Select instrument")}</strong>
              <button
                aria-label={t("关闭品种列表", "Close instruments")}
                onClick={() => onPicker(false)}
              >
                <X size={20} />
              </button>
            </header>
            {watchlist}
          </div>
        </div>
      )}
    </div>
  );
}
