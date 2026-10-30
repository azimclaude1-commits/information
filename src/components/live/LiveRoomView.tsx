import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Captions,
  ChartCandlestick,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Expand,
  Eye,
  Gift,
  Heart,
  Info,
  Lightbulb,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  MessageCircleQuestion,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  ScrollText,
  Share2,
  Target,
  Trophy,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Vote,
  Wallet,
  X,
} from "lucide-react";
import type { Instrument } from "../../data/marketData";
import type { DemoTrading } from "../demoTrading";
import { AssetLogo } from "../AssetLogo";
import { useMinWidth } from "../marketModel";
import {
  Avatar,
  DateLabel,
  EmptyState,
  LiveDialog,
  useNow,
} from "./LiveShared";
import {
  GiftDialog,
  PacketDialog,
  ShareDialog,
  WalletDialog,
} from "./LiveDialogs";
import { LiveClock, LiveStage, type StageControls } from "./LiveStage";
import {
  ViewerInteraction,
  OnAirQuestion,
  ViewerQuestions,
  PollResults,
} from "./LiveEngagement";
import { LiveChat } from "./LiveChat";
import { LiveRoomTrade, type LiveTradeDraft } from "./LiveRoomTrade";
import { ViewerStrategies } from "./LiveStrategies";
import { ViewerReplay, LiveTakeaways, playbackTime } from "./LiveReplay";
import {
  ReminderButton,
  LiveNotices,
  NoticesDialog,
  RoomEvent,
} from "./LivePrograms";
import {
  Composer,
  OverlayChat,
  PacketFloat,
  SeatRail,
  Sheet,
  SoundToggle,
  TileGrid,
  useHearts,
  useImmersiveLock,
} from "./LiveImmersive";
import { useRoomExperience } from "./useRoomExperience";
import {
  HostPanel,
  MarketsPanel,
  MicPanel,
  PollFloat,
  RulesPanel,
  useMic,
} from "./LiveViewerPanels";
import { PacketRain } from "./PacketRain";
import { GiftAnimation } from "./GiftAnimation";
import { useRoomActivity } from "./useRoomActivity";
import {
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

type Props = {
  room: LiveRoom;
  store: LiveStore;
  instruments: Instrument[];
  demo: DemoTrading;
  lang: Lang;
  onToast: (s: string) => void;
  onQuickTrade: (symbol: string, side: "buy" | "sell") => void;
};
type Panel =
  | "more"
  | "markets"
  | "strategies"
  | "replay"
  | "assistant"
  | "trading"
  | "about"
  | "chat"
  | "rank"
  | "questions"
  | "polls"
  | "mic"
  | "rules";
type DialogId =
  | "gift"
  | "wallet"
  | "packet"
  | "share"
  | "join"
  | "notices";

const SUPPORTER_NAMES: Record<string, [string, string]> = {
  [ME]: [VIEWER.name, VIEWER.nameEn],
  "user-oliver": ["Oliver", "Oliver"],
  "user-mia": ["小麦", "Mia"],
  "user-noah": ["Noah", "Noah"],
};

export function LiveRoomView({
  room,
  store,
  instruments,
  demo,
  lang,
  onToast,
  onQuickTrade,
}: Props) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const community = useCommunity();
  const desktop = useMinWidth(1024);
  const [dialog, setDialog] = useState<DialogId | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [tab, setTab] = useState<Panel>(
    room.status === "ended" ? "replay" : "markets",
  );
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<LiveTradeDraft | null>(null);
  const [seek, setSeek] = useState<{ id: number; second: number }>();
  const [scope, setScope] = useState<"new" | "all">("new");
  const [hearts, burst] = useHearts();
  const clean = store.state.experience.cleanMode;
  const now = useNow();
  const following = store.state.following.includes(room.host.id),
    shared = store.state.shared.includes(room.id),
    alerts = store.state.experience.hostAlerts.includes(room.host.id);
  const micState = useMic(room, store, lang, onToast);
  const { seats, mySeat, request } = micState;
  const live = room.status === "live",
    locked = room.access === "followers" && !following;
  useImmersiveLock(!desktop);
  useRoomActivity(room, store, !locked);
  useRoomExperience(room, store, !locked);
  useEffect(() => {
    if (desktop && panel === "more") setPanel(null);
  }, [desktop]);
  const packets = store.state.packets.filter(
    (p) =>
      p.roomId === room.id &&
      !p.closed &&
      p.expiresAt > now &&
      p.remainingCount > 0 &&
      p.claims[ME] == null,
  );
  const data = store.state.experience.rooms[room.id];
  const activeStrategies = data.strategies.filter(
    (s) => !["ended", "expired"].includes(s.status) && s.expiresAt > now,
  ).length;
  const openPolls = data.polls.filter(
    (p) => !p.closed && p.endsAt > now && live,
  ).length;
  const unreadNotices = store.state.experience.notices.filter(
    (n) => !n.read,
  ).length;
  const supporters = Object.entries(store.state.gifts[room.id] || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const focus = instruments.find((i) => i.symbol === room.pinnedSymbol);
  const openOrder = (next: LiveTradeDraft) => {
    if (!instruments.some((i) => i.symbol === next.symbol)) return;
    setPanel(null);
    setDraft(next);
    store.dispatch({
      type: "x/metric",
      roomId: room.id,
      kind: "click",
      id: String(Date.now()),
      at: Date.now(),
    });
  };
  const quickOrder = (symbol: string, side: "buy" | "sell") =>
    openOrder({ symbol, side });
  const seekTo = (second: number) => {
    setPanel(null);
    setSeek({ id: Date.now(), second });
  };
  const toggleFollow = () =>
    store.dispatch({ type: "follow", id: room.host.id, roomId: room.id });
  const like = () => {
    store.dispatch({ type: "like", id: room.id });
    burst();
  };
  const openMic = () => setPanel("mic");
  const joinTrading = () =>
    shared
      ? store.dispatch({
          type: "x/share",
          roomId: room.id,
          scope: null,
          at: Date.now(),
        })
      : setDialog("join");

  const titles: Record<Panel, string> = {
    more: t("更多功能", "More"),
    markets: t("推荐品种", "Markets"),
    strategies: t("策略", "Strategies"),
    replay: t("章节与复盘", "Chapters & recap"),
    assistant: t("直播要点", "Insights"),
    trading: t("一起模拟交易", "Paper trading"),
    about: t("主播介绍", "About"),
    chat: t("聊天记录", "Chat"),
    rank: t("贡献榜", "Top supporters"),
    questions: t("提问", "Q&A"),
    polls: t("投票与答题", "Polls & quizzes"),
    mic: t("连麦", "Speaker seats"),
    rules: t("社区规则", "Community rules"),
  };

  const content = (id: Panel) => {
    switch (id) {
      case "markets":
        return (
          <MarketsPanel
            room={room}
            store={store}
            instruments={instruments}
            lang={lang}
            onOrder={quickOrder}
          />
        );
      case "mic":
        return <MicPanel room={room} store={store} lang={lang} onToast={onToast} />;
      case "rules":
        return <RulesPanel room={room} store={store} lang={lang} />;
      case "trading":
        return room.sharedTrading ? (
          <TradingHub
            room={room}
            store={store}
            instruments={instruments}
            demo={demo}
            lang={lang}
            onJoin={joinTrading}
            onQuickTrade={quickOrder}
          />
        ) : (
          <EmptyState>
            {t(
              "主播尚未开启一起模拟交易",
              "The host has not enabled the trading hub",
            )}
          </EmptyState>
        );
      case "strategies":
        return (
          <ViewerStrategies
            room={room}
            store={store}
            lang={lang}
            instruments={instruments}
            onTrade={openOrder}
          />
        );
      case "replay":
        return (
          <ViewerReplay
            room={room}
            store={store}
            lang={lang}
            onSeek={seekTo}
          />
        );
      case "assistant":
        return (
          <LiveTakeaways
            room={room}
            store={store}
            lang={lang}
            onSeek={seekTo}
          />
        );
      case "chat":
      case "rank":
        return (
          <LiveChat
            room={room}
            store={store}
            lang={lang}
            studio={false}
            initialTab={id}
            onGift={live ? () => setDialog("gift") : undefined}
          />
        );
      case "questions":
        return <ViewerQuestions room={room} store={store} lang={lang} />;
      case "polls":
        return <PollResults room={room} store={store} lang={lang} />;
      case "about":
        return (
          <HostPanel
            room={room}
            store={store}
            lang={lang}
            onFollow={toggleFollow}
            onRules={() => setPanel("rules")}
          />
        );
      default:
        return null;
    }
  };

  const moreTiles = (controls: StageControls) => (
    <>
      <TileGrid
        title={t("互动", "Interact")}
        tiles={[
          {
            id: "chat",
            icon: <MessageCircle size={20} />,
            label: t("聊天记录", "Chat log"),
            onClick: () => setPanel("chat"),
          },
          {
            id: "rank",
            icon: <Trophy size={20} />,
            label: t("贡献榜", "Supporters"),
            onClick: () => setPanel("rank"),
          },
          {
            id: "questions",
            icon: <MessageCircleQuestion size={20} />,
            label: t("提问", "Q&A"),
            onClick: () => setPanel("questions"),
          },
          {
            id: "polls",
            icon: <Vote size={20} />,
            label: t("投票答题", "Polls"),
            badge: openPolls,
            onClick: () => setPanel("polls"),
          },
          {
            id: "mic",
            icon: mySeat ? <MicOff size={20} /> : <Mic size={20} />,
            label: mySeat
              ? t("下麦", "Leave stage")
              : request?.status === "pending"
                ? t("取消申请", "Cancel request")
                : t("申请连麦", "Request mic"),
            pressed: !!mySeat || request?.status === "pending",
            disabled: !live,
            onClick: openMic,
          },
          {
            id: "share",
            icon: <Share2 size={20} />,
            label: t("分享", "Share"),
            onClick: () => setDialog("share"),
          },
        ]}
      />
      <TileGrid
        title={t("直播内容", "Session")}
        tiles={[
          {
            id: "markets",
            icon: <ChartCandlestick size={20} />,
            label: t("推荐品种", "Markets"),
            onClick: () => setPanel("markets"),
          },
          {
            id: "strategies",
            icon: <Target size={20} />,
            label: t("策略", "Strategies"),
            badge: activeStrategies,
            onClick: () => setPanel("strategies"),
          },
          {
            id: "replay",
            icon: <BookOpen size={20} />,
            label: t("章节复盘", "Chapters"),
            onClick: () => setPanel("replay"),
          },
          {
            id: "assistant",
            icon: <Lightbulb size={20} />,
            label: t("直播要点", "Insights"),
            onClick: () => setPanel("assistant"),
          },
          {
            id: "trading",
            icon: <Users size={20} />,
            label: t("一起模拟交易", "Trade together"),
            pressed: shared,
            onClick: () => setPanel("trading"),
          },
          {
            id: "about",
            icon: <UserRound size={20} />,
            label: t("主播介绍", "About"),
            onClick: () => setPanel("about"),
          },
        ]}
      />
      <TileGrid
        title={t("设置", "Settings")}
        tiles={[
          {
            id: "alerts",
            icon: <Bell size={20} />,
            label: alerts
              ? t("已开开播提醒", "Alerts on")
              : t("开播提醒", "Live alerts"),
            pressed: alerts,
            onClick: () =>
              store.dispatch({
                type: "x/subscribe",
                kind: "host",
                id: room.host.id,
              }),
          },
          {
            id: "clean",
            icon: <Eye size={20} />,
            label: t("简洁模式", "Clean mode"),
            pressed: clean,
            onClick: () =>
              store.dispatch({ type: "x/preference", cleanMode: !clean }),
          },
          {
            id: "notices",
            icon: <Bell size={20} />,
            label: t("通知", "Inbox"),
            badge: unreadNotices,
            onClick: () => setDialog("notices"),
          },
          {
            id: "wallet",
            icon: <Wallet size={20} />,
            label: t("直播钱包", "Wallet"),
            onClick: () => setDialog("wallet"),
          },
          {
            id: "play",
            icon: controls.playing ? <Pause size={20} /> : <Play size={20} />,
            label: controls.playing ? t("暂停", "Pause") : t("播放", "Play"),
            onClick: controls.togglePlayback,
            disabled: room.status === "scheduled",
          },
          {
            id: "cc",
            icon: <Captions size={20} />,
            label: t("字幕", "Captions"),
            pressed: controls.cc,
            onClick: controls.toggleCc,
          },
          {
            id: "fullscreen",
            icon: <Expand size={20} />,
            label: t("全屏", "Fullscreen"),
            onClick: controls.fullscreen,
          },
          {
            id: "rules",
            icon: <ScrollText size={20} />,
            label: t("社区规则", "Rules"),
            onClick: () => setPanel("rules"),
          },
        ]}
      />
      <RoomNote lang={lang} />
    </>
  );

  const hostPill = (
    <div className="lv-host">
      <button
        className="lv-host-id"
        onClick={() => community.openProfile(room.host.id)}
      >
        <Avatar profile={room.host} size="sm" />
        <span>
          <b>{personName(room.host, lang)}</b>
          <small>
            {compact(room.host.followers + (following ? 1 : 0))}{" "}
            {t("关注", "followers")}
          </small>
        </span>
      </button>
      <button
        className={`lv-follow${following ? " is-on" : ""}`}
        onClick={toggleFollow}
        aria-label={following ? t("取消关注", "Unfollow") : t("关注", "Follow")}
      >
        {following ? <Check size={14} /> : <Plus size={14} />}
        <span>{following ? t("已关注", "Following") : t("关注", "Follow")}</span>
      </button>
    </div>
  );

  return (
    <div className="lv-room">
      {live && !locked && !clean && (
        <>
          <PacketRain
            packets={store.state.packets}
            roomId={room.id}
            lang={lang}
          />
          <GiftAnimation
            messages={store.state.messages[room.id] || []}
            lang={lang}
          />
        </>
      )}
      {desktop && (
        <aside className="lv-panel lv-panel-info">
          <header className="lv-panel-host">
            <Avatar profile={room.host} size="lg" />
            <div>
              <h1>{t(room.title, room.titleEn)}</h1>
              <button onClick={() => community.openProfile(room.host.id)}>
                {personName(room.host, lang)}
                <BadgeCheck size={14} />
                <span>
                  {compact(room.host.followers + (following ? 1 : 0))}{" "}
                  {t("关注", "followers")}
                </span>
              </button>
            </div>
          </header>
          <div className="lv-panel-actions">
            <button
              className={`ui-btn ${following ? "" : "ui-btn-primary"}`}
              onClick={toggleFollow}
            >
              {following ? <Check size={14} /> : <Plus size={14} />}
              {following ? t("已关注", "Following") : t("关注", "Follow")}
            </button>
            <button
              className="ui-btn"
              aria-pressed={alerts}
              onClick={() =>
                store.dispatch({
                  type: "x/subscribe",
                  kind: "host",
                  id: room.host.id,
                })
              }
            >
              <Bell size={14} />
              {alerts
                ? t("已开启开播提醒", "Alerts on")
                : t("开播提醒", "Live alerts")}
            </button>
            <button
              className="ui-btn"
              aria-pressed={clean}
              onClick={() =>
                store.dispatch({ type: "x/preference", cleanMode: !clean })
              }
            >
              <Eye size={14} />
              {t("简洁模式", "Clean mode")}
            </button>
            <LiveNotices store={store} lang={lang} />
            <button
              className="ui-btn"
              aria-label={t("直播钱包", "Live wallet")}
              onClick={() => setDialog("wallet")}
            >
              <Wallet size={14} />
            </button>
          </div>
          <RoomEvent room={room} store={store} lang={lang} />
          <div
            className="ui-tabs lx-tabs"
            role="tablist"
            aria-label={t("直播内容", "Room details")}
          >
            {(
              [
                "markets",
                "strategies",
                "replay",
                "assistant",
                "trading",
                "about",
              ] as Panel[]
            ).map((id) => (
              <button
                className="ui-tab"
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {titles[id]}
              </button>
            ))}
          </div>
          <div className="lv-panel-body">{content(tab)}</div>
          {tab !== "about" && (
            <RoomNote lang={lang} onRules={() => setPanel("rules")} />
          )}
        </aside>
      )}
      <section className="lv-shell">
        {locked ? (
          <div className="lv-stage lv-stage-locked">
            <img className="lv-video" src="/live/studio-hero.png" alt="" />
            <div className="lv-scrim" aria-hidden="true" />
            <div className="lv-top">
              <button
                className="lv-round lv-back"
                aria-label={t("返回直播大厅", "Back to live rooms")}
                onClick={() => navigateLive()}
              >
                <ChevronLeft size={20} />
              </button>
              {hostPill}
            </div>
            <div className="lv-gate">
              <LockKeyhole size={34} />
              <h2>{t("关注主播后观看", "Follow to watch")}</h2>
              <p>{t(room.title, room.titleEn)}</p>
              <button className="lv-cta" onClick={toggleFollow}>
                {t("关注并进入", "Follow & enter")}
              </button>
            </div>
          </div>
        ) : (
          <LiveStage
            room={room}
            store={store}
            instruments={instruments}
            lang={lang}
            onToast={onToast}
            remember
            seek={seek}
            className={room.status === "ended" ? "has-progress" : ""}
            waitingAction={
              <ReminderButton room={room} store={store} lang={lang} />
            }
          >
            {(controls) => (
              <>
                <div
                  className="lv-tap"
                  onClick={() => setComposing(false)}
                  onDoubleClick={like}
                  aria-hidden="true"
                />
                {hearts}
                <div className="lv-top">
                  <button
                    className="lv-round lv-back"
                    aria-label={t("返回直播大厅", "Back to live rooms")}
                    onClick={() => navigateLive()}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  {hostPill}
                  <div className="lv-top-right">
                    <button
                      className="lv-audience"
                      onClick={() => setPanel("rank")}
                      aria-label={t("贡献榜", "Top supporters")}
                    >
                      {supporters.map(([id], index) => (
                        <Avatar
                          key={id}
                          profile={{
                            name: label(lang, ...(SUPPORTER_NAMES[id] || [id, id])),
                            initials: (SUPPORTER_NAMES[id]?.[1] || id).slice(
                              0,
                              2,
                            ),
                            color: index === 0 ? "amber" : "violet",
                          }}
                          size="sm"
                        />
                      ))}
                      <span className="lv-audience-count">
                        <Users size={12} />
                        {compact(room.viewers)}
                      </span>
                    </button>
                    <button
                      className="lv-round lv-close"
                      aria-label={t("退出直播间", "Leave room")}
                      onClick={() => navigateLive()}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="lv-chips">
                  <LiveClock room={room} lang={lang} />
                  <button
                    className="lv-chip"
                    onClick={() => setPanel("markets")}
                  >
                    <ChartCandlestick size={12} />
                    {room.symbols[0]}
                  </button>
                  {data.eventId && (
                    <button
                      className="lv-chip"
                      onClick={() => setPanel("about")}
                    >
                      <Info size={12} />
                      {t("财经事件", "Event")}
                    </button>
                  )}
                  <button
                    className="lv-chip lv-chip-rank"
                    onClick={() => setPanel("rank")}
                  >
                    <Trophy size={12} />
                    {t("贡献榜", "Supporters")}
                  </button>
                </div>
                <button
                  className="lv-announce"
                  onClick={() => setPanel("about")}
                >
                  <Megaphone size={13} />
                  <span>{t(room.announcement, room.announcementEn)}</span>
                </button>
                {room.status !== "scheduled" && (
                  <SoundToggle controls={controls} lang={lang} />
                )}
                {room.status !== "scheduled" && (
                  <SeatRail
                    room={room}
                    seats={seats}
                    lang={lang}
                    onEmpty={live && !mySeat && request?.status !== "pending" ? openMic : undefined}
                    emptyLabel={t("连麦", "Join")}
                  />
                )}
                <div className="lv-stack">
                  {request?.status === "pending" && (
                    <p className="lv-feedback">
                      {t("连麦申请中…", "Speaker request pending…")}
                      <button onClick={micState.leave}>{t("取消", "Cancel")}</button>
                    </p>
                  )}
                  {request?.status === "rejected" && (
                    <p className="lv-feedback">
                      {t(
                        "本次连麦申请未通过，你可以稍后重新申请。",
                        "Your request was declined. You can request again later.",
                      )}
                    </p>
                  )}
                  {mySeat && (
                    <p className="lv-feedback">
                      {t("你正在连麦", "You are on stage")}
                      <button
                        onClick={() =>
                          store.dispatch({
                            type: "toggleMic",
                            roomId: room.id,
                            userId: ME,
                          })
                        }
                      >
                        {mySeat.muted
                          ? t("开启麦克风", "Unmute mic")
                          : t("关闭麦克风", "Mute mic")}
                      </button>
                      <button onClick={micState.leave}>{t("下麦", "Leave")}</button>
                    </p>
                  )}
                  <OnAirQuestion room={room} store={store} lang={lang} />
                  {!clean && (
                    <OverlayChat room={room} store={store} lang={lang} />
                  )}
                </div>
                <div className="lv-side-stack">
                  <PollFloat room={room} store={store} lang={lang} onOpen={() => setPanel("polls")} />
                  <PacketFloat
                    packets={packets}
                    lang={lang}
                    onOpen={() => setDialog("packet")}
                  />
                  {focus && room.status !== "scheduled" && (
                    <button
                      className="lv-focus"
                      onClick={() => quickOrder(focus.symbol, "buy")}
                    >
                      <small>{t("讲解中", "In focus")}</small>
                      <b>{focus.symbol}</b>
                      <strong>{focus.price.toFixed(focus.decimals)}</strong>
                      <em
                        className={
                          focus.changePercent24h >= 0 ? "positive" : "negative"
                        }
                      >
                        {focus.changePercent24h >= 0 ? "+" : ""}
                        {focus.changePercent24h.toFixed(2)}%
                      </em>
                      <span>{t("模拟交易", "Trade")}</span>
                    </button>
                  )}
                </div>
                {room.status === "ended" && (
                  <div className="lv-progress">
                    <button
                      aria-label={
                        controls.playing ? t("暂停", "Pause") : t("播放", "Play")
                      }
                      onClick={controls.togglePlayback}
                    >
                      {controls.playing ? (
                        <Pause size={15} fill="currentColor" />
                      ) : (
                        <Play size={15} fill="currentColor" />
                      )}
                    </button>
                    <time>{playbackTime(controls.progress)}</time>
                    <input
                      type="range"
                      aria-label={t("播放进度", "Playback position")}
                      min="0"
                      max={controls.duration || 1}
                      step=".1"
                      value={controls.progress}
                      onChange={(e) => controls.seekTo(Number(e.target.value))}
                    />
                    <time>{playbackTime(controls.duration)}</time>
                  </div>
                )}
                <div className={`lv-bar${composing ? " is-composing" : ""}`}>
                  <Composer
                    room={room}
                    store={store}
                    lang={lang}
                    studio={false}
                    open={composing}
                    onOpen={() => setComposing(true)}
                    onClose={() => setComposing(false)}
                  />
                  {!composing && (
                    <>
                      <button
                        className="lv-action"
                        aria-label={t("推荐品种与交易", "Markets & trading")}
                        onClick={() => setPanel("markets")}
                      >
                        <ChartCandlestick size={19} />
                      </button>
                      <button
                        className="lv-action lv-action-packet"
                        aria-label={t("红包", "Red packets")}
                        onClick={() => setDialog("packet")}
                      >
                        <span>福</span>
                        {packets.length > 0 && <b>{packets.length}</b>}
                      </button>
                      <button
                        className="lv-action lv-action-gift"
                        aria-label={t("送礼物", "Send a gift")}
                        disabled={!live}
                        onClick={() => setDialog("gift")}
                      >
                        <Gift size={19} />
                      </button>
                      <button
                        className="lv-action lv-action-like"
                        aria-label={`${t("点赞", "Like")} ${compact(store.state.likes[room.id] || 0)}`}
                        onClick={like}
                      >
                        <Heart
                          size={19}
                          className={store.state.likes[room.id] ? "liked" : ""}
                        />
                        <small>{compact(store.state.likes[room.id] || 0)}</small>
                      </button>
                      <button
                        className="lv-action"
                        aria-label={t("更多功能", "More")}
                        onClick={() => setPanel("more")}
                      >
                        <Ellipsis size={19} />
                        {openPolls + unreadNotices > 0 && <i />}
                      </button>
                    </>
                  )}
                </div>
                {panel && (
                  <Sheet
                    key={panel}
                    lang={lang}
                    title={titles[panel]}
                    tall={panel !== "more"}
                    onClose={() => setPanel(null)}
                  >
                    {panel === "more" ? moreTiles(controls) : content(panel)}
                  </Sheet>
                )}
              </>
            )}
          </LiveStage>
        )}
      </section>
      {desktop && (
        <aside className="lv-panel lv-panel-chat">
          <ViewerInteraction room={room} store={store} lang={lang} />
        </aside>
      )}
      {draft && !locked && (
        <LiveRoomTrade
          key={draft.symbol + (draft.strategy?.id || "")}
          draft={draft}
          instruments={instruments}
          demo={demo}
          room={room}
          store={store}
          lang={lang}
          onClose={() => setDraft(null)}
          onFullTrade={onQuickTrade}
          onToast={onToast}
        />
      )}
      {dialog === "gift" && (
        <GiftDialog
          store={store}
          lang={lang}
          room={room}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "wallet" && (
        <WalletDialog
          store={store}
          lang={lang}
          userId={ME}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "packet" && (
        <PacketDialog
          store={store}
          lang={lang}
          room={room}
          studio={false}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "share" && (
        <ShareDialog
          room={room}
          lang={lang}
          onToast={onToast}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "notices" && (
        <NoticesDialog
          store={store}
          lang={lang}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "join" && (
        <LiveDialog
          title={t("加入一起模拟交易", "Join paper trading")}
          onClose={() => setDialog(null)}
        >
          <div className="live-join-info">
            <Users size={30} />
            <p>
              {t(
                "加入后，你的模拟持仓、盈亏及交易动态将在本直播间展示。你可以随时退出。",
                "Your paper positions, P&L and activity will be visible in this room. You can leave at any time.",
              )}
            </p>
          </div>
          <div className="lx-form">
            <label>
              {t("分享范围", "Sharing scope")}
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "new" | "all")}
              >
                <option value="new">
                  {t(
                    "仅加入后新建的持仓与交易",
                    "New positions and trades after joining",
                  )}
                </option>
                <option value="all">
                  {t("全部模拟持仓与交易", "All paper positions and trades")}
                </option>
              </select>
            </label>
            <small>
              {t(
                "退出分享或离开直播间后，持仓将从本场展示中移除。",
                "Leaving the room or stopping sharing removes your positions from this session.",
              )}
            </small>
          </div>
          <div className="live-dialog-actions">
            <button className="ui-btn" onClick={() => setDialog(null)}>
              {t("取消", "Cancel")}
            </button>
            <button
              className="ui-btn ui-btn-primary"
              onClick={() => {
                store.dispatch({
                  type: "x/share",
                  roomId: room.id,
                  scope,
                  at: Date.now(),
                });
                setDialog(null);
              }}
            >
              {t("同意并加入", "Agree & join")}
            </button>
          </div>
        </LiveDialog>
      )}
    </div>
  );
}

function RoomNote({ lang, onRules }: { lang: Lang; onRules?: () => void }) {
  return (
    <div className="live-room-note">
      <Info size={12} />
      <span>
        {label(
          lang,
          "内容仅供交流，不构成投资建议。交易及直播余额均为虚拟资金。",
          "For discussion only, not investment advice. Trading and live balances use virtual funds.",
        )}
      </span>
      {onRules && (
        <button onClick={onRules}>
          {label(lang, "社区规则", "Community rules")}
        </button>
      )}
    </div>
  );
}

function TradingHub({
  room,
  store,
  instruments,
  demo,
  lang,
  onJoin,
  onQuickTrade,
}: {
  room: LiveRoom;
  store: LiveStore;
  instruments: Instrument[];
  demo: DemoTrading;
  lang: Lang;
  onJoin: () => void;
  onQuickTrade: Props["onQuickTrade"];
}) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    shared = store.state.shared.includes(room.id);
  const [selected, setSelected] = useState(room.host.id),
    [tab, setTab] = useState("positions");
  useEffect(() => {
    if (!shared && selected === ME) setSelected(room.host.id);
  }, [shared, selected, room.host.id]);
  const sharing = store.state.experience.sharing[room.id];
  const visiblePositions = demo.positions.filter(
    (p) => sharing?.scope === "all" || (sharing && p.openedAt >= sharing.since),
  );
  const visibleFills = demo.fills.filter(
    (f) => sharing?.scope === "all" || (sharing && f.openedAt >= sharing.since),
  );
  const traders = [
    {
      id: room.host.id,
      name: personName(room.host, lang),
      pnl: 1286.42,
      color: room.host.color,
    },
    { id: "user-oliver", name: "Oliver", pnl: 846.28, color: "amber" },
    { id: "user-mia", name: t("小麦", "Mia"), pnl: 395.16, color: "violet" },
    ...(shared
      ? [
          {
            id: ME,
            name: VIEWER.name,
            pnl: visiblePositions.reduce((a, p) => a + p.pnl, 0),
            color: "blue",
          },
        ]
      : []),
  ].sort((a, b) => b.pnl - a.pnl);
  const hostPositions = room.symbols.slice(0, 2).flatMap((s, index) => {
    const i = instruments.find((x) => x.symbol === s);
    if (!i) return [];
    return [
      {
        id: `${selected}-${s}`,
        symbol: s,
        side: index ? ("sell" as const) : ("buy" as const),
        qty: index ? 2 : 1,
        entryPrice: i.price * (index ? 1.005 : 0.992),
        pnl: index ? 186.24 : 426.56,
        roe: index ? 8.42 : 16.8,
        decimals: i.decimals,
      },
    ];
  });
  const positions = selected === ME ? visiblePositions : hostPositions;
  return (
    <div className="live-trading-hub">
      <div className="live-hub-top">
        <span>
          <Users size={15} />
          {traders.length} {t("人参与", "participants")}
        </span>
        <button
          className={`ui-btn ${shared ? "" : "ui-btn-soft"}`}
          onClick={onJoin}
        >
          {shared ? <Check size={14} /> : <Plus size={14} />}
          {shared ? t("已加入 · 退出", "Joined · Leave") : t("加入", "Join")}
        </button>
      </div>
      <div className="live-hub-layout">
        <div className="live-trader-list">
          {traders.map((p, index) => (
            <button
              key={p.id}
              aria-pressed={p.id === selected}
              onClick={() => setSelected(p.id)}
            >
              <span>{index + 1}</span>
              <Avatar
                profile={{
                  name: p.name,
                  initials: p.name.slice(0, 2),
                  color: p.color,
                }}
                size="sm"
              />
              <span>
                <strong>{p.name}</strong>
                <small className={p.pnl >= 0 ? "positive" : "negative"}>
                  {p.pnl >= 0 ? "+" : ""}
                  {p.pnl.toFixed(2)}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="live-trader-detail">
          <div className="ui-seg">
            <button
              aria-pressed={tab === "positions"}
              onClick={() => setTab("positions")}
            >
              {t("持仓", "Positions")}
            </button>
            <button
              aria-pressed={tab === "activity"}
              onClick={() => setTab("activity")}
            >
              {t("交易动态", "Activity")}
            </button>
          </div>
          {tab === "positions" ? (
            <div className="live-position-list">
              {positions.length ? (
                positions.map((p) => (
                  <article key={p.id}>
                    <div>
                      <b>{p.symbol}</b>
                      <span
                        className={p.side === "buy" ? "positive" : "negative"}
                      >
                        {p.side === "buy" ? t("多", "Long") : t("空", "Short")}{" "}
                        · {p.qty}
                      </span>
                    </div>
                    <strong className={p.pnl >= 0 ? "positive" : "negative"}>
                      {p.pnl >= 0 ? "+" : ""}
                      {p.pnl.toFixed(2)} <small>({p.roe.toFixed(2)}%)</small>
                    </strong>
                    <footer>
                      <span>
                        {t("开仓价", "Entry")}{" "}
                        {p.entryPrice.toFixed(p.decimals)}
                      </span>
                      <button
                        className="live-text-btn"
                        onClick={() => onQuickTrade(p.symbol, p.side)}
                      >
                        {selected === ME
                          ? t("加仓", "Add")
                          : t(
                              `跟单${p.side === "buy" ? "做多" : "做空"}`,
                              `Copy ${p.side === "buy" ? "long" : "short"}`,
                            )}
                        <ArrowUpRight size={13} />
                      </button>
                    </footer>
                  </article>
                ))
              ) : (
                <EmptyState>{t("暂无持仓", "No open positions")}</EmptyState>
              )}
            </div>
          ) : (
            <div className="live-activity-list">
              {selected === ME ? (
                visibleFills.length ? (
                  visibleFills.slice(0, 10).map((f) => (
                    <div key={f.id}>
                      <span>
                        <b>{f.symbol}</b>
                        <small>
                          <DateLabel at={f.closedAt} lang={lang} />
                        </small>
                      </span>
                      <span>
                        {t("平仓", "Closed")}
                        <b className={f.pnl >= 0 ? "positive" : "negative"}>
                          {f.pnl.toFixed(2)}
                        </b>
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState>
                    {t("暂无交易记录", "No activity yet")}
                  </EmptyState>
                )
              ) : (
                hostPositions.map((p) => (
                  <div key={p.id}>
                    <span>
                      <b>{p.symbol}</b>
                      <small>{t("本场直播", "This session")}</small>
                    </span>
                    <span>
                      {p.side === "buy"
                        ? t("买入开仓", "Opened long")
                        : t("卖出开仓", "Opened short")}
                      <b>{p.entryPrice.toFixed(p.decimals)}</b>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
