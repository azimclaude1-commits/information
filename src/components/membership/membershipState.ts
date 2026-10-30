/**
 * Membership model: plans, the shared daily AI quota, orders and saved cards.
 * Pure functions only (no React, no storage) so `scripts/membership-state.test.ts` can cover them.
 */

export type Tier = "free" | "basic" | "premium" | "elite";
export type PaidTier = Exclude<Tier, "free">;
/** Every feature that calls the model draws from the same daily pool. */
export type AiFeature = "diagnose" | "insight" | "kline" | "signature";
export type PayMethod = "apple" | "google" | "card" | "crypto";
export type CardBrand = "visa" | "mastercard" | "amex" | "jcb" | "unionpay" | "unknown";
export type FailReason =
  | "card_declined"
  | "insufficient_funds"
  | "3ds_failed"
  /** crypto: the payment window closed with nothing (or not enough) received */
  | "expired"
  | "underpaid"
  | "cancelled";

/** One on-chain transfer seen for a crypto order. */
export type CryptoTx = { hash: string; amount: number; at: number; from: string };
/** Deposit details of a crypto order; the logic lives in `cryptoModel.ts`. */
export type CryptoPayment = {
  coin: string;
  network: string;
  address: string;
  /** amount due in `coin` */
  amount: number;
  /** USD per coin used for the quote (1 for stablecoins) */
  rate: number;
  quotedAt: number;
  /** payment window end; partial payments after it are refunded */
  expiresAt: number;
  txs: CryptoTx[];
};

export const DAY = 86_400_000;
export const PERIOD_DAYS = 30;
/** Quotas reset at 00:00 Beijing time for every viewer. */
export const TZ_OFFSET = 8 * 3_600_000;

export type Plan = {
  tier: Tier;
  daily: number;
  price: number;
  zh: string;
  en: string;
  code: string;
};

export const PLANS: Record<Tier, Plan> = {
  free: { tier: "free", daily: 3, price: 0, zh: "免费版", en: "Free", code: "FREE" },
  basic: { tier: "basic", daily: 20, price: 10, zh: "普通会员", en: "Basic", code: "BASIC" },
  premium: { tier: "premium", daily: 80, price: 30, zh: "高级会员", en: "Premium", code: "PREMIUM" },
  elite: { tier: "elite", daily: 300, price: 99, zh: "至尊会员", en: "Elite", code: "ELITE" },
};
export const PAID_TIERS: PaidTier[] = ["basic", "premium", "elite"];
export const TIER_RANK: Record<Tier, number> = { free: 0, basic: 1, premium: 2, elite: 3 };
/** Lowest tier that includes Ace 深度思考 and the priority queue. */
export const DEEP_TIER: PaidTier = "premium";

export const FEATURE_NAME: Record<AiFeature, [string, string]> = {
  diagnose: ["AI诊股", "AI diagnosis"],
  insight: ["AI分析", "AI analysis"],
  kline: ["K线分析", "Chart analysis"],
  signature: ["特色指标", "Signature indicators"],
};

export type UsageRecord = {
  id: string;
  feature: AiFeature;
  key: string;
  label: string;
  at: number;
};

export type Order = {
  id: string;
  tier: PaidTier;
  kind: "new" | "renew" | "upgrade";
  price: number;
  credit: number;
  total: number;
  method: PayMethod;
  methodLabel: string;
  /** awaiting = crypto order waiting for a transfer / confirmations */
  status: "awaiting" | "processing" | "paid" | "failed";
  /** Decided when the payment sheet closes; applied when the order settles. */
  failReason?: FailReason;
  createdAt: number;
  paidAt?: number;
  txn: string;
  periodStart: number;
  periodEnd: number;
  autoRenew: boolean;
  crypto?: CryptoPayment;
};

export type SavedCard = {
  id: string;
  brand: CardBrand;
  last4: string;
  exp: string;
  holder: string;
};

export type MembershipState = {
  /** Purchased tier; it lapses to free once `expiresAt` passes. */
  tier: Tier;
  expiresAt: number;
  autoRenew: boolean;
  day: string;
  used: number;
  /** Today's charged analyses, newest first. */
  records: UsageRecord[];
  /** Analyses opened today; reopening the same key is free. */
  unlocked: string[];
  orders: Order[];
  cards: SavedCard[];
};

export const dayKey = (now: number) => new Date(now + TZ_OFFSET).toISOString().slice(0, 10);
export const nextReset = (now: number) =>
  (Math.floor((now + TZ_OFFSET) / DAY) + 1) * DAY - TZ_OFFSET;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function seedMembership(now: number): MembershipState {
  return {
    tier: "free",
    expiresAt: 0,
    autoRenew: true,
    day: dayKey(now),
    used: 0,
    records: [],
    unlocked: [],
    orders: [],
    cards: [],
  };
}

