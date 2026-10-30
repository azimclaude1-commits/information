import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShieldCheck, ArrowLeftRight } from "lucide-react";
import { Instrument } from "../data/marketData";
import { number, signed } from "./marketModel";
import {
  AccountSummary,
  MarginMode,
  MarketKind,
  OrderRequest,
  OrderType,
  Side,
  contractSize,
  defaultLeverage,
  displaySymbol,
  leveragePresets,
  liquidationPrice,
  notionalUsd,
  pnlAt,
  pointValue,
  qtyStep,
  requiredMargin,
  roundTo,
  stepDecimals,
} from "./demoTrading";
import { EquitySheet } from "./TradeSheets";

interface Props {
  compact?: boolean;
  market: MarketKind;
  instrument: Instrument;
  lang: "zh" | "en";
  side: Side;
  onSideChange: (side: Side) => void;
  summary: AccountSummary;
  onPlace: (req: OrderRequest) => { ok: boolean; message: string };
  onToast: (message: string) => void;
  onOpenAssets: (page?: "overview" | "transfer") => void;
}

const PROTECT = {
  cfd: { tp: 0.025, sl: 0.015 },
  perp: { tp: 0.035, sl: 0.018 },
};

const unitName = (i: Instrument, lang: "zh" | "en") => {
  const zh = lang === "zh";
  if (i.category === "stocks") return zh ? "股" : "shares";
  if (i.category === "forex") return i.symbol.slice(0, 3);
  if (i.category === "indices") return zh ? "指数单位" : "index units";
  if (i.symbol.startsWith("XAU") || i.symbol.startsWith("XAG"))
    return zh ? "盎司" : "oz";
  return zh ? "桶" : "bbl";
};

