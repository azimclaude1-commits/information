import React, { useState } from "react";
import {
  BadgeCheck,
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Megaphone,
  Mic,
  MicOff,
  PlayCircle,
  ShieldAlert,
  Star,
  Vote,
} from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { AssetLogo } from "../AssetLogo";
import {
  DEFAULT_FAVORITES,
  FAVORITES_KEY,
  number,
  useSavedState,
} from "../marketModel";
import { Avatar, DateLabel, useNow } from "./LiveShared";
import { ReminderButton, RoomEvent } from "./LivePrograms";
import {
  CATEGORIES,
  ME,
  VIEWER,
  compact,
  label,
  personName,
  type Lang,
  type LiveRoom,
} from "./liveState";
import { navigateLive, type LiveStore } from "./useLive";
import { useCommunity } from "../community/Community";

type T = (zh: string, en: string) => string;
const tr = (lang: Lang): T => (zh, en) => label(lang, zh, en);

/* ==================== 连麦 ==================== */
export function useMic(
  room: LiveRoom,
  store: LiveStore,
  lang: Lang,
  onToast: (s: string) => void,
) {
  const seats = store.state.seats[room.id] || [];
  const queue = (store.state.requests[room.id] || [])
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.at - b.at);
  const mySeat = seats.find((s) => s.userId === ME);
  const request = store.state.requests[room.id]?.find((r) => r.userId === ME);
  const position = queue.findIndex((r) => r.userId === ME) + 1;
  return {
    seats,
    queue,
    mySeat,
    request,
    position,
    apply: () => {
      if (
        store.dispatch({
          type: "mic",
          roomId: room.id,
          request: {
            userId: ME,
            name: VIEWER.name,
            nameEn: VIEWER.nameEn,
            status: "pending",
            at: Date.now(),
          },
        })
      )
        onToast(label(lang, "连麦申请已发送，等待主播同意", "Request sent. Waiting for the host."));
    },
    leave: () => store.dispatch({ type: "leaveMic", roomId: room.id, userId: ME }),
    toggle: () => store.dispatch({ type: "toggleMic", roomId: room.id, userId: ME }),
  };
}

