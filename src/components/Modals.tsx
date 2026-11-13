import React, { useMemo, useState } from "react";
import {
  CalendarCheck2,
  Check,
  ChevronRight,
  FileText,
  Gift,
  MessageSquareText,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { CHECK_IN_REWARD_USDT, STREAK_BONUS_USDT } from "./demoTrading";
import { useCompliance } from "./compliance/Compliance";
import { useSavedState } from "./marketModel";
import { Sheet } from "./ui/Sheet";
import "./rewards.css";

type Lang = "zh" | "en";
interface Feedback {
  id: string;
  kind: string;
  text: string;
  at: number;
}
interface RewardState {
  days: string[];
  rating?: { stars: number; tags: string[]; text: string; at: number };
  ratingClaimed: boolean;
  feedback: Feedback[];
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
const seed = (): RewardState => ({
  days: [shift(-3), shift(-2), shift(-1)],
  ratingClaimed: false,
  feedback: [],
});
/** Consecutive days ending today (or yesterday, when today is not signed yet) */
const streakOf = (days: string[]) => {
  const set = new Set(days);
  let n = 0,
    i = set.has(shift(0)) ? 0 : -1;
  while (set.has(shift(i - n))) n++;
  return n;
};
const rewardFor = (day: number) =>
  CHECK_IN_REWARD_USDT + (day === 7 ? STREAK_BONUS_USDT : 0);

const TAGS: [string, string][] = [
  ["行情刷新快", "Fast quotes"],
  ["界面清晰", "Clean UI"],
  ["下单方便", "Easy ordering"],
  ["AI 诊股有用", "Useful AI"],
  ["直播内容好", "Good streams"],
  ["指标丰富", "Rich indicators"],
];
const LOW_TAGS: [string, string][] = [
  ["行情卡顿", "Laggy quotes"],
  ["操作复杂", "Hard to use"],
  ["功能缺失", "Missing features"],
  ["数据不准", "Inaccurate data"],
  ["页面报错", "Errors"],
];
const KINDS: [string, string][] = [
  ["功能建议", "Suggestion"],
  ["问题反馈", "Bug report"],
  ["行情数据", "Market data"],
  ["其他", "Other"],
];

/**
 * 签到与奖励: daily check-in streak with published rules, plus an in-app experience rating and feedback.
 * Ratings are never rewarded and never mention an app store (stores forbid incentivised reviews).
 */
export const CheckInAndRateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  rewardBalance: number;
  onWithdraw: () => void;
  onClaimReward: (amount: number, note: string) => void;
}> = ({ isOpen, ...props }) => (isOpen ? <RewardsSheet {...props} /> : null);

function RewardsSheet({
  onClose,
  lang,
  rewardBalance,
  onWithdraw,
  onClaimReward,
}: {
  onClose: () => void;
  lang: Lang;
  rewardBalance: number;
  onWithdraw: () => void;
  onClaimReward: (amount: number, note: string) => void;
}) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const compliance = useCompliance();
  const [state, setState] = useSavedState<RewardState>(
    "alphapulse.rewards.v1",
    seed(),
  );
  const [view, setView] = useState<"home" | "rate" | "feedback">("home");
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [kind, setKind] = useState(KINDS[0][0]);
  const [fbText, setFbText] = useState("");
  const [justSigned, setJustSigned] = useState(false);

  const today = shift(0);
  const signed = state.days.includes(today);
  const streak = streakOf(state.days);
  // Position inside the current 7-day cycle; today's slot is the next one when not signed yet
  const cycleDone = signed ? ((streak - 1) % 7) + 1 : streak % 7;
  const todayDay = signed ? cycleDone : cycleDone + 1;
  const monthDays = useMemo(() => {
    const now = new Date(),
      first = new Date(now.getFullYear(), now.getMonth(), 1),
      total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      pad: first.getDay(),
      days: Array.from({ length: total }, (_, i) =>
        dayKey(new Date(now.getFullYear(), now.getMonth(), i + 1)),
      ),
      label: t(
        `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`,
        now.toLocaleString("en-US", { month: "long", year: "numeric" }),
      ),
    };
  }, [lang]);
  const monthCount = monthDays.days.filter((d) => state.days.includes(d)).length;

  const signIn = () => {
    if (signed) return;
    const amount = rewardFor(todayDay);
    setState((s) => ({ ...s, days: [...s.days, today].slice(-120) }));
    setJustSigned(true);
    onClaimReward(
      amount,
      todayDay === 7 ? "连续签到 7 天奖励" : `每日签到 · 第 ${todayDay} 天`,
    );
  };
  const tagList = stars && stars <= 3 ? LOW_TAGS : TAGS;

  if (view === "rate")
    return (
      <Sheet
        title={t("产品体验评价", "Rate your experience")}
        subtitle={t(
          "评价仅用于改进产品，提交后不会获得任何奖励",
          "Your rating helps us improve. It is not rewarded.",
        )}
        onBack={() => setView("home")}
        onClose={onClose}
        footer={
          <button
            className="sh-btn sh-btn-primary"
            disabled={!stars}
            onClick={() => {
              setState((s) => ({
                ...s,
                rating: { stars, tags, text: text.trim(), at: Date.now() },
              }));
              setView("home");
            }}
          >
            {t("提交评价", "Submit")}
          </button>
        }
      >
        <div className="rw-stars" role="radiogroup" aria-label={t("评分", "Rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n}`}
              onClick={() => {
                setStars(n);
                setTags([]);
              }}
            >
              <Star size={34} className={n <= stars ? "is-on" : ""} />
            </button>
          ))}
        </div>
        <p className="rw-star-label">
          {stars
            ? t(
                ["", "很不满意", "不满意", "一般", "满意", "非常满意"][stars],
                ["", "Very poor", "Poor", "Okay", "Good", "Excellent"][stars],
              )
            : t("点击星星评分", "Tap a star to rate")}
        </p>
        {!!stars && (
          <>
            <div className="sh-section">
              <h3>
                {stars <= 3
                  ? t("哪些方面需要改进？", "What should we improve?")
                  : t("你最喜欢哪些方面？", "What do you like?")}
              </h3>
              <div className="sh-chips">
                {tagList.map(([zh, en]) => (
                  <button
                    key={zh}
                    aria-pressed={tags.includes(zh)}
                    onClick={() =>
                      setTags((old) =>
                        old.includes(zh) ? old.filter((x) => x !== zh) : [...old, zh],
                      )
                    }
                  >
                    {t(zh, en)}
                  </button>
                ))}
              </div>
            </div>
            <label className="sh-field">
              <span>
                {t("补充说明", "Comments")} <em>{text.length}/200</em>
              </span>
              <textarea
                className="sh-input"
                rows={3}
                maxLength={200}
                value={text}
                placeholder={t(
                  "选填：说说行情速度、画线工具或点差的体验…",
                  "Optional: quotes, drawing tools, spreads…",
                )}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
          </>
        )}
      </Sheet>
    );

  if (view === "feedback")
    return (
      <Sheet
        title={t("意见反馈", "Feedback")}
        subtitle={t("产品团队会在 1–3 个工作日内回复", "We reply within 1–3 business days")}
        onBack={() => setView("home")}
        onClose={onClose}
        footer={
          <button
            className="sh-btn sh-btn-primary"
            disabled={fbText.trim().length < 5}
            onClick={() => {
              setState((s) => ({
                ...s,
                feedback: [
                  { id: `FB${Date.now().toString().slice(-8)}`, kind, text: fbText.trim(), at: Date.now() },
                  ...s.feedback,
                ],
              }));
              setFbText("");
              setView("home");
            }}
          >
            {t("提交反馈", "Send feedback")}
          </button>
        }
      >
        <div className="sh-section" style={{ marginTop: 6 }}>
          <h3>{t("反馈类型", "Type")}</h3>
          <div className="sh-chips">
            {KINDS.map(([zh, en]) => (
              <button key={zh} aria-pressed={kind === zh} onClick={() => setKind(zh)}>
                {t(zh, en)}
              </button>
            ))}
          </div>
        </div>
        <label className="sh-field">
          <span>
            {t("问题描述", "Details")} <em>{fbText.length}/500</em>
          </span>
          <textarea
            className="sh-input"
            rows={5}
            maxLength={500}
            value={fbText}
            placeholder={t("请描述你遇到的问题或建议（至少 5 个字）", "Describe the issue or idea (min. 5 characters)")}
            onChange={(e) => setFbText(e.target.value)}
          />
        </label>
        {!!state.feedback.length && (
          <div className="sh-section">
            <h3>{t("我的反馈", "My feedback")}</h3>
            <div className="sh-list">
              {state.feedback.map((f) => (
                <div key={f.id}>
                  <div className="sh-li-main">
                    <b>{f.text}</b>
                    <small>
                      {f.kind} · {new Date(f.at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { hour12: false })}
                    </small>
                  </div>
                  <span className="sh-badge is-info">{t("处理中", "In review")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    );

  return (
    <Sheet title={t("签到与奖励", "Rewards")} onClose={onClose} size="md">
      <section className="rw-hero">
        <div className="rw-hero-top">
          <div>
            <small>{t("已连续签到", "Current streak")}</small>
            <strong>
              {streak}
              <em>{t("天", streak === 1 ? "day" : "days")}</em>
            </strong>
          </div>
          <button className="rw-balance" onClick={onWithdraw}>
            <Wallet size={14} />
            {t("奖励账户", "Rewards")} {rewardBalance.toFixed(2)} USDT
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="rw-week">
          {Array.from({ length: 7 }, (_, i) => {
            const day = i + 1,
              done = day <= cycleDone,
              isToday = !signed && day === todayDay;
            return (
              <div
                key={day}
                className={`${done ? "is-done" : ""} ${isToday ? "is-today" : ""} ${day === 7 ? "is-gift" : ""}`}
              >
                <span>{done ? <Check size={15} strokeWidth={3} /> : day === 7 ? <Gift size={16} /> : `+${rewardFor(day)}`}</span>
                <small>
                  {isToday ? t("今天", "Today") : t(`第${day}天`, `Day ${day}`)}
                </small>
              </div>
            );
          })}
        </div>
        <button className="rw-sign" disabled={signed} onClick={signIn}>
          {signed ? (
            <>
              <Check size={17} />
              {justSigned
                ? t(`签到成功 +${rewardFor(todayDay)} USDT`, `Signed +${rewardFor(todayDay)} USDT`)
                : t("今日已签到", "Checked in today")}
            </>
          ) : (
            <>
              <CalendarCheck2 size={17} />
              {t(`签到领 ${rewardFor(todayDay)} USDT`, `Check in · ${rewardFor(todayDay)} USDT`)}
            </>
          )}
        </button>
        <p className="rw-hero-tip">
          {signed
            ? t(
                `明日签到可领 ${rewardFor((todayDay % 7) + 1)} USDT，断签将从第 1 天重新计算`,
                `Tomorrow: ${rewardFor((todayDay % 7) + 1)} USDT. Missing a day restarts the streak.`,
              )
            : t(
                `连续签到第 7 天额外奖励 ${STREAK_BONUS_USDT} USDT`,
                `Day 7 adds a ${STREAK_BONUS_USDT} USDT bonus`,
              )}
        </p>
      </section>

      <section className="sh-section rw-rules">
        <h3>
          {t("签到奖励规则", "Reward rules")}
          <button className="rw-rules-link" onClick={() => compliance.openLegal("rewards")}>
            <FileText size={13} />
            {t("完整细则", "Full rules")}
            <ChevronRight size={13} />
          </button>
        </h3>
        <table className="rw-rules-table">
          <tbody>
            <tr>
              <th>{t("第 1–6 天", "Days 1–6")}</th>
              <td>{t(`每天 ${CHECK_IN_REWARD_USDT} USDT`, `${CHECK_IN_REWARD_USDT} USDT / day`)}</td>
            </tr>
            <tr>
              <th>{t("第 7 天", "Day 7")}</th>
              <td>
                {CHECK_IN_REWARD_USDT} + {t("连续奖励", "bonus")} {STREAK_BONUS_USDT} = {CHECK_IN_REWARD_USDT + STREAK_BONUS_USDT} USDT
              </td>
            </tr>
            <tr>
              <th>{t("每轮合计", "Per 7-day cycle")}</th>
              <td>
                {CHECK_IN_REWARD_USDT} × 7 + {STREAK_BONUS_USDT} = {CHECK_IN_REWARD_USDT * 7 + STREAK_BONUS_USDT} USDT
              </td>
            </tr>
          </tbody>
        </table>
        <ul className="rw-rules-list">
          <li>{t("每个自然日可签到 1 次，漏签不可补签；断签后从第 1 天重新计算，满 7 天开始新一轮。", "One check-in per calendar day; missed days can't be made up. A missed day restarts at day 1; after day 7 a new cycle starts.")}</li>
          <li>{t("奖励即时发放至奖励账户，每笔可在资金记录中查看。", "Rewards land in the Rewards account immediately and are listed in Funding history.")}</li>
          <li>{t("奖励为虚拟模拟金，不具有现金价值，不能兑换为法币或数字资产，不能用于购买会员。", "Rewards are virtual demo funds with no cash value; they can't be exchanged for money or crypto or pay for a membership.")}</li>
          <li>{t("签到无需付费、交易、评价或分享；批量注册、脚本等作弊行为获得的奖励将被取消。", "No purchase, trade, review or share is required. Rewards gained by cheating are cancelled.")}</li>
        </ul>
      </section>

      <section className="sh-section">
        <h3 className="rw-cal-head">
          {monthDays.label}
          <span>{t(`本月已签 ${monthCount} 天`, `${monthCount} days this month`)}</span>
        </h3>
        <div className="rw-cal">
          {(lang === "zh" ? "日一二三四五六" : "SMTWTFS").split("").map((d, i) => (
            <b key={i}>{d}</b>
          ))}
          {Array.from({ length: monthDays.pad }, (_, i) => (
            <i key={`p${i}`} />
          ))}
          {monthDays.days.map((d) => (
            <span
              key={d}
              className={`${state.days.includes(d) ? "is-done" : ""} ${d === today ? "is-today" : ""} ${d > today ? "is-future" : ""}`}
            >
              {Number(d.slice(-2))}
            </span>
          ))}
        </div>
      </section>

      <section className="sh-section">
        <h3>{t("反馈与评价", "Feedback")}</h3>
        <div className="sh-list">
          <div>
            <span className="sh-li-icon rw-ic-star">
              <Star size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("产品体验评价", "Rate your experience")}</b>
              <small>
                {state.rating
                  ? t(
                      `已评 ${state.rating.stars} 星${state.rating.tags.length ? ` · ${state.rating.tags.join("、")}` : ""}`,
                      `Rated ${state.rating.stars} stars`,
                    )
                  : t("告诉我们你的使用感受，帮助我们改进", "Tell us how it's going")}
              </small>
            </div>
            <button className="sh-btn sh-btn-sm" onClick={() => setView("rate")}>
              {state.rating ? t("修改", "Edit") : t("去评价", "Rate")}
            </button>
          </div>
          <div>
            <span className="sh-li-icon rw-ic-fb">
              <MessageSquareText size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("意见反馈", "Feedback")}</b>
              <small>
                {state.feedback.length
                  ? t(`已提交 ${state.feedback.length} 条 · 处理中`, `${state.feedback.length} submitted · in review`)
                  : t("帮助我们改进产品", "Help us improve")}
              </small>
            </div>
            <button className="sh-btn sh-btn-sm" onClick={() => setView("feedback")}>
              {state.feedback.length ? t("查看", "View") : t("去反馈", "Write")}
            </button>
          </div>
        </div>
      </section>
      <p className="sh-note is-info">
        <Sparkles size={15} />
        {t(
          "评价与反馈仅用于改进产品，不会获得奖励，也不影响签到奖励。",
          "Ratings and feedback only help us improve; they are never rewarded and don't affect check-in rewards.",
        )}
      </p>
    </Sheet>
  );
}
