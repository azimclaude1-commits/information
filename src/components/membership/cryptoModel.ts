/**
 * Crypto checkout for memberships: coins, networks, quotes, deposit addresses and the order lifecycle
 * (awaiting → transfer seen → confirmations → paid, or expired / underpaid / cancelled).
 * Pure functions over `MembershipState`; covered by `scripts/membership-state.test.ts`.
 * Nothing here talks to a chain — transfers are simulated by the checkout page.
 */
import {
  createOrder,
  settleOrder,
  type CryptoPayment,
  type CryptoTx,
  type MembershipState,
  type Order,
  type PaidTier,
} from "./membershipState";

export type CoinId = "USDT" | "USDC" | "ETH" | "BUSD";
export type NetworkId = "tron" | "ethereum" | "bsc" | "polygon" | "arbitrum" | "optimism" | "base" | "solana";
type Family = "evm" | "tron" | "solana";

export type Network = {
  id: NetworkId;
  name: string;
  /** token standard shown in brackets for tokens (ERC20 / TRC20 / BEP20 / SPL); equals the name on L2s */
  standard: string;
  family: Family;
  /** confirmations required before the payment counts */
  confirmations: number;
  /** typical sender fee in USD */
  feeUsd: number;
  /** typical arrival time in minutes */
  minutes: number;
  color: string;
};

export const NETWORKS: Record<NetworkId, Network> = {
  tron: { id: "tron", name: "TRON", standard: "TRC20", family: "tron", confirmations: 20, feeUsd: 1, minutes: 2, color: "#ef0027" },
  ethereum: { id: "ethereum", name: "Ethereum", standard: "ERC20", family: "evm", confirmations: 12, feeUsd: 1.8, minutes: 3, color: "#627eea" },
  bsc: { id: "bsc", name: "BNB Smart Chain", standard: "BEP20", family: "evm", confirmations: 15, feeUsd: 0.08, minutes: 1, color: "#f0b90b" },
  polygon: { id: "polygon", name: "Polygon PoS", standard: "Polygon PoS", family: "evm", confirmations: 30, feeUsd: 0.02, minutes: 2, color: "#8247e5" },
  arbitrum: { id: "arbitrum", name: "Arbitrum One", standard: "Arbitrum One", family: "evm", confirmations: 10, feeUsd: 0.05, minutes: 1, color: "#28a0f0" },
  optimism: { id: "optimism", name: "Optimism", standard: "Optimism", family: "evm", confirmations: 10, feeUsd: 0.05, minutes: 1, color: "#ff0420" },
  base: { id: "base", name: "Base", standard: "Base", family: "evm", confirmations: 10, feeUsd: 0.03, minutes: 1, color: "#0052ff" },
  solana: { id: "solana", name: "Solana", standard: "SPL", family: "solana", confirmations: 32, feeUsd: 0.01, minutes: 1, color: "#9945ff" },
};

export type Coin = {
  id: CoinId;
  name: string;
  stable: boolean;
  /** decimals shown / charged */
  decimals: number;
  networks: NetworkId[];
  color: string;
};

export const COINS: Record<CoinId, Coin> = {
  USDT: { id: "USDT", name: "Tether USD", stable: true, decimals: 2, networks: ["tron", "ethereum", "bsc", "polygon", "arbitrum", "optimism", "solana"], color: "#26a17b" },
  USDC: { id: "USDC", name: "USD Coin", stable: true, decimals: 2, networks: ["ethereum", "base", "arbitrum", "optimism", "polygon", "solana", "bsc"], color: "#2775ca" },
  ETH: { id: "ETH", name: "Ether", stable: false, decimals: 6, networks: ["ethereum", "arbitrum", "optimism", "base"], color: "#627eea" },
  BUSD: { id: "BUSD", name: "Binance USD", stable: true, decimals: 2, networks: ["bsc", "ethereum"], color: "#f0b90b" },
};
export const COIN_ORDER: CoinId[] = ["USDT", "USDC", "ETH", "BUSD"];

/** Payment window and quote lock. */
export const PAY_WINDOW_MS = 30 * 60_000;
export const QUOTE_LOCK_MS = 15 * 60_000;
/** Simulated time per block confirmation (real arrival times are shown separately). */
export const CONF_MS = 350;

