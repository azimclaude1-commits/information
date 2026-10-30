import { useEffect, useState } from "react";
import { useSavedState } from "../marketModel";
import { countryByIso, type Country } from "../../data/countries";

export type Channel = "phone" | "email";
export type AuthAccount = {
  id: string;
  channel: Channel;
  email?: string;
  iso?: string;
  dial?: string;
  phone?: string;
  password: string;
  invite?: string;
  createdAt: number;
};
/** What App needs after a successful sign-in. */
export type AuthIdentity = {
  channel: Channel;
  display: string;
  email?: string;
  phone?: string;
};

export const DEMO_EMAIL = "alpha.trader@mitrade-vip.com";
export const DEMO_PHONE = { iso: "cn", dial: "86", phone: "13800138000" };
export const DEMO_PASSWORD = "Demo1234";
const SEED: AuthAccount[] = [
  {
    id: "demo-email",
    channel: "email",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    createdAt: 0,
  },
  {
    id: "demo-phone",
    channel: "phone",
    ...DEMO_PHONE,
    password: DEMO_PASSWORD,
    createdAt: 0,
  },
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const digits = (v: string) => v.replace(/\D/g, "");
export const isPhone = (v: string, c: Country) => {
  const n = digits(v).length;
  return n >= c.len[0] && n <= c.len[1];
};
export function passwordChecks(p: string) {
  return {
    length: p.length >= 8 && p.length <= 32,
    letter: /[a-z]/i.test(p),
    number: /\d/.test(p),
  };
}
export const isPassword = (p: string) =>
  Object.values(passwordChecks(p)).every(Boolean);
/** 0–4, used for the strength meter. */
export function passwordStrength(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^a-z\d]/i.test(p)) s++;
  return Math.max(1, s);
}
export const maskEmail = (e: string) =>
  e.replace(/^(.{2})[^@]*(@.*)$/, (_, a, b) => `${a}***${b}`);
export const maskPhone = (dial: string, phone: string) =>
  `+${dial} ${phone.length > 6 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone}`;

export function identityOf(a: AuthAccount): AuthIdentity {
  return a.channel === "email"
    ? { channel: "email", display: a.email!, email: a.email }
    : {
        channel: "phone",
        display: `+${a.dial} ${a.phone}`,
        phone: `+${a.dial} ${a.phone}`,
      };
}

export function useAccounts() {
  const [accounts, setAccounts] = useSavedState<AuthAccount[]>(
    "alphapulse.auth.accounts.v1",
    SEED,
  );
  const find = (channel: Channel, value: string, iso?: string) =>
    accounts.find((a) =>
      channel === "email"
        ? a.channel === "email" &&
          a.email!.toLowerCase() === value.trim().toLowerCase()
        : a.channel === "phone" &&
          a.dial === countryByIso(iso!).dial &&
          a.phone === digits(value),
    );
  const create = (account: Omit<AuthAccount, "id" | "createdAt">) => {
    const next = {
      ...account,
      id: globalThis.crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setAccounts((old) => [...old, next]);
    return next;
  };
  const resetPassword = (id: string, password: string) =>
    setAccounts((old) =>
      old.map((a) => (a.id === id ? { ...a, password } : a)),
    );
  return { find, create, resetPassword };
}

/** Six-digit demo codes, valid for 10 minutes, with a 60 s resend cooldown. */
export function useCodeSender() {
  const [sent, setSent] = useState<{
    target: string;
    code: string;
    at: number;
  } | null>(null);
  const [now, setNow] = useState(Date.now);
  const cooldown = sent
    ? Math.max(0, 60 - Math.floor((now - sent.at) / 1000))
    : 0;
  useEffect(() => {
    if (!cooldown) return;
    const id = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown, now]);
  const send = (target: string) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSent({ target, code, at: Date.now() });
    setNow(Date.now());
    return code;
  };
  const verify = (target: string, code: string) =>
    !!sent &&
    sent.target === target &&
    sent.code === code.trim() &&
    Date.now() - sent.at < 600000;
  return {
    send,
    verify,
    cooldown,
    sentTo: sent?.target,
    reset: () => setSent(null),
  };
}
