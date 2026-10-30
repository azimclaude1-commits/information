import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY,
  PERIOD_DAYS,
  createOrder,
  dayKey,
  effectiveTier,
  expiryValid,
  formatCard,
  cardBrand,
  hydrateMembership,
  isUnlocked,
  luhn,
  nextReset,
  quote,
  remaining,
  requestUse,
  seedMembership,
  settleOrder,
  testCardOutcome,
  type MembershipState,
  type PaidTier,
} from "../src/components/membership/membershipState";

// 2026-10-30 10:00 Beijing time
const now = Date.UTC(2026, 9, 30, 2, 0, 0);
let seq = 0;
const use = (s: MembershipState, key: string, at = now, force = false) =>
  requestUse(s, { feature: "diagnose", key, label: key, force }, at, `u${++seq}`);
const buy = (s: MembershipState, tier: PaidTier, at = now, failReason?: "card_declined") => {
  const made = createOrder(
    s,
    { tier, method: "apple", methodLabel: "Apple Pay", autoRenew: true, failReason },
    at,
    { id: `VIP${++seq}`, txn: `TXN${seq}` },
  );
  assert.ok(made);
  return { order: made.order, state: settleOrder(made.state, made.order.id, at + 2000) };
};

test("free users get three analyses a day", () => {
  let s = seedMembership(now);
  for (const key of ["a", "b", "c"]) {
    const r = use(s, key);
    assert.equal(r.result, "charged");
    s = r.state;
  }
  assert.equal(remaining(s, now), 0);
  assert.equal(use(s, "d").result, "blocked");
});

test("reopening the same analysis today is free, regenerating is charged", () => {
  let s = use(seedMembership(now), "diagnose:NVDA").state;
  const again = use(s, "diagnose:NVDA");
  assert.equal(again.result, "cached");
  assert.equal(again.state.used, 1);
  s = use(s, "diagnose:NVDA", now, true).state;
  assert.equal(s.used, 2);
  assert.equal(s.records.length, 2);
});

test("the quota resets at 00:00 Beijing time", () => {
  let s = seedMembership(now);
  for (const key of ["a", "b", "c"]) s = use(s, key).state;
  const reset = nextReset(now);
  assert.equal(dayKey(reset - 1), "2026-10-30");
  assert.equal(dayKey(reset), "2026-10-31");
  assert.equal(remaining(s, reset - 1), 0);
  assert.equal(remaining(s, reset), 3);
  assert.equal(isUnlocked(s, "a", reset), false);
});

test("buying a plan raises the daily limit and keeps today's usage", () => {
  let s = seedMembership(now);
  for (const key of ["a", "b", "c"]) s = use(s, key).state;
  const { state, order } = buy(s, "premium");
  assert.equal(order.kind, "new");
  assert.equal(order.total, 30);
  assert.equal(effectiveTier(state, now), "premium");
  assert.equal(remaining(state, now), 77);
  assert.equal(state.expiresAt, now + PERIOD_DAYS * DAY);
});

test("a failed payment leaves the account on its current plan", () => {
  const { state, order } = buy(seedMembership(now), "basic", now, "card_declined");
  assert.equal(state.orders[0].status, "failed");
  assert.equal(order.status, "processing");
  assert.equal(effectiveTier(state, now), "free");
});

test("upgrades credit the unused days of the current plan", () => {
  const basic = buy(seedMembership(now), "basic").state;
  const later = now + 15 * DAY;
  const q = quote(basic, "elite", later);
  assert.ok(q);
  assert.equal(q.kind, "upgrade");
  assert.equal(q.credit, 5);
  assert.equal(q.total, 94);
  assert.equal(q.periodEnd, later + PERIOD_DAYS * DAY);
  const elite = buy(basic, "elite", later).state;
  assert.equal(effectiveTier(elite, later), "elite");
  assert.equal(quote(elite, "basic", later), null, "no downgrade while a plan is active");
});

test("renewing the same tier extends from the current expiry", () => {
  const first = buy(seedMembership(now), "premium").state;
  const q = quote(first, "premium", now + DAY);
  assert.ok(q);
  assert.equal(q.kind, "renew");
  assert.equal(q.periodStart, first.expiresAt);
  const renewed = buy(first, "premium", now + DAY).state;
  assert.equal(renewed.expiresAt, first.expiresAt + PERIOD_DAYS * DAY);
});

test("an expired plan falls back to the free quota", () => {
  const s = buy(seedMembership(now), "basic").state;
  const after = s.expiresAt + 1;
  assert.equal(effectiveTier(s, after), "free");
  assert.equal(remaining(s, after), 3);
});

test("hydration repairs unknown or partial storage", () => {
  const s = hydrateMembership({ tier: "gold", used: -4, orders: "x" }, now);
  assert.equal(s.tier, "free");
  assert.equal(s.used, 0);
  assert.deepEqual(s.orders, []);
  assert.equal(hydrateMembership(null, now).day, dayKey(now));
});

test("card helpers detect brands, Luhn, expiry and sandbox numbers", () => {
  assert.equal(cardBrand("4242"), "visa");
  assert.equal(cardBrand("5555 5555"), "mastercard");
  assert.equal(cardBrand("3782"), "amex");
  assert.equal(formatCard("4242424242424242"), "4242 4242 4242 4242");
  assert.equal(formatCard("378282246310005"), "3782 822463 10005");
  assert.ok(luhn("4242 4242 4242 4242"));
  assert.ok(!luhn("4242 4242 4242 4241"));
  assert.equal(testCardOutcome("4000 0027 6000 3184"), "3ds");
  assert.equal(testCardOutcome("4111 1111 1111 1111"), null);
  assert.ok(expiryValid("12/29", now));
  assert.ok(expiryValid("10/26", now));
  assert.ok(!expiryValid("09/26", now));
  assert.ok(!expiryValid("13/30", now));
});