/** Accepts anything from storage and returns a complete state. */
export function hydrateMembership(raw: unknown, now: number): MembershipState {
  const base = seedMembership(now);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<MembershipState>;
  const tier = r.tier && r.tier in PLANS ? r.tier : "free";
  return rollDay(
    {
      ...base,
      tier,
      expiresAt: typeof r.expiresAt === "number" ? r.expiresAt : 0,
      autoRenew: r.autoRenew !== false,
      day: typeof r.day === "string" ? r.day : base.day,
      used: typeof r.used === "number" && r.used >= 0 ? r.used : 0,
      records: Array.isArray(r.records) ? r.records.slice(0, 60) : [],
      unlocked: Array.isArray(r.unlocked) ? r.unlocked : [],
      orders: Array.isArray(r.orders) ? r.orders : [],
      cards: Array.isArray(r.cards) ? r.cards : [],
    },
    now,
  );
}

export const effectiveTier = (s: MembershipState, now: number): Tier =>
  s.tier !== "free" && s.expiresAt > now ? s.tier : "free";

export const dailyLimit = (s: MembershipState, now: number) => PLANS[effectiveTier(s, now)].daily;

/** Starts a new quota day when the date (UTC+8) has changed. */
export function rollDay(s: MembershipState, now: number): MembershipState {
  const day = dayKey(now);
  return s.day === day ? s : { ...s, day, used: 0, records: [], unlocked: [] };
}

export function remaining(s: MembershipState, now: number) {
  const r = rollDay(s, now);
  return Math.max(0, dailyLimit(r, now) - r.used);
}

export const isUnlocked = (s: MembershipState, key: string, now: number) =>
  rollDay(s, now).unlocked.includes(key);

export type UseResult = "cached" | "charged" | "blocked";

/**
 * Charges one analysis unless the same key was already opened today.
 * `force` (regenerate / ask again) always charges.
 */
export function requestUse(
  state: MembershipState,
  req: { feature: AiFeature; key: string; label: string; force?: boolean },
  now: number,
  id: string,
): { state: MembershipState; result: UseResult } {
  const s = rollDay(state, now);
  if (!req.force && s.unlocked.includes(req.key)) return { state: s, result: "cached" };
  if (s.used >= dailyLimit(s, now)) return { state: s, result: "blocked" };
  return {
    result: "charged",
    state: {
      ...s,
      used: s.used + 1,
      records: [{ id, feature: req.feature, key: req.key, label: req.label, at: now }, ...s.records].slice(0, 60),
      unlocked: s.unlocked.includes(req.key) ? s.unlocked : [...s.unlocked, req.key],
    },
  };
}

export type Quote = {
  tier: PaidTier;
  kind: Order["kind"];
  price: number;
  credit: number;
  total: number;
  periodStart: number;
  periodEnd: number;
  /** Remaining days of the current plan that were credited (upgrades only). */
  creditDays: number;
};

/**
 * Price of buying `tier` now. Same tier extends from the current expiry; a higher tier starts now
 * and credits the unused part of the current plan; a lower tier is not sold while a plan is active.
 */
export function quote(s: MembershipState, tier: PaidTier, now: number): Quote | null {
  const current = effectiveTier(s, now);
  const price = PLANS[tier].price;
  if (current === tier) {
    return {
      tier,
      kind: "renew",
      price,
      credit: 0,
      total: price,
      periodStart: s.expiresAt,
      periodEnd: s.expiresAt + PERIOD_DAYS * DAY,
      creditDays: 0,
    };
  }
  if (TIER_RANK[tier] < TIER_RANK[current]) return null;
  const left = current === "free" ? 0 : Math.max(0, s.expiresAt - now);
  // Credit whole unused days (a started day counts as a full one) so the amount matches the
  // "N 天折抵" label. Prorating by the millisecond made a plan bought minutes ago worth $9.98,
  // which surfaced as odd totals such as $10.02 / $79.02.
  const creditDays = Math.ceil(left / DAY);
  const credit = Math.min(price, round2((PLANS[current].price * creditDays) / PERIOD_DAYS));
  return {
    tier,
    kind: current === "free" ? "new" : "upgrade",
    price,
    credit,
    total: round2(price - credit),
    periodStart: now,
    periodEnd: now + PERIOD_DAYS * DAY,
    creditDays,
  };
}

