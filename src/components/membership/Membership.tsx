import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, Crown, Lock, Sparkles, Zap } from "lucide-react";
import { Sheet } from "../ui/Sheet";
import {
  DEEP_TIER,
  FEATURE_NAME,
  PAID_TIERS,
  PLANS,
  TIER_RANK,
  createOrder,
  effectiveTier,
  hydrateMembership,
  isUnlocked,
  nextReset,
  quote,
  removeCard,
  requestUse,
  rollDay,
  saveCard,
  seedMembership,
  setAutoRenew,
  settleOrder,
  type AiFeature,
  type FailReason,
  type MembershipState,
  type Order,
  type PaidTier,
  type PayMethod,
  type Plan,
  type Quote,
  type SavedCard,
  type Tier,
} from "./membershipState";
import {
  addCryptoTx,
  cancelCrypto,
  cryptoProgress,
  depositAddress,
  expireCrypto,
  migrateLegacyCoins,
  startCryptoOrder,
  switchCrypto,
  tickCrypto,
  txHash,
  type CoinId,
  type NetworkId,
} from "./cryptoModel";
import { INITIAL_INSTRUMENTS } from "../../data/marketData";
import "./membership.css";

/** ETH quote source for crypto checkout (the demo feed's reference price). */
export const ethUsd = () => INITIAL_INSTRUMENTS.find((i) => i.symbol === "ETH/USD")?.price ?? 3200;

type Lang = "zh" | "en";
const KEY = "alphapulse.membership.v1";
const RETURN_KEY = "alphapulse.membership.return";
/** Simulated time between the payment sheet closing and the plan being activated. */
const SETTLE_MS = 2400;

export type PaywallReason = { feature?: AiFeature; need?: PaidTier; label?: string };

export type MembershipApi = {
  lang: Lang;
  state: MembershipState;
  tier: Tier;
  plan: Plan;
  limit: number;
  used: number;
  left: number;
  resetAt: number;
  /** Shorter simulated wait for tiers with the priority queue. */
  delay: number;
  isUnlocked: (key: string) => boolean;
  /** Charges one analysis (or reuses today's result). Opens the upgrade sheet when the quota is gone. */
  request: (feature: AiFeature, key: string, label: string, opts?: { force?: boolean; quiet?: boolean }) => boolean;
  /** True when the current tier includes `need`; otherwise opens the upgrade sheet naming `label`. */
  requireTier: (need: PaidTier, label?: string) => boolean;
  openPaywall: (reason?: PaywallReason) => void;
  quote: (tier: PaidTier) => Quote | null;
  checkout: (input: {
    tier: PaidTier;
    method: PayMethod;
    methodLabel: string;
    autoRenew: boolean;
    failReason?: FailReason;
  }) => Order | null;
  /** Crypto checkout: creates an awaiting order with a deposit address. */
  startCrypto: (input: { tier: PaidTier; coin: CoinId; network: NetworkId }) => Order | null;
  switchCrypto: (id: string, coin: CoinId, network: NetworkId) => void;
  /** Sandbox wallet: sends the remaining amount ("full") or about 60% of it ("partial"). */
  simulateCrypto: (id: string, kind: "full" | "partial") => void;
  expireCrypto: (id: string) => void;
  cancelCrypto: (id: string) => void;
  setAutoRenew: (on: boolean) => void;
  saveCard: (card: SavedCard) => void;
  removeCard: (id: string) => void;
  resetDemo: () => void;
  /** Navigates to `#vip/<path>` and remembers where the viewer came from. */
  open: (path?: string) => void;
  returnTo: string;
  goBack: () => void;
};

const Ctx = createContext<MembershipApi | null>(null);
export function useMembership() {
  const api = useContext(Ctx);
  if (!api) throw new Error("useMembership must be used inside MembershipProvider");
  return api;
}

