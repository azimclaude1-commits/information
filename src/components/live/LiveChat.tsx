import React, { useEffect, useRef, useState } from "react";
import {
  Crown,
  MessageCircle,
  Pin,
  Send,
  ShieldCheck,
  Smile,
  Trophy,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import { Avatar, EmptyState, LiveDialog, useNow } from "./LiveShared";
import {
  ME,
  GIFTS,
  VIEWER,
  compact,
  label,
  money,
  uid,
  type Lang,
  type LiveRoom,
  type Message,
} from "./liveState";
import type { LiveStore } from "./useLive";
import { useCommunity } from "../community/Community";

export const CHAT_EMOJI = ["👍", "💙", "🔥", "👏", "🚀", "👀", "📈", "☕"];

/** Shared send logic for the full chat panel and the on-stage composer. */
export function useChatSender(
  room: LiveRoom,
  store: LiveStore,
  lang: Lang,
  studio: boolean,
) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [text, setText] = useState("");
  const now = useNow();
  const slow = store.state.experience.rooms[room.id].slowSeconds;
  const lastMessage = (store.state.messages[room.id] || [])
    .filter((m) => m.userId === ME && m.kind === "chat")
    .at(-1);
  const cooldown = studio
    ? 0
    : Math.max(
        0,
        Math.ceil(((lastMessage?.at || 0) + slow * 1000 - now) / 1000),
      );
  const muted =
    !studio &&
    ((store.state.muted[room.id]?.[ME] || 0) > now ||
      room.chatPermission === "closed");
  const closed = room.status !== "live" || muted;
  const send = () => {
    if (!text.trim()) return false;
    const actor = studio ? room.host : VIEWER;
    const ok = store.dispatch({
      type: "chat",
      roomId: room.id,
      message: {
        id: uid(),
        userId: actor.id,
        name: actor.name,
        nameEn: actor.nameEn,
        text,
        at: Date.now(),
        kind: studio ? "host" : "chat",
      },
    });
    if (ok) setText("");
    return ok;
  };
  return {
    text,
    setText,
    send,
    cooldown,
    closed,
    canSend: !!text.trim() && !closed && cooldown === 0,
    hint: studio
      ? t("主播身份发言", "Posting as host")
      : muted
        ? t("暂时无法发言", "Chat restricted")
        : room.chatPermission === "followers"
          ? t("关注后发言", "Followers only")
          : slow
            ? `${t("慢速模式", "Slow mode")} · ${cooldown || slow}s`
            : t("文明交流", "Keep it constructive"),
    placeholder:
      room.status === "ended"
        ? t("直播已结束，聊天已关闭", "Live chat has ended")
        : room.status !== "live"
        ? t("直播开始后即可发言", "Chat opens when live")
        : muted
          ? t("暂时无法发言", "Chat restricted")
          : t("说点什么…", "Say something…"),
  };
}

