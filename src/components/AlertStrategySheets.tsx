import React, { useState } from "react";
import { BellRing, Bot, Info, Trash2 } from "lucide-react";
import type { Instrument } from "../data/marketData";
import { number } from "./marketModel";
import { Sheet } from "./ui/Sheet";
import type { Alert, Strategy } from "./MarketDetails";

type Lang = "zh" | "en";
const tr = (lang: Lang) => (zh: string, en: string) => (lang === "zh" ? zh : en);
const DAY = 86400000;
const pctOf = (target: number, price: number) => ((target - price) / price) * 100;
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

function PriceHead({ i, lang }: { i: Instrument; lang: Lang }) {
  const t = tr(lang);
  return (
    <div className="as-head">
      <div>
        <small>{t("当前价格", "Last price")}</small>
        <b>{number(i.price, i.decimals)}</b>
      </div>
      <span className={i.changePercent24h >= 0 ? "sh-up" : "sh-down"}>{fmtPct(i.changePercent24h)}</span>
      <div className="as-range">
        <small>{t("24H 区间", "24H range")}</small>
        <span>
          {number(i.low24h, i.decimals)} – {number(i.high24h, i.decimals)}
        </span>
      </div>
    </div>
  );
}

/** 价格预警设置 */
export function PriceAlertSheet({
  lang,
  instrument: i,
  alerts,
  initialPrice,
  onAdd,
  onDelete,
  onClose,
}: {
  lang: Lang;
  instrument: Instrument;
  alerts: Alert[];
  initialPrice?: number;
  onAdd: (a: Omit<Alert, "id" | "triggered">) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const [mode, setMode] = useState<"price" | "pct">("price");
  const [priceText, setPriceText] = useState(
    (initialPrice && Math.abs(initialPrice - i.price) > 10 ** -i.decimals ? initialPrice : i.price * 1.01).toFixed(i.decimals),
  );
  const [pctText, setPctText] = useState("1");
  const [valid, setValid] = useState<number>(7);
  const [channels, setChannels] = useState<string[]>(["app", "sound"]);
  const target = mode === "price" ? Number(priceText) : i.price * (1 + Number(pctText) / 100);
  const ok = Number.isFinite(target) && target > 0 && Math.abs(target - i.price) > 10 ** -i.decimals / 2;
  const direction: "above" | "below" = target >= i.price ? "above" : "below";
  const mine = alerts.filter((a) => a.symbol === i.symbol);
  const full = mine.filter((a) => !a.triggered).length >= 10;
  const now = Date.now();
  const status = (a: Alert) =>
    a.triggered ? ["muted", t("已触发", "Triggered")] : a.expiresAt && a.expiresAt < now ? ["muted", t("已过期", "Expired")] : ["up", t("监测中", "Watching")];
  return (
    <Sheet
      title={`${t("价格预警", "Price alert")} · ${i.symbol}`}
      onClose={onClose}
      footer={
        <button
          className="sh-btn sh-btn-primary"
          disabled={!ok || full}
          onClick={() => {
            onAdd({
              symbol: i.symbol,
              price: Number(target.toFixed(i.decimals)),
              direction,
              expiresAt: valid ? now + valid * DAY : undefined,
              channels,
              createdAt: now,
            });
            setPriceText((i.price * 1.01).toFixed(i.decimals));
          }}
        >
          <BellRing size={16} />
          {full ? t("最多 10 条进行中的预警", "Max 10 active alerts") : t("添加预警", "Add alert")}
        </button>
      }
    >
      <PriceHead i={i} lang={lang} />
      <div className="sh-seg as-seg">
        <button aria-pressed={mode === "price"} onClick={() => setMode("price")}>
          {t("价格到达", "Price reaches")}
        </button>
        <button aria-pressed={mode === "pct"} onClick={() => setMode("pct")}>
          {t("涨跌幅", "% change")}
        </button>
      </div>
      {mode === "price" ? (
        <label className="sh-field">
          <span>
            {t("目标价格", "Target price")}
            {ok && <em className={direction === "above" ? "sh-up" : "sh-down"}>{t(`距当前 ${fmtPct(pctOf(target, i.price))}`, `${fmtPct(pctOf(target, i.price))} from now`)}</em>}
          </span>
          <div className="sh-inputbox">
            <input inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.]/g, ""))} />
            <b>USD</b>
          </div>
        </label>
      ) : (
        <label className="sh-field">
          <span>
            {t("相对当前价涨跌", "Change from last price")}
            {ok && <em>≈ {number(target, i.decimals)}</em>}
          </span>
          <div className="sh-inputbox">
            <input inputMode="decimal" value={pctText} onChange={(e) => setPctText(e.target.value.replace(/[^\d.-]/g, ""))} />
            <b>%</b>
          </div>
        </label>
      )}
      <div className="sh-chips">
        {[-5, -2, -1, 1, 2, 5].map((p) => (
          <button
            key={p}
            onClick={() => {
              if (mode === "pct") setPctText(String(p));
              else setPriceText((i.price * (1 + p / 100)).toFixed(i.decimals));
            }}
          >
            {p > 0 ? "+" : ""}
            {p}%
          </button>
        ))}
      </div>
      {ok && (
        <p className={`sh-note ${direction === "above" ? "is-ok" : "is-danger"}`}>
          <Info size={15} />
          {direction === "above"
            ? t(`价格上涨至 ${number(target, i.decimals)} 或以上时提醒我`, `Alert me when the price rises to ${number(target, i.decimals)} or above`)
            : t(`价格下跌至 ${number(target, i.decimals)} 或以下时提醒我`, `Alert me when the price falls to ${number(target, i.decimals)} or below`)}
        </p>
      )}
      <div className="sh-section">
        <h3>{t("有效期", "Valid for")}</h3>
        <div className="sh-chips">
          {[
            [1, t("24 小时", "24 hours")],
            [7, t("7 天", "7 days")],
            [30, t("30 天", "30 days")],
            [0, t("长期有效", "Until triggered")],
          ].map(([d, label]) => (
            <button key={d} aria-pressed={valid === d} onClick={() => setValid(d as number)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="sh-section">
        <h3>{t("提醒方式", "Notify via")}</h3>
        <div className="sh-chips">
          {[
            ["app", t("站内通知", "In-app")],
            ["sound", t("提示音", "Sound")],
            ["email", t("邮件", "Email")],
          ].map(([k, label]) => (
            <button
              key={k}
              aria-pressed={channels.includes(k)}
              onClick={() => setChannels((old) => (old.includes(k) ? (old.length > 1 ? old.filter((x) => x !== k) : old) : [...old, k]))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="sh-section">
        <h3>{t(`我的预警（${mine.length}）`, `My alerts (${mine.length})`)}</h3>
        {mine.length ? (
          <div className="sh-list">
            {mine.map((a) => {
              const [tone, label] = status(a);
              return (
                <div key={a.id}>
                  <div className="sh-li-main">
                    <b className={a.direction === "above" ? "sh-up" : "sh-down"}>
                      {a.direction === "above" ? "≥" : "≤"} {number(a.price, i.decimals)}
                    </b>
                    <small>
                      {a.expiresAt ? t(`有效至 ${new Date(a.expiresAt).toLocaleDateString("zh-CN")}`, `Until ${new Date(a.expiresAt).toLocaleDateString("en-US")}`) : t("长期有效", "Until triggered")}
                    </small>
                  </div>
                  <span className={`sh-badge ${tone === "up" ? "is-ok" : ""}`}>{label}</span>
                  <button className="sh-icon" aria-label={t("删除预警", "Delete alert")} onClick={() => onDelete(a.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="sh-hint">{t("还没有为该品种设置预警", "No alerts for this instrument yet")}</p>
        )}
      </div>
    </Sheet>
  );
}

/** 创建价格条件策略 */
export function StrategySheet({
  lang,
  instrument: i,
  initial,
  onCreate,
  onClose,
}: {
  lang: Lang;
  instrument: Instrument;
  initial: { name: string; price: number; direction: "above" | "below"; template?: string };
  onCreate: (s: Omit<Strategy, "id" | "active" | "triggered">) => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const [name, setName] = useState(initial.name);
  const [direction, setDirection] = useState(initial.direction);
  const [priceText, setPriceText] = useState(initial.price.toFixed(i.decimals));
  const [period, setPeriod] = useState("4H");
  const [side, setSide] = useState<"buy" | "sell" | null>(initial.direction === "above" ? "buy" : "sell");
  const [qtyText, setQtyText] = useState(i.category === "crypto" ? "0.1" : "1");
  const [valid, setValid] = useState(7);
  const price = Number(priceText);
  const qty = Number(qtyText);
  const wrong = price > 0 && (direction === "above" ? price <= i.price : price >= i.price);
  const ok = name.trim().length > 0 && price > 0 && !wrong && (!side || qty > 0);
  const unit = i.category === "crypto" ? i.symbol.split("/")[0] : t("手", "lots");
  const sentence =
    price > 0
      ? t(
          `当 ${i.symbol} ${period} 收盘价${direction === "above" ? "≥" : "≤"} ${number(price, i.decimals)} 时，${side ? `提醒我${side === "buy" ? "买入" : "卖出"} ${qtyText} ${unit}` : "推送提醒"}`,
          `When ${i.symbol} closes ${direction === "above" ? "≥" : "≤"} ${number(price, i.decimals)} on ${period}, ${side ? `remind me to ${side} ${qtyText} ${unit}` : "notify me"}`,
        )
      : "";
  return (
    <Sheet
      title={`${t("创建策略", "Create strategy")} · ${i.symbol}`}
      subtitle={initial.template ? t(`来自模板「${initial.template}」`, `From template “${initial.template}”`) : t("价格条件策略", "Price-condition strategy")}
      onClose={onClose}
      footer={
        <button
          className="sh-btn sh-btn-primary"
          disabled={!ok}
          onClick={() =>
            onCreate({
              symbol: i.symbol,
              name: name.trim(),
              price: Number(price.toFixed(i.decimals)),
              direction,
              period,
              action: side ? { side, qty } : undefined,
              expiresAt: valid ? Date.now() + valid * DAY : undefined,
              createdAt: Date.now(),
            })
          }
        >
          <Bot size={16} />
          {t("开始模拟运行", "Start demo run")}
        </button>
      }
    >
      <PriceHead i={i} lang={lang} />
      <label className="sh-field">
        <span>
          {t("策略名称", "Name")} <em>{name.length}/40</em>
        </span>
        <input className="sh-input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="sh-field">
        <span>{t("触发条件", "Condition")}</span>
        <div className="sh-seg is-trade">
          <button
            data-side="buy"
            aria-pressed={direction === "above"}
            onClick={() => {
              setDirection("above");
              if (price <= i.price) setPriceText((i.price * 1.01).toFixed(i.decimals));
            }}
          >
            {t("价格 ≥ 目标价", "Price ≥ target")}
          </button>
          <button
            data-side="sell"
            aria-pressed={direction === "below"}
            onClick={() => {
              setDirection("below");
              if (price >= i.price) setPriceText((i.price * 0.99).toFixed(i.decimals));
            }}
          >
            {t("价格 ≤ 目标价", "Price ≤ target")}
          </button>
        </div>
      </div>
      <label className="sh-field">
        <span>
          {t("目标价格", "Target price")}
          {price > 0 && <em>{t(`距当前 ${fmtPct(pctOf(price, i.price))}`, `${fmtPct(pctOf(price, i.price))} away`)}</em>}
        </span>
        <div className={`sh-inputbox ${wrong ? "is-invalid" : ""}`}>
          <input inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.]/g, ""))} />
          <b>USD</b>
        </div>
        {wrong && <small className="sh-error">{direction === "above" ? t("目标价需高于当前价", "Target must be above the price") : t("目标价需低于当前价", "Target must be below the price")}</small>}
      </label>
      <div className="sh-chips">
        {(direction === "above" ? [1, 2, 3, 5] : [-1, -2, -3, -5]).map((p) => (
          <button key={p} onClick={() => setPriceText((i.price * (1 + p / 100)).toFixed(i.decimals))}>
            {p > 0 ? "+" : ""}
            {p}%
          </button>
        ))}
      </div>
      <div className="sh-section">
        <h3>{t("确认周期（K 线收盘价）", "Confirmation (candle close)")}</h3>
        <div className="sh-chips">
          {["15m", "1H", "4H", "1D"].map((p) => (
            <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="sh-section">
        <h3>{t("触发后", "When triggered")}</h3>
        <div className="sh-seg">
          <button aria-pressed={side === null} onClick={() => setSide(null)}>
            {t("仅提醒", "Notify only")}
          </button>
          <button aria-pressed={side === "buy"} onClick={() => setSide("buy")}>
            {t("提醒买入", "Suggest buy")}
          </button>
          <button aria-pressed={side === "sell"} onClick={() => setSide("sell")}>
            {t("提醒卖出", "Suggest sell")}
          </button>
        </div>
        {side && (
          <label className="sh-field" style={{ marginTop: 10 }}>
            <span>{t("建议数量", "Suggested size")}</span>
            <div className="sh-inputbox">
              <input inputMode="decimal" value={qtyText} onChange={(e) => setQtyText(e.target.value.replace(/[^\d.]/g, ""))} />
              <b>{unit}</b>
            </div>
          </label>
        )}
      </div>
      <div className="sh-section">
        <h3>{t("运行期限", "Run for")}</h3>
        <div className="sh-chips">
          {[
            [1, t("24 小时", "24 hours")],
            [7, t("7 天", "7 days")],
            [30, t("30 天", "30 days")],
            [0, t("长期", "Until triggered")],
          ].map(([d, label]) => (
            <button key={d} aria-pressed={valid === d} onClick={() => setValid(d as number)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {sentence && !wrong && (
        <p className="sh-note is-info">
          <Bot size={15} />
          {sentence}
        </p>
      )}
      <p className="sh-hint">{t("模拟策略只做提醒，不会自动下单。", "Demo strategies only notify — they never place orders.")}</p>
    </Sheet>
  );
}
