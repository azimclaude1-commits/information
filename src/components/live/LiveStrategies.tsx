import React, { useState } from "react";
import { Bookmark, Clock3, Pencil, Plus } from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { DateLabel, EmptyState, LiveDialog, useNow } from "./LiveShared";
import { label, uid, type Lang, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";
import type { LiveStrategy, StrategyValues } from "./liveExperience";
import type { LiveTradeDraft } from "./LiveRoomTrade";

const STATUS = {
  watching: ["观察中", "Watching"],
  triggered: ["已触达", "Level reached"],
  ended: ["已结束", "Ended"],
  expired: ["已过期", "Expired"],
} as const;
/** Live distance to the plan: current price on a stop → target track plus reward/risk. */
function StrategyProgress({
  s,
  price,
  decimals,
  lang,
}: {
  s: LiveStrategy;
  price: number;
  decimals: number;
  lang: Lang;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const lo = Math.min(s.stop, s.target),
    hi = Math.max(s.stop, s.target);
  const at = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100));
  const rr = Math.abs(s.target - s.entry) / Math.max(Math.abs(s.entry - s.stop), 1e-9);
  const toTarget = ((s.target - price) / price) * 100;
  const pnlDir = s.side === "buy" ? price - s.entry : s.entry - price;
  return (
    <div className="lx-progress">
      <div className="lx-row">
        <span>
          {t("现价", "Last")} <b>{price.toFixed(decimals)}</b>
        </span>
        <span>
          {t("盈亏比", "Reward/risk")} <b>1 : {rr.toFixed(1)}</b>
        </span>
      </div>
      <div className="lx-track" aria-hidden="true">
        <i className="lx-track-entry" style={{ left: `${at(s.entry)}%` }} />
        <i className={`lx-track-now ${pnlDir >= 0 ? "is-up" : "is-down"}`} style={{ left: `${at(price)}%` }} />
      </div>
      <div className="lx-row lx-track-labels">
        <span>{s.side === "buy" ? t("止损", "Stop") : t("目标", "Target")} {lo}</span>
        <span>{s.side === "buy" ? t("目标", "Target") : t("止损", "Stop")} {hi}</span>
      </div>
      <small>
        {t("距目标", "To target")} {toTarget >= 0 ? "+" : ""}
        {toTarget.toFixed(2)}% · {t("相对参考价", "vs entry")}{" "}
        <span className={pnlDir >= 0 ? "text-up" : "text-down"}>
          {pnlDir >= 0 ? t("盈利方向", "in profit") : t("亏损方向", "against")}
        </span>
      </small>
    </div>
  );
}
function StrategyCard({
  strategy: s,
  lang,
  children,
  instrument,
}: {
  strategy: LiveStrategy;
  lang: Lang;
  children: React.ReactNode;
  instrument?: Instrument;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  return (
    <article className="lx-strategy">
      <div className="lx-row">
        <strong>
          {s.symbol}{" "}
          <span className={s.side === "buy" ? "text-up" : "text-down"}>
            {s.side === "buy" ? t("做多", "Long") : t("做空", "Short")}
          </span>
        </strong>
        <span className={`lx-status ${s.status}`}>
          {t(STATUS[s.status][0], STATUS[s.status][1])}
        </span>
      </div>
      <small>
        <DateLabel at={s.at} lang={lang} />
        {s.revisions.length > 0 &&
          ` · ${t("已修订", "Revised")} ${s.revisions.length}`}
      </small>
      <div className="lx-values">
        {[
          [t("参考价", "Entry"), s.entry],
          [t("目标价", "Target"), s.target],
          [t("止损价", "Stop"), s.stop],
        ].map(([title, v]) => (
          <div key={title}>
            <span>{title}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      {instrument && !["ended", "expired"].includes(s.status) && (
        <StrategyProgress s={s} price={instrument.price} decimals={instrument.decimals} lang={lang} />
      )}
      <p>{s.note}</p>
      <div className="lx-row lx-meta">
        <span>
          {s.trigger === "above"
            ? t("价格达到或高于参考价", "Price above entry")
            : t("价格达到或低于参考价", "Price below entry")}
        </span>
        <span>
          <Clock3 size={12} /> <DateLabel at={s.expiresAt} lang={lang} />
        </span>
      </div>
      {s.status === "triggered" && (
        <small>
          {t(
            "行情已触达参考价，订单成交以你的委托记录为准。",
            "The price reached the level. Check your orders for fills.",
          )}
        </small>
      )}
      {s.revisions.length > 0 && (
        <details>
          <summary>{t("修改记录", "Revision history")}</summary>
          {s.revisions.map((r, index) => (
            <div className="lx-revision" key={index}>
              <DateLabel at={r.at} lang={lang} />
              <span>
                {r.entry} / {r.target} / {r.stop}
              </span>
              <small>{r.note}</small>
            </div>
          ))}
        </details>
      )}
      <footer>{children}</footer>
    </article>
  );
}
export function ViewerStrategies({
  room,
  store,
  lang,
  onTrade,
  instruments = [],
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  onTrade: (draft: LiveTradeDraft) => void;
  instruments?: Instrument[];
}) {
  const [filter, setFilter] = useState("all"),
    now = useNow(),
    t = (zh: string, en: string) => label(lang, zh, en);
  const list = store.state.experience.rooms[room.id].strategies.filter(
    (s) => filter === "all" || store.state.experience.bookmarks.includes(s.id),
  );
  return (
    <div className="lx-panel">
      <div className="lx-options">
        {[
          ["all", t("本场策略", "Session strategies")],
          ["saved", t("已收藏", "Saved")],
        ].map(([id, name]) => (
          <button
            className="ui-chip"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            key={id}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="lx-scroll">
        {list.map((s) => (
          <StrategyCard
            key={s.id}
            strategy={s}
            lang={lang}
            instrument={instruments.find((i) => i.symbol === s.symbol)}
          >
            <button
              className="ui-btn"
              aria-pressed={store.state.experience.bookmarks.includes(s.id)}
              onClick={() => store.dispatch({ type: "x/bookmark", id: s.id })}
            >
              <Bookmark size={14} />
              {store.state.experience.bookmarks.includes(s.id)
                ? t("已收藏", "Saved")
                : t("收藏", "Save")}
            </button>
            <button
              className="ui-btn ui-btn-primary"
              disabled={
                s.expiresAt <= now || ["ended", "expired"].includes(s.status)
              }
              onClick={() =>
                onTrade({ symbol: s.symbol, side: s.side, strategy: s })
              }
            >
              {t("模拟下单", "Paper order")}
            </button>
          </StrategyCard>
        ))}
        {!list.length && (
          <EmptyState>{t("暂无策略", "No strategies")}</EmptyState>
        )}
      </div>
    </div>
  );
}
export function StudioStrategies({
  room,
  store,
  lang,
  instruments,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  instruments: Instrument[];
}) {
  const [editing, setEditing] = useState<LiveStrategy | "new" | null>(null),
    t = (zh: string, en: string) => label(lang, zh, en);
  return (
    <div className="lx-panel">
      <div className="lx-row">
        <span>
          {store.state.experience.rooms[room.id].strategies.length}{" "}
          {t("条策略", "strategies")}
        </span>
        <button
          className="ui-btn ui-btn-primary"
          disabled={room.status !== "live"}
          onClick={() => setEditing("new")}
        >
          <Plus size={14} />
          {t("发布策略", "Publish strategy")}
        </button>
      </div>
      <div className="lx-scroll">
        {store.state.experience.rooms[room.id].strategies.map((s) => (
          <StrategyCard key={s.id} strategy={s} lang={lang}>
            {["watching", "triggered"].includes(s.status) &&
              room.status === "live" && (
                <>
                  <button className="ui-btn" onClick={() => setEditing(s)}>
                    <Pencil size={14} />
                    {t("修订", "Revise")}
                  </button>
                  <button
                    className="ui-btn"
                    onClick={() =>
                      store.dispatch({
                        type: "x/strategyStatus",
                        roomId: room.id,
                        actor: room.host.id,
                        id: s.id,
                        status: "ended",
                        at: Date.now(),
                      })
                    }
                  >
                    {t("结束策略", "End strategy")}
                  </button>
                </>
              )}
          </StrategyCard>
        ))}
      </div>
      {editing && (
        <StrategyEditor
          room={room}
          store={store}
          lang={lang}
          instruments={instruments}
          strategy={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
function StrategyEditor({
  room,
  store,
  lang,
  instruments,
  strategy,
  onClose,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  instruments: Instrument[];
  strategy?: LiveStrategy;
  onClose: () => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    i = instruments.find(
      (i) => i.symbol === (strategy?.symbol || room.pinnedSymbol),
    )!;
  const [values, setValues] = useState<StrategyValues>(
      strategy || {
        symbol: i.symbol,
        side: "buy",
        entry: i.price,
        target: Number((i.price * 1.01).toFixed(i.decimals)),
        stop: Number((i.price * 0.995).toFixed(i.decimals)),
        trigger: "above",
        note: "",
        expiresAt: Date.now() + 3600000,
      },
    ),
    [minutes, setMinutes] = useState(60);
  return (
    <LiveDialog
      title={
        strategy
          ? t("修订策略", "Revise strategy")
          : t("发布策略", "Publish strategy")
      }
      onClose={onClose}
    >
      <form
        className="lx-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            store.dispatch({
              type: "x/strategy",
              roomId: room.id,
              actor: room.host.id,
              id: strategy?.id || uid(),
              values: { ...values, expiresAt: Date.now() + minutes * 60000 },
              at: Date.now(),
            })
          )
            onClose();
        }}
      >
        <div className="lx-two">
          <label>
            {t("品种", "Instrument")}
            <select
              value={values.symbol}
              onChange={(e) => {
                const n = instruments.find((i) => i.symbol === e.target.value)!;
                setValues({
                  ...values,
                  symbol: n.symbol,
                  entry: n.price,
                  target: Number(
                    (n.price * (values.side === "buy" ? 1.01 : 0.99)).toFixed(
                      n.decimals,
                    ),
                  ),
                  stop: Number(
                    (n.price * (values.side === "buy" ? 0.995 : 1.005)).toFixed(
                      n.decimals,
                    ),
                  ),
                });
              }}
            >
              {room.symbols.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            {t("方向", "Direction")}
            <select
              value={values.side}
              onChange={(e) => {
                const side = e.target.value as "buy" | "sell";
                setValues({
                  ...values,
                  side,
                  target: values.stop,
                  stop: values.target,
                });
              }}
            >
              <option value="buy">{t("做多", "Long")}</option>
              <option value="sell">{t("做空", "Short")}</option>
            </select>
          </label>
        </div>
        <div className="lx-three">
          {[
            ["entry", t("参考价", "Entry")],
            ["target", t("目标价", "Target")],
            ["stop", t("止损价", "Stop")],
          ].map(([key, title]) => (
            <label key={key}>
              {title}
              <input
                type="number"
                step="any"
                min="0.000001"
                required
                value={values[key as "entry" | "target" | "stop"]}
                onChange={(e) =>
                  setValues({ ...values, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <div className="lx-two">
          <label>
            {t("触达条件", "Trigger")}
            <select
              value={values.trigger}
              onChange={(e) =>
                setValues({
                  ...values,
                  trigger: e.target.value as "above" | "below",
                })
              }
            >
              <option value="above">
                {t("达到或高于参考价", "Above entry")}
              </option>
              <option value="below">
                {t("达到或低于参考价", "Below entry")}
              </option>
            </select>
          </label>
          <label>
            {t("有效期", "Valid for")}
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {[5, 15, 30, 60, 240, 1440].map((m) => (
                <option value={m} key={m}>
                  {m} {t("分钟", "min")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t("策略说明", "Rationale")}
          <textarea
            maxLength={400}
            value={values.note}
            onChange={(e) => setValues({ ...values, note: e.target.value })}
          />
        </label>
        <button className="ui-btn ui-btn-primary">
          {t("发布", "Publish")}
        </button>
      </form>
    </LiveDialog>
  );
}
