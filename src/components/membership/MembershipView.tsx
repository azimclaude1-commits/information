import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart2,
  CandlestickChart,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Crown,
  FileText,
  Headphones,
  Lock,
  Minus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmSheet, Sheet, SheetRows } from "../ui/Sheet";
import {
  DAY,
  FEATURE_NAME,
  PAID_TIERS,
  PERIOD_DAYS,
  PLANS,
  TIER_RANK,
  type AiFeature,
  type Order,
  type PaidTier,
  type PayMethod,
  type Tier,
} from "./membershipState";
import {
  QuotaPill,
  TierBadge,
  countdown,
  fmtTime,
  tierName,
  useMembership,
  useNow,
  usePerks,
  usd,
  usdShort,
} from "./Membership";
import {
  AcceptedMarks,
  ApplePayMark,
  ApplePaySheet,
  BrandMark,
  BRAND_NAME,
  CardPaySheet,
  GooglePayMark,
  GooglePaySheet,
  type PayContext,
} from "./PaymentSheets";

type Lang = "zh" | "en";
type Route = { page: "center" | "checkout" | "order" | "orders"; arg?: string };

const parse = (): Route => {
  const [, page, arg] = window.location.hash.slice(1).split("/");
  if (page === "checkout" || page === "order" || page === "orders") return { page, arg };
  return { page: "center" };
};
const go = (path: string, replace = false) => {
  const hash = `#vip${path ? `/${path}` : ""}`;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
};

export function MembershipView({ lang, onSupport }: { lang: Lang; onSupport: () => void }) {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const sync = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <div className="mb-page">
      {route.page === "checkout" ? (
        <Checkout lang={lang} tier={(PAID_TIERS as string[]).includes(route.arg ?? "") ? (route.arg as PaidTier) : "premium"} />
      ) : route.page === "order" ? (
        <OrderDetail lang={lang} id={route.arg ?? ""} onSupport={onSupport} />
      ) : route.page === "orders" ? (
        <Orders lang={lang} />
      ) : (
        <Center lang={lang} onSupport={onSupport} />
      )}
    </div>
  );
}

