import React, { useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { Instrument } from "../data/marketData";
import { number, signed, useSavedState } from "./marketModel";
import {
  AccountSummary,
  DemoFill,
  DemoOrder,
  MarketKind,
  PositionRow,
  REASON_LABEL,
  displaySymbol,
  stamp,
} from "./demoTrading";
import { CloseAllSheet, CloseSheet, ProtectSheet } from "./TradeSheets";

interface Props {
  expanded?: boolean;
  market: MarketKind;
  lang: "zh" | "en";
  rows: PositionRow[];
  orders: DemoOrder[];
  fills: DemoFill[];
  summary: AccountSummary;
  instruments: Instrument[];
  orderMargin: (o: DemoOrder) => number;
  onSelectSymbol: (symbol: string) => void;
  onClose: (id: string) => void;
  onCloseAll: () => void;
  onCancel: (id: string) => void;
  onUpdateProtection: (id: string, tp?: number, sl?: number) => void;
  onOpenAssets: () => void;
}

type Tab = "positions" | "orders" | "history";

export function PositionsPanel({
  expanded = false,
  market,
  lang,
  rows,
  orders,
  fills,
  summary,
  instruments,
  orderMargin,
  onSelectSymbol,
  onClose,
  onCloseAll,
  onCancel,
  onUpdateProtection,
  onOpenAssets,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const perp = market === "perp";
  const [tab, setTab] = useState<Tab>("positions");
  const [savedCollapsed, setCollapsed] = useSavedState(
    "alphapulse.positions.collapsed",
    false,
  );
  const collapsed = expanded ? false : savedCollapsed;
  const [editing, setEditing] = useState<{ id: string; kind: "tp" | "sl" } | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [closingAll, setClosingAll] = useState(false);
  const editRow = editing && rows.find((r) => r.id === editing.id);
  const closeRow = closing && rows.find((r) => r.id === closing);
  const dp = (symbol: string) =>
    instruments.find((i) => i.symbol === symbol)?.decimals ?? 2;
  const name = (symbol: string) => displaySymbol(symbol, market);
  const qtyLabel = (symbol: string, qty: number) =>
    perp
      ? `${qty.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol.split("/")[0]}`
      : `${number(qty, 2)} ${t("手", "lots")}`;
  const time = (ts: number) => stamp(ts).slice(5, 16);

  const sideTag = (side: "buy" | "sell", leverage: number, mode?: string) => (
    <span className={`tp-side ${side === "buy" ? "is-buy" : "is-sell"}`}>
      {side === "buy"
        ? perp
          ? t("多", "Long")
          : t("买", "Buy")
        : perp
          ? t("空", "Short")
          : t("卖", "Sell")}
      <em>
        {mode ? `${mode} ` : ""}
        {leverage}x
      </em>
    </span>
  );
  const modeLabel = (m: string) =>
    perp ? (m === "cross" ? t("全仓", "Cross") : t("逐仓", "Iso")) : undefined;

  // [id, prefix hidden on phones, label, count]
  const tabs: [Tab, string, string, number][] = [
    ["positions", t("当前", ""), t("持仓", "Positions"), rows.length],
    ["orders", t("当前", "Open "), t("委托", "orders"), orders.length],
    ["history", "", t("历史成交", "History"), fills.length],
  ];

  return (
    <section className={`trade-positions ${collapsed ? "is-collapsed" : ""}`}>
      <header className="tp-head">
        <div
          className="tp-tabs"
          role="tablist"
          aria-label={t("持仓与订单", "Positions & orders")}
        >
          {tabs.map(([id, prefix, label, n]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setCollapsed(false);
              }}
            >
              <span>
                {prefix && <span className="tp-prefix">{prefix}</span>}
                {label}
              </span>
              <em>{n}</em>
            </button>
          ))}
        </div>
        <div className="tp-metrics">
          <span>
            {t("权益", "Equity")} <b>{number(summary.equity, 2)}</b>
          </span>
          <span>
            {t("浮动盈亏", "uPnL")}{" "}
            <b className={summary.unrealized >= 0 ? "up" : "down"}>
              {signed(summary.unrealized)}
            </b>
          </span>
          <span>
            {t("可用", "Free")}{" "}
            <b>{number(Math.max(0, summary.freeMargin), 2)}</b>
          </span>
          <small>{summary.coin}</small>
        </div>
        <div className="tp-actions">
          {tab === "positions" && rows.length > 0 && !collapsed && (
            <button className="tp-closeall" onClick={() => setClosingAll(true)}>
              {t("全部平仓", "Close all")}
            </button>
          )}
          <button
            className="tp-icon"
            title={t("模拟资产", "Demo assets")}
            onClick={onOpenAssets}
          >
            <Wallet size={14} />
          </button>
          <button
            className="tp-icon tp-collapse"
            title={collapsed ? t("展开", "Expand") : t("收起", "Collapse")}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronDown
              size={15}
              style={{ transform: collapsed ? "rotate(180deg)" : undefined }}
            />
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="tp-body">
          {tab === "positions" && (
            <table className="tp-table" data-kind={tab}>
              <thead>
                <tr>
                  <th>
                    {perp
                      ? t("合约 / 数量", "Contract / size")
                      : t("品种 / 手数", "Symbol / lots")}
                  </th>
                  <th>
                    {perp
                      ? t("开仓 / 标记价", "Entry / mark")
                      : t("开仓 / 现价", "Entry / price")}
                  </th>
                  {perp && <th className="tp-c-liq">{t("强平价", "Liq.")}</th>}
                  <th>{t("止盈 / 止损", "TP / SL")}</th>
                  <th className="tp-c-margin">{t("保证金", "Margin")}</th>
                  <th>{t("浮动盈亏", "uPnL")}</th>
                  <th>{t("操作", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="tp-a-sym">
                      <button
                        className="tp-symbol"
                        onClick={() => onSelectSymbol(r.symbol)}
                      >
                        <b>{name(r.symbol)}</b>
                        {sideTag(r.side, r.leverage, modeLabel(r.marginMode))}
                      </button>
                      <small>{qtyLabel(r.symbol, r.qty)}</small>
                    </td>
                    <td
                      className="tp-a-price"
                      data-label={
                        perp
                          ? t("开仓 / 标记价", "Entry / mark")
                          : t("开仓 / 现价", "Entry / price")
                      }
                    >
                      {number(r.entryPrice, r.decimals)}
                      <small>{number(r.markPrice, r.decimals)}</small>
                    </td>
                    {perp && (
                      <td
                        className="tp-c-liq warn"
                        data-label={t("强平价", "Liq. price")}
                      >
                        {r.liqPrice ? number(r.liqPrice, r.decimals) : "—"}
                      </td>
                    )}
                    <td
                      className="tp-a-prot"
                      data-label={t("止盈 / 止损", "TP / SL")}
                    >
                      <span className="tp-protect">
                        <button
                          className="up"
                          title={t("修改止盈", "Edit take profit")}
                          onClick={() => setEditing({ id: r.id, kind: "tp" })}
                        >
                          {r.takeProfit
                            ? number(r.takeProfit, r.decimals)
                            : t("止盈", "TP")}
                        </button>
                        <button
                          className="down"
                          title={t("修改止损", "Edit stop loss")}
                          onClick={() => setEditing({ id: r.id, kind: "sl" })}
                        >
                          {r.stopLoss
                            ? number(r.stopLoss, r.decimals)
                            : t("止损", "SL")}
                        </button>
                      </span>
                    </td>
                    <td
                      className="tp-c-margin"
                      data-label={t("保证金", "Margin")}
                    >
                      {number(r.margin, 2)}
                    </td>
                    <td className={`tp-a-pnl ${r.pnl >= 0 ? "up" : "down"}`}>
                      <b>{signed(r.pnl)}</b>
                      <small>{signed(r.roe)}%</small>
                    </td>
                    <td className="tp-a-act">
                      <button
                        className="tp-close"
                        onClick={() => setClosing(r.id)}
                      >
                        {perp ? t("市价平仓", "Close") : t("平仓", "Close")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "orders" && (
            <table className="tp-table" data-kind={tab}>
              <thead>
                <tr>
                  <th>
                    {perp
                      ? t("合约 / 数量", "Contract / size")
                      : t("品种 / 手数", "Symbol / lots")}
                  </th>
                  <th>{t("限价委托价", "Limit price")}</th>
                  <th>{t("止盈 / 止损", "TP / SL")}</th>
                  <th className="tp-c-margin">{t("冻结保证金", "Frozen")}</th>
                  <th className="tp-c-liq">{t("委托时间", "Time")}</th>
                  <th>{t("操作", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="tp-a-sym">
                      <button
                        className="tp-symbol"
                        onClick={() => onSelectSymbol(o.symbol)}
                      >
                        <b>{name(o.symbol)}</b>
                        {sideTag(o.side, o.leverage, modeLabel(o.marginMode))}
                      </button>
                      <small>{qtyLabel(o.symbol, o.qty)}</small>
                    </td>
                    <td
                      className="tp-a-price"
                      data-label={t("限价委托价", "Limit price")}
                    >
                      {number(o.price, dp(o.symbol))}
                    </td>
                    <td
                      className="tp-a-prot"
                      data-label={t("止盈 / 止损", "TP / SL")}
                    >
                      <span className="up">
                        {o.takeProfit
                          ? number(o.takeProfit, dp(o.symbol))
                          : "—"}
                      </span>
                      <small className="down">
                        {o.stopLoss ? number(o.stopLoss, dp(o.symbol)) : "—"}
                      </small>
                    </td>
                    <td
                      className="tp-c-margin"
                      data-label={t("冻结保证金", "Frozen")}
                    >
                      {number(orderMargin(o), 2)}
                    </td>
                    <td
                      className="tp-c-liq tp-a-time muted"
                      data-label={t("委托时间", "Time")}
                    >
                      {time(o.createdAt)}
                    </td>
                    <td className="tp-a-act">
                      <button
                        className="tp-close"
                        onClick={() => onCancel(o.id)}
                      >
                        {t("撤单", "Cancel")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "history" && (
            <table className="tp-table" data-kind={tab}>
              <thead>
                <tr>
                  <th>
                    {perp
                      ? t("合约 / 数量", "Contract / size")
                      : t("品种 / 手数", "Symbol / lots")}
                  </th>
                  <th>{t("开仓 / 平仓价", "Entry / exit")}</th>
                  <th>{t("已实现盈亏", "Realized P&L")}</th>
                  <th>{t("平仓方式", "Reason")}</th>
                  <th className="tp-c-liq">{t("平仓时间", "Closed")}</th>
                </tr>
              </thead>
              <tbody>
                {fills.map((f) => (
                  <tr key={`${f.id}-${f.closedAt}`}>
                    <td className="tp-a-sym">
                      <button
                        className="tp-symbol"
                        onClick={() => onSelectSymbol(f.symbol)}
                      >
                        <b>{name(f.symbol)}</b>
                        {sideTag(f.side, f.leverage)}
                      </button>
                      <small>{qtyLabel(f.symbol, f.qty)}</small>
                    </td>
                    <td
                      className="tp-a-price"
                      data-label={t("开仓 / 平仓价", "Entry / exit")}
                    >
                      {number(f.entryPrice, dp(f.symbol))}
                      <small>{number(f.exitPrice, dp(f.symbol))}</small>
                    </td>
                    <td className={`tp-a-pnl ${f.pnl >= 0 ? "up" : "down"}`}>
                      <b>{signed(f.pnl)}</b>
                    </td>
                    <td className="tp-a-act">
                      <span className={`tp-reason is-${f.reason}`}>
                        {t(...REASON_LABEL[f.reason])}
                      </span>
                    </td>
                    <td
                      className="tp-c-liq tp-a-time muted"
                      data-label={t("平仓时间", "Closed")}
                    >
                      {time(f.closedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {((tab === "positions" && !rows.length) ||
            (tab === "orders" && !orders.length) ||
            (tab === "history" && !fills.length)) && (
            <div className="tp-empty">
              {tab === "positions"
                ? t(
                    "暂无模拟持仓，可在下单面板开仓",
                    "No demo positions — open one from the order panel",
                  )
                : tab === "orders"
                  ? t(
                      "暂无挂单，可在下单面板选择「限价单」",
                      "No open orders — choose Limit in the order panel",
                    )
                  : t("暂无历史成交", "No closed trades yet")}
            </div>
          )}
        </div>
      )}

      {editRow && editing && (
        <ProtectSheet
          lang={lang}
          row={editRow}
          kind={editing.kind}
          onClose={() => setEditing(null)}
          onSave={(tp, sl) => {
            onUpdateProtection(editRow.id, tp, sl);
            setEditing(null);
          }}
        />
      )}
      {closeRow && (
        <CloseSheet
          lang={lang}
          row={closeRow}
          onClose={() => setClosing(null)}
          onConfirm={() => {
            onClose(closeRow.id);
            setClosing(null);
          }}
        />
      )}
      {closingAll && rows.length > 0 && (
        <CloseAllSheet
          lang={lang}
          rows={rows}
          onClose={() => setClosingAll(false)}
          onConfirm={() => {
            onCloseAll();
            setClosingAll(false);
          }}
        />
      )}
    </section>
  );
}
