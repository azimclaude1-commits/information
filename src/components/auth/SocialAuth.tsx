import React, { useEffect, useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  CircleUserRound,
  Loader2,
  Lock,
  ScanFace,
  UserRound,
  X,
} from "lucide-react";
import { COUNTRIES, countryByIso, defaultCountry } from "../../data/countries";
import { digits, isEmail, isPhone, type AuthIdentity } from "./authState";

export type Provider = "google" | "apple" | "telegram";
type Lang = "zh" | "en";

export const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);
export const AppleLogo = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);
export const TelegramLogo = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="#29a9eb">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const DOMAIN: Record<Provider, string> = {
  google: "accounts.google.com",
  apple: "appleid.apple.com",
  telegram: "oauth.telegram.org",
};
const AppMark = () => (
  <span className="oa-appmark" aria-hidden="true">
    <Activity size={18} strokeWidth={2.6} />
  </span>
);

/**
 * Provider authorization screens (popup on desktop, in-app browser on phones).
 * Prototype only: no credentials are collected and no provider is contacted.
 */
export function SocialAuth({
  provider,
  lang,
  onCancel,
  onDone,
}: {
  provider: Provider;
  lang: Lang;
  onCancel: () => void;
  onDone: (identity: AuthIdentity) => void;
}) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  return (
    <div className="oa-shade" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={`oa-window is-${provider}`} role="dialog" aria-modal="true" aria-label={DOMAIN[provider]}>
        <header className="oa-bar">
          <button onClick={onCancel}>{t("取消", "Cancel")}</button>
          <span>
            <Lock size={11} />
            {DOMAIN[provider]}
          </span>
          <button aria-label={t("关闭", "Close")} onClick={onCancel}>
            <X size={16} />
          </button>
        </header>
        <div className="oa-body">
          {provider === "google" ? (
            <GoogleFlow t={t} onDone={onDone} onCancel={onCancel} />
          ) : provider === "apple" ? (
            <AppleFlow t={t} onDone={onDone} />
          ) : (
            <TelegramFlow t={t} lang={lang} onDone={onDone} onCancel={onCancel} />
          )}
        </div>
      </div>
    </div>
  );
}

type T = (zh: string, en: string) => string;
const useDelay = () => {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => void, ms = 900) => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      fn();
    }, ms);
  };
  return [busy, run] as const;
};

