import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Radio,
  Rocket,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  COUNTRIES,
  POPULAR_ISO,
  countryByIso,
  defaultCountry,
  type Country,
} from "../../data/countries";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_PHONE,
  digits,
  identityOf,
  isEmail,
  isPassword,
  isPhone,
  maskEmail,
  maskPhone,
  passwordChecks,
  passwordStrength,
  useAccounts,
  useCodeSender,
  type AuthAccount,
  type AuthIdentity,
  type Channel,
} from "./authState";
import {
  AppleLogo,
  GoogleLogo,
  SocialAuth,
  TelegramLogo,
  type Provider,
} from "./SocialAuth";
import "./auth.css";
import "./socialAuth.css";

const FLAGS = import.meta.glob<string>(
  "../../../node_modules/flag-icons/flags/1x1/*.svg",
  { query: "?url", import: "default", eager: true },
);
const flagUrl = (iso: string) =>
  FLAGS[`../../../node_modules/flag-icons/flags/1x1/${iso}.svg`];

export type AuthView = "login" | "register" | "forgot";
type Lang = "zh" | "en";
type Props = {
  open: boolean;
  initialView?: AuthView;
  lang: Lang;
  onClose: () => void;
  onAuthenticated: (identity: AuthIdentity) => void;
  onToast: (text: string) => void;
};

export function Flag({ iso }: { iso: string }) {
  return <img className="au-flag" src={flagUrl(iso)} alt="" loading="lazy" />;
}