export function createOrder(
  state: MembershipState,
  input: {
    tier: PaidTier;
    method: PayMethod;
    methodLabel: string;
    autoRenew: boolean;
    failReason?: FailReason;
  },
  now: number,
  ids: { id: string; txn: string },
): { state: MembershipState; order: Order } | null {
  const q = quote(state, input.tier, now);
  if (!q) return null;
  const order: Order = {
    id: ids.id,
    tier: q.tier,
    kind: q.kind,
    price: q.price,
    credit: q.credit,
    total: q.total,
    method: input.method,
    methodLabel: input.methodLabel,
    status: "processing",
    failReason: input.failReason,
    createdAt: now,
    txn: ids.txn,
    periodStart: q.periodStart,
    periodEnd: q.periodEnd,
    autoRenew: input.autoRenew,
  };
  return { order, state: { ...state, orders: [order, ...state.orders] } };
}

/** Completes a processing order: failed orders change nothing else, paid ones activate the plan. */
export function settleOrder(state: MembershipState, id: string, now: number): MembershipState {
  const order = state.orders.find((o) => o.id === id);
  if (!order || order.status !== "processing") return state;
  const orders = (patch: Partial<Order>) =>
    state.orders.map((o) => (o.id === id ? { ...o, ...patch } : o));
  if (order.failReason) return { ...state, orders: orders({ status: "failed" }) };
  // A renewal bought before an upgrade settled must not shorten the newer period.
  const expiresAt = order.kind === "renew" ? Math.max(order.periodEnd, state.expiresAt) : order.periodEnd;
  return {
    ...rollDay(state, now),
    tier: order.tier,
    expiresAt,
    autoRenew: order.autoRenew,
    orders: orders({ status: "paid", paidAt: now }),
  };
}

export const setAutoRenew = (s: MembershipState, on: boolean): MembershipState => ({ ...s, autoRenew: on });

export function saveCard(s: MembershipState, card: SavedCard): MembershipState {
  const rest = s.cards.filter((c) => !(c.brand === card.brand && c.last4 === card.last4));
  return { ...s, cards: [card, ...rest].slice(0, 5) };
}

export const removeCard = (s: MembershipState, id: string): MembershipState => ({
  ...s,
  cards: s.cards.filter((c) => c.id !== id),
});

/* ---------------- Cards (demo checkout) ---------------- */

export const digitsOf = (v: string) => v.replace(/\D/g, "");

export function cardBrand(num: string): CardBrand {
  const d = digitsOf(num);
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^35/.test(d)) return "jcb";
  if (/^62/.test(d)) return "unionpay";
  return "unknown";
}

export const cardLength = (brand: CardBrand) => (brand === "amex" ? 15 : brand === "unionpay" ? 19 : 16);
export const cvcLength = (brand: CardBrand) => (brand === "amex" ? 4 : 3);

/** 4-4-4-4, or 4-6-5 for Amex. */
export function formatCard(num: string) {
  const d = digitsOf(num);
  const brand = cardBrand(d);
  const max = brand === "unionpay" ? 19 : cardLength(brand);
  const v = d.slice(0, max);
  if (brand === "amex") return [v.slice(0, 4), v.slice(4, 10), v.slice(10)].filter(Boolean).join(" ");
  return v.replace(/(.{4})/g, "$1 ").trim();
}

export function luhn(num: string) {
  const d = digitsOf(num);
  if (d.length < 12) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export type CardOutcome = "success" | "3ds" | FailReason;
/** The sandbox only accepts these numbers, so no real card details are typed into the prototype. */
export const TEST_CARDS: { number: string; outcome: CardOutcome; zh: string; en: string }[] = [
  { number: "4242424242424242", outcome: "success", zh: "支付成功", en: "Succeeds" },
  { number: "5555555555554444", outcome: "success", zh: "支付成功", en: "Succeeds" },
  { number: "4000002760003184", outcome: "3ds", zh: "需 3D 安全验证", en: "3-D Secure" },
  { number: "4000000000009995", outcome: "insufficient_funds", zh: "余额不足", en: "Insufficient funds" },
  { number: "4000000000000002", outcome: "card_declined", zh: "发卡行拒绝", en: "Declined" },
];
export const testCardOutcome = (num: string): CardOutcome | null =>
  TEST_CARDS.find((c) => c.number === digitsOf(num))?.outcome ?? null;

/** MM/YY that is not in the past. */
export function expiryValid(v: string, now: number) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const month = Number(m[1]),
    year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const d = new Date(now);
  return year > d.getFullYear() || (year === d.getFullYear() && month >= d.getMonth() + 1);
}
