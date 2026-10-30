import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Headphones,
  Hourglass,
  Radar,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { ConfirmSheet, SheetRows } from "../ui/Sheet";
import { Dropdown } from "../ui/Dropdown";
import {
  COIN_ORDER,
  NETWORKS,
  QUOTE_LOCK_MS,
  coinInfo,
  confirmationsOf,
  cryptoProgress,
  isOfferedCoin,
  networkLabel,
  qrMatrix,
  quoteAmount,
  recommendedNetwork,
  type CoinId,
  type NetworkId,
} from "./cryptoModel";
import { PLANS, type Order } from "./membershipState";
import { TierBadge, VipHead, countdown, ethUsd, fmtTime, goVip, useMembership, useNow, usd } from "./Membership";

type Lang = "zh" | "en";
const tr = (lang: Lang) => (zh: string, en: string) => (lang === "zh" ? zh : en);

/* ---------------- Icons ---------------- */

export function CoinIcon({ coin, size = 28 }: { coin: string; size?: number }) {
  const c = coinInfo(coin);
  return (
    <span className="cp-coin" style={{ width: size, height: size, background: c.color }} aria-hidden>
      {coin === "ETH" ? (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>
          <path d="M12 2 5.5 12.3 12 16l6.5-3.7z" fill="#fff" fillOpacity=".95" />
          <path d="M12 17.3 5.5 13.6 12 22l6.5-8.4z" fill="#fff" fillOpacity=".75" />
        </svg>
      ) : (
        <b style={{ fontSize: size * 0.5, color: "#fff" }}>{coin === "USDT" ? "₮" : coin === "USDC" ? "$" : coin.slice(0, 1)}</b>
      )}
    </span>
  );
}

const NET_MARK: Record<NetworkId, string> = {
  tron: "T",
  ethereum: "Ξ",
  bsc: "B",
  polygon: "P",
  arbitrum: "A",
  optimism: "OP",
  base: "B",
  solana: "S",
};
export function NetIcon({ net, size = 26 }: { net: NetworkId; size?: number }) {
  return (
    <span
      className={`cp-net is-${net}`}
      style={{ width: size, height: size, background: net === "solana" ? "linear-gradient(135deg,#9945ff,#14f195)" : NETWORKS[net].color }}
      aria-hidden
    >
      <b style={{ fontSize: NET_MARK[net].length > 1 ? size * 0.36 : size * 0.48 }}>{NET_MARK[net]}</b>
    </span>
  );
}

/** Stacked coin marks for the payment-method row. */
export function CryptoMark() {
  return (
    <span className="cp-mark">
      {(["USDT", "USDC", "ETH"] as CoinId[]).map((c) => (
        <CoinIcon key={c} coin={c} size={20} />
      ))}
    </span>
  );
}

function QR({ text, coin }: { text: string; coin: CoinId }) {
  const m = useMemo(() => qrMatrix(text), [text]);
  const n = m.length;
  const d = m
    .flatMap((row, y) => row.map((on, x) => (on ? `M${x + 2},${y + 2}h1v1h-1z` : "")))
    .join("");
  return (
    <div className="cp-qr">
      <svg viewBox={`0 0 ${n + 4} ${n + 4}`} role="img" aria-label="QR">
        <rect width={n + 4} height={n + 4} fill="#fff" />
        <path d={d} fill="#0b1220" />
      </svg>
      <span className="cp-qr-logo">
        <CoinIcon coin={coin} size={30} />
      </span>
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
  };
  return [copied, copy] as const;
}

const mask = (s: string, head = 8, tail = 6) => (s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s);
const fmtCoin = (v: number, coin: string) => v.toFixed(coinInfo(coin).decimals);
const mmss = (ms: number) => countdown(ms).slice(3);

/** Address with the first and last six characters emphasised, as wallets do for checking. */
function Address({ value }: { value: string }) {
  return (
    <code className="cp-addr">
      <b>{value.slice(0, 6)}</b>
      {value.slice(6, -6)}
      <b>{value.slice(-6)}</b>
    </code>
  );
}

/* ====================== 收款页 ====================== */

