import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { Instrument } from "../../data/marketData";
import {
  defaultLeverage,
  marketOf,
  requiredMargin,
  type DemoTrading,
  type OrderType,
  type Side,
} from "../demoTrading";
import { label, uid, type Lang, type LiveRoom } from "./liveState";
import type { LiveStrategy } from "./liveExperience";
import type { LiveStore } from "./useLive";

export type LiveTradeDraft = {
  symbol: string;
  side: Side;
  strategy?: LiveStrategy;
};
export function LiveRoomTrade({
  draft,
  instruments,
  demo,
  room,
  store,
  lang,
  onClose,
  onFullTrade,
  onToast,
}: {
  draft: LiveTradeDraft;
  instruments: Instrument[];
  demo: DemoTrading;
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  onClose: () => void;
  onFullTrade: (s: string, side: Side) => void;
  onToast: (s: string) => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    i = instruments.find((i) => i.symbol === draft.symbol)!;
  const [side, setSide] = useState(draft.side),
    [type, setType] = useState<OrderType>(draft.strategy ? "limit" : "market"),
    [qty, setQty] = useState(marketOf(i) === "perp" ? "0.01" : "0.1"),
    [price, setPrice] = useState(String(draft.strategy?.entry || i.price)),
    [tp, setTp] = useState(String(draft.strategy?.target || "")),
    [sl, setSl] = useState(String(draft.strategy?.stop || "")),
    [leverage, setLeverage] = useState(defaultLeverage(i)),
    [receipt, setReceipt] = useState("");
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", handle);
    document.querySelector<HTMLElement>(".lx-trade-drawer button")?.focus();
    return () => {
      window.removeEventListener("keydown", handle);
      prior?.focus();
    };
  }, []);
  const current = side === "buy" ? i.ask : i.bid,
    market = marketOf(i),
    ref = type === "limit" ? Number(price) : current;
  const latest = store.state.experience.rooms[room.id]?.strategies.find(
    (s) => s.id === draft.strategy?.id,
  );
  const revised =
    !!draft.strategy &&
    !!latest &&
    latest.changedAt !== draft.strategy.changedAt &&
    latest.revisions.length !== draft.strategy.revisions.length;
  const stale =
    draft.strategy &&
    (revised ||
      draft.strategy.expiresAt <= Date.now() ||
      ["ended", "expired"].includes(
        store.state.experience.rooms[room.id]?.strategies.find(
          (s) => s.id === draft.strategy?.id,
        )?.status || draft.strategy.status,
      ));
  const margin =
    Number(qty) > 0 && ref > 0
      ? requiredMargin(i, Number(qty), ref, leverage)
      : 0;
  return (
    <div
      className="lx-trade-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="lx-trade-drawer"
        role="dialog"
        aria-modal="false"
        aria-label={t("直播间模拟下单", "Paper order")}
      >
        <header>
          <div>
            <small>{t("模拟交易", "PAPER TRADING")}</small>
            <h3>{i.symbol}</h3>
          </div>
          <button
            className="live-icon-btn"
            aria-label={t("关闭下单", "Close order")}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <form
          className="lx-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (stale) {
              onToast(
                t(
                  revised
                    ? "策略已修订，请重新打开下单核对参数"
                    : "策略已结束，请重新评估参数",
                  "Strategy expired. Review the parameters.",
                ),
              );
              return;
            }
            const result = demo.placeOrder({
              market,
              symbol: i.symbol,
              side,
              type,
              qty: Number(qty),
              leverage,
              marginMode: "cross",
              price: type === "limit" ? Number(price) : undefined,
              takeProfit: tp ? Number(tp) : undefined,
              stopLoss: sl ? Number(sl) : undefined,
            });
            onToast(result.message);
            if (result.ok) {
              setReceipt(
                type === "limit"
                  ? t("限价委托已提交", "Limit order placed")
                  : t("模拟持仓已建立", "Paper position opened"),
              );
              store.dispatch({
                type: "x/metric",
                roomId: room.id,
                kind: "order",
                id: uid(),
                at: Date.now(),
              });
            }
          }}
        >
          <div className="lx-price">
            <span>{t("最新价", "Last price")}</span>
            <b>{current.toFixed(i.decimals)}</b>
            {draft.strategy && (
              <small>
                {t("较策略参考价", "From strategy entry")}{" "}
                {((current / draft.strategy.entry - 1) * 100).toFixed(2)}%
              </small>
            )}
          </div>
          {stale && (
            <p className="text-down">
              {t(
                revised ? "策略已修订，请关闭后重新打开" : "该策略已结束或过期",
                "This strategy has ended or expired",
              )}
            </p>
          )}
          <div className="ui-seg">
            <button
              type="button"
              aria-pressed={side === "buy"}
              onClick={() => setSide("buy")}
            >
              {t("买入 / 做多", "Buy / Long")}
            </button>
            <button
              type="button"
              aria-pressed={side === "sell"}
              onClick={() => setSide("sell")}
            >
              {t("卖出 / 做空", "Sell / Short")}
            </button>
          </div>
          <div className="lx-two">
            <label>
              {t("订单类型", "Order type")}
              <select
                value={type}
                onChange={(e) => setType(e.target.value as OrderType)}
              >
                <option value="market">{t("市价", "Market")}</option>
                <option value="limit">{t("限价", "Limit")}</option>
              </select>
            </label>
            <label>
              {t("杠杆", "Leverage")}
              <select
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
              >
                {[
                  ...new Set([
                    1,
                    5,
                    10,
                    20,
                    50,
                    100,
                    i.leverage,
                    defaultLeverage(i),
                  ]),
                ]
                  .filter((v) => v <= i.leverage)
                  .sort((a, b) => a - b)
                  .map((v) => (
                    <option key={v} value={v}>
                      {v}x
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="lx-two">
            {type === "limit" && (
              <label>
                {t("委托价格", "Limit price")}
                <input
                  aria-label={t("直播委托价格", "Live limit price")}
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            )}
            <label>
              {market === "perp" ? t("数量", "Quantity") : t("手数", "Lots")}
              <input
                aria-label={t("直播下单数量", "Live order quantity")}
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
          </div>
          <div className="lx-two">
            <label>
              {t("止盈价", "Take profit")}
              <input
                aria-label={t("直播止盈价", "Live take profit")}
                inputMode="decimal"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
              />
            </label>
            <label>
              {t("止损价", "Stop loss")}
              <input
                aria-label={t("直播止损价", "Live stop loss")}
                inputMode="decimal"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
              />
            </label>
          </div>
          <div className="lx-row">
            <span>{t("所需 / 可用保证金", "Required / available margin")}</span>
            <b>
              {margin.toFixed(2)} / {demo.summary[market].freeMargin.toFixed(2)}{" "}
              {demo.summary[market].coin}
            </b>
          </div>
          {receipt ? (
            <div className="lx-success" role="status">
              {receipt}
              <button type="button" className="ui-btn" onClick={onClose}>
                {t("完成", "Done")}
              </button>
            </div>
          ) : (
            <button
              className={`ui-btn lx-full ${side === "buy" ? "lx-buy" : "lx-sell"}`}
              disabled={!!stale || room.status === "scheduled"}
            >
              {t("确认模拟下单", "Confirm paper order")}
            </button>
          )}
          <button
            type="button"
            className="live-text-btn"
            onClick={() => {
              store.dispatch({
                type: "x/preference",
                floatingRoom: room.status === "live" ? room.id : null,
              });
              onFullTrade(i.symbol, side);
            }}
          >
            {t("打开完整交易台", "Open trading desk")}
            <ArrowUpRight size={14} />
          </button>
        </form>
      </section>
    </div>
  );
}