export function LiveChat({
  room,
  store,
  lang,
  studio,
  initialTab = "chat",
  onGift,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  studio: boolean;
  initialTab?: "chat" | "rank";
  /** Viewer only: opens the gift sheet from the supporters board. */
  onGift?: () => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const community = useCommunity();
  const [tab, setTab] = useState<string>(initialTab),
    [emoji, setEmoji] = useState(false);
  const sender = useChatSender(room, store, lang, studio);
  const { text, setText } = sender;
  const [report, setReport] = useState<Message | null>(null),
    [reason, setReason] = useState("广告引流");
  const canModerate =
    studio || store.state.experience.rooms[room.id].moderators.includes(ME);
  const moderator = studio ? room.host.id : ME;
  const scroll = useRef<HTMLDivElement>(null),
    atBottom = useRef(true);
  const messages = store.state.messages[room.id] || [],
    pinned = messages.find((m) => m.id === store.state.pinnedMessage[room.id]);
  const ranking = Object.entries(store.state.gifts[room.id] || {}).sort(
    (a, b) => b[1] - a[1],
  );
  const myRank = ranking.findIndex(([id]) => id === ME) + 1;
  const gap = myRank > 1 ? ranking[myRank - 2][1] - ranking[myRank - 1][1] + 1 : 0;
  const names: Record<string, string> = {
    [ME]: VIEWER.name,
    "user-oliver": "Oliver",
    "user-mia": t("小麦", "Mia"),
    "user-noah": "Noah",
  };
  useEffect(() => {
    if (atBottom.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages.at(-1)?.id, tab]);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (sender.send()) {
      setEmoji(false);
      atBottom.current = true;
    }
  };
  return (
    <section className="live-chat-card">
      <header>
        <div role="tablist" aria-label={t("互动区", "Community")}>
          <button
            role="tab"
            aria-selected={tab === "chat"}
            onClick={() => setTab("chat")}
          >
            <MessageCircle size={15} />
            {t("聊天", "Chat")}
          </button>
          <button
            role="tab"
            aria-selected={tab === "rank"}
            onClick={() => setTab("rank")}
          >
            <Trophy size={15} />
            {t("贡献榜", "Top supporters")}
          </button>
        </div>
        <span>
          <Users size={13} />
          {compact(room.viewers)}
        </span>
      </header>
      {tab === "chat" ? (
        <>
          {pinned && (
            <div className="live-pinned-message">
              <Pin size={13} />
              <span>
                {lang === "en" ? pinned.textEn || pinned.text : pinned.text}
              </span>
              {canModerate && (
                <button
                  aria-label={t("取消置顶", "Unpin")}
                  onClick={() =>
                    store.dispatch({
                      type: "pinMessage",
                      actor: moderator,
                      roomId: room.id,
                      messageId: "",
                    })
                  }
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          <div
            className="live-chat-messages"
            ref={scroll}
            onScroll={() => {
              if (scroll.current)
                atBottom.current =
                  scroll.current.scrollHeight -
                    scroll.current.scrollTop -
                    scroll.current.clientHeight <
                  55;
            }}
          >
            <div className="live-chat-welcome">
              <ShieldCheck size={15} />
              <span>
                {t(
                  "欢迎交流市场观点，请勿发布广告与收益承诺。",
                  "Share market views. No spam or promises of returns.",
                )}
              </span>
            </div>
            {messages.map((m) => (
              <div
                key={m.id}
                data-message-id={m.id}
                className={`live-chat-message message-${m.kind}`}
              >
                <button
                  className="live-chat-avatar"
                  disabled={m.kind === "system"}
                  onClick={() => community.openProfile(m.userId)}
                  aria-label={t(
                    `查看${m.name}的主页`,
                    `View ${m.nameEn}'s profile`,
                  )}
                >
                  <Avatar
                    profile={
                      m.userId === room.host.id
                        ? room.host
                        : {
                            name: m.name,
                            initials: m.name.slice(0, 2).toUpperCase(),
                            color: m.userId === ME ? "blue" : "violet",
                          }
                    }
                    size="sm"
                  />
                </button>
                <div>
                  <div className="live-message-meta">
                    <b>{lang === "en" ? m.nameEn : m.name}</b>
                    {store.state.experience.rooms[room.id].moderators.includes(
                      m.userId,
                    ) && <span>{t("房管", "MOD")}</span>}
                    {m.kind === "host" && <span>{t("主播", "HOST")}</span>}
                    {m.userId === ME && <small>{t("我", "You")}</small>}
                    <time>
                      {new Date(m.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </time>
                  </div>
                  <p>
                    {m.kind === "gift" && (
                      <span className="live-chat-gift-icon" aria-hidden="true">
                        {GIFTS.find((gift) => gift.id === m.giftId)?.icon}
                      </span>
                    )}
                    {lang === "en" ? m.textEn || m.text : m.text}
                  </p>
                  {canModerate && m.kind !== "system" && (
                    <div className="live-message-tools">
                      <button
                        aria-label={`${t("置顶消息", "Pin message")} ${m.name}`}
                        onClick={() =>
                          store.dispatch({
                            type: "pinMessage",
                            actor: moderator,
                            roomId: room.id,
                            messageId: m.id,
                          })
                        }
                      >
                        <Pin size={11} />
                        {t("置顶", "Pin")}
                      </button>
                      {m.userId !== room.host.id && (
                        <button
                          aria-label={`${t("禁言", "Mute")} ${m.name}`}
                          onClick={() =>
                            store.dispatch({
                              type: "mute",
                              actor: moderator,
                              roomId: room.id,
                              userId: m.userId,
                              until: Date.now() + 15 * 60000,
                            })
                          }
                        >
                          <VolumeX size={11} />
                          {t("禁言", "Mute")}
                        </button>
                      )}
                      <button
                        aria-label={`${t("删除消息", "Delete message")} ${m.name}`}
                        onClick={() =>
                          store.dispatch({
                            type: "x/moderate",
                            roomId: room.id,
                            actor: moderator,
                            messageId: m.id,
                            remove: true,
                            at: Date.now(),
                          })
                        }
                      >
                        {t("删除", "Delete")}
                      </button>
                    </div>
                  )}
                  {!studio && m.kind !== "system" && m.userId !== ME && (
                    <button
                      className="lx-chat-report"
                      onClick={() => {
                        setReport(m);
                        setReason("广告引流");
                      }}
                    >
                      {t("举报", "Report")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form className="live-chat-form" onSubmit={send}>
            <div className="live-chat-form-top">
              <button
                type="button"
                className="live-icon-btn"
                aria-label={t("表情", "Emoji")}
                aria-expanded={emoji}
                onClick={() => setEmoji(!emoji)}
              >
                <Smile size={19} />
              </button>
              <span>{sender.hint}</span>
              <small>{text.length}/300</small>
            </div>
            {emoji && (
              <div className="live-emoji-picker">
                {CHAT_EMOJI.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => {
                      setText((v) => `${v}${s}`.slice(0, 300));
                      setEmoji(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="live-chat-input">
              <input
                aria-label={t("聊天内容", "Chat message")}
                value={text}
                maxLength={300}
                onChange={(e) => setText(e.target.value)}
                disabled={sender.closed}
                placeholder={sender.placeholder}
              />
              <button
                aria-label={t("发送消息", "Send message")}
                disabled={!sender.canSend}
              >
                <Send size={17} />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="live-supporters">
          <div className="live-supporter-hero">
            <Crown size={28} />
            <span>{t("本场贡献榜", "Session supporters")}</span>
          </div>
          {ranking.length ? (
            ranking.map(([id, cents], index) => (
              <div key={id} className="live-supporter-row">
                <b className={`rank-${index + 1}`}>
                  {String(index + 1).padStart(2, "0")}
                </b>
                <Avatar
                  profile={{
                    name: names[id] || id,
                    initials: (names[id] || id).slice(0, 2),
                    color: index === 0 ? "amber" : "violet",
                  }}
                />
                <span>
                  {names[id] || id}
                  {id === ME && <small>{t("我", "You")}</small>}
                </span>
                <strong>
                  {money(cents)}
                  <small>USDT</small>
                </strong>
              </div>
            ))
          ) : (
            <EmptyState>{t("虚位以待", "Be the first supporter")}</EmptyState>
          )}
          {!studio && (
            <div className="live-my-rank">
              <Avatar profile={VIEWER} size="sm" />
              <span className="live-my-rank-text">
                <b>
                  {myRank > 0
                    ? t(`我 · 第 ${myRank} 名`, `You · #${myRank}`)
                    : t("我 · 未上榜", "You · not ranked")}
                </b>
                <small>
                  {myRank === 1
                    ? t("你是本场第一名", "You're the top supporter")
                    : myRank > 1
                      ? t(`距第 ${myRank - 1} 名还差 ${money(gap)} USDT`, `${money(gap)} USDT behind #${myRank - 1}`)
                      : t("送出任意礼物即可上榜", "Send any gift to join the board")}
                </small>
              </span>
              {onGift && (
                <button className="ui-btn ui-btn-primary" onClick={onGift}>
                  {t("送礼上榜", "Send a gift")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {report && (
        <LiveDialog
          title={t("举报消息", "Report message")}
          onClose={() => setReport(null)}
        >
          <p>{report.text}</p>
          <form
            className="lx-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                store.dispatch({
                  type: "x/report",
                  roomId: room.id,
                  messageId: report.id,
                  id: uid(),
                  reason,
                  at: Date.now(),
                })
              )
                setReport(null);
            }}
          >
            <label>
              {t("举报原因", "Reason")}
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {[
                  ["广告引流", "Spam"],
                  ["骚扰辱骂", "Harassment"],
                  ["收益承诺", "Guaranteed returns"],
                  ["其他不当内容", "Other inappropriate content"],
                ].map(([zh, en]) => (
                  <option key={zh} value={zh}>
                    {t(zh, en)}
                  </option>
                ))}
              </select>
            </label>
            <button className="ui-btn ui-btn-primary">
              {t("提交举报", "Submit report")}
            </button>
          </form>
        </LiveDialog>
      )}
    </section>
  );
}