export function CryptoCheckout({ lang, id, onSupport }: { lang: Lang; id: string; onSupport: () => void }) {
  const t = tr(lang);
  const m = useMembership();
  const now = useNow(500);
  const [copied, copy] = useCopy();
  const [listening, setListening] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const order = m.state.orders.find((o) => o.id === id);
  const pay = order?.crypto;
  const prog = pay ? cryptoProgress(pay, now) : null;

  // Leave for the result page once the full amount is on chain or the order is closed.
  useEffect(() => {
    if (order && (order.status !== "awaiting" || prog?.covered)) goVip(`order/${id}`, true);
  }, [order?.status, prog?.covered]);
  // ETH quotes are locked for 15 minutes; refresh automatically while nothing has been sent.
  const quoteLeft = pay ? pay.quotedAt + QUOTE_LOCK_MS - now : 0;
  useEffect(() => {
    if (pay && pay.coin === "ETH" && !pay.txs.length && quoteLeft <= 0) m.switchCrypto(id, "ETH", pay.network as NetworkId);
  }, [quoteLeft <= 0]);

  if (!order || !pay || !prog)
    return (
      <div className="mb-order">
        <VipHead title={t("数字货币支付", "Pay with crypto")} onBack={() => goVip("")} />
        <p className="mb-empty">{t("没有找到这笔订单", "Order not found")}</p>
      </div>
    );

  const coin = pay.coin as CoinId,
    net = pay.network as NetworkId;
  const network = NETWORKS[net];
  const sent = pay.txs.length > 0;
  const left = pay.expiresAt - now;
  const plan = PLANS[order.tier];
  const label = networkLabel(coin, net);
  const due = sent ? prog.remaining : pay.amount;

  // An order saved before a coin was withdrawn keeps showing that coin (it is locked once sent).
  const coins: CoinId[] = isOfferedCoin(coin) ? COIN_ORDER : [...COIN_ORDER, coin];
  const coinOptions = coins.map((c) => ({
    value: c,
    icon: <CoinIcon coin={c} size={30} />,
    label: c,
    sub: `${coinInfo(c).name} · ≈ ${fmtCoin(quoteAmount(order.total, c, ethUsd()), c)} ${c}`,
  }));
  const nets = coinInfo(coin).networks.length ? coinInfo(coin).networks : [net];
  const netOptions = nets.map((n) => ({
    value: n,
    icon: <NetIcon net={n} size={30} />,
    label: networkLabel(coin, n),
    sub: t(
      `手续费约 $${NETWORKS[n].feeUsd} · 约 ${NETWORKS[n].minutes} 分钟 · ${NETWORKS[n].confirmations} 个确认`,
      `Fee ~$${NETWORKS[n].feeUsd} · ~${NETWORKS[n].minutes} min · ${NETWORKS[n].confirmations} confirmations`,
    ),
    badge: n === recommendedNetwork(coin) ? t("费用最低", "Lowest fee") : undefined,
  }));

  return (
    <div className="mb-checkout cp-page">
      <VipHead
        title={t("数字货币支付", "Pay with crypto")}
        onBack={() => goVip(`checkout/${order.tier}`)}
        right={
          <span className={`cp-timer${left < 5 * 60_000 ? " is-low" : ""}`}>
            <Clock3 size={13} />
            {mmss(left)}
          </span>
        }
      />
      <div className="mb-co-grid">
        <div className="mb-co-main">
          <section className="ui-card mb-co-card">
            <h3 className="cp-step">
              <i>1</i>
              {t("选择币种与转账网络", "Choose coin and network")}
            </h3>
            <div className="cp-selects">
              <Dropdown
                label={t("币种", "Coin")}
                title={t("选择币种", "Choose a coin")}
                value={coin}
                options={coinOptions}
                disabled={sent}
                onChange={(c) => m.switchCrypto(id, c, coinInfo(c).networks[0] ?? net)}
              />
              <Dropdown
                label={t("转账网络", "Network")}
                title={t("选择转账网络", "Choose a network")}
                value={net}
                options={netOptions}
                disabled={sent}
                onChange={(n) => m.switchCrypto(id, coin, n)}
              />
            </div>
            {sent && <p className="sh-hint">{t("已检测到转账，本订单的币种和网络已锁定。", "A transfer was detected; coin and network are now locked.")}</p>}
          </section>

          <section className="ui-card mb-co-card">
            <h3 className="cp-step">
              <i>2</i>
              {sent ? t("补足剩余金额", "Send the remaining amount") : t("向以下地址转账", "Send to this address")}
            </h3>
            <div className="cp-pay">
              <QR text={`${coin}:${pay.address}?amount=${due}&network=${net}`} coin={coin} />
              <div className="cp-fields">
                <div className="cp-field">
                  <span>{t("转账金额", "Amount")}</span>
                  <div className="cp-amount">
                    <b>
                      {fmtCoin(due, coin)} <em>{coin}</em>
                    </b>
                    <button onClick={() => copy(fmtCoin(due, coin), "amount")} aria-label={t("复制金额", "Copy amount")}>
                      {copied === "amount" ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <small>
                    ≈ {usd(due * pay.rate)}
                    {coin === "ETH" &&
                      t(
                        ` · 1 ETH = ${usd(pay.rate)} · 报价 ${mmss(Math.max(0, quoteLeft))} 后刷新`,
                        ` · 1 ETH = ${usd(pay.rate)} · quote refreshes in ${mmss(Math.max(0, quoteLeft))}`,
                      )}
                  </small>
                </div>
                <div className="cp-field">
                  <span>
                    {t("收款地址", "Deposit address")} · <NetIcon net={net} size={16} /> {label}
                  </span>
                  <Address value={pay.address} />
                  <button className="cp-copy" onClick={() => copy(pay.address, "address")}>
                    {copied === "address" ? <Check size={15} /> : <Copy size={15} />}
                    {copied === "address" ? t("已复制", "Copied") : t("复制地址", "Copy address")}
                  </button>
                </div>
              </div>
            </div>
            {sent && (
              <div className="cp-partial">
                <div>
                  <span>
                    {t("已收到", "Received")} <b>{fmtCoin(prog.received, coin)}</b> / {fmtCoin(pay.amount, coin)} {coin}
                  </span>
                  <span>
                    {t("还需", "Still due")} <b>{fmtCoin(prog.remaining, coin)} {coin}</b>
                  </span>
                </div>
                <i>
                  <em style={{ width: `${Math.min(100, (prog.received / pay.amount) * 100)}%` }} />
                </i>
              </div>
            )}
            <ul className="cp-rules">
              <li>
                {t("仅支持通过 ", "Only send ")}
                <b>{label}</b>
                {t(" 网络转入 ", " network ")}
                <b>{coin}</b>
                {t("，转入其他币种或使用其他网络将无法到账且无法找回。", ". Other coins or networks cannot be credited or recovered.")}
              </li>
              <li>
                {t(
                  `从交易所提币时，请确保扣除手续费后的到账金额不少于 ${fmtCoin(due, coin)} ${coin}。`,
                  `When withdrawing from an exchange, make sure ${fmtCoin(due, coin)} ${coin} arrives after fees.`,
                )}
              </li>
              <li>
                {t(
                  `需 ${network.confirmations} 个区块确认，通常约 ${network.minutes} 分钟到账，确认后自动开通会员。`,
                  `${network.confirmations} confirmations, usually ~${network.minutes} min; the plan activates automatically.`,
                )}
              </li>
              <li>{t("该地址仅用于本订单，请勿保存为常用地址或重复转账。", "This address is for this order only; don't reuse it.")}</li>
            </ul>
          </section>
        </div>

        <aside className="mb-co-side cp-side">
          <section className="ui-card mb-co-card">
            <h3>{t("订单信息", "Order")}</h3>
            <div className="cp-plan">
              <TierBadge tier={order.tier} lang={lang} />
              <span>{t("1 个月", "1 month")}</span>
              <b>{usd(order.total)}</b>
            </div>
            <SheetRows
              rows={[
                [t("订单号", "Order ID"), order.id, "mono"],
                [t("应付", "Due"), `${fmtCoin(pay.amount, coin)} ${coin}`],
                [t("网络", "Network"), label],
                [t("支付剩余时间", "Time left"), mmss(left)],
                [t("自动续费", "Auto-renew"), t("不支持，到期前提醒续费", "Not available; we'll remind you")],
              ]}
            />
          </section>

          <section className="ui-card mb-co-card">
            <h3 className="cp-step">
              <i>3</i>
              {t("到账状态", "Status")}
            </h3>
            {sent ? (
              <ul className="cp-txs">
                {pay.txs.map((tx) => {
                  const c = confirmationsOf(tx, net, now);
                  return (
                    <li key={tx.hash}>
                      <span>
                        <b>
                          +{fmtCoin(tx.amount, coin)} {coin}
                        </b>
                        <small>{mask(tx.hash, 10, 8)}</small>
                      </span>
                      <em className={c >= network.confirmations ? "is-ok" : ""}>
                        {c >= network.confirmations ? t("已确认", "Confirmed") : `${c}/${network.confirmations}`}
                      </em>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={`cp-listen${listening ? " is-on" : ""}`}>
                {listening ? <Radar size={18} /> : <Hourglass size={18} />}
                <span>
                  {listening
                    ? t("正在监听链上转账，检测到后自动更新…", "Watching the chain for your transfer…")
                    : t("等待转账，转账后页面会自动检测", "Waiting for your transfer; it is detected automatically")}
                </span>
              </div>
            )}
            <div className="cp-actions">
              <button className="sh-btn sh-btn-primary" onClick={() => setListening(true)} disabled={listening && !sent}>
                {listening && !sent ? <span className="mb-spin is-light" /> : <CheckCircle2 size={16} />}
                {listening && !sent ? t("等待链上确认", "Waiting for chain") : t("我已完成转账", "I've sent it")}
              </button>
              {!sent && (
                <button className="sh-btn" onClick={() => setConfirmCancel(true)}>
                  {t("取消订单", "Cancel order")}
                </button>
              )}
            </div>
          </section>

          <section className="cp-sandbox">
            <b>
              <Wallet size={14} />
              {t("模拟钱包转账", "Sandbox wallet")}
            </b>
            <p>{t("模拟环境不连接区块链，用下方按钮模拟一笔转入。", "The sandbox isn't connected to a chain — simulate a transfer below.")}</p>
            <div>
              <button onClick={() => (setListening(true), m.simulateCrypto(id, "full"))}>{t("足额转账", "Send full")}</button>
              <button onClick={() => (setListening(true), m.simulateCrypto(id, "partial"))}>{t("部分转账", "Send part")}</button>
              <button onClick={() => m.expireCrypto(id)}>{t("模拟超时", "Expire now")}</button>
            </div>
          </section>
          <button className="mb-link cp-help" onClick={onSupport}>
            <Headphones size={13} />
            {t("转错网络或遇到问题？联系客服", "Wrong network or other issue? Contact support")}
          </button>
        </aside>
      </div>

      <div className="mb-co-bar cp-bar">
        <div>
          <small>{t("应转", "Send")}</small>
          <b>
            {fmtCoin(due, coin)} {coin}
          </b>
        </div>
        <button className="mb-pay is-card" onClick={() => copy(pay.address, "address")}>
          {copied === "address" ? <Check size={15} /> : <Copy size={15} />}
          {copied === "address" ? t("地址已复制", "Copied") : t("复制收款地址", "Copy address")}
        </button>
      </div>

      {confirmCancel && (
        <ConfirmSheet
          title={t("取消这笔订单？", "Cancel this order?")}
          confirm={t("取消订单", "Cancel order")}
          cancel={t("继续支付", "Keep paying")}
          danger
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false);
            m.cancelCrypto(id);
          }}
        >
          <p className="mb-confirm-text">
            {t(
              "取消后收款地址失效，请勿再向该地址转账。可随时重新下单。",
              "The deposit address stops working after cancelling — don't send to it. You can order again any time.",
            )}
          </p>
        </ConfirmSheet>
      )}
    </div>
  );
}

/* ====================== 确认结果页 ====================== */

/** Payment detail for crypto orders: waiting → confirming → paid, or expired / underpaid / cancelled. */
export function CryptoResult({ lang, order, onSupport }: { lang: Lang; order: Order; onSupport: () => void }) {
  const t = tr(lang);
  const m = useMembership();
  const now = useNow(order.status === "awaiting" ? 300 : 60_000);
  const [copied, copy] = useCopy();
  const pay = order.crypto!;
  const coin = pay.coin as CoinId,
    net = pay.network as NetworkId;
  const network = NETWORKS[net];
  const prog = cryptoProgress(pay, now);
  const plan = PLANS[order.tier];
  const confirming = order.status === "awaiting" && prog.covered;
  const waiting = order.status === "awaiting" && !prog.covered;
  const lastTx = pay.txs.at(-1);
  const conf = lastTx ? confirmationsOf(lastTx, net, now) : 0;
  const pct = order.status === "paid" ? 100 : Math.round((conf / network.confirmations) * 100);
  const state = order.status === "paid" ? "paid" : confirming ? "confirming" : waiting ? "waiting" : order.failReason ?? "expired";
  const title: Record<string, string> = {
    paid: t("支付成功", "Payment successful"),
    confirming: t("区块确认中", "Confirming on-chain"),
    waiting: t("待支付", "Awaiting payment"),
    expired: t("订单已超时", "Order expired"),
    underpaid: t("支付金额不足", "Underpaid"),
    cancelled: t("订单已取消", "Order cancelled"),
  };
  const desc: Record<string, string> = {
    paid: t(`${plan.zh}已开通，今日可用 ${plan.daily} 次 AI 分析`, `${plan.en} is active: ${plan.daily} AI analyses a day`),
    confirming: t(
      `已检测到转账，正在等待 ${network.confirmations} 个区块确认，完成后自动开通会员`,
      `Transfer detected; waiting for ${network.confirmations} confirmations before activating`,
    ),
    waiting: t(`请在 ${mmss(pay.expiresAt - now)} 内完成转账`, `Send within ${mmss(pay.expiresAt - now)}`),
    expired: t("支付窗口已关闭，未检测到转账，本订单不会扣款", "The window closed with no transfer; nothing was charged"),
    underpaid: t(
      `仅收到 ${fmtCoin(prog.received, coin)} ${coin}，少于应付 ${fmtCoin(pay.amount, coin)} ${coin}，已收款项将原路退回`,
      `Only ${fmtCoin(prog.received, coin)} of ${fmtCoin(pay.amount, coin)} ${coin} arrived; it will be refunded`,
    ),
    cancelled: t("订单已取消，收款地址已失效，请勿再向该地址转账", "Cancelled — don't send to the deposit address"),
  };
  const failed = order.status === "failed";
  const failLabel: Record<string, string> = {
    expired: t("已超时", "Expired"),
    underpaid: t("金额不足", "Underpaid"),
    cancelled: t("已取消", "Cancelled"),
  };
  // [label, done, failed here]
  const steps: [string, boolean, boolean][] = [
    [t("创建订单", "Order"), true, false],
    [t("检测到转账", "Transfer seen"), pay.txs.length > 0, failed && !pay.txs.length],
    failed && pay.txs.length
      ? [failLabel[state] ?? title[state], false, true]
      : [
          t(
            `区块确认 ${order.status === "paid" ? network.confirmations : conf}/${network.confirmations}`,
            `Confirmations ${order.status === "paid" ? network.confirmations : conf}/${network.confirmations}`,
          ),
          order.status === "paid" || (confirming && conf >= network.confirmations),
          false,
        ],
    [t("开通会员", "Activated"), order.status === "paid", false],
  ];
  if (failed && !pay.txs.length) steps[1][0] = failLabel[state] ?? title[state];

  return (
    <div className="mb-order">
      <VipHead
        title={t("支付详情", "Payment details")}
        onBack={() => goVip("orders")}
        right={
          <button className="ui-link" onClick={() => goVip("orders")}>
            {t("订单记录", "Orders")}
          </button>
        }
      />
      <section className={`ui-card mb-od-hero cp-result is-${state}`}>
        {confirming ? (
          <div className="cp-ring" style={{ ["--p" as string]: `${pct}%` }}>
            <b>
              {conf}
              <small>/{network.confirmations}</small>
            </b>
          </div>
        ) : (
          <span className="mb-od-icon">
            {state === "paid" ? (
              <Check size={30} strokeWidth={3} />
            ) : state === "waiting" ? (
              <Hourglass size={28} />
            ) : (
              <X size={30} strokeWidth={3} />
            )}
          </span>
        )}
        <h2>{title[state]}</h2>
        <strong>
          {fmtCoin(order.status === "paid" || confirming ? prog.received : pay.amount, coin)} <em>{coin}</em>
        </strong>
        <p>{desc[state]}</p>
        <ol className="rd-steps mb-od-steps cp-steps">
          {steps.map(([s, on, bad]) => (
            <li key={s} className={on ? "is-on" : bad ? "is-bad" : ""}>
              <i />
              {s}
            </li>
          ))}
        </ol>
      </section>

      {order.status === "paid" && (
        <section className={`mb-od-active is-${order.tier}`}>
          <div>
            <TierBadge tier={order.tier} lang={lang} size="md" />
            <b>{t("会员权益已生效", "Membership is active")}</b>
            <span>{t(`今日可用 ${plan.daily} 次 AI 分析，已用 ${m.used} 次`, `${plan.daily} analyses today, ${m.used} used`)}</span>
          </div>
          <button onClick={m.goBack}>
            {t("返回继续分析", "Back to analysis")}
          </button>
        </section>
      )}
      {state === "underpaid" && (
        <div className="sh-note is-warn mb-od-note">
          <RefreshCw size={15} />
          <span>
            {t(
              `退款 ${fmtCoin(prog.received, coin)} ${coin} 将在 1–3 个工作日内退回付款地址 ${mask(pay.txs[0]?.from ?? "")}，网络手续费由付款方承担。`,
              `${fmtCoin(prog.received, coin)} ${coin} will be refunded to ${mask(pay.txs[0]?.from ?? "")} within 1–3 business days, less network fees.`,
            )}
          </span>
        </div>
      )}

      <section className="ui-card mb-co-card">
        <h3>{t("链上信息", "On-chain details")}</h3>
        <SheetRows
          rows={[
            [t("币种 / 网络", "Coin / network"), `${coin} · ${networkLabel(coin, net)}`],
            [t("应付数量", "Amount due"), `${fmtCoin(pay.amount, coin)} ${coin}`],
            [t("实收数量", "Received"), `${fmtCoin(prog.received, coin)} ${coin}`, prog.received >= pay.amount ? "up" : undefined],
            ...(coin === "ETH" ? ([[t("报价汇率", "Rate"), `1 ETH = ${usd(pay.rate)}`]] as [string, string][]) : []),
            [
              t("收款地址", "Deposit address"),
              <span className="rd-copy" key="addr">
                {mask(pay.address)}
                <button onClick={() => copy(pay.address, "addr")} aria-label={t("复制", "Copy")}>
                  {copied === "addr" ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </span>,
              "mono",
            ],
            ...pay.txs.map(
              (tx, i) =>
                [
                  pay.txs.length > 1 ? t(`交易哈希 ${i + 1}`, `Tx hash ${i + 1}`) : t("交易哈希", "Tx hash"),
                  <span className="rd-copy" key={tx.hash}>
                    {mask(tx.hash, 10, 8)}
                    <button onClick={() => copy(tx.hash, tx.hash)} aria-label={t("复制", "Copy")}>
                      {copied === tx.hash ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </span>,
                  "mono",
                ] as [string, React.ReactNode, string],
            ),
            ...(pay.txs[0] ? ([[t("付款地址", "From"), mask(pay.txs[0].from), "mono"]] as [string, string, string][]) : []),
            [
              t("区块确认", "Confirmations"),
              lastTx ? `${order.status === "paid" ? network.confirmations : conf}/${network.confirmations}` : "—",
            ],
          ]}
        />
      </section>

      <section className="ui-card mb-co-card">
        <h3>{t("订单信息", "Order")}</h3>
        <SheetRows
          rows={[
            [t("订单号", "Order ID"), order.id, "mono"],
            [t("商品", "Item"), `${t(plan.zh, plan.en)} · ${t("1 个月", "1 month")}`],
            [t("订单金额", "Amount"), usd(order.total)],
            [t("下单时间", "Created"), fmtTime(order.createdAt)],
            ...(order.paidAt ? ([[t("到账时间", "Paid"), fmtTime(order.paidAt)]] as [string, string][]) : []),
            [t("会员有效期", "Period"), `${fmtTime(order.periodStart, false)} — ${fmtTime(order.periodEnd, false)}`],
            [t("自动续费", "Auto-renew"), t("数字货币按次支付，不自动扣款", "Not available for crypto")],
          ]}
        />
      </section>

      <div className="mb-od-actions">
        {waiting ? (
          <button className="sh-btn sh-btn-primary" onClick={() => goVip(`crypto/${order.id}`)}>
            <Wallet size={16} />
            {t("继续支付", "Continue paying")}
          </button>
        ) : failed ? (
          <>
            <button className="sh-btn" onClick={onSupport}>
              <Headphones size={16} />
              {t("联系客服", "Support")}
            </button>
            <button className="sh-btn sh-btn-primary" onClick={() => goVip(`checkout/${order.tier}`)}>
              <RefreshCw size={16} />
              {t("重新下单", "Order again")}
            </button>
          </>
        ) : (
          <button className="sh-btn sh-btn-primary" disabled={order.status !== "paid"} onClick={() => goVip("")}>
            <Crown size={16} />
            {t("会员中心", "Membership")}
          </button>
        )}
      </div>
      <p className="mb-od-help">
        <span>
          <ShieldCheck size={12} /> {t("模拟支付环境 · 不连接区块链、不会真实扣款", "Sandbox · no blockchain connection, no real charge")}
        </span>
      </p>
    </div>
  );
}