/** Re-renders on an interval; used for countdowns and expiry. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

const read = (): MembershipState => {
  try {
    const now = Date.now();
    return migrateLegacyCoins(hydrateMembership(JSON.parse(localStorage.getItem(KEY) || "null"), now), now);
  } catch {
    return seedMembership(Date.now());
  }
};
const uid = (prefix: string) => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const orderId = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `VIP${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
};

export const tierName = (tier: Tier, lang: Lang) => (lang === "zh" ? PLANS[tier].zh : PLANS[tier].en);
export const usd = (n: number) => `$${n.toFixed(2)}`;
export const usdShort = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
export function fmtTime(ts: number, withTime = true) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}
export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** Shares the store created by `useMembershipStore` (called once in App). */
export function MembershipProvider({ value, children }: { value: MembershipApi; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Owns the persisted membership state. Returns the API plus the upgrade sheet element, which the
 * caller renders inside its provider.
 */
export function useMembershipStore(lang: Lang, onToast: (text: string) => void): [MembershipApi, React.ReactNode] {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [state, setState] = useState<MembershipState>(read);
  const latest = useRef(state);
  latest.current = state;
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [returnTo, setReturnTo] = useState(() => sessionStorage.getItem(RETURN_KEY) || "#home");
  const now = useNow(30_000);
  const toast = useRef(onToast);
  toast.current = onToast;

  const commit = (next: MembershipState) => {
    latest.current = next;
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep the in-memory state */
    }
  };

  // Other tabs share the same quota and plan.
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === KEY) setState(read());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Crypto orders: count confirmations and close expired windows while any order is awaiting.
  const awaiting = state.orders.some((o) => o.status === "awaiting");
  useEffect(() => {
    if (!awaiting) return;
    const tick = () => {
      const before = latest.current;
      const next = tickCrypto(before, Date.now());
      if (next === before) return;
      const paid = next.orders.find((o) => o.status === "paid" && before.orders.find((b) => b.id === o.id)?.status === "awaiting");
      commit(next);
      if (paid)
        toast.current(
          lang === "zh"
            ? `链上确认完成，${PLANS[paid.tier].zh}已开通`
            : `Payment confirmed on-chain: ${PLANS[paid.tier].en} is active`,
        );
    };
    tick();
    const id = window.setInterval(tick, 300);
    return () => window.clearInterval(id);
  }, [awaiting]);

  // Orders left processing (tab closed mid-payment) settle on the next visit; new ones after SETTLE_MS.
  const pending = state.orders.filter((o) => o.status === "processing").map((o) => o.id).join();
  useEffect(() => {
    if (!pending) return;
    const ids = pending.split(",");
    const timers = ids.map((id) => {
      const order = latest.current.orders.find((o) => o.id === id);
      const wait = Math.max(0, (order?.createdAt ?? 0) + SETTLE_MS - Date.now());
      return window.setTimeout(() => {
        const before = latest.current.orders.find((o) => o.id === id);
        commit(settleOrder(latest.current, id, Date.now()));
        if (before && !before.failReason)
          toast.current(
            lang === "zh"
              ? `${PLANS[before.tier].zh}已开通，今日可用 ${PLANS[before.tier].daily} 次 AI 分析`
              : `${PLANS[before.tier].en} is active: ${PLANS[before.tier].daily} AI analyses a day`,
          );
      }, wait);
    });
    return () => timers.forEach(clearTimeout);
  }, [pending]);

  const view = rollDay(state, now);
  const tier = effectiveTier(view, now);
  const plan = PLANS[tier];
  const api: MembershipApi = {
    lang,
    state: view,
    tier,
    plan,
    limit: plan.daily,
    used: view.used,
    left: Math.max(0, plan.daily - view.used),
    resetAt: nextReset(now),
    delay: TIER_RANK[tier] >= TIER_RANK[DEEP_TIER] ? 650 : 1500,
    isUnlocked: (key) => isUnlocked(latest.current, key, Date.now()),
    request: (feature, key, label, opts) => {
      const at = Date.now();
      const r = requestUse(latest.current, { feature, key, label, force: opts?.force }, at, uid("U"));
      if (r.state !== latest.current) commit(r.state);
      if (r.result === "blocked") {
        setPaywall({ feature });
        return false;
      }
      if (r.result === "charged" && !opts?.quiet) {
        const left = Math.max(0, PLANS[effectiveTier(r.state, at)].daily - r.state.used);
        toast.current(
          lang === "zh"
            ? `已使用 1 次 AI 分析（${FEATURE_NAME[feature][0]}），今日剩余 ${left} 次`
            : `Used 1 AI analysis (${FEATURE_NAME[feature][1]}); ${left} left today`,
        );
      }
      return true;
    },
    requireTier: (need, label) => {
      if (TIER_RANK[effectiveTier(latest.current, Date.now())] >= TIER_RANK[need]) return true;
      setPaywall({ need, label });
      return false;
    },
    openPaywall: (reason) => setPaywall(reason ?? {}),
    quote: (target) => quote(latest.current, target, Date.now()),
    checkout: (input) => {
      const made = createOrder(latest.current, input, Date.now(), { id: orderId(), txn: uid("TXN") });
      if (!made) return null;
      commit(made.state);
      return made.order;
    },
    startCrypto: (input) => {
      const made = startCryptoOrder(latest.current, { ...input, ethUsd: ethUsd() }, Date.now(), { id: orderId(), txn: uid("TXN") });
      if (!made) return null;
      commit(made.state);
      return made.order;
    },
    switchCrypto: (id, coin, network) => commit(switchCrypto(latest.current, id, coin, network, ethUsd(), Date.now())),
    simulateCrypto: (id, kind) => {
      const order = latest.current.orders.find((o) => o.id === id);
      if (!order?.crypto) return;
      const pay = order.crypto;
      const left = cryptoProgress(pay, Date.now()).remaining;
      const dec = pay.coin === "ETH" ? 6 : 2;
      const amount = kind === "full" ? left : Math.round(left * 0.6 * 10 ** dec) / 10 ** dec;
      const from = depositAddress(`${id}:sender`, pay.network as NetworkId);
      commit(
        addCryptoTx(
          latest.current,
          id,
          { hash: txHash(`${id}:${pay.txs.length}:${Date.now()}`, pay.network as NetworkId), amount, at: Date.now(), from },
          Date.now(),
        ),
      );
    },
    expireCrypto: (id) => commit(expireCrypto(latest.current, id, Date.now())),
    cancelCrypto: (id) => commit(cancelCrypto(latest.current, id)),
    setAutoRenew: (on) => commit(setAutoRenew(latest.current, on)),
    saveCard: (card) => commit(saveCard(latest.current, card)),
    removeCard: (id) => commit(removeCard(latest.current, id)),
    resetDemo: () => commit(seedMembership(Date.now())),
    open: (path) => {
      const here = window.location.hash || "#home";
      if (!here.startsWith("#vip")) {
        setReturnTo(here);
        try {
          sessionStorage.setItem(RETURN_KEY, here);
        } catch {
          /* ignore */
        }
      }
      setPaywall(null);
      window.location.hash = `#vip${path ? `/${path}` : ""}`;
    },
    returnTo,
    goBack: () => {
      window.location.hash = returnTo.startsWith("#vip") ? "#home" : returnTo;
    },
  };

  return [api, paywall ? <Paywall api={api} reason={paywall} onClose={() => setPaywall(null)} t={t} /> : null];
}

