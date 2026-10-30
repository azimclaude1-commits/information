import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  MonitorSmartphone,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { countryByIso } from "../../data/countries";
import { digits, isPhone, maskEmail, useCodeSender } from "../auth/authState";
import { Flag } from "../auth/AuthScreen";
import { ConfirmSheet, DigitInput, Sheet } from "../ui/Sheet";
import { CountrySheet } from "../ui/CountrySheet";
import { newSecret, otpValid, PHISH_RE, useOtp, useSecurity, weakPin, type SecurityState } from "./securityState";
import "./security.css";

type Lang = "zh" | "en";
type T = (zh: string, en: string) => string;
type Sender = ReturnType<typeof useCodeSender>;
const tr = (lang: Lang): T => (zh, en) => (lang === "zh" ? zh : en);
const maskPhoneText = (p: string) => p.replace(/(\d{3})\d+(\d{4})$/, "$1****$2");
const fmtDate = (ts: number, lang: Lang) =>
  new Date(ts).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

/* ---------------- Shared fields ---------------- */
function CodeField({
  t,
  sender,
  target,
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  t: T;
  sender: Sender;
  target: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const active = sender.sentTo === target;
  return (
    <label className="sh-field">
      <span>{label}</span>
      <div className={`sh-inputbox ${error ? "is-invalid" : ""}`}>
        <input
          inputMode="numeric"
          maxLength={6}
          value={value}
          placeholder={t("请输入 6 位验证码", "6-digit code")}
          onChange={(e) => onChange(digits(e.target.value).slice(0, 6))}
        />
        <button
          type="button"
          disabled={disabled || (active && sender.cooldown > 0)}
          onClick={() => setCode(sender.send(target))}
        >
          {active && sender.cooldown > 0
            ? t(`${sender.cooldown}s 后重发`, `Resend ${sender.cooldown}s`)
            : active
              ? t("重新发送", "Resend")
              : t("获取验证码", "Send code")}
        </button>
      </div>
      {error && <small className="sh-error">{error}</small>}
      {active && code && (
        <div className="sh-demo">
          <span>
            {t("模拟环境验证码", "Demo code")} <b>{code}</b>
          </span>
          <button type="button" onClick={() => onChange(code)}>
            {t("填入", "Fill")}
          </button>
        </div>
      )}
    </label>
  );
}

function OtpField({ t, secret, value, onChange, error }: { t: T; secret: string; value: string; onChange: (v: string) => void; error?: string }) {
  const { code, left } = useOtp(secret);
  return (
    <div className="sh-field">
      <span>{t("谷歌验证码", "Authenticator code")}</span>
      <DigitInput label={t("谷歌验证码", "Authenticator code")} value={value} onChange={onChange} invalid={!!error} />
      {error && <small className="sh-error">{error}</small>}
      <div className="sh-demo">
        <span>
          {t("模拟验证器当前口令", "Demo authenticator")} <b>{code}</b> · {left}s
        </span>
        <button type="button" onClick={() => onChange(code)}>
          {t("填入", "Fill")}
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className="sc-switch" onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

/* ---------------- Country + phone ---------------- */
/** 绑定手机 / 更换手机. Change verifies the current number (and authenticator) first. */
export function PhoneBindSheet({
  lang,
  current,
  onDone,
  onClose,
}: {
  lang: Lang;
  current: string;
  onDone: (phone: string) => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const { state } = useSecurity();
  const sender = useCodeSender();
  const changing = !!current;
  const [step, setStep] = useState<"old" | "new" | "done">(changing ? "old" : "new");
  const [oldCode, setOldCode] = useState("");
  const [ga, setGa] = useState("");
  const [iso, setIso] = useState(() => (current.startsWith("+1 ") ? "us" : current.startsWith("+852") ? "hk" : "cn"));
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<Record<string, string>>({});
  const country = countryByIso(iso);
  const full = `+${country.dial} ${digits(phone)}`;
  const needGa = changing && state.ga.bound && state.ga.scopes.settings;

  const verifyOld = () => {
    const e: Record<string, string> = {};
    if (!sender.verify(`old:${current}`, oldCode)) e.old = t("验证码错误或已过期", "Invalid or expired code");
    if (needGa && !otpValid(state.ga.secret, ga)) e.ga = t("谷歌验证码错误", "Wrong authenticator code");
    setError(e);
    if (!Object.keys(e).length) {
      sender.reset();
      setStep("new");
    }
  };
  const submit = () => {
    const e: Record<string, string> = {};
    if (!isPhone(phone, country))
      e.phone =
        country.len[0] === country.len[1]
          ? t(`${country.zh}手机号应为 ${country.len[0]} 位数字`, `${country.en} numbers have ${country.len[0]} digits`)
          : t(`请输入 ${country.len[0]}–${country.len[1]} 位手机号`, `Enter ${country.len[0]}–${country.len[1]} digits`);
    else if (full === current) e.phone = t("新手机号不能与当前手机号相同", "Use a different number");
    if (!sender.verify(`new:${full}`, code)) e.code = t("验证码错误或已过期", "Invalid or expired code");
    setError(e);
    if (Object.keys(e).length) return;
    onDone(full);
    setStep("done");
  };

  return (
    <>
      <Sheet
        title={changing ? t("更换手机号", "Change mobile number") : t("绑定手机号", "Bind mobile number")}
        subtitle={step !== "done" && changing ? t(`第 ${step === "old" ? 1 : 2} 步，共 2 步`, `Step ${step === "old" ? 1 : 2} of 2`) : undefined}
        onClose={onClose}
        footer={
          step === "done" ? (
            <button className="sh-btn sh-btn-primary" onClick={onClose}>
              {t("完成", "Done")}
            </button>
          ) : step === "old" ? (
            <button className="sh-btn sh-btn-primary" disabled={oldCode.length !== 6 || (needGa && ga.length !== 6)} onClick={verifyOld}>
              {t("下一步", "Next")}
            </button>
          ) : (
            <button className="sh-btn sh-btn-primary" disabled={!phone || code.length !== 6} onClick={submit}>
              {changing ? t("确认更换", "Confirm change") : t("确认绑定", "Bind number")}
            </button>
          )
        }
      >
        {changing && step !== "done" && (
          <div className="sh-steps">
            <i className="is-on" />
            <i className={step === "new" ? "is-on" : ""} />
          </div>
        )}
        {step === "old" && (
          <>
            <p className="sc-lead">{t("为保障账户安全，请先验证当前手机号", "Verify your current number first")}</p>
            <div className="sc-current">
              <Smartphone size={18} />
              <span>{t("当前手机号", "Current number")}</span>
              <b>{maskPhoneText(current)}</b>
            </div>
            <CodeField t={t} sender={sender} target={`old:${current}`} label={t("短信验证码", "SMS code")} value={oldCode} onChange={setOldCode} error={error.old} />
            {needGa && <OtpField t={t} secret={state.ga.secret} value={ga} onChange={setGa} error={error.ga} />}
            <p className="sh-hint">{t("原手机号已停用？请联系客服人工处理。", "Lost access to the number? Contact support.")}</p>
          </>
        )}
        {step === "new" && (
          <>
            <p className="sc-lead">
              {changing
                ? t("请输入新的手机号码，更换后原手机号将不能用于登录和接收验证码。", "Enter the new number. The old one will no longer sign in or receive codes.")
                : t("绑定后可用于手机号登录、奖励提现和安全验证。", "Used for sign-in, reward withdrawals and security checks.")}
            </p>
            <label className="sh-field">
              <span>{t("手机号码", "Mobile number")}</span>
              <div className={`sh-inputbox sc-phone ${error.phone ? "is-invalid" : ""}`}>
                <button type="button" className="sc-dial" onClick={() => setPicker(true)}>
                  <Flag iso={iso} />+{country.dial}
                  <ChevronDown size={14} />
                </button>
                <input inputMode="tel" value={phone} placeholder={t("请输入手机号", "Phone number")} onChange={(e) => setPhone(digits(e.target.value).slice(0, country.len[1]))} />
              </div>
              {error.phone && <small className="sh-error">{error.phone}</small>}
            </label>
            <CodeField
              t={t}
              sender={sender}
              target={`new:${full}`}
              label={t("短信验证码", "SMS code")}
              value={code}
              onChange={setCode}
              disabled={!isPhone(phone, country)}
              error={error.code}
            />
          </>
        )}
        {step === "done" && (
          <div className="sh-result">
            <span>
              <Check size={30} strokeWidth={3} />
            </span>
            <h3>{changing ? t("手机号已更换", "Number changed") : t("手机号绑定成功", "Number bound")}</h3>
            <p>{maskPhoneText(full)}</p>
          </div>
        )}
      </Sheet>
      {picker && (
        <CountrySheet
          lang={lang}
          selected={iso}
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setIso(v);
            setPicker(false);
            setPhone("");
          }}
        />
      )}
    </>
  );
}

/* ---------------- Fund password ---------------- */
type PinMode = "set" | "manage" | "change" | "reset" | "disable";
function PinSheet({ lang, account, onClose, onToast }: { lang: Lang; account: string; onClose: () => void; onToast: (s: string) => void }) {
  const t = tr(lang);
  const { state, patch } = useSecurity();
  const sender = useCodeSender();
  const [mode, setMode] = useState<PinMode>(state.pin.value ? "manage" : "set");
  const [step, setStep] = useState(0);
  const [old, setOld] = useState("");
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const restart = (m: PinMode) => {
    setMode(m);
    setStep(0);
    setOld("");
    setPin("");
    setAgain("");
    setCode("");
    setErr("");
  };
  // Each flow is a list of steps; the last confirms
  const flows: Record<Exclude<PinMode, "manage">, string[]> = {
    set: ["pin", "again", "code"],
    change: ["old", "pin", "again"],
    reset: ["code", "pin", "again"],
    disable: ["old"],
  };
  const flow = mode === "manage" ? [] : flows[mode];
  const cur = flow[step];
  const next = () => {
    setErr("");
    if (cur === "old" && old !== state.pin.value) return setErr(t("资金密码错误", "Wrong fund password"));
    if (cur === "pin" && weakPin(pin)) return setErr(t("密码过于简单，请勿使用连续或重复数字", "Avoid repeated or sequential digits"));
    if (cur === "pin" && mode === "change" && pin === state.pin.value) return setErr(t("新密码不能与原密码相同", "Use a new password"));
    if (cur === "again" && again !== pin) return setErr(t("两次输入的密码不一致", "Passwords do not match"));
    if (cur === "code" && !sender.verify(`pin:${account}`, code)) return setErr(t("验证码错误或已过期", "Invalid or expired code"));
    if (step < flow.length - 1) return setStep(step + 1);
    if (mode === "disable") {
      patch("pin", { value: null, at: undefined });
      onToast(t("资金密码已关闭", "Fund password disabled"));
    } else {
      patch("pin", { value: pin, at: Date.now() });
      onToast(mode === "set" ? t("资金密码已设置", "Fund password set") : t("资金密码已更新", "Fund password updated"));
    }
    onClose();
  };
  const titles: Record<PinMode, string> = {
    set: t("设置资金密码", "Set fund password"),
    manage: t("资金密码", "Fund password"),
    change: t("修改资金密码", "Change fund password"),
    reset: t("重置资金密码", "Reset fund password"),
    disable: t("关闭资金密码", "Disable fund password"),
  };
  const prompt: Record<string, string> = {
    old: mode === "disable" ? t("输入资金密码以确认关闭", "Enter your fund password to disable it") : t("请输入原资金密码", "Enter current fund password"),
    pin: t("请设置 6 位数字资金密码", "Choose a 6-digit fund password"),
    again: t("请再次输入资金密码", "Re-enter the fund password"),
    code: t(`验证码将发送至 ${account.includes("@") ? maskEmail(account) : maskPhoneText(account)}`, `We'll send a code to ${account.includes("@") ? maskEmail(account) : maskPhoneText(account)}`),
  };
  const value = cur === "old" ? old : cur === "pin" ? pin : cur === "again" ? again : code;
  const setValue = (v: string) => {
    setErr("");
    (cur === "old" ? setOld : cur === "pin" ? setPin : cur === "again" ? setAgain : setCode)(v);
  };

  if (mode === "manage")
    return (
      <Sheet title={titles.manage} onClose={onClose}>
        <div className="sc-status is-ok">
          <ShieldCheck size={20} />
          <div>
            <b>{t("资金密码已启用", "Fund password enabled")}</b>
            <small>{state.pin.at ? t(`设置于 ${fmtDate(state.pin.at, lang)}`, `Set ${fmtDate(state.pin.at, lang)}`) : ""}</small>
          </div>
        </div>
        <div className="sh-section">
          <h3>{t("验证场景", "Required for")}</h3>
          <div className="sh-list">
            {(
              [
                ["withdraw", t("奖励提现", "Reward withdrawals"), t("提现时需输入资金密码", "Asked on every withdrawal")],
                ["transfer", t("资金划转", "Transfers"), t("账户间划转时需输入资金密码", "Asked when moving funds between accounts")],
              ] as const
            ).map(([k, name, desc]) => (
              <div key={k}>
                <div className="sh-li-main">
                  <b>{name}</b>
                  <small>{desc}</small>
                </div>
                <Toggle label={name} on={state.pin.scopes[k]} onChange={(v) => patch("pin", { scopes: { ...state.pin.scopes, [k]: v } })} />
              </div>
            ))}
          </div>
        </div>
        <div className="sh-list sh-section">
          <button onClick={() => restart("change")}>
            <div className="sh-li-main">
              <b>{t("修改资金密码", "Change fund password")}</b>
            </div>
            <ChevronRight size={18} className="sh-muted" />
          </button>
          <button onClick={() => restart("reset")}>
            <div className="sh-li-main">
              <b>{t("忘记资金密码", "Forgot fund password")}</b>
              <small>{t("通过验证码重置", "Reset with a verification code")}</small>
            </div>
            <ChevronRight size={18} className="sh-muted" />
          </button>
          <button onClick={() => restart("disable")}>
            <div className="sh-li-main">
              <b className="sh-down">{t("关闭资金密码", "Disable fund password")}</b>
            </div>
            <ChevronRight size={18} className="sh-muted" />
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      title={titles[mode]}
      onClose={onClose}
      onBack={state.pin.value ? () => (step ? setStep(step - 1) : restart("manage")) : step ? () => setStep(step - 1) : undefined}
      footer={
        <button className={`sh-btn ${mode === "disable" ? "sh-btn-danger" : "sh-btn-primary"}`} disabled={value.length !== 6} onClick={next}>
          {step < flow.length - 1 ? t("下一步", "Next") : mode === "disable" ? t("确认关闭", "Disable") : t("确认", "Confirm")}
        </button>
      }
    >
      {flow.length > 1 && (
        <div className="sh-steps">
          {flow.map((s, i) => (
            <i key={s} className={i <= step ? "is-on" : ""} />
          ))}
        </div>
      )}
      <p className="sc-lead">{prompt[cur]}</p>
      {cur === "code" ? (
        <CodeField
          t={t}
          sender={sender}
          target={`pin:${account}`}
          label={account.includes("@") ? t("邮箱验证码", "Email code") : t("短信验证码", "SMS code")}
          value={code}
          onChange={setValue}
          error={err}
        />
      ) : (
        <>
          <DigitInput key={cur} autoFocus masked label={prompt[cur]} value={value} onChange={setValue} invalid={!!err} />
          {err && <small className="sh-error">{err}</small>}
        </>
      )}
      {mode === "disable" ? (
        <p className="sh-note is-warn">
          <AlertTriangle size={15} />
          {t("关闭后提现与划转将不再校验资金密码，账户安全等级会降低。", "Withdrawals and transfers will no longer ask for it.")}
        </p>
      ) : (
        cur === "pin" && (
          <p className="sh-note">
            <Lock size={15} />
            {t("资金密码用于提现、划转等资金操作，请勿与登录密码相同，也不要告诉任何人（包括客服）。", "Used for withdrawals and transfers. Don't reuse your login password or share it with anyone, including support.")}
          </p>
        )
      )}
    </Sheet>
  );
}

/** Asks for the fund password before a protected action. */
export function PinPrompt({ lang, title, onPass, onClose }: { lang: Lang; title: string; onPass: () => void; onClose: () => void }) {
  const t = tr(lang);
  const { state } = useSecurity();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  return (
    <Sheet title={title} size="sm" onClose={onClose}>
      <p className="sc-lead">{t("请输入 6 位资金密码", "Enter your 6-digit fund password")}</p>
      <DigitInput
        autoFocus
        masked
        label={t("资金密码", "Fund password")}
        value={pin}
        invalid={err}
        onChange={(v) => {
          setErr(false);
          setPin(v);
          if (v.length === 6) {
            if (v === state.pin.value) onPass();
            else {
              setErr(true);
              setPin("");
            }
          }
        }}
      />
      {err && <small className="sh-error">{t("资金密码错误，请重新输入", "Wrong fund password")}</small>}
    </Sheet>
  );
}

/* ---------------- Anti-phishing ---------------- */
function PhishSheet({ lang, account, onClose, onToast }: { lang: Lang; account: string; onClose: () => void; onToast: (s: string) => void }) {
  const t = tr(lang);
  const { state, patch } = useSecurity();
  const sender = useCodeSender();
  const [editing, setEditing] = useState(!state.phish.value);
  const [show, setShow] = useState(false);
  const [value, setValue] = useState(state.phish.value || "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const current = state.phish.value;
  const shown = editing ? value || "YOUR-CODE" : show ? current! : `${current!.slice(0, 2)}${"•".repeat(Math.max(2, current!.length - 4))}${current!.slice(-2)}`;
  const save = () => {
    const e: Record<string, string> = {};
    if (!PHISH_RE.test(value)) e.value = t("4–20 位字母、数字、下划线或短横线", "4–20 letters, digits, _ or -");
    else if (value === current) e.value = t("新防钓鱼码不能与当前相同", "Use a different code");
    if (!sender.verify(`phish:${account}`, code)) e.code = t("验证码错误或已过期", "Invalid or expired code");
    setErr(e);
    if (Object.keys(e).length) return;
    patch("phish", { value, at: Date.now() });
    onToast(current ? t("防钓鱼码已修改", "Anti-phishing code updated") : t("防钓鱼码已设置", "Anti-phishing code set"));
    setEditing(false);
    setCode("");
    sender.reset();
  };
  return (
    <Sheet
      title={t("防钓鱼码", "Anti-phishing code")}
      onClose={onClose}
      onBack={editing && current ? () => setEditing(false) : undefined}
      footer={
        editing ? (
          <button className="sh-btn sh-btn-primary" disabled={!value || code.length !== 6} onClick={save}>
            {t("保存", "Save")}
          </button>
        ) : (
          <button className="sh-btn" onClick={() => setEditing(true)}>
            {t("修改防钓鱼码", "Change code")}
          </button>
        )
      }
    >
      <p className="sc-lead">
        {t(
          "设置后，AlphaPulse 发给你的所有官方邮件都会带上这串代码。没有防钓鱼码或代码不一致的邮件，都不是我们发送的。",
          "Every official AlphaPulse email will include this code. Emails without it, or with a different code, are not from us.",
        )}
      </p>
      {!editing && (
        <div className="sc-phish-code">
          <small>{t("当前防钓鱼码", "Current code")}</small>
          <b>{shown}</b>
          <button aria-label={show ? t("隐藏", "Hide") : t("显示", "Show")} onClick={() => setShow(!show)}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
          {state.phish.at && <em>{t(`设置于 ${fmtDate(state.phish.at, lang)}`, `Set ${fmtDate(state.phish.at, lang)}`)}</em>}
        </div>
      )}
      {editing && (
        <>
          <label className="sh-field">
            <span>
              {current ? t("新防钓鱼码", "New code") : t("防钓鱼码", "Code")} <em>{value.length}/20</em>
            </span>
            <input
              className={`sh-input ${err.value ? "is-invalid" : ""}`}
              maxLength={20}
              value={value}
              placeholder={t("例如 Alpha_2026", "e.g. Alpha_2026")}
              onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            />
            {err.value ? <small className="sh-error">{err.value}</small> : <small className="sh-hint">{t("4–20 位，可使用字母、数字、下划线和短横线", "4–20 letters, digits, _ or -")}</small>}
          </label>
          <CodeField t={t} sender={sender} target={`phish:${account}`} label={t("身份验证码", "Verification code")} value={code} onChange={setCode} error={err.code} />
        </>
      )}
      <div className="sh-section">
        <h3>{t("邮件效果预览", "Email preview")}</h3>
        <div className="sc-mail">
          <header>
            <Mail size={15} />
            <span>AlphaPulse &lt;no-reply@alphapulse.app&gt;</span>
          </header>
          <div className="sc-mail-code">
            {t("防钓鱼码", "Anti-phishing code")}: <b>{shown}</b>
          </div>
          <p>
            <b>{t("登录提醒", "Sign-in alert")}</b>
            <br />
            {t("你的账户于刚刚在新设备上登录。如非本人操作，请立即修改密码。", "Your account just signed in on a new device. If this wasn't you, change your password now.")}
          </p>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------- Devices ---------------- */
function DevicesSheet({ lang, onClose, onToast }: { lang: Lang; onClose: () => void; onToast: (s: string) => void }) {
  const t = tr(lang);
  const { state, setState } = useSecurity();
  const [confirm, setConfirm] = useState<string | null>(null);
  const others = state.devices.filter((d) => !d.current);
  return (
    <Sheet title={t("登录设备管理", "Signed-in devices")} subtitle={t(`共 ${state.devices.length} 台设备`, `${state.devices.length} devices`)} onClose={onClose}>
      <div className="sh-list">
        {state.devices.map((d) => (
          <div key={d.id}>
            <span className="sh-li-icon">{/iOS|iPhone|Android/.test(d.name) ? <Smartphone size={18} /> : <Laptop size={18} />}</span>
            <div className="sh-li-main">
              <b>{d.name}</b>
              <small>
                {d.place} · {d.current ? t("当前设备", "This device") : fmtDate(d.at, lang)}
              </small>
            </div>
            {d.current ? (
              <span className="sh-badge is-ok">{t("在线", "Active")}</span>
            ) : (
              <button className="sh-btn sh-btn-sm" onClick={() => setConfirm(d.id)}>
                {t("下线", "Sign out")}
              </button>
            )}
          </div>
        ))}
      </div>
      {others.length > 1 && (
        <button className="sh-btn sh-btn-block sh-section" onClick={() => setConfirm("all")}>
          {t("下线其他所有设备", "Sign out all other devices")}
        </button>
      )}
      {confirm && (
        <ConfirmSheet
          danger
          title={confirm === "all" ? t("下线其他所有设备？", "Sign out other devices?") : t("下线该设备？", "Sign out this device?")}
          confirm={t("确认下线", "Sign out")}
          cancel={t("取消", "Cancel")}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setState((s) => ({ ...s, devices: s.devices.filter((d) => d.current || (confirm !== "all" && d.id !== confirm)) }));
            onToast(t("设备已下线", "Device signed out"));
            setConfirm(null);
          }}
        >
          <p className="sc-lead">{t("该设备需要重新登录才能继续使用。", "That device will need to sign in again.")}</p>
        </ConfirmSheet>
      )}
    </Sheet>
  );
}

/* ---------------- Security home ---------------- */
function scoreOf(s: SecurityState, phone: boolean) {
  return 15 + (phone ? 25 : 0) + (s.ga.bound ? 30 : 0) + (s.pin.value ? 20 : 0) + (s.phish.value ? 10 : 0);
}

function SecurityHome({
  lang,
  account,
  phone,
  onVerifyPhone,
  onToast,
  onAuthenticator,
}: {
  lang: Lang;
  account: string;
  phone: string;
  onVerifyPhone: (p: string) => void;
  onToast: (s: string) => void;
  onAuthenticator: () => void;
}) {
  const t = tr(lang);
  const { state, setState } = useSecurity();
  const [sheet, setSheet] = useState<"phone" | "pin" | "phish" | "devices" | null>(null);
  const score = scoreOf(state, !!phone);
  const level = score >= 85 ? ["high", t("高", "High")] : score >= 55 ? ["mid", t("中", "Medium")] : ["low", t("低", "Low")];
  const todo = !phone
    ? t("绑定手机号，提升账户安全", "Bind a mobile number")
    : !state.ga.bound
      ? t("建议开启谷歌验证器，防止账户被盗", "Turn on the authenticator")
      : !state.pin.value
        ? t("建议设置资金密码，保护提现安全", "Set a fund password")
        : !state.phish.value
          ? t("设置防钓鱼码，识别仿冒邮件", "Set an anti-phishing code")
          : t("所有安全项均已开启", "All protections are on");
  const verifyTarget = phone || account;
  const pinScopes = [state.pin.scopes.withdraw && t("提现", "withdrawals"), state.pin.scopes.transfer && t("划转", "transfers")].filter(Boolean) as string[];
  const row = (
    icon: React.ReactNode,
    name: string,
    desc: string,
    on: boolean,
    onClick: () => void,
    offLabel = t("未设置", "Off"),
    onLabel = t("已开启", "On"),
  ) => (
    <button onClick={onClick}>
      <span className={`sh-li-icon ${on ? "sc-ic-on" : ""}`}>{icon}</span>
      <div className="sh-li-main">
        <b>{name}</b>
        <small>{desc}</small>
      </div>
      <span className="sh-li-end">
        <span className={`sh-badge ${on ? "is-ok" : "is-warn"}`}>{on ? onLabel : offLabel}</span>
        <ChevronRight size={17} />
      </span>
    </button>
  );
  return (
    <div className="sc-page">
      <section className={`sc-hero is-${level[0]}`}>
        <div className="sc-ring" style={{ "--p": score } as React.CSSProperties}>
          <b>{score}</b>
          <small>{t("安全分", "Score")}</small>
        </div>
        <div className="sc-hero-text">
          <h2>
            {t("安全等级", "Security level")}：{level[1]}
          </h2>
          <p>{todo}</p>
        </div>
        {score >= 85 ? <ShieldCheck size={46} className="sc-hero-ic" /> : <ShieldAlert size={46} className="sc-hero-ic" />}
      </section>

      <section className="ui-card sc-group">
        <h3>{t("身份验证", "Verification")}</h3>
        <div className="sh-list">
          <div>
            <span className="sh-li-icon sc-ic-on">
              <Mail size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("登录账号", "Sign-in account")}</b>
              <small>{account.includes("@") ? maskEmail(account) : maskPhoneText(account)}</small>
            </div>
            <span className="sh-badge is-ok">{t("已验证", "Verified")}</span>
          </div>
          {row(
            <Smartphone size={18} />,
            t("手机号", "Mobile number"),
            phone ? maskPhoneText(phone) : t("用于登录、提现和安全验证", "For sign-in, withdrawals and checks"),
            !!phone,
            () => setSheet("phone"),
            t("未绑定", "Not bound"),
            t("更换", "Change"),
          )}
          {row(
            <QrCode size={18} />,
            t("谷歌验证器", "Google Authenticator"),
            state.ga.bound ? t("登录、提现和修改安全设置时验证", "Checked on sign-in, withdrawals and settings") : t("使用动态口令进行两步验证", "Two-step verification with time-based codes"),
            state.ga.bound,
            onAuthenticator,
            t("未配置", "Not set"),
            t("已配置", "On"),
          )}
        </div>
      </section>

      <section className="ui-card sc-group">
        <h3>{t("资金安全", "Funds")}</h3>
        <div className="sh-list">
          {row(
            <Lock size={18} />,
            t("资金密码", "Fund password"),
            state.pin.value
              ? pinScopes.length
                ? t(`${pinScopes.join("、")}时验证`, `Asked on ${pinScopes.join(", ")}`)
                : t("已启用，未选择验证场景", "Enabled, no actions selected")
              : t("提现、划转时的二次确认", "Second check on withdrawals and transfers"),
            !!state.pin.value,
            () => setSheet("pin"),
            t("未设置", "Not set"),
            t("已启用", "Enabled"),
          )}
          {row(
            <KeyRound size={18} />,
            t("防钓鱼码", "Anti-phishing code"),
            state.phish.value ? t(`官方邮件将显示 ${state.phish.value.slice(0, 2)}****`, `Shown in emails as ${state.phish.value.slice(0, 2)}****`) : t("识别仿冒 AlphaPulse 的钓鱼邮件", "Spot fake AlphaPulse emails"),
            !!state.phish.value,
            () => setSheet("phish"),
            t("未设置", "Not set"),
            t("已设置", "Set"),
          )}
        </div>
      </section>

      <section className="ui-card sc-group">
        <h3>{t("登录与设备", "Sign-in & devices")}</h3>
        <div className="sh-list">
          <div>
            <span className="sh-li-icon">
              <BellRing size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("新设备登录提醒", "New sign-in alerts")}</b>
              <small>{t("在新设备登录时发送邮件和站内通知", "Email and in-app alert on new devices")}</small>
            </div>
            <Toggle label={t("新设备登录提醒", "New sign-in alerts")} on={state.loginAlert} onChange={(v) => setState((s) => ({ ...s, loginAlert: v }))} />
          </div>
          <button onClick={() => setSheet("devices")}>
            <span className="sh-li-icon">
              <MonitorSmartphone size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("登录设备管理", "Devices")}</b>
              <small>{t(`${state.devices.length} 台设备在线`, `${state.devices.length} signed in`)}</small>
            </div>
            <ChevronRight size={17} className="sh-muted" />
          </button>
        </div>
      </section>
      <p className="sc-foot">{t("模拟账户 · 安全设置仅保存在当前设备", "Demo account · settings are stored on this device")}</p>

      {sheet === "phone" && (
        <PhoneBindSheet
          lang={lang}
          current={phone}
          onClose={() => setSheet(null)}
          onDone={(p) => {
            onVerifyPhone(p);
          }}
        />
      )}
      {sheet === "pin" && <PinSheet lang={lang} account={verifyTarget} onClose={() => setSheet(null)} onToast={onToast} />}
      {sheet === "phish" && <PhishSheet lang={lang} account={verifyTarget} onClose={() => setSheet(null)} onToast={onToast} />}
      {sheet === "devices" && <DevicesSheet lang={lang} onClose={() => setSheet(null)} onToast={onToast} />}
    </div>
  );
}