/* ==================== Google ==================== */
const GOOGLE_ACCOUNTS = [
  { name: "Alpha Trader", email: "alpha.trader@gmail.com", color: "#1a73e8" },
  { name: "Alpha Desk", email: "desk.alpha@gmail.com", color: "#188038" },
];
function GoogleFlow({ t, onDone, onCancel }: { t: T; onDone: (i: AuthIdentity) => void; onCancel: () => void }) {
  const [step, setStep] = useState<"choose" | "email" | "consent">("choose");
  const [account, setAccount] = useState(GOOGLE_ACCOUNTS[0]);
  const [email, setEmail] = useState("");
  const [busy, run] = useDelay();
  const pick = (a: (typeof GOOGLE_ACCOUNTS)[number]) => {
    setAccount(a);
    run(() => setStep("consent"), 600);
  };
  return (
    <div className="oa-google">
      {busy && <i className="oa-google-progress" />}
      <div className="oa-google-head">
        <GoogleLogo size={24} />
        <span>{t("使用 Google 账号登录", "Sign in with Google")}</span>
      </div>
      {step === "choose" && (
        <>
          <h1>{t("选择账号", "Choose an account")}</h1>
          <p>
            {t("以继续使用", "to continue to")} <b>AlphaPulse</b>
          </p>
          <ul className="oa-google-list">
            {GOOGLE_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button onClick={() => pick(a)} disabled={busy}>
                  <span className="oa-avatar" style={{ background: a.color }}>
                    {a.name[0]}
                  </span>
                  <span>
                    <b>{a.name}</b>
                    <small>{a.email}</small>
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button onClick={() => setStep("email")} disabled={busy}>
                <span className="oa-avatar is-empty">
                  <CircleUserRound size={20} />
                </span>
                <span>
                  <b>{t("使用其他账号", "Use another account")}</b>
                </span>
              </button>
            </li>
          </ul>
          <p className="oa-fine">
            {t(
              "如果继续，Google 将会与 AlphaPulse 分享您的姓名、电子邮件地址、语言偏好设置和个人资料照片。在使用此应用前，请查看其隐私权政策和服务条款。",
              "To continue, Google will share your name, email address, language preference and profile picture with AlphaPulse. Review its privacy policy and terms before using this app.",
            )}
          </p>
        </>
      )}
      {step === "email" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isEmail(email)) return;
            pick({ name: email.split("@")[0], email: email.trim(), color: "#9334e6" });
          }}
        >
          <h1>{t("登录", "Sign in")}</h1>
          <p>
            {t("以继续使用", "to continue to")} <b>AlphaPulse</b>
          </p>
          <label className="oa-google-field">
            <input
              autoFocus
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span>{t("电子邮件地址", "Email")}</span>
          </label>
          {email && !isEmail(email) && <small className="oa-google-err">{t("请输入有效的电子邮件地址", "Enter a valid email")}</small>}
          <div className="oa-google-actions">
            <button type="button" className="is-text" onClick={() => setStep("choose")}>
              {t("返回", "Back")}
            </button>
            <button className="is-primary" disabled={!isEmail(email) || busy}>
              {t("下一步", "Next")}
            </button>
          </div>
        </form>
      )}
      {step === "consent" && (
        <>
          <div className="oa-google-apps">
            <AppMark />
            <span className="oa-dots" />
            <GoogleLogo size={28} />
          </div>
          <h1>{t("AlphaPulse 想要访问您的 Google 账号", "AlphaPulse wants to access your Google Account")}</h1>
          <button className="oa-google-chip" onClick={() => setStep("choose")}>
            <span className="oa-avatar is-sm" style={{ background: account.color }}>
              {account.name[0]}
            </span>
            {account.email}
            <ChevronDown size={14} />
          </button>
          <p className="oa-google-sub">{t("这将使 AlphaPulse 能够：", "This will allow AlphaPulse to:")}</p>
          <ul className="oa-perms">
            <li>
              <UserRound size={18} />
              {t("查看您的个人信息，包括您公开的任何个人信息", "See your personal info, including any personal info you've made publicly available")}
            </li>
            <li>
              <span className="oa-at">@</span>
              {t("查看您的主要 Google 账号电子邮件地址", "See your primary Google Account email address")}
            </li>
          </ul>
          <div className="oa-google-trust">
            <b>{t("确保 AlphaPulse 是您信任的应用", "Make sure you trust AlphaPulse")}</b>
            <span>
              {t(
                "您可能会与此网站或应用分享敏感信息。您可以随时在 Google 账号中移除访问权限。",
                "You may be sharing sensitive info with this site or app. You can always remove access in your Google Account.",
              )}
            </span>
          </div>
          <div className="oa-google-actions">
            <button className="is-text" onClick={onCancel}>
              {t("取消", "Cancel")}
            </button>
            <button
              className="is-primary"
              disabled={busy}
              onClick={() => run(() => onDone({ channel: "email", display: account.email, email: account.email }))}
            >
              {busy ? <Loader2 size={16} className="au-spin" /> : t("继续", "Continue")}
            </button>
          </div>
        </>
      )}
      <footer className="oa-google-foot">
        <span>{t("简体中文", "English (US)")}</span>
        <span>
          <span>{t("帮助", "Help")}</span>
          <span>{t("隐私权", "Privacy")}</span>
          <span>{t("条款", "Terms")}</span>
        </span>
      </footer>
    </div>
  );
}

