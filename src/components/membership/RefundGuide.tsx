import React, { useState } from "react";
import { Apple, Check, ChevronRight, Clock3, CreditCard, FileText, Headphones, Play, ReceiptText, Wallet } from "lucide-react";
import { ConfirmSheet } from "../ui/Sheet";
import { useSavedState } from "../marketModel";
import { useCompliance } from "../compliance/Compliance";
import { CONTACT } from "../compliance/complianceInfo";
import { DAY, PLANS } from "./membershipState";
import { VipHead, fmtTime, goVip, useMembership, usd } from "./Membership";

type Lang = "zh" | "en";
type Channel = "appstore" | "googleplay" | "web" | "crypto";
const CHANNELS: Channel[] = ["appstore", "googleplay", "web", "crypto"];
const WEB_WINDOW_DAYS = 7;

type Step = [string, string];
type Guide = {
  icon: React.ElementType;
  name: [string, string];
  who: [string, string];
  steps: Step[];
  timing: [string, string];
  cancel: Step[];
  note?: [string, string];
};

const GUIDES: Record<Channel, Guide> = {
  appstore: {
    icon: Apple,
    name: ["App Store", "App Store"],
    who: ["通过 iPhone / iPad 应用内购买的会员，退款由 Apple 审核处理", "Purchases made in the iPhone / iPad app. Apple reviews refund requests"],
    steps: [
      ["在浏览器打开 reportaproblem.apple.com，使用购买时的 Apple ID 登录", "Open reportaproblem.apple.com and sign in with the Apple ID you used"],
      ["点击「我想要」→「申请退款」，选择退款原因", "Tap I'd like to → Request a refund, then choose a reason"],
      ["在列表中选择 TickVelo 会员订单并提交", "Pick the TickVelo membership order and submit"],
      ["Apple 审核通过后会邮件通知你，会员权益随之终止", "Apple emails you when it's approved; the membership then ends"],
    ],
    timing: ["Apple 审核通常需 24–48 小时，退款 5–10 个工作日原路退回", "Apple usually decides within 24–48 h; money returns in 5–10 business days"],
    cancel: [
      ["打开 iPhone「设置」，点击顶部你的名字", "Open Settings and tap your name"],
      ["点击「订阅」→ TickVelo", "Tap Subscriptions → TickVelo"],
      ["点击「取消订阅」并确认", "Tap Cancel subscription and confirm"],
    ],
    note: ["我们无法直接为 App Store 订单退款，如遇问题可联系客服协助", "We can't refund App Store orders ourselves, but support can help with the request"],
  },
  googleplay: {
    icon: Play,
    name: ["Google Play", "Google Play"],
    who: ["通过 Android 应用内购买的会员", "Purchases made in the Android app"],
    steps: [
      ["打开 Google Play，点击右上角头像 →「付款和订阅」", "Open Google Play → profile → Payments & subscriptions"],
      ["进入「预算和历史记录」，找到 TickVelo 会员订单", "Open Budget & history and find the TickVelo order"],
      ["购买 48 小时内：点击「申请退款」并选择原因提交", "Within 48 hours: tap Request a refund and choose a reason"],
      ["超过 48 小时：在「联系我们」提交订单号，由我们审核后通过 Google Play 退款", "After 48 hours: send us the order number; we review and refund through Google Play"],
    ],
    timing: ["Google 通常 1–4 个工作日内处理，退款原路退回", "Google usually decides in 1–4 business days; money returns to the original method"],
    cancel: [
      ["打开 Google Play，点击头像 →「付款和订阅」→「订阅」", "Google Play → profile → Payments & subscriptions → Subscriptions"],
      ["选择 TickVelo", "Choose TickVelo"],
      ["点击「取消订阅」并按提示确认", "Tap Cancel subscription and confirm"],
    ],
  },
  web: {
    icon: CreditCard,
    name: ["网页支付", "Web checkout"],
    who: ["通过银行卡、Apple Pay 或 Google Pay 在网页 / 收银台支付的会员", "Card, Apple Pay or Google Pay payments in our checkout"],
    steps: [
      [`开通后 ${WEB_WINDOW_DAYS} 天内且未使用会员额度的订单可申请全额退款`, `Orders within ${WEB_WINDOW_DAYS} days and before using member allowance get a full refund`],
      ["在下方「可申请退款的订单」中点击「申请退款」，或在订单详情中操作", "Tap Request refund below or in the order details"],
      ["客服在 1 个工作日内审核，审核通过后会员权益立即终止", "Support reviews within 1 business day; the membership ends once approved"],
      ["超过时限或已使用额度的，可联系客服说明情况，我们会按法律规定处理", "Outside the window or after use, contact support and we'll handle it as the law requires"],
    ],
    timing: ["原路退回，银行卡 5–10 个工作日到账", "Back to the original method; cards take 5–10 business days"],
    cancel: [
      ["进入「会员中心」→「订阅与支付」", "Open Membership → Billing"],
      ["关闭「连续包月」开关并确认", "Turn off Auto-renew and confirm"],
      ["当期权益保留至到期日，到期后不再扣费", "Your plan stays active until it ends; no further charge"],
    ],
  },
  crypto: {
    icon: Wallet,
    name: ["数字货币", "Crypto"],
    who: ["使用 USDT / USDC / ETH 支付的单月会员", "One-month passes paid with USDT / USDC / ETH"],
    steps: [
      ["少付或超时到账的款项会自动原路退回付款地址，无需申请", "Short or late payments are refunded to the sending address automatically"],
      ["已开通的单月会员按网页支付规则申请退款", "Activated passes follow the web checkout rules"],
      ["退款以支付时的币种与网络退回，链上手续费由付款方承担", "Refunds use the same coin and network; network fees are borne by the payer"],
    ],
    timing: ["1–3 个工作日内发起链上转账", "Sent on-chain within 1–3 business days"],
    cancel: [["数字货币为单月购买，不会自动续费，无需取消", "Crypto passes never auto-renew, so there is nothing to cancel"]],
  },
};

