import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronRight,
  ClipboardList,
  Headphones,
  Mail,
  MessageCircle,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  TicketPlus,
} from "lucide-react";
import { useSavedState } from "./marketModel";
import { Sheet } from "./ui/Sheet";
import "./support.css";

type Lang = "zh" | "en";
interface Msg {
  id: string;
  from: "user" | "bot" | "agent" | "system";
  text: string;
  at: number;
}
interface Ticket {
  id: string;
  cat: string;
  subject: string;
  body: string;
  contact: string;
  at: number;
  replies: Msg[];
}
interface Faq {
  id: string;
  cat: string;
  q: [string, string];
  a: [string, string];
  keys: string[];
}

const CATS: [string, string, string][] = [
  ["account", "账户与安全", "Account & security"],
  ["trade", "模拟交易", "Demo trading"],
  ["assets", "资产与奖励", "Assets & rewards"],
  ["live", "直播", "Live"],
  ["ai", "AI 诊股", "AI analysis"],
];
const FAQS: Faq[] = [
  { id: "f1", cat: "assets", keys: ["模拟金", "领取", "资金", "demo funds", "claim"], q: ["如何领取模拟金？", "How do I claim demo funds?"], a: ["进入「账户 → 领模拟金」，每次可领取 10,000 USDT 至资金账户，再通过「划转」转入交易账户即可下单。模拟金仅用于练习，不可提现。", "Go to Account → Claim to get 10,000 USDT into the funding account, then transfer it to the trading account. Demo funds can't be withdrawn."] },
  { id: "f2", cat: "assets", keys: ["奖励", "提现", "reward", "withdraw"], q: ["签到奖励可以提现吗？", "Can I withdraw check-in rewards?"], a: ["可以。签到与评分奖励会发放到奖励账户，在「奖励提现」中填写 USDT 地址即可提交，每笔手续费 1 USDT。提现前需绑定手机号。", "Yes. Rewards land in the reward account and can be withdrawn to a USDT address (1 USDT fee). A bound mobile number is required."] },
  { id: "f3", cat: "trade", keys: ["保证金", "爆仓", "强平", "margin", "liquidation"], q: ["保证金水平和强平是怎么计算的？", "How are margin level and liquidation calculated?"], a: ["保证金水平 = 账户权益 ÷ 已用保证金 × 100%。当保证金水平低于 50% 时，系统会按亏损从大到小依次强制平仓。建议设置止损控制风险。", "Margin level = equity ÷ used margin × 100%. Below 50%, positions are closed starting from the largest loss. Use stop-losses to manage risk."] },
  { id: "f4", cat: "trade", keys: ["止盈", "止损", "tp", "sl", "stop"], q: ["如何设置或修改止盈止损？", "How do I set or edit TP / SL?"], a: ["下单时可直接填写止盈止损价；已有持仓可在「交易 → 持仓」中点击止盈或止损金额修改。多单止盈需高于现价、止损需低于现价，空单相反。", "Enter TP/SL on the ticket, or tap the TP or SL value on an open position. For longs TP must be above and SL below the price; reversed for shorts."] },
  { id: "f5", cat: "trade", keys: ["点差", "手续费", "spread", "fee"], q: ["模拟交易收取手续费吗？", "Are there trading fees?"], a: ["CFD 品种不收取佣金，成本体现在买卖点差中；加密货币永续合约按成交额收取 0.05% 的模拟手续费。", "CFDs have no commission — the cost is the spread. Crypto perpetuals charge a 0.05% demo fee on notional."] },
  { id: "f6", cat: "account", keys: ["验证器", "谷歌", "google", "2fa", "authenticator"], q: ["手机丢失，谷歌验证器无法使用怎么办？", "Lost my phone with the authenticator"], a: ["如果保存了 16 位备份密钥，可在新手机上手动输入恢复。没有备份时，请提交「账户与安全」工单，客服会在身份核验后协助解绑。", "Restore it on a new phone with your 16-character backup key. Without it, submit an Account & security ticket and we'll unbind it after verifying your identity."] },
  { id: "f7", cat: "account", keys: ["密码", "忘记", "password", "forgot"], q: ["忘记登录密码怎么办？", "Forgot my password"], a: ["在登录页点击「忘记密码」，通过手机或邮箱验证码验证后即可设置新密码。", "Tap Forgot password on the sign-in page and verify with a code sent to your phone or email."] },
  { id: "f8", cat: "account", keys: ["手机", "更换", "phone", "change"], q: ["如何更换绑定的手机号？", "How do I change my phone number?"], a: ["进入「安全中心 → 手机号 → 更换」，先验证原手机号（已开启验证器时还需动态口令），再验证新手机号即可。原号码已停用可联系客服人工处理。", "Security → Mobile number → Change. Verify the old number (and authenticator if on), then the new one."] },
  { id: "f9", cat: "live", keys: ["直播", "连麦", "礼物", "红包", "live", "gift"], q: ["直播间的礼物和红包是真钱吗？", "Are live gifts and red packets real money?"], a: ["不是。直播钱包内是虚拟余额，仅用于互动，不能充值或提现，也与交易账户、奖励账户相互独立。", "No. The live wallet holds virtual credits for interaction only — no top-ups or withdrawals, and separate from trading and reward accounts."] },
  { id: "f10", cat: "ai", keys: ["ai", "诊股", "分析", "analysis"], q: ["AI 诊股的结论可以直接用来交易吗？", "Can I trade on AI analysis?"], a: ["AI 诊股基于公开行情和财务数据生成，仅供学习参考，不构成投资建议。请结合自身判断和风险承受能力决策。", "AI analysis uses public market and financial data and is for learning only — not investment advice."] },
];
const seedChat = (): Msg[] => [];
const id = () => Math.random().toString(36).slice(2, 10);
const timeOf = (ts: number, lang: Lang) => new Date(ts).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export function SupportCenter({ lang, account, onClose }: { lang: Lang; account: string; onClose: () => void }) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const L = (pair: [string, string]) => (lang === "zh" ? pair[0] : pair[1]);
  const [store, setStore] = useSavedState<{ chat: Msg[]; agent: boolean; tickets: Ticket[] }>("alphapulse.support.v1", { chat: seedChat(), agent: false, tickets: [] });
  const [view, setView] = useState<"home" | "chat" | "new" | "tickets" | "ticket" | "faq">("home");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [faq, setFaq] = useState<Faq | null>(null);
  const [vote, setVote] = useState<Record<string, "up" | "down">>({});
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({ cat: "account", subject: "", body: "", contact: account });
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [store.chat.length, typing, view]);

  const query = q.trim().toLowerCase();
  const results = useMemo(
    () => FAQS.filter((f) => (!cat || f.cat === cat) && (!query || L(f.q).toLowerCase().includes(query) || L(f.a).toLowerCase().includes(query) || f.keys.some((k) => k.includes(query) || query.includes(k)))),
    [query, cat, lang],
  );
  const push = (m: Omit<Msg, "id" | "at">) => setStore((s) => ({ ...s, chat: [...s.chat, { ...m, id: id(), at: Date.now() }].slice(-80) }));
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const answer = (text: string) => {
    const lower = text.toLowerCase();
    if (/人工|客服|agent|human/.test(lower)) return handoff();
    const hit = FAQS.find((f) => f.keys.some((k) => lower.includes(k.toLowerCase())));
    setTyping(true);
    later(() => {
      setTyping(false);
      push({
        from: store.agent ? "agent" : "bot",
        text: hit
          ? L(hit.a)
          : store.agent
            ? t("收到，我这边帮你核实一下，请稍等片刻。", "Got it — let me check that for you.")
            : t("暂时没有找到相关答案。你可以换个说法，或回复「人工」转接在线客服。", "I couldn't find an answer. Try rephrasing, or reply \"agent\" to reach a person."),
      });
    }, 900);
  };
  const handoff = () => {
    if (store.agent) return;
    push({ from: "system", text: t("正在为你转接人工客服，当前排队 1 人…", "Connecting you to an agent — 1 person ahead…") });
    later(() => {
      setStore((s) => ({ ...s, agent: true }));
      push({ from: "system", text: t("客服 Lina 已接入", "Lina joined the chat") });
      setTyping(true);
      later(() => {
        setTyping(false);
        push({ from: "agent", text: t("你好，我是在线客服 Lina，请问有什么可以帮你？", "Hi, I'm Lina. How can I help?") });
      }, 1100);
    }, 1600);
  };
  const send = (text = draft) => {
    const v = text.trim();
    if (!v) return;
    if (!store.chat.length) push({ from: "bot", text: t("你好，我是 AlphaPulse 智能助手。", "Hi, I'm the AlphaPulse assistant.") });
    push({ from: "user", text: v });
    setDraft("");
    answer(v);
  };
  const openChat = () => {
    if (!store.chat.length)
      push({ from: "bot", text: t("你好，我是 AlphaPulse 智能助手，可以帮你解答账户、交易、资产和直播相关问题。也可以回复「人工」联系在线客服。", "Hi, I'm the AlphaPulse assistant. Ask about accounts, trading, assets or live streams, or reply \"agent\" for a person.") });
    setView("chat");
  };
  const ticket = store.tickets.find((x) => x.id === ticketId);
  const catName = (c: string) => {
    const x = CATS.find((k) => k[0] === c);
    return x ? t(x[1], x[2]) : c;
  };
  const back = () => setView(view === "ticket" ? "tickets" : "home");

  if (view === "chat")
    return (
      <Sheet
        size="full"
        className="sp-chat-sheet"
        title={store.agent ? t("在线客服 · Lina", "Live agent · Lina") : t("智能助手", "Assistant")}
        subtitle={store.agent ? t("人工服务中", "Agent connected") : t("7×24 小时在线", "Online 24/7")}
        onBack={back}
        onClose={onClose}
        footer={
          <div className="sp-composer">
            {!store.agent && (
              <div className="sp-quick">
                {[t("如何领取模拟金？", "Claim demo funds"), t("止盈止损怎么设置", "Set TP / SL"), t("奖励提现", "Withdraw rewards"), t("转人工", "Talk to an agent")].map((s) => (
                  <button key={s} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="sp-input"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input value={draft} maxLength={300} onChange={(e) => setDraft(e.target.value)} placeholder={t("请输入你的问题", "Type your question")} />
              <button aria-label={t("发送", "Send")} disabled={!draft.trim()}>
                <Send size={17} />
              </button>
            </form>
          </div>
        }
      >
        <div className="sp-msgs" ref={scroller}>
          {store.chat.map((m) =>
            m.from === "system" ? (
              <p key={m.id} className="sp-sys">
                {m.text}
              </p>
            ) : (
              <div key={m.id} className={`sp-msg is-${m.from}`}>
                {m.from !== "user" && <span className="sp-av">{m.from === "bot" ? <Bot size={16} /> : "L"}</span>}
                <div>
                  <p>{m.text}</p>
                  <small>{timeOf(m.at, lang)}</small>
                </div>
              </div>
            ),
          )}
          {typing && (
            <div className="sp-msg is-bot">
              <span className="sp-av">{store.agent ? "L" : <Bot size={16} />}</span>
              <div>
                <p className="sp-typing">
                  <i />
                  <i />
                  <i />
                </p>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    );

  if (view === "new")
    return (
      <Sheet
        title={t("提交工单", "New ticket")}
        subtitle={t("通常在 24 小时内回复", "We usually reply within 24 hours")}
        onBack={back}
        onClose={onClose}
        footer={
          <button
            className="sh-btn sh-btn-primary"
            disabled={form.subject.trim().length < 4 || form.body.trim().length < 10 || !form.contact.trim()}
            onClick={() => {
              const tk: Ticket = { id: `T${Date.now().toString().slice(-8)}`, ...form, subject: form.subject.trim(), body: form.body.trim(), at: Date.now(), replies: [] };
              setStore((s) => ({ ...s, tickets: [tk, ...s.tickets] }));
              setForm({ cat: "account", subject: "", body: "", contact: account });
              setTicketId(tk.id);
              setView("ticket");
              later(() => {
                setStore((s) => ({
                  ...s,
                  tickets: s.tickets.map((x) =>
                    x.id === tk.id
                      ? { ...x, replies: [...x.replies, { id: id(), from: "agent", at: Date.now(), text: t("你好，工单已收到，客服专员正在处理，结果会通过站内信和邮件通知你。", "Thanks — your ticket is with a specialist. We'll update you here and by email.") }] }
                      : x,
                  ),
                }));
              }, 2500);
            }}
          >
            {t("提交", "Submit")}
          </button>
        }
      >
        <div className="sh-section" style={{ marginTop: 6 }}>
          <h3>{t("问题分类", "Category")}</h3>
          <div className="sh-chips">
            {CATS.map(([k, zh, en]) => (
              <button key={k} aria-pressed={form.cat === k} onClick={() => setForm({ ...form, cat: k })}>
                {t(zh, en)}
              </button>
            ))}
          </div>
        </div>
        <label className="sh-field">
          <span>{t("标题", "Subject")}</span>
          <input className="sh-input" maxLength={50} value={form.subject} placeholder={t("简要描述问题（至少 4 个字）", "Short summary (min. 4 characters)")} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </label>
        <label className="sh-field">
          <span>
            {t("问题描述", "Details")} <em>{form.body.length}/1000</em>
          </span>
          <textarea className="sh-input" rows={5} maxLength={1000} value={form.body} placeholder={t("请描述发生时间、操作步骤和看到的提示（至少 10 个字）", "When it happened, what you did and what you saw (min. 10 characters)")} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </label>
        <label className="sh-field">
          <span>{t("联系方式", "Contact")}</span>
          <input className="sh-input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        </label>
        <p className="sh-note">
          <Headphones size={15} />
          {t("客服不会向你索要登录密码、资金密码或验证码，请勿在工单中填写。", "We'll never ask for your password, fund password or codes. Don't include them.")}
        </p>
      </Sheet>
    );

  if (view === "tickets" || (view === "ticket" && ticket))
    return (
      <Sheet title={view === "ticket" ? ticket!.subject : t("我的工单", "My tickets")} subtitle={view === "ticket" ? `#${ticket!.id} · ${catName(ticket!.cat)}` : undefined} onBack={back} onClose={onClose}>
        {view === "tickets" ? (
          store.tickets.length ? (
            <div className="sh-list">
              {store.tickets.map((x) => (
                <button
                  key={x.id}
                  onClick={() => {
                    setTicketId(x.id);
                    setView("ticket");
                  }}
                >
                  <div className="sh-li-main">
                    <b>{x.subject}</b>
                    <small>
                      #{x.id} · {catName(x.cat)} · {new Date(x.at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
                    </small>
                  </div>
                  <span className={`sh-badge ${x.replies.length ? "is-info" : "is-warn"}`}>{x.replies.length ? t("处理中", "In progress") : t("待受理", "Submitted")}</span>
                  <ChevronRight size={16} className="sh-muted" />
                </button>
              ))}
            </div>
          ) : (
            <div className="sh-empty">
              <span>
                <ClipboardList size={22} />
              </span>
              <b>{t("暂无工单", "No tickets yet")}</b>
              {t("遇到问题可以随时提交工单", "Submit a ticket whenever you need help")}
              <button className="sh-btn sh-btn-sm sh-btn-primary" onClick={() => setView("new")}>
                {t("提交工单", "New ticket")}
              </button>
            </div>
          )
        ) : (
          <ol className="sp-timeline">
            <li>
              <b>{t("我", "Me")}</b>
              <small>{new Date(ticket!.at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { hour12: false })}</small>
              <p>{ticket!.body}</p>
            </li>
            {ticket!.replies.map((r) => (
              <li key={r.id} className="is-agent">
                <b>{t("客服专员", "Support")}</b>
                <small>{new Date(r.at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { hour12: false })}</small>
                <p>{r.text}</p>
              </li>
            ))}
            {!ticket!.replies.length && <li className="is-wait">{t("等待客服受理…", "Waiting for support…")}</li>}
          </ol>
        )}
      </Sheet>
    );

  if (view === "faq" && faq)
    return (
      <Sheet title={catName(faq.cat)} onBack={back} onClose={onClose}>
        <h3 className="sp-faq-q">{L(faq.q)}</h3>
        <p className="sp-faq-a">{L(faq.a)}</p>
        <div className="sp-helpful">
          <span>{vote[faq.id] ? t("感谢你的反馈", "Thanks for the feedback") : t("这篇内容是否有帮助？", "Was this helpful?")}</span>
          <button aria-pressed={vote[faq.id] === "up"} onClick={() => setVote({ ...vote, [faq.id]: "up" })}>
            <ThumbsUp size={15} />
            {t("有帮助", "Yes")}
          </button>
          <button aria-pressed={vote[faq.id] === "down"} onClick={() => setVote({ ...vote, [faq.id]: "down" })}>
            <ThumbsDown size={15} />
            {t("没帮助", "No")}
          </button>
        </div>
        {vote[faq.id] === "down" && (
          <button className="sh-btn sh-btn-block sh-btn-primary sh-section" onClick={openChat}>
            <MessageCircle size={17} />
            {t("咨询在线客服", "Chat with support")}
          </button>
        )}
        <div className="sh-section">
          <h3>{t("相关问题", "Related")}</h3>
          <div className="sh-list">
            {FAQS.filter((f) => f.cat === faq.cat && f.id !== faq.id).map((f) => (
              <button key={f.id} onClick={() => setFaq(f)}>
                <div className="sh-li-main">
                  <b className="sp-q">{L(f.q)}</b>
                </div>
                <ChevronRight size={16} className="sh-muted" />
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    );

  return (
    <Sheet title={t("客服中心", "Help center")} onClose={onClose} size="lg">
      <div className="sp-hero">
        <h3>{t("你好，有什么可以帮你？", "Hi, how can we help?")}</h3>
        <label className="sh-inputbox">
          <Search size={16} className="sh-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜索问题，如：模拟金、止损、提现", "Search, e.g. demo funds, stop loss")} />
        </label>
      </div>
      <div className="sp-entries">
        <button onClick={openChat}>
          <span className="is-blue">
            <MessageCircle size={20} />
          </span>
          {t("在线客服", "Live chat")}
          <small>{store.agent ? t("对话中", "Active") : t("平均 1 分钟响应", "~1 min reply")}</small>
        </button>
        <button onClick={() => setView("new")}>
          <span className="is-orange">
            <TicketPlus size={20} />
          </span>
          {t("提交工单", "New ticket")}
          <small>{t("24 小时内回复", "Reply in 24h")}</small>
        </button>
        <button onClick={() => setView("tickets")}>
          <span className="is-green">
            <ClipboardList size={20} />
          </span>
          {t("我的工单", "My tickets")}
          <small>{store.tickets.length ? t(`${store.tickets.length} 条`, `${store.tickets.length}`) : t("暂无", "None")}</small>
        </button>
      </div>
      <div className="sh-chips sp-cats">
        <button aria-pressed={!cat} onClick={() => setCat(null)}>
          {t("全部", "All")}
        </button>
        {CATS.map(([k, zh, en]) => (
          <button key={k} aria-pressed={cat === k} onClick={() => setCat(cat === k ? null : k)}>
            {t(zh, en)}
          </button>
        ))}
      </div>
      <div className="sh-section">
        <h3>{query ? t(`搜索结果（${results.length}）`, `Results (${results.length})`) : t("常见问题", "Popular questions")}</h3>
        {results.length ? (
          <div className="sh-list">
            {results.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFaq(f);
                  setView("faq");
                }}
              >
                <div className="sh-li-main">
                  <b className="sp-q">{L(f.q)}</b>
                  <small>{catName(f.cat)}</small>
                </div>
                <ChevronRight size={16} className="sh-muted" />
              </button>
            ))}
          </div>
        ) : (
          <div className="sh-empty">
            <span>
              <Search size={20} />
            </span>
            {t("没有找到相关问题", "No matching questions")}
            <button className="sh-btn sh-btn-sm sh-btn-primary" onClick={openChat}>
              {t("问问在线客服", "Ask support")}
            </button>
          </div>
        )}
      </div>
      <div className="sh-section">
        <h3>{t("其他联系方式", "Other channels")}</h3>
        <div className="sh-list">
          <a className="sp-contact" href="mailto:support@alphapulse.app">
            <span className="sh-li-icon">
              <Mail size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("邮件支持", "Email")}</b>
              <small>support@alphapulse.app</small>
            </div>
            <ChevronRight size={16} className="sh-muted" />
          </a>
          <div>
            <span className="sh-li-icon">
              <Headphones size={18} />
            </span>
            <div className="sh-li-main">
              <b>{t("服务时间", "Hours")}</b>
              <small>{t("智能助手 7×24 小时 · 人工客服 09:00–24:00 (UTC+8)", "Assistant 24/7 · Agents 09:00–24:00 (UTC+8)")}</small>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