export function OrderTicket({
  compact = false,
  market,
  instrument: i,
  lang,
  side,
  onSideChange,
  summary,
  onPlace,
  onToast,
  onOpenAssets,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const perp = market === "perp";
  const step = qtyStep(i);
  const qtyDp = stepDecimals(step);
  const nudge = perp ? step * 10 : 0.1;
  const presets = leveragePresets(i.leverage, market);
  const coin = summary.coin;
  const money = (v: number) =>
    coin === "USD" ? `$${number(v, 2)}` : `${number(v, 2)} USDT`;

  const [equityOpen, setEquityOpen] = useState(false);
  const [type, setType] = useState<OrderType>("market");
  const [marginMode, setMarginMode] = useState<MarginMode>("cross");
  const [leverage, setLeverage] = useState(defaultLeverage(i));
  const [qtyText, setQtyText] = useState("1");
  const [priceText, setPriceText] = useState("");
  const [tpOn, setTpOn] = useState(!compact);
  const [slOn, setSlOn] = useState(!compact);
  const [tpText, setTpText] = useState("");
  const [slText, setSlText] = useState("");
  const [protectEdited, setProtectEdited] = useState(false);

  const market0 = side === "buy" ? i.ask : i.bid;
  const limitPrice = Number(priceText);
  const refPrice = type === "limit" && limitPrice > 0 ? limitPrice : market0;

  const fillProtection = (ref: number, s: Side) => {
    const { tp, sl } = PROTECT[market];
    const dir = s === "buy" ? 1 : -1;
    setTpText((ref * (1 + dir * tp)).toFixed(i.decimals));
    setSlText((ref * (1 - dir * sl)).toFixed(i.decimals));
  };

  // New instrument → sensible defaults for size, leverage, price and protection
  useEffect(() => {
    setLeverage(defaultLeverage(i));
    setQtyText(
      perp
        ? String(Math.max(step, roundTo(5000 / i.price, step)))
        : compact
          ? "0.1"
          : "1",
    );
    setPriceText(i.price.toFixed(i.decimals));
    setType("market");
    setProtectEdited(false);
    fillProtection(side === "buy" ? i.ask : i.bid, side);
  }, [i.symbol]);

  // Direction flips always re-derive TP/SL; a new limit price does so until the user edits them
  useEffect(() => {
    setProtectEdited(false);
    fillProtection(refPrice, side);
  }, [side]);
  useEffect(() => {
    if (!protectEdited) fillProtection(refPrice, side);
  }, [type, type === "limit" ? priceText : ""]);

  const qty = Number(qtyText);
  const tp = tpOn ? Number(tpText) : undefined;
  const sl = slOn ? Number(slText) : undefined;
  const notional = qty > 0 ? notionalUsd(i, qty, refPrice) : 0;
  const margin = qty > 0 ? requiredMargin(i, qty, refPrice, leverage) : 0;
  const liq = perp ? liquidationPrice(side, refPrice, leverage) : undefined;
  const long = side === "buy";
  const tpBad = tp !== undefined && !(long ? tp > refPrice : tp < refPrice);
  const slBad = sl !== undefined && !(long ? sl < refPrice : sl > refPrice);
  const draft = { side, entryPrice: refPrice, qty, symbol: i.symbol };
  const tpPnl = tp && !tpBad ? pnlAt(draft, i, tp) : null;
  const slPnl = sl && !slBad ? pnlAt(draft, i, sl) : null;
  const insufficient = margin > summary.freeMargin;
  const maxQty =
    summary.freeMargin > 0
      ? (summary.freeMargin * leverage) / (refPrice * contractSize(i))
      : 0;
  const invalid =
    !(qty > 0) || tpBad || slBad || (type === "limit" && !(limitPrice > 0));

  const setQty = (v: number) =>
    setQtyText(String(Math.max(step, roundTo(v, step))));

  const book = useMemo(() => {
    const tick = Math.max(
      10 ** -i.decimals,
      Number((i.price * 0.00008).toFixed(i.decimals)),
    );
    const seed = [...i.symbol].reduce((n, c) => n + c.charCodeAt(0), 0);
    const size = (n: number) =>
      roundTo(((seed * (n + 3)) % 37) / 10 + 0.4, step) *
      (perp ? Math.max(1, 2000 / i.price) : 1);
    const asks = Array.from({ length: 5 }, (_, n) => ({
      price: i.ask + tick * (5 - n),
      size: size(5 - n),
    }));
    const bids = Array.from({ length: 5 }, (_, n) => ({
      price: i.bid - tick * (n + 1),
      size: size(n + 7),
    }));
    const max = Math.max(
      ...asks.map((a) => a.size),
      ...bids.map((b) => b.size),
    );
    return { asks, bids, max };
  }, [i.symbol, i.bid, i.ask]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || insufficient) return;
    const result = onPlace({
      market,
      symbol: i.symbol,
      side,
      type,
      qty,
      leverage,
      marginMode,
      price: type === "limit" ? limitPrice : undefined,
      takeProfit: tp,
      stopLoss: sl,
    });
    onToast(result.message);
  };

  const sideButton = (s: Side) => {
    const buy = s === "buy";
    return (
      <button
        type="button"
        key={s}
        aria-pressed={side === s}
        className={`tk-side ${buy ? "is-buy" : "is-sell"}`}
        onClick={() => onSideChange(s)}
      >
        <small>
          {perp
            ? buy
              ? t("买入开多", "Buy / Long")
              : t("卖出开空", "Sell / Short")
            : buy
              ? t("买入做多", "Buy")
              : t("卖出做空", "Sell")}
        </small>
        <strong>{number(buy ? i.ask : i.bid, i.decimals)}</strong>
      </button>
    );
  };

  return (
    <form className={`tk${compact ? " tk-compact" : ""}`} onSubmit={submit}>
      <div className="tk-demo">
        <ShieldCheck size={13} />
        <span>
          {perp
            ? t("模拟交易 · 虚拟 USDT 保证金", "Paper trading · virtual USDT")
            : t("模拟交易 · 虚拟美元保证金", "Paper trading · virtual USD")}
        </span>
        {compact ? (
          <button type="button" onClick={() => setEquityOpen(true)}>
            {t("账户权益", "Equity")} ›
          </button>
        ) : (
          <b>DEMO</b>
        )}
      </div>

      {perp && (
        <div
          className="segmented tk-seg"
          role="group"
          aria-label={t("保证金模式", "Margin mode")}
        >
          {(["cross", "isolated"] as const).map((m) => (
            <button
              type="button"
              key={m}
              aria-pressed={marginMode === m}
              onClick={() => setMarginMode(m)}
            >
              {m === "cross" ? t("全仓", "Cross") : t("逐仓", "Isolated")}
            </button>
          ))}
        </div>
      )}

      <div className="tk-sides">
        {perp || compact
          ? [sideButton("buy"), sideButton("sell")]
          : [sideButton("sell"), sideButton("buy")]}
        <span className="tk-spread">{number(i.ask - i.bid, i.decimals)}</span>
      </div>

      <div className="tk-order-controls">
        <div
          className="segmented tk-seg"
          role="group"
          aria-label={t("订单类型", "Order type")}
        >
          {(["market", "limit"] as const).map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={type === v}
              onClick={() => {
                setType(v);
                if (v === "limit" && !(limitPrice > 0))
                  setPriceText(i.price.toFixed(i.decimals));
              }}
            >
              {v === "market" ? t("市价单", "Market") : t("限价单", "Limit")}
            </button>
          ))}
        </div>
        {compact && (
          <select
            className="tk-leverage-select"
            aria-label={t("杠杆倍数", "Leverage")}
            value={leverage}
            onChange={(event) => setLeverage(Number(event.target.value))}
          >
            {presets.map((value) => (
              <option value={value} key={value}>
                {value}x
              </option>
            ))}
          </select>
        )}
      </div>

      {type === "limit" && (
        <label className="tk-field tk-limit-field">
          <span>
            {t("委托价格", "Limit price")}
            <em>{t("点击下方盘口可快速带入", "Click the book to fill")}</em>
          </span>
          <div className="tk-input">
            {compact && (
              <button
                type="button"
                aria-label={t("降低委托价", "Decrease limit price")}
                onClick={() =>
                  setPriceText(
                    Math.max(
                      10 ** -i.decimals,
                      (limitPrice || i.price) - 10 ** -i.decimals,
                    ).toFixed(i.decimals),
                  )
                }
              >
                <Minus size={13} />
              </button>
            )}
            <input
              inputMode="decimal"
              aria-label={t("委托价格", "Limit price")}
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
            />
            {compact ? (
              <button
                type="button"
                aria-label={t("提高委托价", "Increase limit price")}
                onClick={() =>
                  setPriceText(
                    ((limitPrice || i.price) + 10 ** -i.decimals).toFixed(
                      i.decimals,
                    ),
                  )
                }
              >
                <Plus size={13} />
              </button>
            ) : (
              <i>{perp ? "USDT" : "USD"}</i>
            )}
          </div>
        </label>
      )}

      <div className="tk-field tk-quantity-field">
        <span>
          {perp ? t("数量", "Size") : t("交易手数", "Lots")}
          <em>
            {perp
              ? i.symbol.split("/")[0]
              : t(
                  `1 手 = ${number(contractSize(i), 0)} ${unitName(i, lang)}`,
                  `1 lot = ${number(contractSize(i), 0)} ${unitName(i, lang)}`,
                )}
          </em>
        </span>
        <div className="tk-stepper">
          <button
            type="button"
            aria-label={t("减少", "Decrease")}
            onClick={() => setQty((qty || 0) - nudge)}
          >
            <Minus size={13} />
          </button>
          <input
            inputMode="decimal"
            aria-label={perp ? t("数量", "Size") : t("交易手数", "Lots")}
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value)}
            onBlur={() => qty > 0 && setQty(qty)}
          />
          <button
            type="button"
            aria-label={t("增加", "Increase")}
            onClick={() => setQty((qty || 0) + nudge)}
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="tk-quick">
          {perp
            ? [0.1, 0.25, 0.5, 1].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  disabled={maxQty < step}
                  onClick={() =>
                    setQty(Math.floor((maxQty * pct) / step) * step)
                  }
                >
                  {pct * 100}%
                </button>
              ))
            : (compact ? [0.1, 0.5, 1, 2] : [0.1, 0.5, 1, 2, 5]).map((v) => (
                <button
                  type="button"
                  key={v}
                  aria-pressed={qty === v}
                  onClick={() => setQty(v)}
                >
                  {v}
                </button>
              ))}
          {compact && !perp && (
            <button
              type="button"
              disabled={maxQty < step}
              onClick={() => setQty(Math.floor(maxQty / step) * step)}
            >
              {t("最大", "Max")}
            </button>
          )}
        </div>
      </div>

      <div className="tk-field tk-leverage-field" hidden={compact}>
        <span>
          {t("杠杆倍数", "Leverage")}
          <em>{t(`最高 ${i.leverage}x`, `Max ${i.leverage}x`)}</em>
        </span>
        <div className="tk-chips">
          {presets.map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={leverage === v}
              onClick={() => setLeverage(v)}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>

      <div className="tk-protect">
        {(
          [
            [
              "tp",
              t("止盈", "Take profit"),
              tpOn,
              setTpOn,
              tpText,
              setTpText,
              tpBad,
              tpPnl,
            ],
            [
              "sl",
              t("止损", "Stop loss"),
              slOn,
              setSlOn,
              slText,
              setSlText,
              slBad,
              slPnl,
            ],
          ] as const
        ).map(([id, label, on, setOn, text, setText, bad, est]) => (
          <div
            className={`tk-protect-row ${on ? "is-enabled" : ""} ${bad ? "is-bad" : ""}`}
            key={id}
          >
            <label className="tk-check">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setOn(e.target.checked)}
              />
              {label}
            </label>
            <div className="tk-input">
              <input
                inputMode="decimal"
                aria-label={label}
                disabled={!on}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setProtectEdited(true);
                }}
              />
              <i className={est === null ? "" : est >= 0 ? "up" : "down"}>
                {on && est !== null ? signed(est) : "—"}
              </i>
            </div>
          </div>
        ))}
        {(tpBad || slBad) && (
          <p className="tk-hint down">
            {long
              ? t(
                  "做多时止盈需高于开仓价、止损需低于开仓价",
                  "For longs: TP above and SL below entry",
                )
              : t(
                  "做空时止盈需低于开仓价、止损需高于开仓价",
                  "For shorts: TP below and SL above entry",
                )}
          </p>
        )}
      </div>

      <dl className="tk-summary">
        <div>
          <dt>
            {perp ? t("开仓价值", "Position value") : t("合约价值", "Notional")}
          </dt>
          <dd>{money(notional)}</dd>
        </div>
        <div>
          <dt>{t("所需保证金", "Required margin")}</dt>
          <dd className={insufficient ? "down" : ""}>{money(margin)}</dd>
        </div>
        {perp ? (
          <div>
            <dt>{t("预估强平价", "Est. liquidation")}</dt>
            <dd className="warn">{liq ? number(liq, i.decimals) : "—"}</dd>
          </div>
        ) : (
          <div>
            <dt>{t("每点价值", "Value per 1.0")}</dt>
            <dd>${number(qty > 0 ? pointValue(i, qty) : 0, 2)}</dd>
          </div>
        )}
        <div>
          <dt>{t("可用保证金", "Free margin")}</dt>
          <dd>{money(Math.max(0, summary.freeMargin))}</dd>
        </div>
      </dl>

      {insufficient && (
        <p className="tk-hint down">
          {t("可用保证金不足", "Insufficient free margin")}
          <button type="button" onClick={() => onOpenAssets("transfer")}>
            <ArrowLeftRight size={12} />
            {t("划转模拟资金", "Transfer demo funds")}
          </button>
        </p>
      )}

      <button
        type="submit"
        className={`tk-submit ${long ? "is-buy" : "is-sell"}`}
        disabled={invalid || insufficient}
      >
        {type === "limit" ? t("挂单 · ", "Limit · ") : ""}
        {perp
          ? long
            ? t("模拟开多", "Demo long")
            : t("模拟开空", "Demo short")
          : long
            ? t("模拟买入", "Demo buy")
            : t("模拟卖出", "Demo sell")}{" "}
        {qty > 0 ? number(qty, perp ? qtyDp : 2) : ""}
        {perp ? "" : t(" 手", " lots")} {displaySymbol(i.symbol, market)}
      </button>

      <section
        className="tk-account"
        aria-label={t("模拟账户", "Demo account")}
      >
        <header>
          <b>
            {perp
              ? t(
                  "交易账户 (模拟) · USDT 保证金",
                  "Trading account (demo) · USDT margin",
                )
              : t(
                  "交易账户 (模拟) · USD 保证金",
                  "Trading account (demo) · USD margin",
                )}
          </b>
          <button
            type="button"
            className="text-link"
            onClick={() => onOpenAssets("overview")}
          >
            {t("资产 / 划转", "Assets")}
          </button>
        </header>
        <div>
          <span>{t("账户权益", "Equity")}</span>
          <b>{money(summary.equity)}</b>
        </div>
        <div>
          <span>{t("浮动盈亏", "Unrealized P&L")}</span>
          <b className={summary.unrealized >= 0 ? "up" : "down"}>
            {signed(summary.unrealized)}
          </b>
        </div>
        <div>
          <span>{t("已用 / 冻结保证金", "Used / frozen")}</span>
          <b>
            {number(summary.usedMargin, 2)} / {number(summary.frozenMargin, 2)}
          </b>
        </div>
        <div>
          <span>{t("保证金比例", "Margin level")}</span>
          <b>
            {summary.marginLevel === null
              ? "—"
              : `${number(summary.marginLevel, 0)}%`}
          </b>
        </div>
      </section>

      <section className="tk-book" aria-label={t("盘口", "Order book")}>
        <header>
          <b>{t("盘口", "Order book")}</b>
          <span>{t("点击价格带入限价", "Click a price to set limit")}</span>
        </header>
        {book.asks.map((r) => (
          <button
            type="button"
            key={`a${r.price}`}
            className="tk-book-row"
            onClick={() => {
              setType("limit");
              setPriceText(r.price.toFixed(i.decimals));
            }}
          >
            <i
              className="ask-depth"
              style={{ width: `${(r.size / book.max) * 100}%` }}
            />
            <span className="down">{number(r.price, i.decimals)}</span>
            <span>{number(r.size, perp ? qtyDp : 2)}</span>
          </button>
        ))}
        <div className="tk-book-mid">
          <strong className={i.changePercent24h >= 0 ? "up" : "down"}>
            {number(i.price, i.decimals)}
          </strong>
          <span>
            {t("点差", "Spread")} {i.spreadPips}
          </span>
        </div>
        {book.bids.map((r) => (
          <button
            type="button"
            key={`b${r.price}`}
            className="tk-book-row"
            onClick={() => {
              setType("limit");
              setPriceText(r.price.toFixed(i.decimals));
            }}
          >
            <i
              className="bid-depth"
              style={{ width: `${(r.size / book.max) * 100}%` }}
            />
            <span className="up">{number(r.price, i.decimals)}</span>
            <span>{number(r.size, perp ? qtyDp : 2)}</span>
          </button>
        ))}
      </section>

      <p className="tk-foot">
        {t(
          "模拟交易使用虚拟资金，盈亏不涉及真实资产，也不支持入金与出金。",
          "Demo trading uses virtual funds only — no deposits or withdrawals.",
        )}
      </p>
      {equityOpen && (
        <EquitySheet
          lang={lang}
          summary={summary}
          onClose={() => setEquityOpen(false)}
          onTransfer={() => {
            setEquityOpen(false);
            onOpenAssets("transfer");
          }}
          onAssets={() => {
            setEquityOpen(false);
            onOpenAssets("overview");
          }}
        />
      )}
    </form>
  );
}