export function AuthScreen({
  open,
  initialView = "login",
  lang,
  onClose,
  onAuthenticated,
  onToast,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const accounts = useAccounts();
  const [view, setView] = useState<AuthView | "success">(initialView);
  const [channel, setChannel] = useState<Channel>("phone");
  const [iso, setIso] = useState(() => defaultCountry(lang));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [picker, setPicker] = useState(false);
  const [doc, setDoc] = useState<"terms" | "privacy" | null>(null);
  const [captcha, setCaptcha] = useState<(() => void) | null>(null);
  const [social, setSocial] = useState<Provider | null>(null);
  const [created, setCreated] = useState<AuthAccount | null>(null);
  const country = countryByIso(iso);

  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (social) setSocial(null);
      else if (captcha) setCaptcha(null);
      else if (picker) setPicker(false);
      else if (doc) setDoc(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, social, captcha, picker, doc, onClose]);
  if (!open) return null;

  const account = {
    channel,
    country,
    email,
    phone,
    setEmail,
    setPhone,
    openPicker: () => setPicker(true),
    valid: channel === "email" ? isEmail(email) : isPhone(phone, country),
    target:
      channel === "email"
        ? email.trim().toLowerCase()
        : `+${country.dial}${digits(phone)}`,
    masked:
      channel === "email"
        ? maskEmail(email.trim())
        : maskPhone(country.dial, digits(phone)),
    find: () =>
      accounts.find(channel, channel === "email" ? email : phone, iso),
  };
  const shared = {
    lang,
    t,
    account,
    setChannel,
    onToast,
    requireCaptcha: (next: () => void) => setCaptcha(() => next),
    go: setView,
  };
  const finish = (a: AuthAccount) => {
    onAuthenticated(identityOf(a));
    onClose();
  };

  const titles = {
    login: [t("欢迎回来", "Welcome back"), t("登录你的 AlphaPulse 账户", "Sign in to your AlphaPulse account")],
    register: [t("创建账户", "Create account"), t("支持邮箱或全球手机号注册", "Sign up with email or any mobile number")],
    forgot: [t("重置密码", "Reset password"), t("验证账户后设置新的登录密码", "Verify your account to set a new password")],
    success: ["", ""],
  }[view];

  return (
    <div
      className="au-root"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="au-card"
        role="dialog"
        aria-modal="true"
        aria-label={titles[0] || t("注册成功", "Account created")}
      >
        <aside className="au-art">
          <img src="/live/studio-hero.png" alt="" aria-hidden="true" />
          <div className="au-logo">
            <span>
              <Activity size={20} strokeWidth={2.6} />
            </span>
            <b>AlphaPulse</b>
            <small>PRO</small>
          </div>
          <div className="au-art-copy">
            <h2>{t("全球市场，一个账户", "Global markets, one account")}</h2>
            <p>
              {t(
                "CFD 与加密市场模拟交易、AI 诊股、财经直播与资讯，一站完成。",
                "Paper-trade CFDs and crypto, AI stock diagnosis, live market rooms and news in one place.",
              )}
            </p>
            <ul>
              <li>
                <Gift size={16} />
                {t("注册即可领取 10,000 USDT 模拟金", "Claim 10,000 USDT in demo funds")}
              </li>
              <li>
                <BrainCircuit size={16} />
                {t("AI 诊股与机会雷达", "AI diagnosis and opportunity radar")}
              </li>
              <li>
                <Radio size={16} />
                {t("分析师直播，一键跟随模拟下单", "Analyst live rooms with one-tap paper orders")}
              </li>
            </ul>
          </div>
        </aside>

        <section className="au-main">
          <header className="au-head">
            {view !== "login" && view !== "success" ? (
              <button
                className="au-icon"
                aria-label={t("返回登录", "Back to sign in")}
                onClick={() => setView("login")}
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <span />
            )}
            <button
              className="au-icon"
              aria-label={t("关闭", "Close")}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </header>

          <div className="au-body">
            {view === "success" && created ? (
              <SuccessView
                t={t}
                account={created}
                onStart={() => finish(created)}
              />
            ) : (
              <>
                <div className="au-logo au-logo-mobile" aria-hidden="true">
                  <span>
                    <Activity size={18} strokeWidth={2.6} />
                  </span>
                  <b>AlphaPulse</b>
                  <small>PRO</small>
                </div>
                <div className="au-title">
                  <h1>{titles[0]}</h1>
                  <p>{titles[1]}</p>
                </div>
                <div className="au-tabs" role="tablist">
                  {(["phone", "email"] as Channel[]).map((c) => (
                    <button
                      key={c}
                      role="tab"
                      aria-selected={channel === c}
                      onClick={() => setChannel(c)}
                    >
                      {c === "phone" ? t("手机号", "Mobile") : t("邮箱", "Email")}
                    </button>
                  ))}
                </div>
                {view === "login" ? (
                  <LoginForm
                    key={channel}
                    {...shared}
                    onSuccess={finish}
                    onDemo={() => {
                      if (channel === "email") setEmail(DEMO_EMAIL);
                      else {
                        setIso(DEMO_PHONE.iso);
                        setPhone(DEMO_PHONE.phone);
                      }
                    }}
                  />
                ) : view === "register" ? (
                  <RegisterForm
                    key={channel}
                    {...shared}
                    onDoc={setDoc}
                    onCreate={(a) => {
                      const next = accounts.create(a);
                      setCreated(next);
                      setView("success");
                    }}
                  />
                ) : (
                  <ForgotForm
                    key={channel}
                    {...shared}
                    onReset={(id, password) => {
                      accounts.resetPassword(id, password);
                      onToast(t("密码已重置，请使用新密码登录", "Password updated. Sign in with your new password."));
                      setView("login");
                    }}
                  />
                )}
                {view === "login" && (
                  <SocialRow t={t} onPick={setSocial} />
                )}
              </>
            )}
          </div>
          <footer className="au-foot">
            <ShieldCheck size={13} />
            {t(
              "模拟交易账户 · 使用虚拟资金，不支持充值与提现",
              "Demo trading account · Virtual funds, no deposits or withdrawals",
            )}
          </footer>

          {picker && (
            <CountryPicker
              lang={lang}
              t={t}
              selected={iso}
              onPick={(c) => {
                setIso(c);
                setPicker(false);
              }}
              onClose={() => setPicker(false)}
            />
          )}
          {doc && <DocSheet t={t} doc={doc} onClose={() => setDoc(null)} />}
          {captcha && (
            <SlideCaptcha
              t={t}
              onCancel={() => setCaptcha(null)}
              onPass={() => {
                const next = captcha;
                setCaptcha(null);
                next();
              }}
            />
          )}
        </section>
      </div>
      {social && (
        <SocialAuth
          provider={social}
          lang={lang}
          onCancel={() => {
            setSocial(null);
            onToast(t(`已取消 ${PROVIDER_NAME[social]} 授权`, `${PROVIDER_NAME[social]} sign-in cancelled`));
          }}
          onDone={(identity) => {
            onToast(t(`已通过 ${PROVIDER_NAME[social]} 登录`, `Signed in with ${PROVIDER_NAME[social]}`));
            setSocial(null);
            onAuthenticated(identity);
            onClose();
          }}
        />
      )}
    </div>
  );
}