function SubHead({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
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

const FEATURE_ICON: Record<AiFeature, React.ElementType> = {
  diagnose: ScanLine,
  insight: Sparkles,
  kline: BarChart2,
  signature: CandlestickChart,
};
const FEATURE_ROUTE: Record<AiFeature, string> = {
  diagnose: "#diagnose/diagnosis",
  insight: "#trade",
  kline: "#diagnose/ace",
  signature: "#trade",
};

/* ====================== 会员中心 ====================== */

function Center({ lang, onSupport }: { lang: Lang; onSupport: () => void }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const m = useMembership();
  const now = useNow(1000);
  const perks = usePerks(lang);
  const [confirmOff, setConfirmOff] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const member = m.tier !== "free";
  const daysLeft = member ? Math.max(1, Math.ceil((m.state.expiresAt - now) / DAY)) : 0;
  const counts = (["diagnose", "insight", "kline", "signature"] as AiFeature[]).map((f) => ({
    f,
    n: m.state.records.filter((r) => r.feature === f).length,
  }));
  const ring = 2 * Math.PI * 38;
  const pct = m.limit ? m.left / m.limit : 0;

  return (
    <div className="mb-center">
      <SubHead
        title={t("会员中心", "Membership")}
        onBack={m.goBack}
        right={
          <button className="ui-link" onClick={() => go("orders")}>
            {t("订单记录", "Orders")}
            <ChevronRight size={14} />
          </button>
        }
      />

      <section className={`mb-hero is-${m.tier}`}>
        <div className="mb-hero-main">
          <div className="mb-hero-id">
            <span className={`mb-ava is-${m.tier} is-lg`}>
              <span>AP</span>
              {member && (
                <i>
                  <Crown size={11} strokeWidth={2.6} />
                </i>
              )}
            </span>
            <div>
              <h2>
                GUEST-16bf <TierBadge tier={m.tier} lang={lang} size="md" />
              </h2>
              <p>
                {member
                  ? t(
                      `有效期至 ${fmtTime(m.state.expiresAt, false)} · 剩余 ${daysLeft} 天`,
                      `Valid until ${fmtTime(m.state.expiresAt, false)} · ${daysLeft} days left`,
                    )
                  : t("免费版 · 每日 3 次 AI 分析", "Free · 3 AI analyses a day")}
              </p>
              {member && (
                <p className="mb-hero-renew">
                  {m.state.autoRenew
                    ? t(
                        `连续包月已开启 · ${fmtTime(m.state.expiresAt, false)} 自动续费 ${usd(m.plan.price)}`,
                        `Auto-renews ${fmtTime(m.state.expiresAt, false)} at ${usd(m.plan.price)}`,
                      )
                    : t("已关闭自动续费，到期后恢复免费版", "Auto-renew off — returns to Free after expiry")}
                </p>
              )}
            </div>
          </div>
          <ul className="mb-hero-perks">
            {perks[m.tier].map((p) => (
              <li key={p}>
                <Check size={13} strokeWidth={3} />
                {p}
              </li>
            ))}
          </ul>
          <div className="mb-hero-actions">
            {member ? (
              <>
                <button className="mb-hero-btn is-solid" onClick={() => m.open(`checkout/${m.tier}`)}>
                  {t("续费", "Renew")}
                </button>
                {m.tier !== "elite" && (
                  <button className="mb-hero-btn" onClick={() => m.open(`checkout/${m.tier === "basic" ? "premium" : "elite"}`)}>
                    {t("升级", "Upgrade")}
                  </button>
                )}
              </>
            ) : (
              <button
                className="mb-hero-btn is-gold"
                onClick={() => document.getElementById("mb-plans")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Crown size={15} />
                {t("开通会员 · 低至 $10/月", "Join from $10/mo")}
              </button>
            )}
          </div>
        </div>
        <div className="mb-hero-ring" aria-label={t(`今日剩余 ${m.left} 次`, `${m.left} left today`)}>
          <svg viewBox="0 0 92 92">
            <circle cx="46" cy="46" r="38" className="mb-ring-track" />
            {pct > 0 && (
              <circle
                cx="46"
                cy="46"
                r="38"
                className="mb-ring-fill"
                strokeDasharray={`${ring * pct} ${ring}`}
                transform="rotate(-90 46 46)"
              />
            )}
          </svg>
          <div>
            <b>{m.left}</b>
            <small>/ {m.limit}</small>
          </div>
          <span>{t("今日剩余次数", "Left today")}</span>
          <em>
            <Clock3 size={11} />
            {countdown(m.resetAt - now)} {t("后重置", "to reset")}
          </em>
        </div>
      </section>

      <section className="mb-usage">
        {counts.map(({ f, n }) => {
          const Icon = FEATURE_ICON[f];
          return (
            <button key={f} onClick={() => (window.location.hash = FEATURE_ROUTE[f])}>
              <span className={`mb-usage-ic is-${f}`}>
                <Icon size={17} />
              </span>
              <span>
                <b>{t(...FEATURE_NAME[f])}</b>
                <small>
                  {t("今日已用", "Used today")} {n} {t("次", "")}
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          );
        })}
      </section>

      <section id="mb-plans" className="mb-section">
        <div className="mb-section-head">
          <h2>{t("选择会员方案", "Choose a plan")}</h2>
          <p>{t("按月订阅，AI诊股 · AI分析 · K线分析 · 特色指标共用每日次数", "Monthly. One daily quota shared by all AI features")}</p>
        </div>
        <div className="mb-plans">
          {PAID_TIERS.map((tier) => {
            const current = m.tier === tier;
            const lower = TIER_RANK[tier] < TIER_RANK[m.tier];
            const q = m.quote(tier);
            return (
              <article key={tier} className={`mb-plan is-${tier} ${current ? "is-current" : ""}`}>
                {tier === "premium" && <span className="mb-plan-rec">{t("最受欢迎", "Most popular")}</span>}
                <header>
                  <TierBadge tier={tier} lang={lang} size="md" />
                  <div className="mb-plan-price">
                    <b>{usdShort(PLANS[tier].price)}</b>
                    <span>{t("/月", "/mo")}</span>
                  </div>
                  <p>
                    {t("每日", "")}
                    <strong>{PLANS[tier].daily}</strong>
                    {t(" 次 AI 分析", " AI analyses a day")}
                    <small>
                      ≈ {usd(PLANS[tier].price / (PLANS[tier].daily * PERIOD_DAYS))}
                      {t("/次", "/each")}
                    </small>
                  </p>
                </header>
                <ul>
                  {perks[tier].map((p) => (
                    <li key={p}>
                      <Check size={14} strokeWidth={3} />
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mb-plan-cta ${current ? "is-current" : ""}`}
                  disabled={lower}
                  onClick={() => m.open(`checkout/${tier}`)}
                >
                  {lower
                    ? t("当前方案更高", "Lower than current")
                    : current
                      ? t("续费 30 天", "Renew 30 days")
                      : m.tier === "free"
                        ? t("立即开通", "Get started")
                        : t(`升级 · 补差 ${usd(q?.total ?? 0)}`, `Upgrade · ${usd(q?.total ?? 0)}`)}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mb-grid">
        <section className="ui-card mb-compare">
          <div className="ui-card-head">
            <h2 className="ui-card-title">{t("权益对比", "Compare plans")}</h2>
          </div>
          <div className="mb-compare-scroll">
            <table>
              <thead>
                <tr>
                  <th />
                  {(["free", ...PAID_TIERS] as Tier[]).map((tier) => (
                    <th key={tier} className={m.tier === tier ? "is-current" : ""}>
                      {tierName(tier, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [t("月费", "Price"), ["$0", "$10", "$30", "$99"]],
                    [t("每日 AI 次数", "AI analyses / day"), ["3", "20", "80", "300"]],
                    [t("AI诊股", "AI diagnosis"), [1, 1, 1, 1]],
                    [t("AI分析（解读 / 摘要 / Ace智搜）", "AI analysis (insight, summary, Ace)"), [1, 1, 1, 1]],
                    [t("K线分析", "Chart analysis"), [1, 1, 1, 1]],
                    [t("特色指标三副图", "Signature indicators"), [1, 1, 1, 1]],
                    [t("同品种当日重复查看免费", "Free same-day reopen"), [1, 1, 1, 1]],
                    [t("Ace智搜深度思考", "Ace deep research"), [0, 0, 1, 1]],
                    [t("优先分析通道", "Priority queue"), [0, 0, 1, 1]],
                    [t("专属客服通道", "Dedicated support"), [0, 0, 0, 1]],
                    [t("会员标识", "Badge"), ["—", t("蓝色", "Blue"), t("金色", "Gold"), t("黑金", "Black-gold")]],
                  ] as [string, (string | number)[]][]
                ).map(([label, cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={i} className={m.tier === (["free", ...PAID_TIERS] as Tier[])[i] ? "is-current" : ""}>
                        {c === 1 ? (
                          <Check size={15} strokeWidth={3} className="mb-yes" />
                        ) : c === 0 ? (
                          <Minus size={15} className="mb-no" />
                        ) : (
                          c
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mb-side">
          <section className="ui-card">
            <div className="ui-card-head">
              <h2 className="ui-card-title">{t("今日使用记录", "Today's usage")}</h2>
              <QuotaPill />
            </div>
            {m.state.records.length ? (
              <ul className="mb-records">
                {m.state.records.map((r) => {
                  const Icon = FEATURE_ICON[r.feature];
                  return (
                    <li key={r.id}>
                      <span className={`mb-usage-ic is-${r.feature} is-sm`}>
                        <Icon size={14} />
                      </span>
                      <span>
                        <b>{r.label}</b>
                        <small>{t(...FEATURE_NAME[r.feature])}</small>
                      </span>
                      <time>{fmtTime(r.at).slice(11)}</time>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mb-empty">{t("今天还没有使用 AI 分析", "No AI analyses yet today")}</p>
            )}
          </section>

          <section className="ui-card mb-billing">
            <div className="ui-card-head">
              <h2 className="ui-card-title">{t("订阅与支付", "Billing")}</h2>
            </div>
            <div className="mb-billing-row">
              <span>
                <b>{t("连续包月", "Auto-renew")}</b>
                <small>
                  {member
                    ? m.state.autoRenew
                      ? t(`下次扣款 ${fmtTime(m.state.expiresAt, false)}`, `Next charge ${fmtTime(m.state.expiresAt, false)}`)
                      : t("已关闭", "Off")
                    : t("开通会员后可设置", "Available after joining")}
                </small>
              </span>
              <button
                role="switch"
                aria-checked={member && m.state.autoRenew}
                disabled={!member}
                className="mb-switch"
                onClick={() => (m.state.autoRenew ? setConfirmOff(true) : m.setAutoRenew(true))}
              >
                <i />
              </button>
            </div>
            {m.state.cards.map((c) => (
              <div className="mb-billing-row" key={c.id}>
                <span className="mb-billing-card">
                  <BrandMark brand={c.brand} />
                  <span>
                    <b>
                      {BRAND_NAME[c.brand]} •••• {c.last4}
                    </b>
                    <small>
                      {t("有效期", "Exp.")} {c.exp}
                    </small>
                  </span>
                </span>
                <button className="ui-icon-btn" aria-label={t("删除卡片", "Remove card")} onClick={() => m.removeCard(c.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button className="mb-billing-row is-link" onClick={() => go("orders")}>
              <span>
                <b>{t("订单记录与电子收据", "Orders & receipts")}</b>
                <small>
                  {m.state.orders.length} {t("笔订单", "orders")}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button className="mb-billing-row is-link" onClick={onSupport}>
              <span>
                <b>{m.tier === "elite" ? t("至尊专属客服", "Elite support line") : t("会员客服", "Member support")}</b>
                <small>{m.tier === "elite" ? t("优先接入 · 7×24 小时", "Priority · 24/7") : t("会员与支付问题", "Plans and payments")}</small>
              </span>
              <Headphones size={16} />
            </button>
          </section>
        </div>
      </div>

      <section className="ui-card mb-faq">
        <div className="ui-card-head">
          <h2 className="ui-card-title">{t("常见问题", "FAQ")}</h2>
        </div>
        {(
          [
            [
              t("次数怎么计算？", "How are analyses counted?"),
              t(
                "生成一次 AI诊股报告、交易台 AI 解读、资讯 AI 摘要、Ace智搜提问、K线分析或特色指标分析各计 1 次，所有功能共用每日次数。",
                "Each diagnosis report, desk insight, news summary, Ace question, chart reading or indicator analysis counts once against one shared daily quota.",
              ),
            ],
            [
              t("重复查看会扣次数吗？", "Does reopening cost an analysis?"),
              t(
                "同一品种（特色指标为同一品种同一周期）当天再次打开不扣次数；点击「重新生成」或继续提问会重新计算。",
                "Reopening the same symbol (and period, for indicators) on the same day is free. Regenerating or asking again counts.",
              ),
            ],
            [
              t("次数什么时候重置？", "When does the quota reset?"),
              t("每天 00:00（北京时间）重置，当天未用完的次数不累计。", "Daily at 00:00 Beijing time. Unused analyses don't roll over."),
            ],
            [
              t("升级怎么计费？", "How are upgrades billed?"),
              t(
                "升级立即生效并重新计算 30 天有效期，原会员剩余天数按比例折抵；同档续费从当前到期日顺延 30 天。会员期内不支持降级。",
                "Upgrades start a new 30-day period immediately and credit the unused part of your plan. Renewals extend from the current expiry. Downgrades wait until expiry.",
              ),
            ],
            [
              t("如何取消自动续费？", "How do I cancel auto-renew?"),
              t("在本页关闭「连续包月」即可，当期权益保留至到期日。", "Turn off auto-renew on this page. Your plan stays active until it expires."),
            ],
          ] as [string, string][]
        ).map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <footer className="mb-foot">
        <div>
          <span>{t("支持的支付方式", "Accepted payments")}</span>
          <AcceptedMarks />
        </div>
        <button className="mb-link" onClick={() => setConfirmReset(true)}>
          <RefreshCw size={12} />
          {t("重置会员演示数据", "Reset membership demo")}
        </button>
      </footer>

      {confirmOff && (
        <ConfirmSheet
          title={t("关闭连续包月？", "Turn off auto-renew?")}
          confirm={t("确认关闭", "Turn off")}
          cancel={t("保留", "Keep")}
          danger
          onClose={() => setConfirmOff(false)}
          onConfirm={() => {
            m.setAutoRenew(false);
            setConfirmOff(false);
          }}
        >
          <p className="mb-confirm-text">
            {t(
              `关闭后 ${fmtTime(m.state.expiresAt, false)} 到期时不再扣款，当期${m.plan.zh}权益不受影响，到期后恢复为免费版（每日 3 次）。`,
              `You won't be charged on ${fmtTime(m.state.expiresAt, false)}. ${m.plan.en} stays active until then, then returns to Free (3 a day).`,
            )}
          </p>
        </ConfirmSheet>
      )}
      {confirmReset && (
        <ConfirmSheet
          title={t("重置会员演示数据？", "Reset membership demo?")}
          confirm={t("重置", "Reset")}
          cancel={t("取消", "Cancel")}
          danger
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            m.resetDemo();
            setConfirmReset(false);
          }}
        >
          <p className="mb-confirm-text">
            {t(
              "将恢复为免费版并清空今日次数、订单记录和已保存的卡片，模拟交易账户不受影响。",
              "Returns to Free and clears today's usage, orders and saved cards. The demo trading account is not affected.",
            )}
          </p>
        </ConfirmSheet>
      )}
    </div>
  );
}

/* ====================== 收银台 ====================== */

const METHODS: { id: PayMethod; zh: string; en: string }[] = [
  { id: "apple", zh: "Apple Pay", en: "Apple Pay" },
  { id: "google", zh: "Google Pay", en: "Google Pay" },
  { id: "card", zh: "信用卡 / 借记卡", en: "Credit / debit card" },
];

function Checkout({ lang, tier: initial }: { lang: Lang; tier: PaidTier }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const m = useMembership();
  const perks = usePerks(lang);
  const [tier, setTier] = useState<PaidTier>(initial);
  useEffect(() => setTier(initial), [initial]);
  const [method, setMethod] = useState<PayMethod>(() =>
    /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? "apple" : /Android/.test(navigator.userAgent) ? "google" : "card",
  );
  const [autoRenew, setAutoRenew] = useState(true);
  const [agree, setAgree] = useState(false);
  const [terms, setTerms] = useState<"read" | "pay" | null>(null);
  const [sheet, setSheet] = useState<PayMethod | null>(null);
  const q = m.quote(tier);
  const plan = PLANS[tier];

  const ctx: PayContext | null = q && {
    lang,
    item: `AlphaPulse ${t(plan.zh, plan.en)} · ${t("1 个月", "1 month")}`,
    price: q.price,
    credit: q.credit,
    total: q.total,
    renewAt: autoRenew ? q.periodEnd : undefined,
  };

  const finish = (methodLabel: string, failReason?: Order["failReason"]) => {
    const order = m.checkout({ tier, method: sheet ?? method, methodLabel, autoRenew, failReason });
    setSheet(null);
    if (order) go(`order/${order.id}`, true);
  };
  const pay = () => {
    if (!q) return;
    if (!agree) {
      setTerms("pay");
      return;
    }
    setSheet(method);
  };

  const kindLabel = q
    ? q.kind === "new"
      ? t("新开通", "New")
      : q.kind === "renew"
        ? t("续费", "Renewal")
        : t("升级", "Upgrade")
    : "";

  return (
    <div className="mb-checkout">
      <SubHead title={t("确认订单", "Checkout")} onBack={() => (history.length > 1 ? history.back() : go(""))} />
      <div className="mb-co-grid">
        <div className="mb-co-main">
          <section className={`mb-co-plan is-${tier}`}>
            <div className="mb-co-plan-top">
              <TierBadge tier={tier} lang={lang} size="md" />
              {q && <span className="mb-co-kind">{kindLabel}</span>}
            </div>
            <h2>
              {usdShort(plan.price)}
              <small>{t(" / 月", " / month")}</small>
            </h2>
            <p>{t(`每日 ${plan.daily} 次 AI 分析`, `${plan.daily} AI analyses a day`)}</p>
            <ul>
              {perks[tier].slice(1).map((p) => (
                <li key={p}>
                  <Check size={12} strokeWidth={3} />
                  {p}
                </li>
              ))}
            </ul>
            {q && (
              <div className="mb-co-period">
                <Clock3 size={13} />
                {t("有效期", "Period")} {fmtTime(q.periodStart, false)} — {fmtTime(q.periodEnd, false)}
              </div>
            )}
          </section>

          <section className="ui-card mb-co-card">
            <h3>{t("会员方案", "Plan")}</h3>
            <div className="mb-co-tiers" role="radiogroup">
              {PAID_TIERS.map((tt) => {
                const disabled = TIER_RANK[tt] < TIER_RANK[m.tier];
                return (
                  <button
                    key={tt}
                    role="radio"
                    aria-checked={tier === tt}
                    disabled={disabled}
                    onClick={() => go(`checkout/${tt}`, true)}
                    className={`is-${tt}`}
                  >
                    <b>{tierName(tt, lang)}</b>
                    <span>
                      {usdShort(PLANS[tt].price)}
                      {t("/月", "/mo")}
                    </span>
                    <small>
                      {PLANS[tt].daily}
                      {t(" 次/天", "/day")}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className="mb-billing-row is-flat">
              <span>
                <b>{t("连续包月", "Auto-renew monthly")}</b>
                <small>
                  {autoRenew
                    ? t(
                        `到期自动续费 ${usd(plan.price)}，可随时在会员中心关闭`,
                        `Renews at ${usd(plan.price)}; cancel any time`,
                      )
                    : t("仅购买 1 个月，到期不自动扣款", "One month only, no automatic charge")}
                </small>
              </span>
              <button role="switch" aria-checked={autoRenew} className="mb-switch" onClick={() => setAutoRenew(!autoRenew)}>
                <i />
              </button>
            </div>
          </section>

          <section className="ui-card mb-co-card">
            <h3>{t("支付方式", "Payment method")}</h3>
            <div className="mb-co-methods" role="radiogroup">
              {METHODS.map((pm) => (
                <button key={pm.id} role="radio" aria-checked={method === pm.id} onClick={() => setMethod(pm.id)}>
                  <span className={`mb-co-mlogo is-${pm.id}`}>
                    {pm.id === "apple" ? (
                      <ApplePayMark size={14} />
                    ) : pm.id === "google" ? (
                      <GooglePayMark size={14} />
                    ) : (
                      <CreditCard size={18} />
                    )}
                  </span>
                  <span className="mb-co-mtext">
                    <b>{t(pm.zh, pm.en)}</b>
                    <small>
                      {pm.id === "apple"
                        ? t("Face ID / 触控 ID 一键支付", "Face ID or Touch ID")
                        : pm.id === "google"
                          ? t("使用 Google 账户中的卡片", "Cards saved to your Google account")
                          : m.state.cards[0]
                            ? t(
                                `已保存 ${BRAND_NAME[m.state.cards[0].brand]} •••• ${m.state.cards[0].last4}`,
                                `Saved ${BRAND_NAME[m.state.cards[0].brand]} •••• ${m.state.cards[0].last4}`,
                              )
                            : "Visa · Mastercard · AMEX · JCB · 银联"}
                    </small>
                  </span>
                  {pm.id === "card" && (
                    <span className="mb-co-brands">
                      <BrandMark brand="visa" />
                      <BrandMark brand="mastercard" />
                    </span>
                  )}
                  <i className="mb-radio" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="mb-co-side">
          <section className="ui-card mb-co-card mb-co-summary">
            <h3>{t("费用明细", "Summary")}</h3>
            {q ? (
              <>
                <SheetRows
                  rows={[
                    [`${t(plan.zh, plan.en)} · ${t("1 个月", "1 month")}`, usd(q.price)],
                    ...(q.credit > 0
                      ? ([[t(`原会员剩余 ${q.creditDays} 天折抵`, `Credit for ${q.creditDays} unused days`), `−${usd(q.credit)}`, "up"]] as [string, string, string][])
                      : []),
                    [t("税费", "Tax"), t("已含", "Included")],
                  ]}
                />
                <div className="mb-co-total">
                  <span>{t("应付金额", "Total due")}</span>
                  <b>{usd(q.total)}</b>
                </div>
                <label className="mb-co-agree">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>
                    {t("我已阅读并同意", "I agree to the")}
                    <button onClick={() => setTerms("read")}>{t("《会员服务协议》", "Membership Terms")}</button>
                    {autoRenew && (
                      <>
                        {t("和", " and ")}
                        <button onClick={() => setTerms("read")}>{t("《自动续费规则》", "Auto-renew Rules")}</button>
                      </>
                    )}
                  </span>
                </label>
                <PayButton lang={lang} method={method} total={q.total} onClick={pay} />
                <p className="mb-co-secure">
                  <ShieldCheck size={13} />
                  {t("模拟支付环境 · 不会产生真实扣款", "Sandbox checkout · no real charge")}
                </p>
              </>
            ) : (
              <p className="mb-empty">
                {t("会员期内不支持降级，可在当前会员到期后重新选择。", "Downgrades are available after your current plan expires.")}
              </p>
            )}
          </section>
        </aside>
      </div>

      {q && (
        <div className="mb-co-bar">
          <div>
            <small>{t("应付", "Total")}</small>
            <b>{usd(q.total)}</b>
          </div>
          <PayButton lang={lang} method={method} total={q.total} onClick={pay} />
        </div>
      )}

      {terms && (
        <Sheet
          title={t("会员服务协议", "Membership terms")}
          onClose={() => setTerms(null)}
          size="md"
          footer={
            <>
              <button className="sh-btn" onClick={() => setTerms(null)}>
                {t("关闭", "Close")}
              </button>
              <button
                className="sh-btn sh-btn-primary"
                onClick={() => {
                  setAgree(true);
                  const thenPay = terms === "pay";
                  setTerms(null);
                  if (thenPay) setSheet(method);
                }}
              >
                {terms === "pay" ? t("同意并支付", "Agree and pay") : t("同意", "Agree")}
              </button>
            </>
          }
        >
          <ol className="mb-terms">
            <li>{t("会员权益自支付成功起生效，每期 30 天。", "Membership starts when payment succeeds and lasts 30 days per period.")}</li>
            <li>
              {t(
                "连续包月会在到期日自动扣取下一期费用；可随时在会员中心关闭，关闭后当期权益保留至到期日。",
                "Auto-renew charges the next period on the expiry date. Turn it off any time; the current period stays active.",
              )}
            </li>
            <li>
              {t(
                "AI 分析次数每日 00:00（北京时间）重置，当日未使用的次数不累计、不退款。",
                "AI analyses reset daily at 00:00 Beijing time and don't roll over or refund.",
              )}
            </li>
            <li>
              {t(
                "升级立即生效，原会员剩余天数按比例折抵；会员期内不支持降级。",
                "Upgrades apply immediately with credit for unused days. Downgrades wait until expiry.",
              )}
            </li>
            <li>
              {t(
                "AI 分析结果基于模型与行情数据生成，仅供参考，不构成任何投资建议。",
                "AI results are generated from models and market data, for reference only, not investment advice.",
              )}
            </li>
          </ol>
        </Sheet>
      )}

      {sheet === "apple" && ctx && <ApplePaySheet ctx={ctx} onCancel={() => setSheet(null)} onPaid={(label) => finish(label)} />}
      {sheet === "google" && ctx && <GooglePaySheet ctx={ctx} onCancel={() => setSheet(null)} onPaid={(label) => finish(label)} />}
      {sheet === "card" && ctx && (
        <CardPaySheet
          ctx={ctx}
          saved={m.state.cards}
          autoRenew={autoRenew}
          onCancel={() => setSheet(null)}
          onResult={(r) => {
            if (r.save) m.saveCard(r.save);
            finish(`${t("银行卡", "Card")} · ${r.label}`, r.outcome === "success" ? undefined : r.outcome);
          }}
        />
      )}
    </div>
  );
}

function PayButton({ lang, method, total, onClick }: { lang: Lang; method: PayMethod; total: number; onClick: () => void }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  if (method === "apple")
    return (
      <button className="mb-pay is-apple" onClick={onClick} aria-label={t(`使用 Apple Pay 支付 ${usd(total)}`, `Pay ${usd(total)} with Apple Pay`)}>
        <ApplePayMark size={19} />
      </button>
    );
  if (method === "google")
    return (
      <button className="mb-pay is-google" onClick={onClick} aria-label={t(`使用 Google Pay 支付 ${usd(total)}`, `Pay ${usd(total)} with Google Pay`)}>
        <span>{t("使用", "Buy with")}</span>
        <GooglePayMark size={17} />
        <span>{t("支付", "")}</span>
      </button>
    );
  return (
    <button className="mb-pay is-card" onClick={onClick}>
      <Lock size={15} />
      {t(`支付 ${usd(total)}`, `Pay ${usd(total)}`)}
    </button>
  );
}

/* ====================== 支付详情 ====================== */

const FAIL_TEXT: Record<NonNullable<Order["failReason"]>, [string, string, string, string]> = {
  card_declined: ["发卡行拒绝了本次交易", "The card issuer declined this payment", "请更换卡片或使用 Apple Pay / Google Pay 支付。", "Try another card, Apple Pay or Google Pay."],
  insufficient_funds: ["卡内可用余额不足", "Insufficient funds on the card", "请确认卡片额度后重试，或更换支付方式。", "Check the card balance or use another method."],
  "3ds_failed": ["银行安全验证未通过", "Bank verification was not completed", "请重新支付并在银行页面完成短信验证。", "Pay again and complete the bank's SMS check."],
};

function OrderDetail({ lang, id, onSupport }: { lang: Lang; id: string; onSupport: () => void }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const m = useMembership();
  const order = m.state.orders.find((o) => o.id === id);
  const now = useNow(order?.status === "processing" ? 150 : 60_000);
  const [receipt, setReceipt] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!order)
    return (
      <div className="mb-order">
        <SubHead title={t("支付详情", "Payment details")} onBack={() => go("")} />
        <p className="mb-empty">{t("没有找到这笔订单", "Order not found")}</p>
      </div>
    );
  const plan = PLANS[order.tier];
  const elapsed = now - order.createdAt;
  const step =
    order.status === "paid" ? 4 : order.status === "failed" ? 2 : elapsed > 1600 ? 3 : elapsed > 700 ? 2 : 1;
  const steps = [t("提交订单", "Order placed"), t("支付授权", "Authorised"), t("扣款确认", "Charged"), t("权益开通", "Activated")];
  const fail = order.failReason ? FAIL_TEXT[order.failReason] : null;
  const copy = () => {
    navigator.clipboard?.writeText(order.id).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const kind = order.kind === "new" ? t("新开通", "New") : order.kind === "renew" ? t("续费", "Renewal") : t("升级", "Upgrade");

  return (
    <div className="mb-order">
      <SubHead
        title={t("支付详情", "Payment details")}
        onBack={() => go("orders")}
        right={
          <button className="ui-link" onClick={() => go("orders")}>
            {t("订单记录", "Orders")}
          </button>
        }
      />
      <section className={`ui-card mb-od-hero is-${order.status}`}>
        <span className="mb-od-icon">
          {order.status === "processing" ? (
            <span className="mb-spin is-lg" />
          ) : order.status === "paid" ? (
            <Check size={30} strokeWidth={3} />
          ) : (
            <X size={30} strokeWidth={3} />
          )}
        </span>
        <h2>
          {order.status === "processing"
            ? t("支付处理中", "Processing payment")
            : order.status === "paid"
              ? t("支付成功", "Payment successful")
              : t("支付失败", "Payment failed")}
        </h2>
        <strong>{usd(order.total)}</strong>
        <p>
          {order.status === "failed" && fail
            ? `${t(fail[0], fail[1])} · ${t("未扣款", "not charged")}`
            : `AlphaPulse ${t(plan.zh, plan.en)} · ${t("1 个月", "1 month")} · ${kind}`}
        </p>
        <ol className={`rd-steps mb-od-steps ${order.status === "failed" ? "is-failed" : ""}`}>
          {steps.map((s, i) => (
            <li key={s} className={i < step ? "is-on" : ""}>
              <i />
              {order.status === "failed" && i === 1 ? t("授权失败", "Declined") : s}
            </li>
          ))}
        </ol>
      </section>

      {order.status === "paid" && (
        <section className={`mb-od-active is-${order.tier}`}>
          <div>
            <TierBadge tier={order.tier} lang={lang} size="md" />
            <b>{t("会员权益已生效", "Membership is active")}</b>
            <span>
              {t(
                `今日可用 ${plan.daily} 次 AI 分析，已用 ${m.used} 次`,
                `${plan.daily} analyses today, ${m.used} used`,
              )}
            </span>
          </div>
          <button onClick={m.goBack}>
            {t("返回继续分析", "Back to analysis")}
            <ChevronRight size={15} />
          </button>
        </section>
      )}
      {order.status === "failed" && fail && (
        <div className="sh-note is-danger mb-od-note">
          <X size={15} />
          <span>{t(fail[2], fail[3])}</span>
        </div>
      )}

      <section className="ui-card mb-co-card">
        <h3>{t("订单信息", "Order")}</h3>
        <SheetRows
          rows={[
            [
              t("订单号", "Order ID"),
              <span className="rd-copy" key="id">
                {order.id}
                <button onClick={copy} aria-label={t("复制订单号", "Copy order ID")}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </span>,
              "mono",
            ],
            [t("商品", "Item"), `${t(plan.zh, plan.en)} · ${t("1 个月", "1 month")}`],
            [t("订单类型", "Type"), kind],
            [t("支付方式", "Method"), order.methodLabel],
            [t("下单时间", "Created"), fmtTime(order.createdAt)],
            ...(order.paidAt ? ([[t("支付时间", "Paid"), fmtTime(order.paidAt)]] as [string, string][]) : []),
            [t("交易流水号", "Transaction"), order.status === "failed" ? "—" : order.txn, "mono"],
            [
              t("会员有效期", "Period"),
              `${fmtTime(order.periodStart, false)} — ${fmtTime(order.periodEnd, false)}`,
            ],
            [
              t("自动续费", "Auto-renew"),
              order.autoRenew
                ? t(`已开启 · ${fmtTime(order.periodEnd, false)} 续费 ${usd(order.price)}`, `On · ${usd(order.price)} on ${fmtTime(order.periodEnd, false)}`)
                : t("未开启", "Off"),
            ],
          ]}
        />
      </section>

      <section className="ui-card mb-co-card">
        <h3>{t("费用明细", "Amount")}</h3>
        <SheetRows
          rows={[
            [t("会员费", "Plan"), usd(order.price)],
            ...(order.credit > 0 ? ([[t("原会员折抵", "Credit"), `−${usd(order.credit)}`, "up"]] as [string, string, string][]) : []),
            [t("税费", "Tax"), t("已含", "Included")],
            [order.status === "failed" ? t("应付", "Due") : t("实付", "Paid"), usd(order.total)],
          ]}
        />
      </section>

      <div className="mb-od-actions">
        {order.status === "failed" ? (
          <>
            <button className="sh-btn" onClick={() => go(`checkout/${order.tier}`)}>
              {t("更换支付方式", "Change method")}
            </button>
            <button className="sh-btn sh-btn-primary" onClick={() => go(`checkout/${order.tier}`)}>
              <RefreshCw size={16} />
              {t("重新支付", "Try again")}
            </button>
          </>
        ) : (
          <>
            <button className="sh-btn" disabled={order.status !== "paid"} onClick={() => setReceipt(true)}>
              <FileText size={16} />
              {t("电子收据", "Receipt")}
            </button>
            <button className="sh-btn sh-btn-primary" disabled={order.status !== "paid"} onClick={() => go("")}>
              <Crown size={16} />
              {t("会员中心", "Membership")}
            </button>
          </>
        )}
      </div>
      <p className="mb-od-help">
        <button className="mb-link" onClick={onSupport}>
          <Headphones size={13} />
          {t("支付遇到问题？联系客服", "Payment issue? Contact support")}
        </button>
        <span>{t("模拟支付环境 · 不会产生真实扣款", "Sandbox · no real charge")}</span>
      </p>

      {receipt && (
        <Sheet title={t("电子收据", "Receipt")} subtitle={order.id} size="sm" onClose={() => setReceipt(false)}>
          <div className="mb-receipt">
            <header>
              <b>AlphaPulse</b>
              <span>{t("会员订阅收据", "Subscription receipt")}</span>
            </header>
            <SheetRows
              rows={[
                [t("收据编号", "Receipt"), `R-${order.id.slice(3)}`, "mono"],
                [t("开具日期", "Date"), fmtTime(order.paidAt ?? order.createdAt, false)],
                [t("项目", "Item"), `${t(plan.zh, plan.en)} × 1 ${t("个月", "month")}`],
                [t("服务期间", "Service period"), `${fmtTime(order.periodStart, false)} — ${fmtTime(order.periodEnd, false)}`],
                [t("小计", "Subtotal"), usd(order.price)],
                ...(order.credit > 0 ? ([[t("折抵", "Credit"), `−${usd(order.credit)}`]] as [string, string][]) : []),
                [t("合计（含税）", "Total (tax incl.)"), usd(order.total)],
                [t("支付方式", "Paid with"), order.methodLabel],
              ]}
            />
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ====================== 订单记录 ====================== */

function Orders({ lang }: { lang: Lang }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const m = useMembership();
  return (
    <div className="mb-orders">
      <SubHead title={t("订单记录", "Orders")} onBack={() => go("")} />
      {m.state.orders.length ? (
        <ul className="mb-order-list">
          {m.state.orders.map((o) => (
            <li key={o.id}>
              <button onClick={() => go(`order/${o.id}`)}>
                <TierBadge tier={o.tier} lang={lang} />
                <span className="mb-ol-main">
                  <b>
                    {t(PLANS[o.tier].zh, PLANS[o.tier].en)} · {o.kind === "new" ? t("新开通", "New") : o.kind === "renew" ? t("续费", "Renewal") : t("升级", "Upgrade")}
                  </b>
                  <small>
                    {fmtTime(o.createdAt)} · {o.methodLabel}
                  </small>
                </span>
                <span className="mb-ol-end">
                  <b>{usd(o.total)}</b>
                  <em className={`is-${o.status}`}>
                    {o.status === "paid" ? t("已支付", "Paid") : o.status === "failed" ? t("支付失败", "Failed") : t("处理中", "Processing")}
                  </em>
                </span>
                <ChevronRight size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-card mb-orders-empty">
          <Crown size={26} />
          <b>{t("还没有订单", "No orders yet")}</b>
          <span>{t("开通会员后，订单和电子收据会显示在这里", "Orders and receipts appear here after you subscribe")}</span>
          <button className="sh-btn sh-btn-primary sh-btn-sm" onClick={() => go("")}>
            {t("查看会员方案", "See plans")}
          </button>
        </div>
      )}
    </div>
  );
}