export const isNative = (coin: CoinId, net: NetworkId) => coin === "ETH" && NETWORKS[net].family === "evm";
/** "TRON (TRC20)" for tokens, plain "Arbitrum One" for native ETH. */
export function networkLabel(coin: CoinId, net: NetworkId) {
  const n = NETWORKS[net];
  return isNative(coin, net) || n.standard === n.name ? n.name : `${n.name} (${n.standard})`;
}
/** Cheapest supported network for a coin — used as the default and the 推荐 badge. */
export const recommendedNetwork = (coin: CoinId): NetworkId =>
  [...COINS[coin].networks].sort((a, b) => NETWORKS[a].feeUsd - NETWORKS[b].feeUsd)[0];

/** Amount due in `coin` for `usd`. Stablecoins are 1:1 (rounded up to the cent), ETH uses `ethUsd`. */
export function quoteAmount(usd: number, coin: CoinId, ethUsd: number) {
  if (COINS[coin].stable) return Math.ceil(usd * 100 - 1e-6) / 100;
  return Math.ceil((usd / ethUsd) * 1e6 - 1e-6) / 1e6;
}

function hash32(s: string, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}
function stream(s: string, n: number, alphabet: string) {
  let out = "",
    h = hash32(s);
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = (h + 0x9e3779b9 + i) >>> 0;
    out += alphabet[h % alphabet.length];
  }
  return out;
}
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** One deposit address per order and address family (all EVM chains share the 0x address). */
export function depositAddress(orderId: string, net: NetworkId) {
  const family = NETWORKS[net].family;
  if (family === "evm") return `0x${stream(`${orderId}:evm`, 40, "0123456789abcdef")}`;
  if (family === "tron") return `T${stream(`${orderId}:tron`, 33, B58)}`;
  return stream(`${orderId}:sol`, 44, B58);
}
export const txHash = (seed: string, net: NetworkId) =>
  NETWORKS[net].family === "solana" ? stream(seed, 88, B58) : `${NETWORKS[net].family === "evm" ? "0x" : ""}${stream(seed, 64, "0123456789abcdef")}`;

/**
 * Deterministic QR-style matrix (finder squares + timing + data from the address) for the deposit card.
 * It is a visual stand-in for the wallet QR code.
 */
export function qrMatrix(text: string, size = 29): boolean[][] {
  const m = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const bits = stream(text, size * size, "01");
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) m[y][x] = bits[y * size + x] === "1";
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const X = ox + x,
          Y = oy + y;
        if (X < 0 || Y < 0 || X >= size || Y >= size) continue;
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        m[Y][X] = ring !== 2 && ring !== 4 && x >= 0 && y >= 0 && x <= 6 && y <= 6;
      }
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);
  for (let i = 8; i < size - 8; i++) m[6][i] = m[i][6] = i % 2 === 0;
  return m;
}

/* ---------------- Order lifecycle ---------------- */

const patch = (s: MembershipState, id: string, p: Partial<Order>): MembershipState => ({
  ...s,
  orders: s.orders.map((o) => (o.id === id ? { ...o, ...p } : o)),
});
const cryptoOf = (s: MembershipState, id: string) => {
  const o = s.orders.find((x) => x.id === id);
  return o && o.method === "crypto" && o.crypto ? { order: o, pay: o.crypto } : null;
};

/** Creates an awaiting crypto order. Crypto is paid per period, so auto-renew is always off. */
export function startCryptoOrder(
  state: MembershipState,
  input: { tier: PaidTier; coin: CoinId; network: NetworkId; ethUsd: number },
  now: number,
  ids: { id: string; txn: string },
): { state: MembershipState; order: Order } | null {
  const made = createOrder(
    state,
    { tier: input.tier, method: "crypto", methodLabel: `${input.coin} · ${networkLabel(input.coin, input.network)}`, autoRenew: false },
    now,
    ids,
  );
  if (!made) return null;
  const crypto: CryptoPayment = {
    coin: input.coin,
    network: input.network,
    address: depositAddress(ids.id, input.network),
    amount: quoteAmount(made.order.total, input.coin, input.ethUsd),
    rate: COINS[input.coin].stable ? 1 : input.ethUsd,
    quotedAt: now,
    expiresAt: now + PAY_WINDOW_MS,
    txs: [],
  };
  const order: Order = { ...made.order, status: "awaiting", crypto };
  return { order, state: patch(made.state, order.id, { status: "awaiting", crypto }) };
}