export function RefundGuide({ lang, channel, onSupport }: { lang: Lang; channel?: string; onSupport: () => void }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const m = useMembership();
  const compliance = useCompliance();
  const [tab, setTab] = useState<Channel>(CHANNELS.includes(channel as Channel) ? (channel as Channel) : "appstore");
  const [requested, setRequested] = useSavedState<string[]>("alphapulse.membership.refunds.v1", []);
  const [confirm, setConfirm] = useState<string | null>(null);
  const g = GUIDES[tab];
  const now = Date.now();
  const eligible = m.state.orders.filter(
    (o) => o.status === "paid" && o.method !== "crypto" && now - (o.paidAt ?? o.createdAt) <= WEB_WINDOW_DAYS * DAY,
  );
  const pick = eligible.find((o) => o.id === confirm);

  return (
    <div className="mb-center rf-page">
      <VipHead title={t("退款与取消订阅", "Refunds & cancellation")} onBack={() => (history.length > 1 ? history.back() : goVip(""))} />

      <div className="rf-tabs" role="tablist" aria-label={t("支付渠道", "Payment channel")}>
        {CHANNELS.map((c) => {
          const Icon = GUIDES[c].icon;
          return (
            <button key={c} role="tab" aria-selected={tab === c} onClick={() => setTab(c)}>
              <Icon size={16} />
              {t(...GUIDES[c].name)}
            </button>
          );
        })}
      </div>

      <section className="ui-card rf-card">
        <p className="rf-who">{t(...g.who)}</p>
        <h3>
          <ReceiptText size={16} />
          {t("如何申请退款", "How to request a refund")}
        </h3>
        <ol className="rf-steps">
          {g.steps.map((s, i) => (
            <li key={i}>
              <i>{i + 1}</i>
              <span>{t(...s)}</span>
            </li>
          ))}
        </ol>
        <p className="rf-timing">
          <Clock3 size={14} />
          {t(...g.timing)}
        </p>
        {g.note && <p className="sh-hint">{t(...g.note)}</p>}
      </section>

      <section className="ui-card rf-card">
        <h3>
          <Check size={16} />
          {t("如何取消自动续费", "How to cancel auto-renewal")}
        </h3>
        <ol className="rf-steps">
          {g.cancel.map((s, i) => (
            <li key={i}>
              <i>{i + 1}</i>
              <span>{t(...s)}</span>
            </li>
          ))}
        </ol>
        <p className="sh-hint">
          {t(
            "请在当期到期前至少 24 小时取消；注销账户不会自动取消商店订阅。",
            "Cancel at least 24 hours before the period ends. Deleting your account does not cancel store subscriptions.",
          )}
        </p>
      </section>

      {tab === "web" && (
        <section className="ui-card rf-card">
          <h3>
            <CreditCard size={16} />
            {t("可申请退款的订单", "Orders eligible for a refund")}
          </h3>
          {eligible.length ? (
            <div className="sh-list">
              {eligible.map((o) => {
                const done = requested.includes(o.id);
                return (
                  <div key={o.id}>
                    <div className="sh-li-main">
                      <b>
                        {t(PLANS[o.tier].zh, PLANS[o.tier].en)} · {usd(o.total)}
                      </b>
                      <small>
                        {o.methodLabel} · {fmtTime(o.paidAt ?? o.createdAt)}
                      </small>
                    </div>
                    {done ? (
                      <span className="sh-badge is-info">{t("审核中", "In review")}</span>
                    ) : (
                      <button className="sh-btn sh-btn-sm" onClick={() => setConfirm(o.id)}>
                        {t("申请退款", "Request refund")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-empty">{t(`近 ${WEB_WINDOW_DAYS} 天没有可退款的网页支付订单`, `No web orders in the last ${WEB_WINDOW_DAYS} days`)}</p>
          )}
        </section>
      )}

      <section className="ui-card rf-card rf-help">
        <button onClick={onSupport}>
          <Headphones size={17} />
          <span>
            <b>{t("联系客服协助退款", "Ask support for help")}</b>
            <small>
              {CONTACT.email} · {CONTACT.phone}
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
        <button onClick={() => compliance.openLegal("subscription", "refund")}>
          <FileText size={17} />
          <span>
            <b>{t("会员服务与自动续费协议", "Membership & Auto-renewal Terms")}</b>
            <small>{t("第六条 退款政策与流程", "Section 6 · Refunds")}</small>
          </span>
          <ChevronRight size={15} />
        </button>
      </section>

      {pick && (
        <ConfirmSheet
          title={t("申请退款", "Request a refund")}
          confirm={t("提交申请", "Submit")}
          cancel={t("取消", "Cancel")}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setRequested((old) => [...old, pick.id]);
            setConfirm(null);
          }}
        >
          <p className="mb-confirm-text">
            {t(
              `将为 ${PLANS[pick.tier].zh}（${usd(pick.total)}）提交退款申请。审核通过后款项原路退回，会员权益同步终止。`,
              `Request a refund of ${usd(pick.total)} for ${PLANS[pick.tier].en}. Once approved the money returns to the original method and the plan ends.`,
            )}
          </p>
        </ConfirmSheet>
      )}
    </div>
  );
}