export function MicPanel({
  room,
  store,
  lang,
  onToast,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  onToast: (s: string) => void;
}) {
  const t = tr(lang);
  const mic = useMic(room, store, lang, onToast);
  const [agree, setAgree] = useState(false);
  const live = room.status === "live";
  const pending = mic.request?.status === "pending";
  const status = !live
    ? [t("直播未进行，暂不可连麦", "Speaker seats open while live"), ""]
    : mic.mySeat
      ? [t("连麦中", "On stage"), mic.mySeat.muted ? t("麦克风已关闭", "Mic muted") : t("麦克风已开启", "Mic on")]
      : pending
        ? [
            t(`排队中 · 第 ${mic.position} 位`, `In queue · #${mic.position}`),
            mic.position > 1
              ? t(`前面还有 ${mic.position - 1} 人，主播同意后自动上麦`, `${mic.position - 1} ahead of you`)
              : t("你排在第一位，等待主播同意", "You're next. Waiting for the host"),
          ]
        : mic.request?.status === "rejected"
          ? [t("本次申请未通过", "Request declined"), t("可以稍后重新申请", "You can request again later")]
          : [t("未申请连麦", "Not requested"), t(`当前排队 ${mic.queue.length} 人`, `${mic.queue.length} in queue`)];
  return (
    <div className="lv-pn">
      <div className={`lv-pn-status${mic.mySeat ? " is-on" : pending ? " is-wait" : ""}`}>
        <span>{mic.mySeat ? <Mic size={18} /> : <MicOff size={18} />}</span>
        <div>
          <b>{status[0]}</b>
          {status[1] && <small>{status[1]}</small>}
        </div>
        <em>
          {t("席位", "Seats")} {mic.seats.length}/5
        </em>
      </div>
      <div className="lv-pn-seats">
        <div className="is-host">
          <Avatar profile={room.host} size="md" />
          <span>{personName(room.host, lang)}</span>
          <small>{t("主播", "Host")}</small>
        </div>
        {Array.from({ length: 5 }, (_, i) => {
          const s = mic.seats[i];
          return s ? (
            <div key={s.userId} className={s.userId === ME ? "is-me" : ""}>
              <Avatar
                profile={{ name: s.name, initials: s.name.slice(0, 2), color: s.userId === ME ? "blue" : "violet" }}
                size="md"
              />
              <span>{personName(s, lang)}</span>
              <small>{s.muted ? t("已闭麦", "Muted") : t("发言中", "Speaking")}</small>
            </div>
          ) : (
            <div key={i} className="is-empty">
              <i>
                <Mic size={14} />
              </i>
              <span>{t("空闲", "Open")}</span>
            </div>
          );
        })}
      </div>
      <section className="lv-pn-block">
        <h4>{t("连麦须知", "Speaker guidelines")}</h4>
        <ol>
          <li>{t("连麦需主播同意，按申请先后排队。", "The host approves requests in order.")}</li>
          <li>{t("上麦后请保持环境安静，不发言时可自行闭麦。", "Keep your surroundings quiet and mute when not speaking.")}</li>
          <li>{t("禁止荐股、广告引流或承诺收益，主播可随时将你移出连麦。", "No stock tips, ads or promised returns; the host may remove you at any time.")}</li>
          <li>{t("连麦内容会被录制并可能出现在回放中。", "Your audio may be recorded and appear in the replay.")}</li>
        </ol>
      </section>
      {!mic.mySeat && !pending && (
        <label className="lv-pn-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          {t("我已阅读并同意连麦须知", "I have read the speaker guidelines")}
        </label>
      )}
      <div className="lv-pn-actions">
        {mic.mySeat ? (
          <>
            <button className="ui-btn" onClick={mic.toggle}>
              {mic.mySeat.muted ? <Mic size={15} /> : <MicOff size={15} />}
              {mic.mySeat.muted ? t("开启麦克风", "Unmute") : t("关闭麦克风", "Mute")}
            </button>
            <button className="ui-btn lv-pn-danger" onClick={mic.leave}>
              {t("下麦", "Leave stage")}
            </button>
          </>
        ) : pending ? (
          <button className="ui-btn" onClick={mic.leave}>
            {t("取消申请", "Cancel request")}
          </button>
        ) : (
          <button className="ui-btn ui-btn-primary" disabled={!live || !agree || mic.seats.length >= 5} onClick={mic.apply}>
            <Mic size={15} />
            {mic.seats.length >= 5 ? t("席位已满", "Seats full") : t("申请连麦", "Request to speak")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ==================== 推荐品种 ==================== */
export function MarketsPanel({
  room,
  store,
  instruments,
  lang,
  onOrder,
}: {
  room: LiveRoom;
  store: LiveStore;
  instruments: Instrument[];
  lang: Lang;
  onOrder: (symbol: string, side: "buy" | "sell") => void;
}) {
  const t = tr(lang);
  const now = useNow();
  const [favorites, setFavorites] = useSavedState(FAVORITES_KEY, DEFAULT_FAVORITES);
  const strategies = store.state.experience.rooms[room.id].strategies.filter(
    (s) => !["ended", "expired"].includes(s.status) && s.expiresAt > now,
  );
  return (
    <div className="lv-pn">
      <p className="lv-pn-hint">
        {t("主播本场讲解的品种，点击买入 / 卖出可在直播间内直接模拟下单。", "Markets covered this session. Buy or sell without leaving the room.")}
      </p>
      {room.symbols.map((symbol) => {
        const i = instruments.find((x) => x.symbol === symbol);
        if (!i) return null;
        const view = strategies.find((s) => s.symbol === symbol);
        const saved = favorites.includes(symbol);
        const range = Math.max(0, Math.min(100, ((i.price - i.low24h) / Math.max(i.high24h - i.low24h, 1e-9)) * 100));
        const up = i.changePercent24h >= 0;
        return (
          <article key={symbol} className="lv-mk">
            <header>
              <AssetLogo {...i} size="md" />
              <div className="lv-mk-name">
                <b>
                  {symbol}
                  {symbol === room.pinnedSymbol && <em>{t("讲解中", "In focus")}</em>}
                </b>
                <small>{t(i.nameZh, i.nameEn)}</small>
              </div>
              <button
                className={`lv-mk-star${saved ? " is-on" : ""}`}
                aria-pressed={saved}
                aria-label={saved ? t("取消自选", "Remove from watchlist") : t("加入自选", "Add to watchlist")}
                onClick={() => setFavorites((old) => (saved ? old.filter((s) => s !== symbol) : [...old, symbol]))}
              >
                <Star size={16} fill={saved ? "currentColor" : "none"} />
              </button>
            </header>
            <div className="lv-mk-price">
              <strong>{number(i.price, i.decimals)}</strong>
              <span className={up ? "positive" : "negative"}>
                {up ? "+" : ""}
                {i.changePercent24h.toFixed(2)}%
              </span>
              <small>
                {t("点差", "Spread")} {number(i.ask - i.bid, i.decimals)}
              </small>
            </div>
            <div className="lv-mk-range">
              <span>{number(i.low24h, i.decimals)}</span>
              <div>
                <i style={{ left: `${range}%` }} />
              </div>
              <span>{number(i.high24h, i.decimals)}</span>
            </div>
            {view && (
              <div className={`lv-mk-view ${view.side === "buy" ? "is-long" : "is-short"}`}>
                <b>
                  {t("主播观点", "Host view")} · {view.side === "buy" ? t("看多", "Bullish") : t("看空", "Bearish")}
                </b>
                <span>
                  {t("参考", "Entry")} {view.entry} · {t("目标", "Target")} {view.target} · {t("止损", "Stop")} {view.stop}
                </span>
              </div>
            )}
            <div className="lv-mk-trade">
              <button className="is-buy" onClick={() => onOrder(symbol, "buy")}>
                <span>{t("买入", "Buy")}</span>
                <b>{number(i.ask, i.decimals)}</b>
              </button>
              <button className="is-sell" onClick={() => onOrder(symbol, "sell")}>
                <span>{t("卖出", "Sell")}</span>
                <b>{number(i.bid, i.decimals)}</b>
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ==================== 主播介绍 ==================== */
export function HostPanel({
  room,
  store,
  lang,
  onFollow,
  onRules,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  onFollow: () => void;
  onRules: () => void;
}) {
  const t = tr(lang);
  const community = useCommunity();
  const host = room.host;
  const following = store.state.following.includes(host.id);
  const alerts = store.state.experience.hostAlerts.includes(host.id);
  const rooms = store.state.rooms.filter((r) => r.host.id === host.id);
  const published = (r: LiveRoom) => {
    const rp = store.state.experience.rooms[r.id]?.replay;
    return r.status === "ended" && !r.cancelled && rp?.publication === "published" && rp.visibility === "public" && rp.recording;
  };
  const upcoming = rooms.filter((r) => r.status === "scheduled").sort((a, b) => a.startsAt - b.startsAt);
  const replays = rooms.filter(published).sort((a, b) => (b.endedAt || b.startsAt) - (a.endedAt || a.startsAt));
  const tags = [
    ...new Set(rooms.map((r) => CATEGORIES.find((c) => c[0] === r.category)).filter(Boolean).map((c) => t(c![1], c![2]))),
    ...new Set(rooms.flatMap((r) => r.symbols)),
  ].slice(0, 7);
  return (
    <div className="lv-pn">
      <header className="lv-host-card">
        <Avatar profile={host} size="xl" />
        <div>
          <h3>
            {personName(host, lang)}
            <BadgeCheck size={17} />
          </h3>
          <small>{t("平台认证分析师", "Verified analyst")}</small>
          <p>{t(host.bio, host.bioEn)}</p>
        </div>
      </header>
      <div className="lv-host-stats">
        {[
          [t("粉丝", "Followers"), compact(host.followers + (following ? 1 : 0))],
          [t("直播场次", "Sessions"), rooms.filter((r) => r.status !== "scheduled" && !r.cancelled).length],
          [t("累计观看", "Views"), compact(rooms.reduce((n, r) => n + r.viewers, 0))],
          [t("回放", "Replays"), replays.length],
        ].map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>
      <div className="lv-pn-actions">
        <button className={`ui-btn ${following ? "" : "ui-btn-primary"}`} onClick={onFollow}>
          {following ? <Check size={15} /> : null}
          {following ? t("已关注", "Following") : t("关注主播", "Follow")}
        </button>
        <button
          className="ui-btn"
          aria-pressed={alerts}
          onClick={() => store.dispatch({ type: "x/subscribe", kind: "host", id: host.id })}
        >
          {alerts ? <BellRing size={15} /> : <Bell size={15} />}
          {alerts ? t("已开启开播提醒", "Alerts on") : t("开播提醒", "Live alerts")}
        </button>
      </div>
      <section className="lv-pn-block">
        <h4>{t("擅长领域", "Coverage")}</h4>
        <div className="lv-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>
      <section className="lv-pn-block">
        <h4>
          <Megaphone size={14} />
          {t("直播公告", "Announcement")}
        </h4>
        <p>{t(room.announcement, room.announcementEn)}</p>
        <RoomEvent room={room} store={store} lang={lang} />
      </section>
      <section className="lv-pn-block">
        <h4>{t("直播预告", "Upcoming")}</h4>
        {upcoming.length ? (
          upcoming.map((r) => (
            <div className="lv-pn-row" key={r.id}>
              <div>
                <b>{t(r.title, r.titleEn)}</b>
                <small>
                  <DateLabel at={r.startsAt} lang={lang} />
                </small>
              </div>
              <ReminderButton room={r} store={store} lang={lang} />
            </div>
          ))
        ) : (
          <p className="lv-pn-muted">{t("暂无新的直播安排，开启开播提醒第一时间获知", "No sessions scheduled. Turn on alerts to hear first.")}</p>
        )}
      </section>
      <section className="lv-pn-block">
        <h4>{t("精彩回放", "Replays")}</h4>
        {replays.length ? (
          replays.slice(0, 4).map((r) => (
            <button className="lv-pn-row" key={r.id} onClick={() => navigateLive(`room/${r.id}`)}>
              <div>
                <b>{store.state.experience.rooms[r.id].replay.title || t(r.title, r.titleEn)}</b>
                <small>
                  <DateLabel at={r.endedAt || r.startsAt} lang={lang} /> · {compact(r.viewers)} {t("观看", "views")}
                </small>
              </div>
              <PlayCircle size={18} />
            </button>
          ))
        ) : (
          <p className="lv-pn-muted">{t("暂无公开回放", "No public replays yet")}</p>
        )}
      </section>
      <div className="lv-pn-foot">
        <button className="live-text-btn" onClick={() => community.openProfile(host.id)}>
          {t("查看主播主页", "View profile")}
          <ChevronRight size={14} />
        </button>
        <button className="live-text-btn" onClick={onRules}>
          {t("社区规则", "Community rules")}
          <ChevronRight size={14} />
        </button>
      </div>
      <p className="lv-pn-muted">
        {t("主播观点仅供交流，不构成投资建议。交易及直播余额均为虚拟资金。", "Host views are for discussion only, not investment advice. Trading and live balances are virtual.")}
      </p>
    </div>
  );
}

/* ==================== 社区规则 ==================== */
export function RulesPanel({
  room,
  store,
  lang,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
}) {
  const t = tr(lang);
  const now = useNow();
  const mutedUntil = store.state.muted[room.id]?.[ME] || 0;
  const slow = store.state.experience.rooms[room.id].slowSeconds;
  const following = store.state.following.includes(room.host.id);
  const canChat =
    room.chatPermission === "all" || (room.chatPermission === "followers" && following);
  return (
    <div className="lv-pn">
      <section className={`lv-pn-status ${mutedUntil > now || !canChat ? "is-warn" : "is-on"}`}>
        <span>
          <ShieldAlert size={18} />
        </span>
        <div>
          <b>
            {mutedUntil > now
              ? t("你已被禁言", "You are muted")
              : canChat
                ? t("发言状态正常", "You can chat")
                : t("当前无法发言", "Chat unavailable")}
          </b>
          <small>
            {mutedUntil > now
              ? `${t("解除时间", "Until")} ${new Date(mutedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`
              : room.chatPermission === "closed"
                ? t("主播已开启仅主播发言", "Only the host can chat")
                : room.chatPermission === "followers"
                  ? t("本场仅关注主播后可发言", "Followers only")
                  : t("所有人可发言", "Everyone can chat")}
            {slow ? ` · ${t("慢速模式", "Slow mode")} ${slow}s` : ""}
          </small>
        </div>
      </section>
      {[
        [
          t("发言规范", "Chat guidelines"),
          [
            t("尊重他人，围绕市场话题理性交流，不发布与直播无关的内容。", "Be respectful and stay on market topics."),
            t("禁止广告引流、私信拉群、代客理财与收益承诺。", "No ads, private-group invites, managed accounts or promised returns."),
            t("禁止发布未经证实的消息或操纵市场的言论。", "No unverified rumours or market manipulation."),
          ],
        ],
        [
          t("违规处理", "Enforcement"),
          [
            t("首次违规：删除消息并警告。", "First offence: message removed with a warning."),
            t("再次违规：禁言 15 分钟，房管与主播可执行。", "Repeat: muted for 15 minutes by moderators or the host."),
            t("严重或多次违规：移出直播间并限制账号互动功能。", "Serious or repeated: removed from the room and interaction limited."),
          ],
        ],
        [
          t("举报方式", "Reporting"),
          [
            t("在聊天记录中点击消息下方的「举报」，选择原因后提交。", "Tap Report under a message in the chat log and choose a reason."),
            t("房管会在直播中优先处理，处理结果会记录在管理日志。", "Moderators handle reports during the session; actions are logged."),
          ],
        ],
        [
          t("风险提示", "Risk notice"),
          [
            t("主播观点不代表平台立场，不构成投资建议。", "Host views do not represent the platform or constitute advice."),
            t("直播礼物、红包与模拟交易均使用虚拟资金，不可充值或提现。", "Gifts, red packets and paper trading use virtual funds that cannot be deposited or withdrawn."),
          ],
        ],
      ].map(([title, items]) => (
        <section className="lv-pn-block" key={title as string}>
          <h4>{title as string}</h4>
          <ul>
            {(items as string[]).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ==================== Live poll card on the stage ==================== */
export function PollFloat({
  room,
  store,
  lang,
  onOpen,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  onOpen: () => void;
}) {
  const now = useNow();
  if (room.status !== "live") return null;
  const poll = store.state.experience.rooms[room.id].polls.find(
    (p) => !p.closed && p.endsAt > now && p.votes[ME] === undefined,
  );
  if (!poll) return null;
  const left = Math.ceil((poll.endsAt - now) / 1000);
  return (
    <button className="lv-poll" onClick={onOpen}>
      <span>
        <Vote size={13} />
        {poll.kind === "quiz" ? label(lang, "答题", "Quiz") : label(lang, "投票", "Poll")}
        <em>{left > 3600 ? `${Math.floor(left / 3600)}h` : left > 60 ? `${Math.floor(left / 60)}m` : `${left}s`}</em>
      </span>
      <b>{poll.title}</b>
      <small>{label(lang, "去参与", "Vote")}</small>
    </button>
  );
}