type T = (zh: string, en: string) => string;
type Shared = {
  lang: Lang;
  t: T;
  account: {
    channel: Channel;
    country: Country;
    email: string;
    phone: string;
    setEmail: (v: string) => void;
    setPhone: (v: string) => void;
    openPicker: () => void;
    valid: boolean;
    target: string;
    masked: string;
    find: () => AuthAccount | undefined;
  };
  setChannel: (c: Channel) => void;
  onToast: (text: string) => void;
  requireCaptcha: (next: () => void) => void;
  go: (view: AuthView) => void;
};

/* ---------------- Fields ---------------- */
function Field({
  icon,
  error,
  hint,
  children,
  trailing,
}: {
  icon?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="au-field-wrap">
      <label className={`au-field${error ? " is-error" : ""}`}>
        {icon && <span className="au-field-icon">{icon}</span>}
        {children}
        {trailing}
      </label>
      {error ? (
        <p className="au-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="au-hint">{hint}</p>
      )}
    </div>
  );
}

function AccountField({
  account: a,
  t,
  error,
  onEdit,
}: Pick<Shared, "account" | "t"> & {
  error?: React.ReactNode;
  onEdit?: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const invalid =
    touched &&
    (a.channel === "email" ? a.email : a.phone) &&
    !a.valid &&
    (a.channel === "email"
      ? t("请输入正确的邮箱地址", "Enter a valid email address")
      : t(
          `${a.country.zh}手机号应为 ${a.country.len[0] === a.country.len[1] ? a.country.len[0] : a.country.len.join("–")} 位数字`,
          `${a.country.en} numbers have ${a.country.len[0] === a.country.len[1] ? a.country.len[0] : a.country.len.join("–")} digits`,
        ));
  return a.channel === "email" ? (
    <Field icon={<Mail size={18} />} error={error || invalid}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        aria-label={t("邮箱地址", "Email address")}
        placeholder={t("请输入邮箱地址", "Email address")}
        value={a.email}
        onChange={(e) => {
          a.setEmail(e.target.value);
          onEdit?.();
        }}
        onBlur={() => setTouched(true)}
      />
      {a.email && (
        <button
          type="button"
          className="au-clear"
          aria-label={t("清除", "Clear")}
          onClick={() => a.setEmail("")}
        >
          <X size={14} />
        </button>
      )}
    </Field>
  ) : (
    <Field error={error || invalid}>
      <button
        type="button"
        className="au-dial"
        onClick={a.openPicker}
        aria-label={t("选择国家/地区", "Select country/region")}
      >
        <Flag iso={a.country.iso} />+{a.country.dial}
        <ChevronDown size={14} />
      </button>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label={t("手机号", "Mobile number")}
        placeholder={t("请输入手机号", "Mobile number")}
        value={a.phone}
        maxLength={a.country.len[1] + 4}
        onChange={(e) => {
          a.setPhone(e.target.value.replace(/[^\d\s-]/g, ""));
          onEdit?.();
        }}
        onBlur={() => setTouched(true)}
      />
      {a.phone && (
        <button
          type="button"
          className="au-clear"
          aria-label={t("清除", "Clear")}
          onClick={() => a.setPhone("")}
        >
          <X size={14} />
        </button>
      )}
    </Field>
  );
}

function PasswordField({
  value,
  onChange,
  t,
  placeholder,
  error,
  autoComplete = "current-password",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  t: T;
  placeholder: string;
  error?: React.ReactNode;
  autoComplete?: string;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field
      icon={<Lock size={18} />}
      error={error}
      trailing={
        <button
          type="button"
          className="au-eye"
          aria-label={show ? t("隐藏密码", "Hide password") : t("显示密码", "Show password")}
          onClick={() => setShow(!show)}
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      }
    >
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        maxLength={32}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function CodeField({
  account,
  t,
  code,
  setCode,
  sender,
  onToast,
  requireCaptcha,
  error,
  beforeSend,
}: Pick<Shared, "account" | "t" | "onToast" | "requireCaptcha"> & {
  code: string;
  setCode: (v: string) => void;
  sender: ReturnType<typeof useCodeSender>;
  error?: React.ReactNode;
  beforeSend?: () => string | null;
}) {
  const [demo, setDemo] = useState<string | null>(null);
  const send = () => {
    const problem = beforeSend?.();
    if (problem) return onToast(problem);
    requireCaptcha(() => {
      const c = sender.send(account.target);
      setDemo(c);
      onToast(
        t(
          `验证码已发送至 ${account.masked}`,
          `Code sent to ${account.masked}`,
        ),
      );
    });
  };
  const sentHere = sender.sentTo === account.target;
  return (
    <Field
      icon={<ShieldCheck size={18} />}
      error={error}
      hint={
        sentHere && demo ? (
          <>
            {t(`已发送至 ${account.masked}，10 分钟内有效`, `Sent to ${account.masked}, valid for 10 minutes`)}
            <button type="button" onClick={() => setCode(demo)}>
              {t("模拟环境验证码", "Demo code")} <b>{demo}</b> · {t("填入", "Fill")}
            </button>
          </>
        ) : undefined
      }
      trailing={
        <button
          type="button"
          className="au-send"
          disabled={!account.valid || sender.cooldown > 0}
          onClick={send}
        >
          {sender.cooldown > 0
            ? `${sender.cooldown}s`
            : sentHere
              ? t("重新发送", "Resend")
              : t("获取验证码", "Get code")}
        </button>
      }
    >
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={t("验证码", "Verification code")}
        placeholder={t("请输入 6 位验证码", "6-digit code")}
        value={code}
        maxLength={6}
        onChange={(e) => setCode(digits(e.target.value))}
      />
    </Field>
  );
}

function StrengthMeter({ value, t }: { value: string; t: T }) {
  if (!value) return null;
  const s = passwordStrength(value),
    c = passwordChecks(value);
  const labels = [
    "",
    t("弱", "Weak"),
    t("一般", "Fair"),
    t("良好", "Good"),
    t("强", "Strong"),
  ];
  return (
    <div className="au-strength" data-level={s}>
      <div>
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= s ? "on" : ""} />
        ))}
        <span>{labels[s]}</span>
      </div>
      <ul>
        {(
          [
            ["length", t("8–32 位字符", "8–32 characters")],
            ["letter", t("包含字母", "A letter")],
            ["number", t("包含数字", "A number")],
          ] as const
        ).map(([k, label]) => (
          <li key={k} className={c[k] ? "ok" : ""}>
            <Check size={12} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Submit({
  disabled,
  loading,
  children,
}: {
  disabled: boolean;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="au-submit" disabled={disabled || loading}>
      {loading ? <Loader2 size={18} className="au-spin" /> : children}
    </button>
  );
}

const useBusy = () => {
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = (fn: () => void) => {
    setBusy(true);
    timer.current = window.setTimeout(() => {
      setBusy(false);
      fn();
    }, 650);
  };
  return [busy, run] as const;
};

/* ---------------- Login ---------------- */
function LoginForm({
  t,
  account,
  onToast,
  requireCaptcha,
  go,
  onSuccess,
  onDemo,
}: Shared & { onSuccess: (a: AuthAccount) => void; onDemo: () => void }) {
  const [method, setMethod] = useState<"password" | "code">("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ field: string; text: React.ReactNode } | null>(null);
  const [fails, setFails] = useState(0);
  const [busy, run] = useBusy();
  const sender = useCodeSender();
  const notFound = (
    <>
      {t("该账号尚未注册，", "No account found. ")}
      <button type="button" onClick={() => go("register")}>
        {t("立即注册", "Sign up")}
      </button>
    </>
  );
  const ready =
    account.valid &&
    (method === "password" ? password.length > 0 : code.length === 6);
  return (
    <form
      className="au-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        run(() => {
          const found = account.find();
          if (!found) return setError({ field: "account", text: notFound });
          if (method === "code") {
            if (!sender.verify(account.target, code))
              return setError({ field: "code", text: t("验证码错误或已过期", "Incorrect or expired code") });
          } else if (found.password !== password) {
            const n = fails + 1;
            setFails(n);
            return setError({
              field: "password",
              text:
                n >= 5
                  ? t("错误次数过多，建议使用验证码登录或重置密码", "Too many attempts. Use a code or reset your password.")
                  : t(`账号或密码错误，还可尝试 ${5 - n} 次`, `Incorrect account or password. ${5 - n} attempts left.`),
            });
          }
          onToast(t("登录成功，欢迎回来", "Signed in. Welcome back!"));
          onSuccess(found);
        });
      }}
    >
      <AccountField
        account={account}
        t={t}
        error={error?.field === "account" ? error.text : undefined}
        onEdit={() => setError(null)}
      />
      {method === "password" ? (
        <PasswordField
          t={t}
          label={t("登录密码", "Password")}
          placeholder={t("请输入登录密码", "Password")}
          value={password}
          onChange={(v) => {
            setPassword(v);
            setError(null);
          }}
          error={error?.field === "password" ? error.text : undefined}
        />
      ) : (
        <CodeField
          account={account}
          t={t}
          code={code}
          setCode={(v) => {
            setCode(v);
            setError(null);
          }}
          sender={sender}
          onToast={onToast}
          requireCaptcha={requireCaptcha}
          error={error?.field === "code" ? error.text : undefined}
          beforeSend={() =>
            account.find() ? null : t("该账号尚未注册，请先注册", "No account found. Please sign up first.")
          }
        />
      )}
      <div className="au-links">
        <button
          type="button"
          onClick={() => {
            setMethod(method === "password" ? "code" : "password");
            setError(null);
          }}
        >
          {method === "password" ? t("验证码登录", "Sign in with code") : t("密码登录", "Sign in with password")}
        </button>
        <button type="button" onClick={() => go("forgot")}>
          {t("忘记密码？", "Forgot password?")}
        </button>
      </div>
      <Submit disabled={!ready} loading={busy}>
        {t("登录", "Sign in")}
      </Submit>
      <p className="au-switch">
        {t("还没有账户？", "New to AlphaPulse?")}
        <button type="button" onClick={() => go("register")}>
          {t("立即注册", "Create account")}
          <ArrowRight size={14} />
        </button>
      </p>
      <button
        type="button"
        className="au-demo"
        onClick={() => {
          onDemo();
          setMethod("password");
          setPassword(DEMO_PASSWORD);
          setError(null);
        }}
      >
        <KeyRound size={13} />
        {t("使用体验账号", "Use demo account")}
        <span>
          {account.channel === "email" ? DEMO_EMAIL : `+${DEMO_PHONE.dial} ${DEMO_PHONE.phone}`} / {DEMO_PASSWORD}
        </span>
      </button>
    </form>
  );
}

/* ---------------- Register ---------------- */
function RegisterForm({
  t,
  account,
  onToast,
  requireCaptcha,
  go,
  onCreate,
  onDoc,
}: Shared & {
  onCreate: (a: Omit<AuthAccount, "id" | "createdAt">) => void;
  onDoc: (d: "terms" | "privacy") => void;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(
    () => new URLSearchParams(window.location.search).get("ref") || "",
  );
  const [agree, setAgree] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [error, setError] = useState<{ field: string; text: React.ReactNode } | null>(null);
  const [busy, run] = useBusy();
  const sender = useCodeSender();
  const inviteOk = !invite || /^[a-z0-9]{4,10}$/i.test(invite);
  const ready = account.valid && code.length === 6 && isPassword(password) && inviteOk;
  const exists = (
    <>
      {t("该账号已注册，", "This account already exists. ")}
      <button type="button" onClick={() => go("login")}>
        {t("去登录", "Sign in")}
      </button>
    </>
  );
  return (
    <form
      className="au-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        if (!agree) {
          setNudge(true);
          window.setTimeout(() => setNudge(false), 600);
          return onToast(t("请先阅读并同意用户协议和隐私政策", "Please accept the Terms and Privacy Policy"));
        }
        run(() => {
          if (account.find()) return setError({ field: "account", text: exists });
          if (!sender.verify(account.target, code))
            return setError({ field: "code", text: t("验证码错误或已过期", "Incorrect or expired code") });
          onCreate(
            account.channel === "email"
              ? { channel: "email", email: account.email.trim(), password, invite: invite || undefined }
              : {
                  channel: "phone",
                  iso: account.country.iso,
                  dial: account.country.dial,
                  phone: digits(account.phone),
                  password,
                  invite: invite || undefined,
                },
          );
        });
      }}
    >
      <AccountField
        account={account}
        t={t}
        error={error?.field === "account" ? error.text : undefined}
        onEdit={() => setError(null)}
      />
      <CodeField
        account={account}
        t={t}
        code={code}
        setCode={(v) => {
          setCode(v);
          setError(null);
        }}
        sender={sender}
        onToast={onToast}
        requireCaptcha={requireCaptcha}
        error={error?.field === "code" ? error.text : undefined}
        beforeSend={() =>
          account.find() ? t("该账号已注册，请直接登录", "This account already exists. Please sign in.") : null
        }
      />
      <div>
        <PasswordField
          t={t}
          label={t("设置登录密码", "Create password")}
          placeholder={t("设置登录密码", "Create a password")}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <StrengthMeter value={password} t={t} />
      </div>
      <Field
        icon={<Rocket size={18} />}
        error={!inviteOk ? t("邀请码为 4–10 位字母或数字", "Invite codes are 4–10 letters or digits") : undefined}
      >
        <input
          aria-label={t("邀请码", "Invite code")}
          placeholder={t("邀请码（选填）", "Invite code (optional)")}
          value={invite}
          maxLength={10}
          onChange={(e) => setInvite(e.target.value.trim())}
        />
      </Field>
      <label className={`au-agree${nudge ? " is-nudge" : ""}`}>
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span className="au-check">
          <Check size={11} strokeWidth={3} />
        </span>
        <span>
          {t("我已阅读并同意", "I have read and agree to the ")}
          <button type="button" onClick={() => onDoc("terms")}>
            {t("《用户协议》", "Terms of Service")}
          </button>
          {t("和", " and ")}
          <button type="button" onClick={() => onDoc("privacy")}>
            {t("《隐私政策》", "Privacy Policy")}
          </button>
        </span>
      </label>
      <Submit disabled={!ready} loading={busy}>
        {t("注册", "Create account")}
      </Submit>
      <p className="au-switch">
        {t("已有账户？", "Already have an account?")}
        <button type="button" onClick={() => go("login")}>
          {t("去登录", "Sign in")}
          <ArrowRight size={14} />
        </button>
      </p>
    </form>
  );
}

