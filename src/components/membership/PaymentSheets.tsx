import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, CreditCard, Fingerprint, Lock, ShieldCheck, X } from "lucide-react";
import { DigitInput, Sheet } from "../ui/Sheet";
import { CountrySheet } from "../ui/CountrySheet";
import { countryByIso, defaultCountry } from "../../data/countries";
import { Flag } from "../auth/AuthScreen";
import {
  TEST_CARDS,
  cardBrand,
  cardLength,
  cvcLength,
  digitsOf,
  expiryValid,
  formatCard,
  luhn,
  testCardOutcome,
  type CardBrand,
  type CardOutcome,
  type SavedCard,
} from "./membershipState";
import { fmtTime, usd } from "./Membership";

type Lang = "zh" | "en";
export type PayContext = {
  lang: Lang;
  /** e.g. "AlphaPulse 高级会员" */
  item: string;
  price: number;
  credit: number;
  total: number;
  /** Next automatic charge, when auto-renew is on. */
  renewAt?: number;
};

/* ---------------- Brand marks (drawn locally, no remote assets) ---------------- */

export function AppleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function ApplePayMark({ size = 15 }: { size?: number }) {
  return (
    <span className="pay-mark-apple" style={{ fontSize: size }}>
      <AppleGlyph size={size} />
      Pay
    </span>
  );
}
export function GooglePayMark({ size = 15 }: { size?: number }) {
  return (
    <span className="pay-mark-google" style={{ fontSize: size }}>
      <GoogleG size={size + 1} />
      Pay
    </span>
  );
}

export const BRAND_NAME: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  jcb: "JCB",
  unionpay: "UnionPay",
  unknown: "Card",
};

export function BrandMark({ brand }: { brand: CardBrand }) {
  return (
    <span className={`pay-brand is-${brand}`} aria-label={BRAND_NAME[brand]} role="img">
      {brand === "visa" ? (
        <b>VISA</b>
      ) : brand === "mastercard" ? (
        <svg viewBox="0 0 26 16" aria-hidden>
          <circle cx="9" cy="8" r="6.5" fill="#eb001b" />
          <circle cx="17" cy="8" r="6.5" fill="#f79e1b" />
          <path d="M13 3a6.5 6.5 0 0 1 0 10a6.5 6.5 0 0 1 0-10z" fill="#ff5f00" />
        </svg>
      ) : brand === "amex" ? (
        <b>AMEX</b>
      ) : brand === "jcb" ? (
        <b>JCB</b>
      ) : brand === "unionpay" ? (
        <b>银联</b>
      ) : (
        <CreditCard size={14} />
      )}
    </span>
  );
}

/** The marks shown under "支持的支付方式". */
export function AcceptedMarks() {
  return (
    <span className="pay-accepted">
      <span className="pay-chip is-dark">
        <ApplePayMark size={12} />
      </span>
      <span className="pay-chip">
        <GooglePayMark size={12} />
      </span>
      {(["visa", "mastercard", "amex", "jcb", "unionpay"] as CardBrand[]).map((b) => (
        <BrandMark key={b} brand={b} />
      ))}
    </span>
  );
}

/* ---------------- Wallet sheets (Apple Pay / Google Pay) ---------------- */

/** Portal overlay used by the wallet sheets: bottom sheet on phones, centred window from 640px. */
function SystemOverlay({
  kind,
  onCancel,
  busy,
  children,
}: {
  kind: "apple" | "google";
  onCancel: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  const lock = useRef(busy);
  lock.current = busy;
  useEffect(() => {
    document.documentElement.classList.add("sh-locked");
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lock.current) cancel.current();
    };
    document.addEventListener("keydown", key);
    return () => {
      document.documentElement.classList.remove("sh-locked");
      document.removeEventListener("keydown", key);
    };
  }, []);
  return createPortal(
    <div
      className={`pay-sys is-${kind}`}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      {children}
    </div>,
    document.body,
  );
}