/* ==================== Apple ==================== */
function AppleFlow({ t, onDone }: { t: T; onDone: (i: AuthIdentity) => void }) {
  const [name, setName] = useState("Alpha Trader");
  const [share, setShare] = useState<"share" | "hide">("hide");
  const [step, setStep] = useState<"form" | "faceid" | "ok">("form");
  const relay = "k8p2xq4m7d@privaterelay.appleid.com";
  const real = "alpha.trader@icloud.com";
  useEffect(() => {
    if (step === "faceid") {
      const id = window.setTimeout(() => setStep("ok"), 1400);
      return () => window.clearTimeout(id);
    }
    if (step === "ok") {
      const id = window.setTimeout(() => {
        const email = share === "share" ? real : relay;
        onDone({ channel: "email", display: email, email });
      }, 700);
      return () => window.clearTimeout(id);
    }
  }, [step]);
  return (
    <div className="oa-apple">
      <div className="oa-apple-head">
        <AppleLogo size={22} />
        <span>{t("使用 Apple 登录", "Sign in with Apple")}</span>
      </div>
      <AppMark />
      <h1>{t("使用你的 Apple 账户登录“AlphaPulse”", "Use your Apple Account to sign in to AlphaPulse")}</h1>
      {step === "form" ? (
        <>
          <p className="oa-apple-sub">
            {t("创建账户时，AlphaPulse 只会收到以下信息。", "AlphaPulse will only receive the info below.")}
          </p>
          <div className="oa-apple-group">
            <label>
              <UserRound size={18} />
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("姓名", "Name")} />
              {name && (
                <button aria-label={t("清除", "Clear")} onClick={() => setName("")}>
                  <X size={12} />
                </button>
              )}
            </label>
          </div>
          <div className="oa-apple-group">
            {(
              [
                ["share", t("共享我的电子邮件", "Share My Email"), real],
                ["hide", t("隐藏我的电子邮件", "Hide My Email"), t(`转发至 ${relay}`, `Forward to ${relay}`)],
              ] as const
            ).map(([id, title, sub]) => (
              <button key={id} className="oa-apple-radio" aria-pressed={share === id} onClick={() => setShare(id)}>
                <span>
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
                <i>{share === id && <Check size={14} strokeWidth={3} />}</i>
              </button>
            ))}
          </div>
          <button className="oa-apple-continue" disabled={!name.trim()} onClick={() => setStep("faceid")}>
            {t("继续", "Continue")}
          </button>
          <p className="oa-fine">
            {t(
              "选择隐藏电子邮件后，Apple 会为你创建唯一的转发地址，邮件会转发到你的个人邮箱。",
              "With Hide My Email, Apple creates a unique address that forwards to your personal inbox.",
            )}
          </p>
        </>
      ) : (
        <div className={`oa-faceid${step === "ok" ? " is-ok" : ""}`}>
          {step === "ok" ? <Check size={46} strokeWidth={2.5} /> : <ScanFace size={52} strokeWidth={1.4} />}
          <span>{step === "ok" ? t("完成", "Done") : "Face ID"}</span>
        </div>
      )}
    </div>
  );
}