/* ---------------- Forgot password ---------------- */
function ForgotForm({
  t,
  account,
  onToast,
  requireCaptcha,
  onReset,
}: Shared & { onReset: (id: string, password: string) => void }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ field: string; text: string } | null>(null);
  const [busy, run] = useBusy();
  const sender = useCodeSender();
  const mismatch = !!confirm && confirm !== password;
  const ready =
    account.valid && code.length === 6 && isPassword(password) && confirm === password;
  return (
    <form
      className="au-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        run(() => {
          const found = account.find();
          if (!found)
            return setError({ field: "account", text: t("该账号尚未注册", "No account found") });
          if (!sender.verify(account.target, code))
            return setError({ field: "code", text: t("验证码错误或已过期", "Incorrect or expired code") });
          if (found.password === password)
            return setError({ field: "password", text: t("新密码不能与原密码相同", "Choose a different password") });
          onReset(found.id, password);
        });
      }}
    >
      <AccountField
        account={account}
        t={t}
        error={error?.field === "account" ? error.text : undefined}
        onEdit={() => setError(null)}
      />
      <CodeField
        account={account}
        t={t}
        code={code}
        setCode={setCode}
        sender={sender}
        onToast={onToast}
        requireCaptcha={requireCaptcha}
        error={error?.field === "code" ? error.text : undefined}
        beforeSend={() =>
          account.find() ? null : t("该账号尚未注册", "No account found")
        }
      />
      <div>
        <PasswordField
          t={t}
          label={t("新密码", "New password")}
          placeholder={t("设置新密码", "New password")}
          autoComplete="new-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setError(null);
          }}
          error={error?.field === "password" ? error.text : undefined}
        />
        <StrengthMeter value={password} t={t} />
      </div>
      <PasswordField
        t={t}
        label={t("确认新密码", "Confirm password")}
        placeholder={t("再次输入新密码", "Confirm new password")}
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={mismatch ? t("两次输入的密码不一致", "Passwords do not match") : undefined}
      />
      <Submit disabled={!ready} loading={busy}>
        {t("重置密码", "Reset password")}
      </Submit>
    </form>
  );
}

