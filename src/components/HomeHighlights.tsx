import React from "react";
import {
  ArrowUpRight,
  Activity,
  CalendarDays,
  Coins,
  Radio,
  ScanLine,
  Search,
  Grid2X2,
  BarChart3,
} from "lucide-react";
import {
  Instrument,
  DIVIDEND_DATA,
  ECONOMIC_CALENDAR_DATA,
} from "../data/marketData";
import { AssetLogo } from "./AssetLogo";
import type { ResearchTab } from "./ResearchViews";

export function HomeHighlights({
  instruments,
  onResearch,
  onNavigate,
  onSelect,
}: {
  instruments: Instrument[];
  onResearch: (tab: ResearchTab) => void;
  onNavigate: (tab: string) => void;
  onSelect: (symbol: string) => void;
}) {
  const rising = instruments.filter((i) => i.changePercent24h > 0).length;
  return (
    <>
      <div className="home-breadth">
        <span>
          <Activity size={15} /> 市场温度 <b>{instruments.length}</b> 个品种
        </span>
        <span className="positive">上涨 {rising}</span>
        <div className="breadth-track">
          <i style={{ width: `${(rising / instruments.length) * 100}%` }} />
        </div>
        <span className="negative">
          下跌 {instruments.filter((i) => i.changePercent24h < 0).length}
        </span>
        <span>美股 · 指数 · 外汇 · 商品 · 加密资产</span>
      </div>
      <div className="home-focus-grid">
        {["XAU/USD", "NVDA", "BTC/USD", "EUR/USD"].map((symbol) => {
          const i = instruments.find((i) => i.symbol === symbol);
          if (!i) return null;
          return (
            <button
              key={symbol}
              className="home-focus-card"
              onClick={() => onSelect(symbol)}
            >
              <div className="focus-heading">
                <AssetLogo {...i} size="md" />
                <div>
                  <b>{symbol}</b>
                  <small>{i.nameZh}</small>
                </div>
                <ArrowUpRight size={15} />
              </div>
              <div className="focus-price">
                <strong>
                  {i.price.toLocaleString("en-US", {
                    maximumFractionDigits: i.decimals,
                  })}
                </strong>
                <b
                  className={i.changePercent24h >= 0 ? "positive" : "negative"}
                >
                  {i.changePercent24h >= 0 ? "+" : ""}
                  {i.changePercent24h.toFixed(2)}%
                </b>
              </div>
              <p>{i.hotTagZh || "全球市场重点观察"}</p>
              <div className="focus-range">
                <span>低 {i.low24h.toLocaleString()}</span>
                <span>高 {i.high24h.toLocaleString()}</span>
              </div>
              <div className="focus-range-track">
                <i
                  style={{
                    left: `${Math.max(0, Math.min(100, ((i.price - i.low24h) / (i.high24h - i.low24h)) * 100))}%`,
                  }}
                />
              </div>
              <div className="focus-range">
                <span>24H 成交量</span>
                <b>{i.volume24h}</b>
              </div>
            </button>
          );
        })}
      </div>
      <div className="home-services">
        {(
          [
            [
              "五维诊股",
              "技术、资金与基本面",
              ScanLine,
              () => onResearch("diagnosis"),
            ],
            ["Ace智搜", "宏观与品种研究", Search, () => onResearch("ace")],
            [
              "热门榜单",
              "ETF、持仓与资金费率",
              BarChart3,
              () => onResearch("hotlist"),
            ],
            [
              "全市场云图",
              "板块涨跌与资金轮动",
              Grid2X2,
              () => onResearch("heatmap"),
            ],
          ] as const
        ).map(([name, desc, Icon, action]) => (
          <button key={name} onClick={action}>
            <Icon size={20} />
            <span>
              <b>{name}</b>
              <small>{desc}</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
      <div className="home-agenda-grid">
        <section className="home-panel">
          <div className="home-panel-heading">
            <h2>
              <CalendarDays size={16} /> 财经日历
            </h2>
            <button onClick={() => onNavigate("news")}>
              查看全部 <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="home-agenda-list">
            {ECONOMIC_CALENDAR_DATA.slice(0, 3).map((e) => (
              <button key={e.id} onClick={() => onNavigate("news")}>
                <time>
                  {e.time}
                  <small>{e.currency}</small>
                </time>
                <span>
                  <b>{e.eventZh}</b>
                  <small>
                    前值 {e.previous}　预测 {e.forecast}　公布 {e.actual}
                  </small>
                </span>
                <i>{"•".repeat(e.importance)}</i>
              </button>
            ))}
          </div>
        </section>
        <section className="home-panel">
          <div className="home-panel-heading">
            <h2>
              <Coins size={16} /> 股息日历
            </h2>
            <span className="home-muted">每股派息 / 除息日</span>
          </div>
          <div className="home-agenda-list">
            {DIVIDEND_DATA.filter((d) => d.status === "upcoming")
              .slice(0, 3)
              .map((d) => (
                <button key={d.id} onClick={() => onSelect(d.symbol)}>
                  <span>
                    <b>{d.symbol}</b>
                    <small>{d.companyZh}</small>
                  </span>
                  <span className="dividend-value">
                    <b>${d.amountPerShare.toFixed(2)}</b>
                    <small>{d.exDate}</small>
                  </span>
                </button>
              ))}
          </div>
        </section>
        <section className="home-panel home-live-preview">
          <div className="home-panel-heading">
            <h2>
              <Radio size={16} /> 市场解读
            </h2>
            <span className="home-live-badge">直播间</span>
          </div>
          <div className="home-live-body">
            <span className="home-kicker">全球市场观察</span>
            <h3>黄金、美元与科技股：关注本周关键数据</h3>
            <p>宏观数据、重点品种走势与分析师观点。</p>
            <button onClick={() => onNavigate("live")}>
              进入直播间 <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