/* ==================== Telegram ==================== */
function TelegramFlow({
  t,
  lang,
  onDone,
  onCancel,
}: {
  t: T;
  lang: Lang;
  onDone: (i: AuthIdentity) => void;
  onCancel: () => void;
}) {
  const [iso, setIso] = useState(() => defaultCountry(lang));
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "confirm" | "grant">("phone");
  const [left, setLeft] = useState(60);
  const [allowMsg, setAllowMsg] = useState(true);
  const [busy, run] = useDelay();
  const c = countryByIso(iso);
  const full = `+${c.dial} ${digits(phone)}`;
  useEffect(() => {
    if (step !== "confirm" || left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [step, left]);
  return (
    <div className="oa-telegram">
      <div className="oa-tg-head">
        <TelegramLogo size={56} />
        <h1>{t("使用 Telegram 登录", "Log in with Telegram")}</h1>
        <p>
          <b>AlphaPulse</b> {t("请求使用你的 Telegram 账号登录", "wants to log in with your Telegram account")}
        </p>
      </div>
      {step === "phone" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isPhone(phone, c)) run(() => setStep("confirm"));
          }}
        >
          <p className="oa-tg-sub">{t("请输入你的手机号码", "Please enter your phone number")}</p>
          <label className="oa-tg-field">
            <span>{t("国家/地区", "Country")}</span>
            <select value={iso} onChange={(e) => setIso(e.target.value)}>
              {COUNTRIES.map((x) => (
                <option key={x.iso} value={x.iso}>
                  {lang === "zh" ? x.zh : x.en} (+{x.dial})
                </option>
              ))}
            </select>
          </label>
          <label className="oa-tg-field">
            <span>{t("手机号码", "Phone number")}</span>
            <div>
              <em>+{c.dial}</em>
              <input
                autoFocus
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="--- --- ----"
              />
            </div>
          </label>
          <button className="oa-tg-btn" disabled={!isPhone(phone, c) || busy}>
            {busy ? <Loader2 size={16} className="au-spin" /> : t("下一步", "Next")}
          </button>
          <p className="oa-fine">
            {t(
              "我们将向你的 Telegram 应用发送一条确认消息。AlphaPulse 不会看到你的手机号码。",
              "We'll send a confirmation message to your Telegram app. AlphaPulse won't see your phone number.",
            )}
          </p>
        </form>
      )}
      {step === "confirm" && (
        <>
          <p className="oa-tg-sub">
            {t(`已向 ${full} 的 Telegram 发送确认消息`, `Confirmation sent to Telegram at ${full}`)}
          </p>
          <div className="oa-tg-msg">
            <header>
              <TelegramLogo size={22} />
              <b>Telegram</b>
              <small>{t("现在", "now")}</small>
            </header>
            <p>
              {t("登录请求：", "Login request: ")}
              <b>AlphaPulse</b> (alphapulse.app) {t("请求使用你的账号登录。", "wants to log in with your account.")}
            </p>
            <small>
              {t("浏览器", "Browser")}: Chrome · Windows · {t("位置", "Location")}: {lang === "zh" ? c.zh : c.en}
            </small>
            <div>
              <button className="is-ok" onClick={() => setStep("grant")}>
                {t("确认", "Confirm")}
              </button>
              <button onClick={onCancel}>{t("拒绝", "Decline")}</button>
            </div>
          </div>
          <p className="oa-tg-wait">
            {left > 0 ? (
              <>
                <Loader2 size={14} className="au-spin" />
                {t("等待在 Telegram 中确认…", "Waiting for confirmation…")}{" "}
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </>
            ) : (
              <button onClick={() => setLeft(60)}>{t("未收到？重新发送", "Didn't get it? Resend")}</button>
            )}
          </p>
          <button className="oa-tg-link" onClick={() => setStep("phone")}>
            {t("更换手机号码", "Use a different number")}
          </button>
        </>
      )}
      {step === "grant" && (
        <>
          <div className="oa-tg-user">
            <span className="oa-avatar" style={{ background: "#2aabee" }}>
              A
            </span>
            <span>
              <b>Alpha Trader</b>
              <small>@alpha_trader · {full}</small>
            </span>
          </div>
          <p className="oa-tg-sub">{t("AlphaPulse 将获得：", "AlphaPulse will receive:")}</p>
          <ul className="oa-perms">
            <li>
              <UserRound size={18} />
              {t("你的姓名、用户名和头像", "Your name, username and profile photo")}
            </li>
          </ul>
          <label className="oa-tg-check">
            <input type="checkbox" checked={allowMsg} onChange={(e) => setAllowMsg(e.target.checked)} />
            {t("允许 AlphaPulse 向你发送消息（开播提醒、价格预警）", "Allow AlphaPulse to send you messages (live alerts, price alerts)")}
          </label>
          <button
            className="oa-tg-btn"
            disabled={busy}
            onClick={() => run(() => onDone({ channel: "phone", display: full, phone: full }))}
          >
            {busy ? <Loader2 size={16} className="au-spin" /> : t("接受", "Accept")}
          </button>
          <button className="oa-tg-link" onClick={onCancel}>
            {t("拒绝", "Decline")}
          </button>
        </>
      )}
    </div>
  );
}