/* ---------------- Shared pieces ---------------- */

export function TierBadge({ tier, lang, size = "sm" }: { tier: Tier; lang: Lang; size?: "sm" | "md" }) {
  return (
    <span className={`mb-badge is-${tier} is-${size}`}>
      {tier === "free" ? null : <Crown size={size === "md" ? 13 : 11} strokeWidth={2.4} />}
      {tierName(tier, lang)}
    </span>
  );
}

/** "今日剩余 2/3" — shown on every AI entry point. */
export function QuotaPill({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const m = useMembership();
  const t = (zh: string, en: string) => (m.lang === "zh" ? zh : en);
  const tone = m.left === 0 ? "is-empty" : m.tier === "free" && m.left <= 1 ? "is-low" : "";
  return (
    <span className={`mb-quota ${tone} ${className}`} title={t("今日 AI 分析次数", "AI analyses left today")}>
      <Zap size={11} strokeWidth={2.6} />
      {compact
        ? t(`剩 ${m.left}`, `${m.left} left`)
        : t(`今日剩余 ${m.left}/${m.limit}`, `${m.left}/${m.limit} left today`)}
    </span>
  );
}

/**
 * Blurs a preview of an AI result until it is generated. The overlay names the cost and the quota;
 * the content stays inert so it cannot be read or focused while locked.
 */
export function AiLock({
  locked,
  title,
  desc,
  cta,
  busy,
  onUnlock,
  children,
  className = "",
}: {
  locked: boolean;
  title: string;
  desc?: string;
  cta: string;
  busy?: boolean;
  onUnlock: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const m = useMembership();
  const t = (zh: string, en: string) => (m.lang === "zh" ? zh : en);
  return (
    <div className={`mb-lock ${locked ? "is-locked" : ""} ${className}`}>
      <div className="mb-lock-content" aria-hidden={locked || undefined} inert={locked || undefined}>
        {children}
      </div>
      {locked && (
        <div className="mb-lock-overlay">
          <div className="mb-lock-card">
            <span className="mb-lock-icon">{busy ? <span className="mb-spin" /> : <Sparkles size={20} />}</span>
            <h3>{busy ? t("AI 正在分析…", "Analysing…") : title}</h3>
            {desc && !busy && <p>{desc}</p>}
            {!busy && (
              <>
                <button className="mb-cta" onClick={onUnlock}>
                  {m.left > 0 ? <Sparkles size={15} /> : <Lock size={15} />}
                  {m.left > 0 ? cta : t("次数已用完 · 开通会员", "Out of analyses · Upgrade")}
                </button>
                <div className="mb-lock-meta">
                  <QuotaPill />
                  {m.tier === "free" && (
                    <button className="mb-link" onClick={() => m.open()}>
                      {t("开通会员每日最多 300 次", "Up to 300 a day with membership")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Upgrade sheet ---------------- */

function Paywall({
  api,
  reason,
  onClose,
  t,
}: {
  api: MembershipApi;
  reason: PaywallReason;
  onClose: () => void;
  t: (zh: string, en: string) => string;
}) {
  const now = useNow(1000);
  const floor = reason.need ? TIER_RANK[reason.need] : TIER_RANK[api.tier] + 1;
  const options = PAID_TIERS.filter((tier) => TIER_RANK[tier] >= floor);
  const [pick, setPick] = useState<PaidTier | undefined>(
    options.includes("premium") ? "premium" : options[0],
  );
  const locked = !!reason.need;
  const free = api.tier === "free";
  const feature = reason.label ?? (reason.feature ? t(...FEATURE_NAME[reason.feature]) : t("AI 分析", "AI analysis"));
  const title = locked
    ? t(`${feature}为${PLANS[reason.need!].zh}权益`, `${feature} needs ${PLANS[reason.need!].en}`)
    : free
      ? t("今日免费次数已用完", "Today's free analyses are used up")
      : t(`今日 ${api.limit} 次已用完`, `All ${api.limit} analyses used today`);
  const pct = Math.min(100, (api.used / Math.max(1, api.limit)) * 100);
  return (
    <Sheet
      onClose={onClose}
      size="md"
      className="mb-paywall"
      footer={
        options.length ? (
          <>
            <button className="sh-btn" onClick={onClose}>
              {locked ? t("暂不需要", "Not now") : t("明天再来", "Come back tomorrow")}
            </button>
            <button className="sh-btn mb-btn-gold" disabled={!pick} onClick={() => pick && api.open(`checkout/${pick}`)}>
              <Crown size={16} />
              {pick
                ? t(
                    `${api.tier === "free" ? "开通" : "升级"}${PLANS[pick].zh} · ${usdShort(PLANS[pick].price)}/月`,
                    `Get ${PLANS[pick].en} · ${usdShort(PLANS[pick].price)}/mo`,
                  )
                : t("选择方案", "Choose a plan")}
            </button>
          </>
        ) : (
          <button className="sh-btn sh-btn-primary" onClick={onClose}>
            {t("知道了", "OK")}
          </button>
        )
      }
    >
      <div className="mb-pw-hero">
        <span className="mb-pw-icon">{locked ? <Lock size={24} /> : <Sparkles size={24} />}</span>
        <h2>{title}</h2>
        <p>
          {locked
            ? t(
                `升级后即可使用${feature}，同时获得更多每日 AI 分析次数。`,
                `Upgrade to use ${feature} and get more daily analyses.`,
              )
            : t(
                "AI诊股、AI分析、K线分析和特色指标共用每日次数，同一品种当日重复查看不扣次数。",
                "AI diagnosis, AI analysis, chart analysis and signature indicators share one daily quota. Reopening the same result today is free.",
              )}
        </p>
        {!locked && (
          <div className="mb-pw-meter">
            <div>
              <span>
                {t("今日已用", "Used today")} <b>{api.used}</b> / {api.limit}
              </span>
              <span>
                <Clock3 size={12} />
                {t("重置倒计时", "Resets in")} <b className="tabular-nums">{countdown(api.resetAt - now)}</b>
              </span>
            </div>
            <i>
              <em style={{ width: `${pct}%` }} />
            </i>
          </div>
        )}
      </div>
      {options.length > 0 && (
        <div className="mb-pw-plans" role="radiogroup" aria-label={t("会员方案", "Plans")}>
          {options.map((tier) => (
            <button
              key={tier}
              role="radio"
              aria-checked={pick === tier}
              className={`mb-pw-plan is-${tier}`}
              onClick={() => setPick(tier)}
            >
              {tier === "premium" && <span className="mb-pw-rec">{t("推荐", "Popular")}</span>}
              <TierBadge tier={tier} lang={api.lang} />
              <b>
                {PLANS[tier].daily}
                <small>{t(" 次/天", "/day")}</small>
              </b>
              <span>
                {usdShort(PLANS[tier].price)}
                <small>{t("/月", "/mo")}</small>
              </span>
              <i className="mb-pw-check">
                <Check size={12} strokeWidth={3} />
              </i>
            </button>
          ))}
        </div>
      )}
      {options.length > 0 && (
        <button className="mb-pw-more" onClick={() => api.open()}>
          {t("查看全部会员权益", "Compare all plans")}
        </button>
      )}
    </Sheet>
  );
}

/** Memoised per-tier perk copy shared by the member centre and the account panel. */
export function usePerks(lang: Lang) {
  return useMemo(() => {
    const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
    return {
      free: [t("每日 3 次 AI 分析", "3 AI analyses a day"), t("特色指标需分析后查看", "Signature indicators after analysis")],
      basic: [
        t("每日 20 次 AI 分析", "20 AI analyses a day"),
        t("AI诊股 · AI分析 · K线分析 · 特色指标", "Diagnosis, analysis, chart reading, indicators"),
        t("蓝色会员标识", "Blue member badge"),
      ],
      premium: [
        t("每日 80 次 AI 分析", "80 AI analyses a day"),
        t("Ace智搜深度思考", "Ace deep research"),
        t("优先分析通道，出结果更快", "Priority queue for faster results"),
        t("金色会员标识", "Gold member badge"),
      ],
      elite: [
        t("每日 300 次 AI 分析", "300 AI analyses a day"),
        t("包含高级会员全部权益", "Everything in Premium"),
        t("专属客服通道", "Dedicated support line"),
        t("黑金会员标识", "Black-gold member badge"),
      ],
    } satisfies Record<Tier, string[]>;
  }, [lang]);
}

/** One-line plan + quota row for pages that summarise the account (asset home). */
export function MemberStrip() {
  const m = useMembership();
  const t = (zh: string, en: string) => (m.lang === "zh" ? zh : en);
  const paid = m.tier !== "free";
  return (
    <button className={`mb-strip is-${m.tier}`} onClick={() => m.open()}>
      <Crown size={16} strokeWidth={2.4} />
      <span className="mb-strip-main">
        <b>{paid ? tierName(m.tier, m.lang) : t("开通会员，AI 分析每日最多 300 次", "Membership: up to 300 AI analyses a day")}</b>
        <small>
          {paid
            ? t(`有效期至 ${fmtTime(m.state.expiresAt, false)}`, `Until ${fmtTime(m.state.expiresAt, false)}`)
            : t("AI诊股 · AI分析 · K线分析 · 特色指标", "Diagnosis · analysis · charts · indicators")}
        </small>
      </span>
      <QuotaPill />
    </button>
  );
}

/** Navigates inside the member area (`#vip/<path>`); `replace` keeps checkout steps out of history. */
export const goVip = (path: string, replace = false) => {
  const hash = `#vip${path ? `/${path}` : ""}`;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
};

/** Back header shared by the member-area pages. */
export function VipHead({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <header className="mb-subhead">
      <button className="ui-icon-btn" aria-label="Back" onClick={onBack}>
        <ArrowLeft size={19} />
      </button>
      <h1>{title}</h1>
      <div>{right}</div>
    </header>
  );
}