/* ---------------- Success ---------------- */
function SuccessView({
  t,
  account,
  onStart,
}: {
  t: T;
  account: AuthAccount;
  onStart: () => void;
}) {
  return (
    <div className="au-success">
      <span className="au-success-badge">
        <Check size={34} strokeWidth={3} />
      </span>
      <h1>{t("注册成功", "You're all set")}</h1>
      <p>
        {t("欢迎加入 AlphaPulse，账户 ", "Welcome to AlphaPulse. Account ")}
        <b>
          {account.channel === "email"
            ? maskEmail(account.email!)
            : maskPhone(account.dial!, account.phone!)}
        </b>
        {t(" 已开通模拟交易。", " is ready for paper trading.")}
      </p>
      <ul>
        <li>
          <Gift size={18} />
          <span>
            <b>{t("10,000 USDT 模拟金", "10,000 USDT demo funds")}</b>
            <small>{t("前往「模拟资产」领取", "Claim them in Demo Assets")}</small>
          </span>
        </li>
        <li>
          <ShieldCheck size={18} />
          <span>
            <b>
              {account.channel === "email"
                ? t("建议绑定手机号", "Add a mobile number")
                : t("建议绑定邮箱", "Add an email address")}
            </b>
            <small>{t("在「安全中心」完成，提升账户安全等级", "Do it in Security to protect your account")}</small>
          </span>
        </li>
      </ul>
      <button className="au-submit" onClick={onStart}>
        {t("开始模拟交易", "Start paper trading")}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ---------------- Social ---------------- */
const PROVIDER_NAME: Record<Provider, string> = {
  google: "Google",
  apple: "Apple",
  telegram: "Telegram",
};
function SocialRow({ t, onPick }: { t: T; onPick: (p: Provider) => void }) {
  return (
    <div className="au-social">
      <span>{t("或使用以下方式登录", "Or continue with")}</span>
      <div>
        <button type="button" aria-label="Google" onClick={() => onPick("google")}>
          <GoogleLogo />
        </button>
        <button type="button" aria-label="Apple" onClick={() => onPick("apple")}>
          <AppleLogo />
        </button>
        <button type="button" aria-label="Telegram" onClick={() => onPick("telegram")}>
          <TelegramLogo />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Country picker ---------------- */
function CountryPicker({
  lang,
  t,
  selected,
  onPick,
  onClose,
}: {
  lang: Lang;
  t: T;
  selected: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  const sorted = useMemo(
    () =>
      [...COUNTRIES].sort((a, b) =>
        lang === "zh"
          ? a.zh.localeCompare(b.zh, "zh-CN")
          : a.en.localeCompare(b.en, "en"),
      ),
    [lang],
  );
  const query = q.trim().toLowerCase().replace(/^\+/, "");
  const results = query
    ? sorted.filter(
        (c) =>
          c.zh.includes(query) ||
          c.en.toLowerCase().includes(query) ||
          c.dial.startsWith(query) ||
          c.iso === query,
      )
    : null;
  const row = (c: Country) => (
    <button
      key={c.iso}
      className="au-country"
      aria-pressed={c.iso === selected}
      onClick={() => onPick(c.iso)}
    >
      <Flag iso={c.iso} />
      <span>{lang === "zh" ? c.zh : c.en}</span>
      <em>+{c.dial}</em>
      {c.iso === selected && <Check size={16} />}
    </button>
  );
  return (
    <div className="au-layer" role="dialog" aria-label={t("选择国家/地区", "Select country/region")}>
      <header className="au-layer-head">
        <button className="au-icon" aria-label={t("返回", "Back")} onClick={onClose}>
          <ChevronLeft size={20} />
        </button>
        <h2>{t("选择国家/地区", "Country / region")}</h2>
        <span />
      </header>
      <label className="au-search">
        <Search size={16} />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("搜索国家/地区或区号", "Search country or dial code")}
          aria-label={t("搜索国家/地区", "Search country/region")}
        />
        {q && (
          <button className="au-clear" aria-label={t("清除", "Clear")} onClick={() => setQ("")}>
            <X size={14} />
          </button>
        )}
      </label>
      <div className="au-country-list">
        {results ? (
          results.length ? (
            results.map(row)
          ) : (
            <p className="au-empty">{t("没有找到匹配的国家/地区", "No matching country or region")}</p>
          )
        ) : (
          <>
            <h3>{t("常用地区", "Popular")}</h3>
            {POPULAR_ISO.map((iso) => row(countryByIso(iso)))}
            <h3>{t("全部国家/地区", "All countries & regions")}</h3>
            {sorted.map(row)}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Legal documents ---------------- */
function DocSheet({
  t,
  doc,
  onClose,
}: {
  t: T;
  doc: "terms" | "privacy";
  onClose: () => void;
}) {
  const sections =
    doc === "terms"
      ? [
          [t("服务说明", "Service"), t("AlphaPulse 提供 CFD 与加密市场的模拟交易、行情资讯、AI 分析与直播服务。所有交易均使用虚拟资金，不涉及真实资金的存入、提取或交易。", "AlphaPulse provides paper trading for CFD and crypto markets, market news, AI analysis and live rooms. All trading uses virtual funds; no real money is deposited, withdrawn or traded.")],
          [t("账户与安全", "Account & security"), t("你应妥善保管登录凭证，不得出借、转让账户。发现异常登录请及时修改密码。", "Keep your credentials safe and do not share or transfer your account. Change your password if you notice unusual activity.")],
          [t("内容与风险提示", "Content & risk"), t("平台内的分析、策略与直播观点仅供学习交流，不构成投资建议。模拟收益不代表真实交易结果。", "Analysis, strategies and live commentary are for education only and are not investment advice. Simulated results do not represent real trading outcomes.")],
          [t("社区规范", "Community"), t("禁止发布广告引流、骚扰辱骂及收益承诺等内容，违规账号可能被限制使用。", "Spam, harassment and promises of returns are prohibited. Violations may lead to restrictions.")],
        ]
      : [
          [t("我们收集的信息", "What we collect"), t("注册所用的邮箱或手机号、加密存储的密码，以及你在模拟交易与社区中的操作记录。", "The email or mobile number you register with, your encrypted password, and your activity in paper trading and the community.")],
          [t("信息的使用", "How we use it"), t("用于账户登录、安全验证、发送通知以及改进产品体验。我们不会出售你的个人信息。", "To sign you in, verify security, send notifications and improve the product. We never sell your personal information.")],
          [t("你的权利", "Your rights"), t("你可以随时查看、更正或删除账户信息，也可以在设置中关闭营销通知。", "You can view, correct or delete your account information at any time and turn off marketing notifications in settings.")],
        ];
  return (
    <div className="au-layer" role="dialog" aria-label={doc === "terms" ? t("用户协议", "Terms of Service") : t("隐私政策", "Privacy Policy")}>
      <header className="au-layer-head">
        <button className="au-icon" aria-label={t("返回", "Back")} onClick={onClose}>
          <ChevronLeft size={20} />
        </button>
        <h2>{doc === "terms" ? t("用户协议", "Terms of Service") : t("隐私政策", "Privacy Policy")}</h2>
        <span />
      </header>
      <div className="au-doc">
        <small>{t("更新日期：2026 年 10 月", "Updated October 2026")}</small>
        {sections.map(([h, p]) => (
          <section key={h}>
            <h3>{h}</h3>
            <p>{p}</p>
          </section>
        ))}
        <button className="au-submit" onClick={onClose}>
          {t("我已了解", "Got it")}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Slide captcha ---------------- */
function SlideCaptcha({
  t,
  onPass,
  onCancel,
}: {
  t: T;
  onPass: () => void;
  onCancel: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const max = () => (track.current?.clientWidth || 280) - 48;
  const end = () => {
    if (start.current == null) return;
    start.current = null;
    if (x >= max() - 4) {
      setX(max());
      setDone(true);
      window.setTimeout(onPass, 450);
    } else setX(0);
  };
  return (
    <div className="au-captcha-shade" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="au-captcha" role="dialog" aria-label={t("安全验证", "Security check")}>
        <header>
          <b>{t("安全验证", "Security check")}</b>
          <button className="au-icon" aria-label={t("关闭", "Close")} onClick={onCancel}>
            <X size={18} />
          </button>
        </header>
        <p>{t("为保障账户安全，请向右拖动滑块完成验证", "Drag the slider to the right to continue")}</p>
        <div
          ref={track}
          className={`au-slider${done ? " is-done" : ""}`}
          onPointerMove={(e) => {
            if (start.current == null || done) return;
            setX(Math.max(0, Math.min(max(), e.clientX - start.current)));
          }}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <i style={{ width: x + 24 }} />
          <span>{done ? t("验证通过", "Verified") : t("按住滑块，拖动到最右边", "Hold and drag to the end")}</span>
          <button
            type="button"
            aria-label={t("拖动滑块", "Slider handle")}
            style={{ transform: `translateX(${x}px)`, transition: start.current == null ? "transform .25s" : "none" }}
            onPointerDown={(e) => {
              if (done) return;
              (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
              start.current = e.clientX - x;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setX(max());
                setDone(true);
                window.setTimeout(onPass, 450);
              }
            }}
          >
            {done ? <Check size={18} /> : <ChevronsRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
