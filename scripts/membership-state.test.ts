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
  type CryptoTx,
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

test("upgrade credit counts whole days, so totals have no stray cents", () => {
  // Basic bought, then renewed once: about 60 days left. A few minutes later the upgrade used to
  // credit $19.98 (prorated to the millisecond) and show $10.02 / $79.02.
  const once = buy(seedMembership(now), "basic").state;
  const twice = buy(once, "basic", now + 60_000).state;
  const later = now + 5 * 60_000;
  const premium = quote(twice, "premium", later);
  const elite = quote(twice, "elite", later);
  assert.ok(premium && elite);
  assert.equal(premium.creditDays, 60);
  assert.equal(premium.credit, 20);
  assert.equal(premium.total, 10);
  assert.equal(elite.total, 79);
  // A started day counts as a full day; the credit always matches creditDays.
  const q = quote(once, "premium", now + 12.5 * DAY);
  assert.ok(q);
  assert.equal(q.creditDays, 18);
  assert.equal(q.credit, 6);
  assert.equal(q.total, 24);
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

/* ---------------- Crypto checkout ---------------- */
import {
  CONF_MS,
  COINS,
  NETWORKS,
  PAY_WINDOW_MS,
  addCryptoTx,
  cancelCrypto,
  cryptoProgress,
  depositAddress,
  migrateLegacyCoins,
  networkLabel,
  quoteAmount,
  recommendedNetwork,
  startCryptoOrder,
  switchCrypto,
  tickCrypto,
} from "../src/components/membership/cryptoModel";

const startUsdt = (s = seedMembership(now)) => {
  const made = startCryptoOrder(s, { tier: "premium", coin: "USDT", network: "tron", ethUsd: 3200 }, now, { id: "VIPC1", txn: "TXNC1" });
  assert.ok(made);
  return made;
};
const tx = (amount: number, at: number, hash = `h${amount}${at}`) => ({ hash, amount, at, from: "Tsender" });

test("a crypto order waits for a transfer and has auto-renew off", () => {
  const { order, state } = startUsdt();
  assert.equal(order.status, "awaiting");
  assert.equal(order.autoRenew, false);
  assert.equal(order.crypto?.amount, 30);
  assert.ok(order.crypto?.address.startsWith("T"));
  assert.equal(order.crypto?.expiresAt, now + PAY_WINDOW_MS);
  assert.equal(state.orders[0].status, "awaiting");
  assert.equal(tickCrypto(state, now + 1000).orders[0].status, "awaiting");
});

test("full payment activates the plan once confirmations complete", () => {
  let { state } = startUsdt();
  state = addCryptoTx(state, "VIPC1", tx(30, now + 1000), now + 1000);
  const need = NETWORKS.tron.confirmations;
  const halfway = tickCrypto(state, now + 1000 + CONF_MS * (need - 1));
  assert.equal(halfway.orders[0].status, "awaiting");
  assert.equal(cryptoProgress(halfway.orders[0].crypto!, now + 1000 + CONF_MS * (need - 1)).covered, true);
  const done = tickCrypto(state, now + 1000 + CONF_MS * need);
  assert.equal(done.orders[0].status, "paid");
  assert.equal(done.tier, "premium");
  assert.equal(done.autoRenew, false);
});

test("a partial payment waits for the rest, then completes", () => {
  let { state } = startUsdt();
  state = addCryptoTx(state, "VIPC1", tx(18, now + 1000), now + 1000);
  const later = now + 1000 + CONF_MS * 40;
  state = tickCrypto(state, later);
  assert.equal(state.orders[0].status, "awaiting");
  assert.equal(cryptoProgress(state.orders[0].crypto!, later).remaining, 12);
  state = addCryptoTx(state, "VIPC1", tx(12, later), later);
  state = tickCrypto(state, later + CONF_MS * 40);
  assert.equal(state.orders[0].status, "paid");
});

test("the window closes as expired (nothing sent) or underpaid (partial)", () => {
  const { state } = startUsdt();
  const end = now + PAY_WINDOW_MS + 1;
  assert.equal(tickCrypto(state, end).orders[0].failReason, "expired");
  const partial = addCryptoTx(state, "VIPC1", tx(10, now + 1000), now + 1000);
  const closed = tickCrypto(partial, end);
  assert.equal(closed.orders[0].status, "failed");
  assert.equal(closed.orders[0].failReason, "underpaid");
  assert.equal(effectiveTier(closed, end), "free");
  // A covered payment still confirming is not expired.
  const covered = addCryptoTx(state, "VIPC1", tx(30, end - 2), end - 2);
  assert.equal(tickCrypto(covered, end).orders[0].status, "awaiting");
});

test("coin/network can change before sending; cancel only before sending", () => {
  let { state } = startUsdt();
  state = switchCrypto(state, "VIPC1", "ETH", "arbitrum", 3000, now + 5);
  const pay = state.orders[0].crypto!;
  assert.equal(pay.coin, "ETH");
  assert.equal(pay.amount, 0.01);
  assert.ok(pay.address.startsWith("0x"));
  assert.equal(state.orders[0].methodLabel, "ETH · Arbitrum One");
  // unsupported network falls back to the cheapest one for the coin
  state = switchCrypto(state, "VIPC1", "ETH", "tron", 3000, now + 6);
  assert.equal(state.orders[0].crypto!.network, "base");
  const sent = addCryptoTx(state, "VIPC1", tx(5, now + 7), now + 7);
  assert.equal(switchCrypto(sent, "VIPC1", "USDT", "tron", 3000, now + 8), sent);
  assert.equal(cancelCrypto(sent, "VIPC1"), sent);
  assert.equal(cancelCrypto(state, "VIPC1").orders[0].failReason, "cancelled");
});

test("quotes, labels and addresses", () => {
  assert.equal(quoteAmount(30, "USDC", 3000), 30);
  assert.equal(quoteAmount(99, "ETH", 3183.75), 0.031096); // rounded up, never under-quoted
  assert.equal(networkLabel("USDT", "tron"), "TRON (TRC20)");
  assert.equal(networkLabel("ETH", "ethereum"), "Ethereum");
  assert.equal(recommendedNetwork("USDT"), "solana");
  assert.equal(depositAddress("A", "ethereum"), depositAddress("A", "base"));
  assert.notEqual(depositAddress("A", "ethereum"), depositAddress("B", "ethereum"));
  assert.equal(depositAddress("A", "ethereum").length, 42);
  for (const c of Object.values(COINS)) assert.ok(c.networks.length > 0);
  assert.deepEqual(Object.keys(COINS), ["USDT", "USDC", "ETH"]);
});

test("saved orders for a withdrawn coin (BUSD) move to USDT before anything is sent", () => {
  const { state } = startUsdt();
  const legacy = (o: MembershipState["orders"][number], network = "bsc", txs: CryptoTx[] = []) => ({
    ...o,
    methodLabel: "BUSD · BNB Smart Chain (BEP20)",
    crypto: { ...o.crypto!, coin: "BUSD", network, txs },
  });
  const unsent: MembershipState = { ...state, orders: [legacy(state.orders[0])] };
  const moved = migrateLegacyCoins(unsent, now + 10).orders[0];
  assert.equal(moved.crypto!.coin, "USDT");
  assert.equal(moved.crypto!.network, "bsc");
  assert.equal(moved.crypto!.amount, 30);
  assert.equal(moved.methodLabel, "USDT · BNB Smart Chain (BEP20)");
  // A transfer already seen keeps the coin and still completes.
  const sent: MembershipState = { ...state, orders: [legacy(state.orders[0], "bsc", [tx(30, now + 1000)])] };
  assert.equal(migrateLegacyCoins(sent, now + 2000), sent);
  assert.equal(tickCrypto(sent, now + 1000 + CONF_MS * NETWORKS.bsc.confirmations).orders[0].status, "paid");
});