/* ---------------- Authenticator ---------------- */
/** Deterministic QR-style matrix (finder patterns + data modules) for the demo secret. */
function PseudoQr({ seed }: { seed: string }) {
  const n = 29;
  const cells = useMemo(() => {
    let h = 2166136261;
    const rnd = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return (h >>> 0) / 4294967296;
    };
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const finder = (x: number, y: number) =>
      [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
    const out: [number, number][] = [];
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (finder(x, y)) continue;
        if ((y === 6 && x % 2 === 0) || (x === 6 && y % 2 === 0) || rnd() > 0.52) out.push([x, y]);
      }
    return out;
  }, [seed]);
  const eye = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} rx={1.2} fill="#111" />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={0.8} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.6} fill="#111" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="sc-qr" role="img" aria-label="QR">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width={1.02} height={1.02} fill="#111" />
      ))}
      {eye(0, 0)}
      {eye(n - 7, 0)}
      {eye(0, n - 7)}
    </svg>
  );
}

function AuthenticatorPage({ lang, account, phone, onToast, onBack }: { lang: Lang; account: string; phone: string; onToast: (s: string) => void; onBack: () => void }) {
  const t = tr(lang);
  const { state, patch } = useSecurity();
  const sender = useCodeSender();
  const [saved, setSaved] = useState(false);
  const [ga, setGa] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [manage, setManage] = useState<"unbind" | "rebind" | null>(null);
  const target = phone || account;
  const codeLabel = phone ? t("短信验证码", "SMS code") : t("邮箱验证码", "Email code");
  const label = `AlphaPulse (${account.includes("@") ? account : maskPhoneText(account)})`;

  const bind = () => {
    const e: Record<string, string> = {};
    if (!otpValid(state.ga.secret, ga)) e.ga = t("动态口令错误，请确认手机时间准确", "Wrong code — check your phone's clock");
    if (!sender.verify(`ga:${target}`, code)) e.code = t("验证码错误或已过期", "Invalid or expired code");
    setErr(e);
    if (Object.keys(e).length) return;
    patch("ga", { bound: true, boundAt: Date.now() });
    sender.reset();
    setGa("");
    setCode("");
    onToast(t("谷歌验证器已开启", "Authenticator turned on"));
  };

  if (state.ga.bound)
    return (
      <div className="sc-page">
        <section className="sc-hero is-high">
          <ShieldCheck size={40} className="sc-hero-ic sc-hero-ic-left" />
          <div className="sc-hero-text">
            <h2>{t("谷歌验证器已开启", "Authenticator is on")}</h2>
            <p>{state.ga.boundAt ? t(`绑定于 ${fmtDate(state.ga.boundAt, lang)}`, `Since ${fmtDate(state.ga.boundAt, lang)}`) : label}</p>
          </div>
        </section>
        <section className="ui-card sc-group">
          <h3>{t("验证场景", "Required for")}</h3>
          <div className="sh-list">
            {(
              [
                ["login", t("登录", "Sign-in"), t("新设备登录时输入动态口令", "On new devices")],
                ["withdraw", t("奖励提现", "Reward withdrawals"), t("每次提现时验证", "Every withdrawal")],
                ["settings", t("修改安全设置", "Security changes"), t("更换手机、解绑验证器等操作", "Changing phone, unbinding, etc.")],
              ] as const
            ).map(([k, name, desc]) => (
              <div key={k}>
                <div className="sh-li-main">
                  <b>{name}</b>
                  <small>{desc}</small>
                </div>
                <Toggle label={name} on={state.ga.scopes[k]} onChange={(v) => patch("ga", { scopes: { ...state.ga.scopes, [k]: v } })} />
              </div>
            ))}
          </div>
        </section>
        <section className="ui-card sc-group">
          <div className="sh-list">
            <button onClick={() => setManage("rebind")}>
              <span className="sh-li-icon">
                <Smartphone size={18} />
              </span>
              <div className="sh-li-main">
                <b>{t("更换验证器", "Move to a new phone")}</b>
                <small>{t("换手机时重新绑定新的密钥", "Bind a new secret on your new device")}</small>
              </div>
              <ChevronRight size={17} className="sh-muted" />
            </button>
            <button onClick={() => setManage("unbind")}>
              <span className="sh-li-icon">
                <ShieldAlert size={18} />
              </span>
              <div className="sh-li-main">
                <b className="sh-down">{t("解绑谷歌验证器", "Turn off authenticator")}</b>
                <small>{t("解绑后账户安全等级会降低", "Lowers your security level")}</small>
              </div>
              <ChevronRight size={17} className="sh-muted" />
            </button>
          </div>
        </section>
        {manage && (
          <Sheet
            title={manage === "unbind" ? t("解绑谷歌验证器", "Turn off authenticator") : t("更换验证器", "Move authenticator")}
            onClose={() => setManage(null)}
            tone={manage === "unbind" ? "danger" : undefined}
            footer={
              <button
                className={`sh-btn ${manage === "unbind" ? "sh-btn-danger" : "sh-btn-primary"}`}
                disabled={ga.length !== 6 || code.length !== 6}
                onClick={() => {
                  const e: Record<string, string> = {};
                  if (!otpValid(state.ga.secret, ga)) e.ga = t("谷歌验证码错误", "Wrong authenticator code");
                  if (!sender.verify(`ga:${target}`, code)) e.code = t("验证码错误或已过期", "Invalid or expired code");
                  setErr(e);
                  if (Object.keys(e).length) return;
                  patch("ga", { bound: false, boundAt: undefined, secret: newSecret() });
                  sender.reset();
                  setGa("");
                  setCode("");
                  setSaved(false);
                  setManage(null);
                  onToast(manage === "unbind" ? t("谷歌验证器已解绑", "Authenticator turned off") : t("请在新手机上完成绑定", "Finish setup on your new phone"));
                }}
              >
                {manage === "unbind" ? t("确认解绑", "Turn off") : t("验证并继续", "Verify & continue")}
              </button>
            }
          >
            <p className={`sh-note ${manage === "unbind" ? "is-warn" : "is-info"}`} style={{ marginTop: 4 }}>
              <AlertTriangle size={15} />
              {manage === "unbind"
                ? t("解绑后登录和提现将不再需要动态口令。", "Sign-in and withdrawals will no longer ask for a code.")
                : t("验证通过后会生成新的密钥，旧手机上的口令将立即失效。", "A new secret will be generated and the old one stops working.")}
            </p>
            <OtpField t={t} secret={state.ga.secret} value={ga} onChange={setGa} error={err.ga} />
            <CodeField t={t} sender={sender} target={`ga:${target}`} label={codeLabel} value={code} onChange={setCode} error={err.code} />
          </Sheet>
        )}
      </div>
    );

  return (
    <div className="sc-page">
      <p className="sc-lead sc-ga-lead">
        {t(
          "开启后，登录新设备、奖励提现和修改安全设置时，需要输入验证器 App 上每 30 秒刷新的 6 位动态口令。",
          "After setup, new sign-ins, withdrawals and security changes need the 6-digit code that refreshes every 30 seconds in your authenticator app.",
        )}
      </p>
      <ol className="sc-ga-steps">
        <li className="ui-card">
          <h3>
            <i>1</i>
            {t("下载验证器 App", "Install an authenticator")}
          </h3>
          <p>{t("在手机应用商店搜索并安装 Google Authenticator。", "Install Google Authenticator from your app store.")}</p>
          <div className="sc-stores">
            <button onClick={() => onToast(t("请在 App Store 搜索 Google Authenticator", "Search Google Authenticator in the App Store"))}>App Store</button>
            <button onClick={() => onToast(t("请在 Google Play 搜索 Google Authenticator", "Search Google Authenticator in Google Play"))}>Google Play</button>
          </div>
        </li>
        <li className="ui-card">
          <h3>
            <i>2</i>
            {t("扫描二维码或手动输入密钥", "Scan the QR code or enter the key")}
          </h3>
          <div className="sc-ga-key">
            <div className="sc-qr-box">
              <PseudoQr seed={state.ga.secret} />
            </div>
            <div className="sc-ga-key-text">
              <small>{t("账户名", "Account")}</small>
              <b>{label}</b>
              <small>{t("密钥（基于时间）", "Key (time-based)")}</small>
              <div className="sc-secret">
                <code>{state.ga.secret}</code>
                <button
                  aria-label={t("复制密钥", "Copy key")}
                  onClick={() => {
                    navigator.clipboard?.writeText(state.ga.secret.replace(/\s/g, "")).catch(() => {});
                    onToast(t("密钥已复制", "Key copied"));
                  }}
                >
                  <Copy size={15} />
                </button>
              </div>
            </div>
          </div>
        </li>
        <li className="ui-card">
          <h3>
            <i>3</i>
            {t("备份密钥", "Back up the key")}
          </h3>
          <p className="sh-note is-warn" style={{ marginTop: 6 }}>
            <AlertTriangle size={15} />
            {t("请将 16 位密钥抄写在纸上并妥善保管。手机丢失或更换时，可用它恢复验证器；切勿截图或发送给他人。", "Write the 16-character key on paper. You'll need it to restore the authenticator if you lose your phone. Never screenshot or share it.")}
          </p>
          <label className="sh-check">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            {t("我已抄写并妥善保存密钥", "I've written down the key")}
          </label>
        </li>
        <li className={`ui-card ${saved ? "" : "is-locked"}`}>
          <h3>
            <i>4</i>
            {t("输入动态口令完成绑定", "Enter the code to finish")}
          </h3>
          <OtpField t={t} secret={state.ga.secret} value={ga} onChange={setGa} error={err.ga} />
          <CodeField t={t} sender={sender} target={`ga:${target}`} label={codeLabel} value={code} onChange={setCode} disabled={!saved} error={err.code} />
          <button className="sh-btn sh-btn-primary sh-btn-block sc-ga-submit" disabled={!saved || ga.length !== 6 || code.length !== 6} onClick={bind}>
            {t("确认绑定", "Turn on")}
          </button>
        </li>
      </ol>
      <button className="sc-back-link" onClick={onBack}>
        {t("返回安全中心", "Back to security")}
      </button>
    </div>
  );
}

export function SecurityCenter({
  lang,
  page,
  account,
  phone,
  onVerifyPhone,
  onToast,
  onPage,
}: {
  lang: Lang;
  page: "security" | "authenticator";
  account: string;
  phone: string;
  onVerifyPhone: (p: string) => void;
  onToast: (s: string) => void;
  onPage: (p: "security" | "authenticator") => void;
}) {
  return page === "authenticator" ? (
    <AuthenticatorPage lang={lang} account={account} phone={phone} onToast={onToast} onBack={() => onPage("security")} />
  ) : (
    <SecurityHome lang={lang} account={account} phone={phone} onVerifyPhone={onVerifyPhone} onToast={onToast} onAuthenticator={() => onPage("authenticator")} />
  );
}