type WalletCard = { brand: CardBrand; last4: string; zh: string; en: string; art: string };
const APPLE_CARDS: WalletCard[] = [
  { brand: "visa", last4: "4242", zh: "Visa 借记卡", en: "Visa Debit", art: "linear-gradient(135deg,#1f3b8f,#3b6fe0)" },
  { brand: "mastercard", last4: "5454", zh: "Mastercard 信用卡", en: "Mastercard Credit", art: "linear-gradient(135deg,#2b2b2f,#55555c)" },
];
const GOOGLE_CARDS: WalletCard[] = [
  { brand: "mastercard", last4: "1881", zh: "Mastercard", en: "Mastercard", art: "" },
  { brand: "visa", last4: "0077", zh: "Visa", en: "Visa", art: "" },
];

const isTouch = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640;

function FaceIdGlyph() {
  return (
    <svg className="ap-faceid" viewBox="0 0 48 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M4 15V9a5 5 0 0 1 5-5h6M33 4h6a5 5 0 0 1 5 5v6M44 33v6a5 5 0 0 1-5 5h-6M15 44H9a5 5 0 0 1-5-5v-6" />
      <path d="M16 17v4M32 17v4M24 17v10h-2M17 33c4 3.5 10 3.5 14 0" />
    </svg>
  );
}

