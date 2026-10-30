import { useEffect, useState } from "react";
import { useSavedState } from "../marketModel";

export interface Device {
  id: string;
  name: string;
  place: string;
  at: number;
  current?: boolean;
}
export interface SecurityState {
  ga: { bound: boolean; secret: string; boundAt?: number; scopes: { login: boolean; withdraw: boolean; settings: boolean } };
  pin: { value: string | null; at?: number; scopes: { withdraw: boolean; transfer: boolean } };
  phish: { value: string | null; at?: number };
  loginAlert: boolean;
  devices: Device[];
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const newSecret = () =>
  Array.from({ length: 16 }, () => B32[Math.floor(Math.random() * 32)])
    .join("")
    .replace(/(.{4})(?!$)/g, "$1 ");

const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : "Linux";

const seed = (): SecurityState => ({
  ga: { bound: false, secret: newSecret(), scopes: { login: true, withdraw: true, settings: true } },
  pin: { value: null, scopes: { withdraw: true, transfer: false } },
  phish: { value: null },
  loginAlert: true,
  devices: [
    { id: "d0", name: `${browser} · ${os}`, place: "上海 · 中国", at: Date.now(), current: true },
    { id: "d1", name: "AlphaPulse iOS · iPhone 15 Pro", place: "上海 · 中国", at: Date.now() - 86400000 * 1.4 },
    { id: "d2", name: "Safari · macOS", place: "香港 · 中国", at: Date.now() - 86400000 * 6.2 },
  ],
});

export function useSecurity() {
  const [state, setState] = useSavedState<SecurityState>("alphapulse.security.v1", seed());
  const patch = <K extends keyof SecurityState>(key: K, value: Partial<SecurityState[K]>) =>
    setState((s) => ({ ...s, [key]: { ...(s[key] as object), ...value } }));
  return { state, setState, patch };
}

/** Demo stand-in for TOTP: a six-digit code per 30 s window derived from the secret. */
export const otpAt = (secret: string, step = Math.floor(Date.now() / 30000)) => {
  let h = 2166136261;
  for (const ch of `${secret.replace(/\s/g, "")}:${step}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 1000000).padStart(6, "0");
};
/** Accepts the current and previous window, like real authenticators. */
export const otpValid = (secret: string, code: string) => {
  const step = Math.floor(Date.now() / 30000);
  return code === otpAt(secret, step) || code === otpAt(secret, step - 1);
};
export function useOtp(secret: string) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return { code: otpAt(secret, Math.floor(now / 30000)), left: 30 - Math.floor((now / 1000) % 30) };
}

/** Rejects repeated digits and straight sequences. */
export const weakPin = (p: string) =>
  /^(\d)\1+$/.test(p) || "0123456789".includes(p) || "9876543210".includes(p);
export const PHISH_RE = /^[A-Za-z0-9_-]{4,20}$/;