/** Switch coin / network (or refresh an expired ETH quote) before anything was sent. */
export function switchCrypto(
  state: MembershipState,
  id: string,
  coin: CoinId,
  network: NetworkId,
  ethUsd: number,
  now: number,
): MembershipState {
  const c = cryptoOf(state, id);
  if (!c || c.order.status !== "awaiting" || c.pay.txs.length || now > c.pay.expiresAt) return state;
  if (!COINS[coin].networks.includes(network)) network = recommendedNetwork(coin);
  return patch(state, id, {
    methodLabel: `${coin} · ${networkLabel(coin, network)}`,
    crypto: {
      ...c.pay,
      coin,
      network,
      address: depositAddress(id, network),
      amount: quoteAmount(c.order.total, coin, ethUsd),
      rate: COINS[coin].stable ? 1 : ethUsd,
      quotedAt: now,
    },
  });
}

export const confirmationsOf = (tx: CryptoTx, net: NetworkId, now: number) =>
  Math.max(0, Math.min(NETWORKS[net].confirmations, Math.floor((now - tx.at) / CONF_MS)));

export function cryptoProgress(pay: CryptoPayment, now: number) {
  const net = pay.network as NetworkId;
  const need = NETWORKS[net].confirmations;
  const received = pay.txs.reduce((s, t) => s + t.amount, 0);
  const confirmed = pay.txs.filter((t) => confirmationsOf(t, net, now) >= need).reduce((s, t) => s + t.amount, 0);
  const eps = 10 ** -(COINS[pay.coin as CoinId]?.decimals ?? 2) / 2;
  return {
    received,
    confirmed,
    remaining: Math.max(0, pay.amount - received),
    /** full amount seen on chain (confirmations may still be running) */
    covered: received + eps >= pay.amount,
    done: confirmed + eps >= pay.amount,
    need,
  };
}

/** Records a transfer to the deposit address (from the sandbox buttons on the checkout page). */
export function addCryptoTx(state: MembershipState, id: string, tx: CryptoTx, now: number): MembershipState {
  const c = cryptoOf(state, id);
  if (!c || c.order.status !== "awaiting" || now > c.pay.expiresAt || tx.amount <= 0) return state;
  return patch(state, id, { crypto: { ...c.pay, txs: [...c.pay.txs, tx] } });
}

export function cancelCrypto(state: MembershipState, id: string): MembershipState {
  const c = cryptoOf(state, id);
  if (!c || c.order.status !== "awaiting" || c.pay.txs.length) return state;
  return patch(state, id, { status: "failed", failReason: "cancelled" });
}

/** Sandbox helper: end the payment window now. */
export function expireCrypto(state: MembershipState, id: string, now: number): MembershipState {
  const c = cryptoOf(state, id);
  if (!c || c.order.status !== "awaiting") return state;
  return patch(state, id, { crypto: { ...c.pay, expiresAt: now - 1 } });
}

/**
 * Advances every awaiting crypto order: fully confirmed → paid (plan activates); window closed while
 * short → expired (nothing received) or underpaid (partial, refunded). A covered payment that is still
 * confirming is never expired.
 */
export function tickCrypto(state: MembershipState, now: number): MembershipState {
  let s = state;
  for (const o of state.orders) {
    if (o.status !== "awaiting" || o.method !== "crypto" || !o.crypto) continue;
    const p = cryptoProgress(o.crypto, now);
    if (p.done) {
      s = settleOrder(patch(s, o.id, { status: "processing", failReason: undefined }), o.id, now);
    } else if (now > o.crypto.expiresAt && !p.covered) {
      s = patch(s, o.id, { status: "failed", failReason: p.received > 0 ? "underpaid" : "expired" });
    }
  }
  return s;
}