export function ApplePaySheet({
  ctx,
  onCancel,
  onPaid,
}: {
  ctx: PayContext;
  onCancel: () => void;
  onPaid: (label: string) => void;
}) {
  const t = (zh: string, en: string) => (ctx.lang === "zh" ? zh : en);
  const [card, setCard] = useState(APPLE_CARDS[0]);
  const [picking, setPicking] = useState(false);
  const [phase, setPhase] = useState<"ready" | "auth" | "done">("ready");
  const touch = useRef(isTouch()).current;
  const confirm = () => {
    if (phase !== "ready") return;
    setPhase("auth");
    window.setTimeout(() => setPhase("done"), 1100);
    window.setTimeout(() => onPaid(`Apple Pay · ${BRAND_NAME[card.brand]} •••• ${card.last4}`), 1900);
  };
  return (
    <SystemOverlay kind="apple" onCancel={onCancel} busy={phase !== "ready"}>
      <div className="ap-sheet" role="dialog" aria-modal="true" aria-label="Apple Pay">
        <header className="ap-head">
          <ApplePayMark size={20} />
          <span className="pay-sandbox">{t("模拟", "Sandbox")}</span>
          <button className="ap-x" aria-label={t("取消", "Cancel")} onClick={onCancel} disabled={phase !== "ready"}>
            <X size={15} strokeWidth={2.6} />
          </button>
        </header>
        <div className="ap-body">
          <button className="ap-card" onClick={() => setPicking((v) => !v)} disabled={phase !== "ready"}>
            <span className="ap-art" style={{ background: card.art }}>
              <BrandMark brand={card.brand} />
            </span>
            <span className="ap-card-main">
              <b>{t(card.zh, card.en)}</b>
              <small>•••• {card.last4}</small>
            </span>
            {picking ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {picking && (
            <div className="ap-list">
              {APPLE_CARDS.map((c) => (
                <button
                  key={c.last4}
                  onClick={() => {
                    setCard(c);
                    setPicking(false);
                  }}
                >
                  <span className="ap-art is-sm" style={{ background: c.art }} />
                  <span>
                    {t(c.zh, c.en)} •••• {c.last4}
                  </span>
                  {c.last4 === card.last4 && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
          <div className="ap-group">
            <div>
              <span>{t("联系邮箱", "Email")}</span>
              <b>a••••@icloud.com</b>
            </div>
          </div>
          <div className="ap-group">
            <div>
              <span>{ctx.item}</span>
              <b>{usd(ctx.price)}</b>
            </div>
            {ctx.credit > 0 && (
              <div>
                <span>{t("原会员剩余天数折抵", "Credit for unused days")}</span>
                <b>−{usd(ctx.credit)}</b>
              </div>
            )}
            {ctx.renewAt && (
              <p>
                {t(
                  `连续包月：${fmtTime(ctx.renewAt, false)} 起每月自动扣款 ${usd(ctx.price)}，可随时在会员中心取消。`,
                  `Renews monthly at ${usd(ctx.price)} from ${fmtTime(ctx.renewAt, false)}. Cancel any time in Membership.`,
                )}
              </p>
            )}
          </div>
          <div className="ap-total">
            <span>{t("支付 ALPHAPULSE", "PAY ALPHAPULSE")}</span>
            <b>{usd(ctx.total)}</b>
          </div>
        </div>
        <button className={`ap-confirm is-${phase}`} onClick={confirm} disabled={phase !== "ready"}>
          {phase === "ready" ? (
            touch ? (
              <>
                <span className="ap-side-icon" aria-hidden>
                  <i />
                </span>
                <span>{t("双击侧边按钮以支付", "Double-click side button to pay")}</span>
              </>
            ) : (
              <>
                <Fingerprint size={30} strokeWidth={1.6} />
                <span>{t("使用触控 ID 支付", "Pay with Touch ID")}</span>
              </>
            )
          ) : phase === "auth" ? (
            <>
              <FaceIdGlyph />
              <span>{touch ? "Face ID" : "Touch ID"}</span>
            </>
          ) : (
            <>
              <span className="ap-done">
                <Check size={26} strokeWidth={3} />
              </span>
              <span>{t("完成", "Done")}</span>
            </>
          )}
        </button>
      </div>
      {touch && phase === "ready" && (
        <button className="ap-side" onClick={confirm} aria-label={t("双击侧边按钮", "Double-click side button")}>
          <i />
          <span>{t("双击", "Double")}<br />{t("确认", "click")}</span>
        </button>
      )}
    </SystemOverlay>
  );
}

export function GooglePaySheet({
  ctx,
  onCancel,
  onPaid,
}: {
  ctx: PayContext;
  onCancel: () => void;
  onPaid: (label: string) => void;
}) {
  const t = (zh: string, en: string) => (ctx.lang === "zh" ? zh : en);
  const [card, setCard] = useState(GOOGLE_CARDS[0]);
  const [picking, setPicking] = useState(false);
  const [phase, setPhase] = useState<"ready" | "paying" | "done">("ready");
  const pay = () => {
    setPhase("paying");
    window.setTimeout(() => setPhase("done"), 1200);
    window.setTimeout(() => onPaid(`Google Pay · ${BRAND_NAME[card.brand]} •••• ${card.last4}`), 1900);
  };
  return (
    <SystemOverlay kind="google" onCancel={onCancel} busy={phase !== "ready"}>
      <div className="gp-sheet" role="dialog" aria-modal="true" aria-label="Google Pay">
        <i className="gp-grip" aria-hidden />
        {phase === "ready" ? (
          <>
            <header className="gp-head">
              <GooglePayMark size={18} />
              <span className="pay-sandbox">{t("模拟", "Sandbox")}</span>
              <span className="gp-account">
                <i>A</i>
                a••••@gmail.com
              </span>
              <button className="gp-x" aria-label={t("取消", "Cancel")} onClick={onCancel}>
                <X size={18} />
              </button>
            </header>
            <div className="gp-merchant">
              <span className="gp-app" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13h4l3-8 4 14 3-6h4" />
                </svg>
              </span>
              <div>
                <b>AlphaPulse</b>
                <small>{ctx.item}</small>
              </div>
              <strong>{usd(ctx.total)}</strong>
            </div>
            {ctx.credit > 0 && (
              <p className="gp-line">
                {t("会员费", "Plan")} {usd(ctx.price)} · {t("折抵", "credit")} −{usd(ctx.credit)}
              </p>
            )}
            <button className="gp-method" onClick={() => setPicking((v) => !v)}>
              <BrandMark brand={card.brand} />
              <span>
                {t(card.zh, card.en)} •••• {card.last4}
              </span>
              <em>{picking ? t("收起", "Close") : t("更改", "Change")}</em>
            </button>
            {picking && (
              <div className="gp-list">
                {GOOGLE_CARDS.map((c) => (
                  <button
                    key={c.last4}
                    aria-pressed={c.last4 === card.last4}
                    onClick={() => {
                      setCard(c);
                      setPicking(false);
                    }}
                  >
                    <BrandMark brand={c.brand} />
                    <span>
                      {t(c.zh, c.en)} •••• {c.last4}
                    </span>
                    {c.last4 === card.last4 && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
            {ctx.renewAt && (
              <p className="gp-terms">
                {t(
                  `订阅：每月 ${usd(ctx.price)}，下次扣款 ${fmtTime(ctx.renewAt, false)}，可随时取消。`,
                  `Subscription: ${usd(ctx.price)}/month, next charge ${fmtTime(ctx.renewAt, false)}. Cancel any time.`,
                )}
              </p>
            )}
            <button className="gp-continue" onClick={pay}>
              {t("继续", "Continue")}
            </button>
          </>
        ) : (
          <div className="gp-progress">
            {phase === "paying" ? <span className="gp-spinner" /> : (
              <span className="gp-ok">
                <Check size={30} strokeWidth={3} />
              </span>
            )}
            <b>{phase === "paying" ? t("正在处理…", "Processing…") : t("已完成", "Done")}</b>
            <small>{usd(ctx.total)} · AlphaPulse</small>
          </div>
        )}
      </div>
    </SystemOverlay>
  );
}

/* ---------------- Card payment + 3-D Secure ---------------- */

export type CardResult = {
  outcome: Exclude<CardOutcome, "3ds">;
  label: string;
  save?: SavedCard;
};

export function CardPaySheet({
  ctx,
  saved,
  autoRenew,
  onCancel,
  onResult,
}: {
  ctx: PayContext;
  saved: SavedCard[];
  autoRenew: boolean;
  onCancel: () => void;
  onResult: (r: CardResult) => void;
}) {
  const lang = ctx.lang;
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [use, setUse] = useState<string>(saved[0]?.id ?? "new");
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [country, setCountry] = useState(() => defaultCountry(lang));
  const [countryOpen, setCountryOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [save, setSave] = useState(autoRenew);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "3ds">("form");
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [tries, setTries] = useState(0);
  const [otp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const brand = cardBrand(num);
  const usingSaved = use !== "new";
  const savedCard = saved.find((c) => c.id === use);
  const needZip = ["us", "ca", "gb"].includes(country);

  const errors = {
    num: usingSaved
      ? ""
      : digitsOf(num).length < cardLength(brand) || !luhn(num)
        ? t("请输入有效的卡号", "Enter a valid card number")
        : !testCardOutcome(num)
          ? t("模拟环境仅支持下方测试卡，请勿输入真实卡号", "The sandbox accepts the test cards below only. Don't enter a real card.")
          : "",
    exp: usingSaved ? "" : !expiryValid(exp, Date.now()) ? t("有效期格式为 MM/YY 且未过期", "Use MM/YY, not expired") : "",
    cvc:
      digitsOf(cvc).length !== cvcLength(usingSaved ? savedCard!.brand : brand)
        ? t(`请输入 ${cvcLength(usingSaved ? savedCard!.brand : brand)} 位安全码`, `Enter the ${cvcLength(usingSaved ? savedCard!.brand : brand)}-digit code`)
        : "",
    holder: usingSaved ? "" : holder.trim().length < 2 ? t("请输入持卡人姓名", "Enter the cardholder name") : "",
    zip: usingSaved || !needZip ? "" : zip.trim().length < 3 ? t("请输入邮政编码", "Enter the postal code") : "",
  };
  const valid = Object.values(errors).every((e) => !e);
  const err = (k: keyof typeof errors) => (tried && errors[k] ? errors[k] : "");

  const label = usingSaved
    ? `${BRAND_NAME[savedCard!.brand]} •••• ${savedCard!.last4}`
    : `${BRAND_NAME[brand]} •••• ${digitsOf(num).slice(-4)}`;

  const finish = (outcome: CardResult["outcome"]) =>
    onResult({
      outcome,
      label,
      save:
        !usingSaved && save && outcome === "success"
          ? {
              id: `card-${Date.now().toString(36)}`,
              brand,
              last4: digitsOf(num).slice(-4),
              exp,
              holder: holder.trim(),
            }
          : undefined,
    });

  const submit = () => {
    setTried(true);
    if (!valid || busy) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const outcome = usingSaved ? "success" : testCardOutcome(num)!;
      if (outcome === "3ds") setStep("3ds");
      else finish(outcome);
    }, 900);
  };

  const verify = () => {
    if (code.length !== 6) return;
    if (code === otp) {
      setBusy(true);
      window.setTimeout(() => finish("success"), 700);
      return;
    }
    const n = tries + 1;
    setTries(n);
    setCode("");
    if (n >= 3) finish("3ds_failed");
    else setCodeErr(t(`验证码不正确，还可尝试 ${3 - n} 次`, `Incorrect code, ${3 - n} attempts left`));
  };

  if (step === "3ds")
    return (
      <Sheet
        title={t("银行安全验证", "Bank verification")}
        subtitle="3-D Secure"
        onClose={() => !busy && finish("3ds_failed")}
        size="sm"
        className="pay-3ds-sheet"
        footer={
          <>
            <button className="sh-btn" disabled={busy} onClick={() => finish("3ds_failed")}>
              {t("取消支付", "Cancel")}
            </button>
            <button className="sh-btn sh-btn-primary" disabled={code.length !== 6 || busy} onClick={verify}>
              {busy ? t("验证中…", "Verifying…") : t("提交验证", "Verify")}
            </button>
          </>
        }
      >
        <div className="pay-3ds">
          <header>
            <ShieldCheck size={18} />
            <b>AlphaPulse Test Bank</b>
            <span>{BRAND_NAME[brand]} Secure</span>
          </header>
          <p>
            {t(
              "为保障您的用卡安全，请输入发送至尾号 8000 手机的 6 位验证码以完成本次支付。",
              "To protect your card, enter the 6-digit code sent to the phone ending 8000.",
            )}
          </p>
          <dl>
            <div>
              <dt>{t("商户", "Merchant")}</dt>
              <dd>AlphaPulse</dd>
            </div>
            <div>
              <dt>{t("金额", "Amount")}</dt>
              <dd>{usd(ctx.total)}</dd>
            </div>
            <div>
              <dt>{t("卡号", "Card")}</dt>
              <dd>
                {BRAND_NAME[brand]} •••• {digitsOf(num).slice(-4)}
              </dd>
            </div>
            <div>
              <dt>{t("时间", "Date")}</dt>
              <dd>{fmtTime(Date.now())}</dd>
            </div>
          </dl>
          <DigitInput
            value={code}
            onChange={(v) => {
              setCode(v);
              setCodeErr("");
            }}
            autoFocus
            invalid={!!codeErr}
            label={t("短信验证码", "SMS code")}
          />
          {codeErr && <p className="sh-error">{codeErr}</p>}
          <div className="sh-demo">
            <span>
              {t("模拟短信验证码", "Sandbox code")} <b>{otp}</b>
            </span>
            <button onClick={() => setCode(otp)}>{t("填入", "Fill")}</button>
          </div>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      title={t("银行卡支付", "Pay by card")}
      subtitle={`${ctx.item} · ${usd(ctx.total)}`}
      onClose={() => !busy && onCancel()}
      size="md"
      className="pay-card-sheet"
      footer={
        <button className="sh-btn sh-btn-primary pay-card-submit" onClick={submit} disabled={busy}>
          {busy ? <span className="mb-spin is-light" /> : <Lock size={15} />}
          {busy ? t("正在提交…", "Submitting…") : t(`支付 ${usd(ctx.total)}`, `Pay ${usd(ctx.total)}`)}
        </button>
      }
    >
      {saved.length > 0 && (
        <div className="pay-saved" role="radiogroup" aria-label={t("选择卡片", "Choose a card")}>
          {saved.map((c) => (
            <button key={c.id} role="radio" aria-checked={use === c.id} onClick={() => setUse(c.id)}>
              <BrandMark brand={c.brand} />
              <span>
                {BRAND_NAME[c.brand]} •••• {c.last4}
                <small>
                  {t("有效期", "Exp.")} {c.exp}
                </small>
              </span>
              <i />
            </button>
          ))}
          <button role="radio" aria-checked={use === "new"} onClick={() => setUse("new")}>
            <span className="pay-brand is-unknown">
              <CreditCard size={14} />
            </span>
            <span>{t("使用新卡", "Use a new card")}</span>
            <i />
          </button>
        </div>
      )}

      {!usingSaved && (
        <>
          <div className="pay-test">
            <span>{t("测试卡（点击填入）", "Test cards (tap to fill)")}</span>
            <div>
              {TEST_CARDS.map((c) => (
                <button
                  key={c.number}
                  onClick={() => {
                    setNum(formatCard(c.number));
                    setExp("12/30");
                    setCvc("123");
                    if (!holder) setHolder("ALPHA TRADER");
                    if (needZip && !zip) setZip("10001");
                  }}
                >
                  <BrandMark brand={cardBrand(c.number)} />
                  •••• {c.number.slice(-4)}
                  <em className={`is-${c.outcome}`}>{t(c.zh, c.en)}</em>
                </button>
              ))}
            </div>
          </div>
          <label className="sh-field">
            <span>{t("卡号", "Card number")}</span>
            <div className={`sh-inputbox pay-num ${err("num") ? "is-invalid" : ""}`}>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="1234 5678 9012 3456"
                value={num}
                onChange={(e) => setNum(formatCard(e.target.value))}
              />
              <BrandMark brand={brand} />
            </div>
            {err("num") && <p className="sh-error">{err("num")}</p>}
          </label>
          <div className="pay-row">
            <label className="sh-field">
              <span>{t("有效期", "Expiry")}</span>
              <input
                className={`sh-input ${err("exp") ? "is-invalid" : ""}`}
                inputMode="numeric"
                placeholder="MM/YY"
                value={exp}
                onChange={(e) => {
                  const d = digitsOf(e.target.value).slice(0, 4);
                  setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                }}
              />
              {err("exp") && <p className="sh-error">{err("exp")}</p>}
            </label>
            <label className="sh-field">
              <span>{t("安全码", "Security code")}</span>
              <input
                className={`sh-input ${err("cvc") ? "is-invalid" : ""}`}
                inputMode="numeric"
                autoComplete="off"
                placeholder={brand === "amex" ? "4 位" : "CVC"}
                value={cvc}
                onChange={(e) => setCvc(digitsOf(e.target.value).slice(0, 4))}
              />
              {err("cvc") && <p className="sh-error">{err("cvc")}</p>}
            </label>
          </div>
          <label className="sh-field">
            <span>{t("持卡人姓名", "Cardholder name")}</span>
            <input
              className={`sh-input ${err("holder") ? "is-invalid" : ""}`}
              autoComplete="off"
              placeholder={t("与卡面一致", "As shown on the card")}
              value={holder}
              onChange={(e) => setHolder(e.target.value.toUpperCase())}
            />
            {err("holder") && <p className="sh-error">{err("holder")}</p>}
          </label>
          <div className="pay-row">
            <div className="sh-field">
              <span id="pay-country-label">{t("账单国家/地区", "Billing country")}</span>
              <button
                type="button"
                className="sh-input pay-country"
                aria-labelledby="pay-country-label"
                aria-haspopup="dialog"
                onClick={() => setCountryOpen(true)}
              >
                <Flag iso={country} />
                <span>{lang === "zh" ? countryByIso(country).zh : countryByIso(country).en}</span>
                <ChevronDown size={16} />
              </button>
            </div>
            {needZip && (
              <label className="sh-field">
                <span>{t("邮政编码", "Postal code")}</span>
                <input
                  className={`sh-input ${err("zip") ? "is-invalid" : ""}`}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.toUpperCase().slice(0, 10))}
                />
                {err("zip") && <p className="sh-error">{err("zip")}</p>}
              </label>
            )}
          </div>
          <label className="sh-check pay-save">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
            {t("保存此卡，用于自动续费和下次支付", "Save this card for renewals and next time")}
          </label>
        </>
      )}
      {usingSaved && (
        <label className="sh-field">
          <span>
            {t("安全码", "Security code")} · {BRAND_NAME[savedCard!.brand]} •••• {savedCard!.last4}
          </span>
          <input
            className={`sh-input ${err("cvc") ? "is-invalid" : ""}`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="CVC"
            value={cvc}
            onChange={(e) => setCvc(digitsOf(e.target.value).slice(0, 4))}
          />
          {err("cvc") && <p className="sh-error">{err("cvc")}</p>}
        </label>
      )}
      <p className="pay-secure">
        <ShieldCheck size={14} />
        {t(
          "卡信息经加密传输，AlphaPulse 不保存完整卡号与安全码。模拟环境不会产生真实扣款。",
          "Card details are encrypted; AlphaPulse never stores the full number or code. The sandbox never charges a card.",
        )}
      </p>
      {countryOpen && (
        <CountrySheet
          lang={lang}
          selected={country}
          showDial={false}
          title={t("账单国家/地区", "Billing country")}
          onClose={() => setCountryOpen(false)}
          onPick={(iso) => {
            setCountry(iso);
            setZip("");
            setCountryOpen(false);
          }}
        />
      )}
    </Sheet>
  );
}
