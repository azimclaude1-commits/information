import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, Lock, Sparkles } from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { makeCandles, useMinWidth } from "../marketModel";
import { SignatureIndicators } from "../SignatureIndicators";
import { Sheet } from "../ui/Sheet";
import { QuotaPill, useMembership } from "./Membership";

type Lang = "zh" | "en";

/** Static line path for the blurred previews. */
function spark(values: number[], w: number, h: number) {
  const lo = Math.min(...values),
    hi = Math.max(...values);
  return values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 8)).toFixed(1)}`)
    .join("");
}

/**
 * 特色指标 entry below the trading chart. The three panes stay hidden until the viewer runs an AI
 * analysis (one quota unit per symbol + period per day); the result opens in a dialog.
 */
export function SignatureGate({
  instrument,
  period,
  lang,
  mobile = false,
}: {
  instrument: Instrument;
  period: string;
  lang: Lang;
  mobile?: boolean;
}) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const m = useMembership();
  const wide = useMinWidth(900);
  const key = `signature:${instrument.symbol}:${period}`;
  const unlocked = m.isUnlocked(key);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(4);
  const steps = [
    t(`读取 ${instrument.symbol} ${period} K 线`, `Load ${instrument.symbol} ${period} candles`),
    t("计算金眼 BBI 箱体与安全线", "Golden Eye BBI box and safe line"),
    t("MACD · KDJ · RSI 三重共振", "MACD · KDJ · RSI resonance"),
    t("OBV 资金背离扫描", "OBV divergence scan"),
  ];
  useEffect(() => {
    if (step >= steps.length) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), m.delay / 2);
    return () => window.clearTimeout(id);
  }, [step, m.delay]);

  const run = () => {
    if (unlocked) {
      setStep(steps.length);
      setOpen(true);
      return;
    }
    if (!m.request("signature", key, `${instrument.symbol} · ${period} ${t("特色指标", "indicators")}`)) return;
    setStep(0);
    setOpen(true);
  };

  const preview = useMemo(() => {
    const closes = makeCandles(instrument, period, Date.now())
      .slice(-60)
      .map((c) => c.close);
    const osc = closes.map((_, i) => Math.sin(i / 4) * 30 + Math.sin(i / 11) * 18);
    const div = closes.map((_, i) => Math.cos(i / 6) * 22 + (i % 9) - 4);
    return [
      { name: t("金眼主图", "Golden Eye"), sub: "BBI Box", d: spark(closes, 160, 64), color: "#e5a429" },
      { name: t("三合一副图", "Trio"), sub: "MACD·KDJ·RSI", d: spark(osc, 160, 64), color: "#ef4444" },
      { name: t("背离副图", "Divergence"), sub: "OBV-MACD", d: spark(div, 160, 64), color: "#a855f7" },
    ];
  }, [instrument.symbol, period, lang]);

  const done = step >= steps.length;
  return (
    <section className={`sig-gate${mobile ? " is-mobile" : ""}`} aria-label={t("特色指标", "Signature indicators")}>
      <header className="sig-gate-head">
        <div>
          <h2>
            <Sparkles size={16} />
            {t("特色指标", "Signature indicators")}
            <span className="sig-gate-tag">AI</span>
          </h2>
          <p>
            {instrument.symbol} · {period} · {t("金眼主图 · 三合一副图 · 背离副图", "Golden Eye · Trio · Divergence")}
          </p>
        </div>
        <QuotaPill />
      </header>
      <div className="sig-gate-body">
        <div className="sig-gate-previews" aria-hidden>
          {preview.map((p) => (
            <div key={p.name} className="sig-gate-card">
              <b>{p.name}</b>
              <small>{p.sub}</small>
              <svg viewBox="0 0 160 64" preserveAspectRatio="none">
                <path d={p.d} stroke={p.color} />
              </svg>
              {!unlocked && (
                <span className="sig-gate-lock">
                  <Lock size={13} />
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="sig-gate-cta">
          <h3>
            {unlocked
              ? t("今日已完成分析", "Analysed today")
              : t("AI 分析后查看三张指标图", "Run AI analysis to see the three panes")}
          </h3>
          <p>
            {t(
              "金眼 BBI 箱体买卖点、MACD·KDJ·RSI 三重共振与 OBV 资金背离，一次分析三图联动，并给出 AI 结论。",
              "Golden Eye B/S points, MACD·KDJ·RSI resonance and OBV divergence in one linked view, with an AI conclusion.",
            )}
          </p>
          <button className={`mb-cta ${unlocked ? "is-open" : ""}`} onClick={run}>
            {unlocked ? <Eye size={15} /> : <Sparkles size={15} />}
            {unlocked
              ? t("查看分析结果", "View result")
              : m.left > 0
                ? t("AI 分析 · 消耗 1 次", "Analyse · uses 1")
                : t("次数已用完 · 开通会员", "Out of analyses · Upgrade")}
          </button>
          <small>
            {unlocked
              ? t("同品种同周期今日重复查看不扣次数", "Reopening today is free")
              : t("切换周期需重新分析；同品种同周期当日重复查看免费", "Each symbol + period counts once per day")}
          </small>
        </div>
      </div>

      {open && (
        <Sheet
          title={t("AI 特色指标分析", "AI signature analysis")}
          subtitle={`${instrument.symbol} · ${period}`}
          size="full"
          className="sig-sheet"
          onClose={() => setOpen(false)}
        >
          {!done ? (
            <div className="sig-progress">
              <span className="mb-spin is-lg" />
              <ol>
                {steps.map((s, i) => (
                  <li key={s} className={i < step ? "is-done" : i === step ? "is-now" : ""}>
                    <i>{i < step ? <Check size={11} strokeWidth={3} /> : null}</i>
                    {s}
                  </li>
                ))}
              </ol>
              {m.delay < 1000 && <em className="sig-progress-fast">{t("优先分析通道", "Priority queue")}</em>}
            </div>
          ) : (
            <SignatureIndicators instrument={instrument} period={period} lang={lang} mobile={!wide} embedded />
          )}
        </Sheet>
      )}
    </section>
  );
}
