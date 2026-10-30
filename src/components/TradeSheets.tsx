import React, { useState } from "react";
import { AlertTriangle, ArrowLeftRight, Info, Minus, Plus, Wallet } from "lucide-react";
import { number, signed } from "./marketModel";
import { displaySymbol, pnlAt, type AccountSummary, type PositionRow } from "./demoTrading";
import { ConfirmSheet, Sheet, SheetRows } from "./ui/Sheet";

type Lang = "zh" | "en";
const tr = (lang: Lang) => (zh: string, en: string) => (lang === "zh" ? zh : en);
const sideText = (r: PositionRow, t: ReturnType<typeof tr>) =>
  `${r.side === "buy" ? (r.market === "perp" ? t("多", "Long") : t("买入", "Buy")) : r.market === "perp" ? t("空", "Short") : t("卖出", "Sell")} · ${r.leverage}x`;
const qtyText = (r: PositionRow, t: ReturnType<typeof tr>) =>
  r.market === "perp" ? `${r.qty} ${r.symbol.split("/")[0]}` : `${number(r.qty, 2)} ${t("手", "lots")}`;
const estPnl = (r: PositionRow, price: number) => (r.instrument ? pnlAt(r, r.instrument, price) : 0);

/** 修改止盈 / 修改止损: one level at a time, with % presets and P&L estimate. */
export function ProtectSheet({
  lang,
  row: r,
  kind,
  onSave,
  onClose,
}: {
  lang: Lang;
  row: PositionRow;
  kind: "tp" | "sl";
  onSave: (tp: number | undefined, sl: number | undefined) => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const tp = kind === "tp";
  const long = r.side === "buy";
  const current = tp ? r.takeProfit : r.stopLoss;
  const [text, setText] = useState(current ? current.toFixed(r.decimals) : "");
  const [preset, setPreset] = useState<number | null>(null);
  const price = Number(text);
  const valid = text.trim() !== "" && price > 0;
  // TP above / SL below the mark for longs; reversed for shorts
  const above = tp === long;
  const wrongSide = valid && (above ? price <= r.markPrice : price >= r.markPrice);
  const tick = 10 ** -r.decimals;
  const stepBy = Math.max(tick, Number((r.markPrice * 0.001).toPrecision(2)));
  const set = (v: number) => setText(Math.max(tick, v).toFixed(r.decimals));
  const pnl = valid ? estPnl(r, price) : 0;
  const roe = r.margin > 0 ? (pnl / r.margin) * 100 : 0;
  const pcts = [0.5, 1, 2, 5];
  const other = tp ? r.stopLoss : r.takeProfit;
  return (
    <Sheet
      title={`${tp ? t("修改止盈", "Edit take profit") : t("修改止损", "Edit stop loss")} · ${displaySymbol(r.symbol, r.market)}`}
      subtitle={`${sideText(r, t)} · ${qtyText(r, t)}`}
      onClose={onClose}
      footer={
        <>
          {current && (
            <button className="sh-btn" onClick={() => onSave(tp ? undefined : r.takeProfit, tp ? r.stopLoss : undefined)}>
              {tp ? t("取消止盈", "Remove TP") : t("取消止损", "Remove SL")}
            </button>
          )}
          <button
            className={`sh-btn ${tp ? "sh-btn-up" : "sh-btn-danger"}`}
            disabled={!valid || wrongSide}
            onClick={() => onSave(tp ? price : r.takeProfit, tp ? r.stopLoss : price)}
          >
            {t("确认", "Confirm")}
          </button>
        </>
      }
    >
      <div className="ts-prices">
        <div>
          <small>{t("开仓价", "Entry")}</small>
          <b>{number(r.entryPrice, r.decimals)}</b>
        </div>
        <div>
          <small>{r.market === "perp" ? t("标记价", "Mark") : t("现价", "Price")}</small>
          <b>{number(r.markPrice, r.decimals)}</b>
        </div>
        <div>
          <small>{tp ? t("当前止损", "Stop loss") : t("当前止盈", "Take profit")}</small>
          <b className={tp ? "sh-down" : "sh-up"}>{other ? number(other, r.decimals) : "—"}</b>
        </div>
      </div>
      <label className="sh-field">
        <span>
          {tp ? t("止盈触发价", "Take-profit price") : t("止损触发价", "Stop-loss price")}
          <em>{above ? t("需高于现价", "Above price") : t("需低于现价", "Below price")}</em>
        </span>
        <div className={`sh-inputbox ts-stepper ${wrongSide ? "is-invalid" : ""}`}>
          <button type="button" aria-label="-" onClick={() => set((valid ? price : r.markPrice) - stepBy)}>
            <Minus size={16} />
          </button>
          <input
            inputMode="decimal"
            value={text}
            placeholder={number(r.markPrice, r.decimals)}
            onChange={(e) => {
              setPreset(null);
              setText(e.target.value.replace(/[^\d.]/g, ""));
            }}
          />
          <button type="button" aria-label="+" onClick={() => set((valid ? price : r.markPrice) + stepBy)}>
            <Plus size={16} />
          </button>
        </div>
        {wrongSide && (
          <small className="sh-error">
            {long
              ? tp
                ? t("多单止盈价需高于现价", "Long TP must be above the price")
                : t("多单止损价需低于现价", "Long SL must be below the price")
              : tp
                ? t("空单止盈价需低于现价", "Short TP must be below the price")
                : t("空单止损价需高于现价", "Short SL must be above the price")}
          </small>
        )}
      </label>
      <div className="sh-chips">
        {pcts.map((p) => (
          <button
            key={p}
            aria-pressed={preset === p}
            onClick={() => {
              setPreset(p);
              set(r.markPrice * (1 + ((above ? 1 : -1) * p) / 100));
            }}
          >
            {above ? "+" : "-"}
            {p}%
          </button>
        ))}
      </div>
      <div className={`ts-est ${pnl >= 0 ? "is-up" : "is-down"}`}>
        <span>{tp ? t("触发后预计盈利", "Est. profit when hit") : t("触发后预计亏损", "Est. loss when hit")}</span>
        <b>
          {valid && !wrongSide ? `${signed(pnl)} ${r.market === "perp" ? "USDT" : "USD"}` : "—"}
          {valid && !wrongSide && <em>{`${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%`}</em>}
        </b>
      </div>
      <p className="sh-note">
        <Info size={15} />
        {t("价格触及后按市价平仓，极端行情下成交价可能与触发价存在偏差。", "Closes at market when touched; fills may slip in fast markets.")}
      </p>
    </Sheet>
  );
}

/** 单笔平仓确认 */
export function CloseSheet({ lang, row: r, onConfirm, onClose }: { lang: Lang; row: PositionRow; onConfirm: () => void; onClose: () => void }) {
  const t = tr(lang);
  const coin = r.market === "perp" ? "USDT" : "USD";
  return (
    <ConfirmSheet
      title={`${t("确认平仓", "Close position")} · ${displaySymbol(r.symbol, r.market)}`}
      confirm={t("市价平仓", "Close at market")}
      cancel={t("取消", "Cancel")}
      danger
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className={`ts-est ts-est-lg ${r.pnl >= 0 ? "is-up" : "is-down"}`}>
        <span>{t("预计盈亏", "Est. P&L")}</span>
        <b>
          {signed(r.pnl)} {coin}
          <em>{`${r.roe >= 0 ? "+" : ""}${r.roe.toFixed(2)}%`}</em>
        </b>
      </div>
      <SheetRows
        rows={[
          [t("方向", "Side"), sideText(r, t), r.side === "buy" ? "up" : "down"],
          [t("平仓数量", "Size"), qtyText(r, t)],
          [t("开仓价", "Entry"), number(r.entryPrice, r.decimals)],
          [t("平仓价（约）", "Exit (approx.)"), number(r.markPrice, r.decimals)],
          [t("释放保证金", "Margin released"), `${number(r.margin, 2)} ${coin}`],
        ]}
      />
      <p className="sh-note">
        <Info size={15} />
        {t("以市价全部平仓，最终成交价以实际成交为准。", "Closes the full size at market; the final price may differ slightly.")}
      </p>
    </ConfirmSheet>
  );
}

/** 全部平仓确认 */
export function CloseAllSheet({ lang, rows, onConfirm, onClose }: { lang: Lang; rows: PositionRow[]; onConfirm: () => void; onClose: () => void }) {
  const t = tr(lang);
  const total = rows.reduce((n, r) => n + r.pnl, 0);
  const margin = rows.reduce((n, r) => n + r.margin, 0);
  return (
    <ConfirmSheet
      title={t(`全部平仓（${rows.length} 笔）`, `Close all (${rows.length})`)}
      confirm={t("确认全部平仓", "Close all")}
      cancel={t("取消", "Cancel")}
      danger
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className={`ts-est ts-est-lg ${total >= 0 ? "is-up" : "is-down"}`}>
        <span>{t("预计总盈亏", "Est. total P&L")}</span>
        <b>{signed(total)}</b>
      </div>
      <ul className="ts-list">
        {rows.map((r) => (
          <li key={r.id}>
            <b>{displaySymbol(r.symbol, r.market)}</b>
            <span className={r.side === "buy" ? "sh-up" : "sh-down"}>{sideText(r, t)}</span>
            <em className={r.pnl >= 0 ? "sh-up" : "sh-down"}>{signed(r.pnl)}</em>
          </li>
        ))}
      </ul>
      <p className="sh-note is-warn">
        <AlertTriangle size={15} />
        {t(`将以市价平掉当前账户的全部持仓，释放保证金约 ${number(margin, 2)}。挂单不受影响。`, `All positions close at market, releasing about ${number(margin, 2)} margin. Pending orders stay open.`)}
      </p>
    </ConfirmSheet>
  );
}

/** 账户权益底部弹层 */
export function EquitySheet({
  lang,
  summary: s,
  onTransfer,
  onAssets,
  onClose,
}: {
  lang: Lang;
  summary: AccountSummary;
  onTransfer: () => void;
  onAssets: () => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const level = s.marginLevel;
  const risk = level == null ? "none" : level >= 300 ? "safe" : level >= 100 ? "watch" : "danger";
  const riskText = { none: t("无持仓", "No positions"), safe: t("安全", "Safe"), watch: t("注意", "Caution"), danger: t("危险", "At risk") }[risk];
  const money = (v: number) => `${number(v, 2)} ${s.coin}`;
  return (
    <Sheet
      title={t("账户权益", "Account equity")}
      subtitle={s.market === "perp" ? t("交易账户 · USDT 保证金（加密货币）", "Trading account · USDT margin (crypto)") : t("交易账户 · USD 保证金（CFD）", "Trading account · USD margin (CFD)")}
      onClose={onClose}
      footer={
        <>
          <button className="sh-btn" onClick={onAssets}>
            <Wallet size={16} />
            {t("资产详情", "Assets")}
          </button>
          <button className="sh-btn sh-btn-primary" onClick={onTransfer}>
            <ArrowLeftRight size={16} />
            {t("划转", "Transfer")}
          </button>
        </>
      }
    >
      <div className="ts-equity">
        <small>{t("账户权益", "Equity")}</small>
        <strong>{money(s.equity)}</strong>
        <span className={s.unrealized >= 0 ? "sh-up" : "sh-down"}>
          {t("浮动盈亏", "Unrealized")} {signed(s.unrealized)}
        </span>
      </div>
      <div className={`ts-level is-${risk}`}>
        <div>
          <span>{t("保证金水平", "Margin level")}</span>
          <b>
            {level == null ? "—" : `${number(level, 2)}%`} <em>{riskText}</em>
          </b>
        </div>
        <div className="ts-bar">
          <i style={{ width: `${level == null ? 0 : Math.min(100, (level / 500) * 100)}%` }} />
          <u style={{ left: "10%" }} title="50%" />
          <u style={{ left: "20%" }} title="100%" />
        </div>
        <small>{t("低于 100% 将无法开新仓；持仓价格触及强平价时会被强制平仓。", "Below 100% you can't open new positions; positions reaching their liquidation price are closed.")}</small>
      </div>
      <SheetRows
        rows={[
          [t("账户余额", "Balance"), money(s.balance)],
          [t("浮动盈亏", "Unrealized P&L"), signed(s.unrealized), s.unrealized >= 0 ? "up" : "down"],
          [t("已用保证金", "Used margin"), money(s.usedMargin)],
          [t("挂单冻结", "Frozen by orders"), money(s.frozenMargin)],
          [t("可用保证金", "Free margin"), money(Math.max(0, s.freeMargin))],
          [t("持仓 / 委托", "Positions / orders"), `${s.positions} / ${s.orders}`],
        ]}
      />
      <p className="sh-note">
        <Info size={15} />
        <span>
          {t("权益 = 余额 + 浮动盈亏", "Equity = balance + unrealized P&L")}
          <br />
          {t("可用保证金 = 权益 − 已用保证金 − 挂单冻结", "Free margin = equity − used − frozen")}
          <br />
          {t("保证金水平 = 权益 ÷ 已用保证金", "Margin level = equity ÷ used margin")}
        </span>
      </p>
    </Sheet>
  );
}
