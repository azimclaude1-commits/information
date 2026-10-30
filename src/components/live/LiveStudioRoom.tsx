import React, { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Captions,
  ChevronLeft,
  Ellipsis,
  Expand,
  Gift,
  Heart,
  LayoutPanelTop,
  Megaphone,
  MessageCircle,
  MessageCircleQuestion,
  Mic,
  Pause,
  Play,
  Settings2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Target,
  Users,
  Volume2,
  VolumeX,
  Vote,
  Wallet,
  XCircle,
} from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { useMinWidth } from "../marketModel";
import { Avatar, LiveDialog } from "./LiveShared";
import {
  LiveStudioTools,
  StudioAnalytics,
  StudioModeration,
} from "./LiveStudioTools";
import { OnAirQuestion, StudioPolls, StudioQuestions } from "./LiveEngagement";
import { StudioStrategies } from "./LiveStrategies";
import { StudioReplay } from "./LiveReplay";
import { LiveClock, LiveStage, type StageControls } from "./LiveStage";
import { LiveChat } from "./LiveChat";
import { GiftAnimation } from "./GiftAnimation";
import { useRoomActivity } from "./useRoomActivity";
import { LiveStudioPanel } from "./LiveStudioPanel";
import { PacketDialog, ShareDialog, WalletDialog } from "./LiveDialogs";
import {
  Composer,
  OverlayChat,
  SeatRail,
  Sheet,
  SoundToggle,
  TileGrid,
  useImmersiveLock,
} from "./LiveImmersive";
import {
  compact,
  label,
  money,
  type Lang,
  type LiveRoom,
} from "./liveState";
import { navigateStudio, type LiveStore } from "./useLive";

type Panel =
  | "more"
  | "mic"
  | "content"
  | "permissions"
  | "chat"
  | "questions"
  | "polls"
  | "strategies"
  | "replay"
  | "analytics"
  | "manage";

export function LiveStudioRoom({
  room,
  store,
  instruments,
  lang,
  onToast,
  onEdit,
}: {
  room: LiveRoom;
  store: LiveStore;
  instruments: Instrument[];
  lang: Lang;
  onToast: (s: string) => void;
  onEdit: () => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const desktop = useMinWidth(1024);
  const [dialog, setDialog] = useState<
    "wallet" | "packet" | "share" | "end" | "cancel" | null
  >(null);
  const [side, setSide] = useState("control");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [composing, setComposing] = useState(false);
  const live = room.status === "live",
    seats = store.state.seats[room.id] || [];
  useImmersiveLock(!desktop);
  useRoomActivity(room, store);
  useEffect(() => {
    if (desktop && panel === "more") setPanel(null);
  }, [desktop]);
  const requests = (store.state.requests[room.id] || []).filter(
    (r) => r.status === "pending",
  ).length;
  const earned = store.state.ledger
    .filter((l) => l.roomId === room.id && l.kind === "received")
    .reduce((sum, l) => sum + l.amount, 0);
  const pendingQuestions = store.state.experience.rooms[
    room.id
  ].questions.filter((q) => q.status === "pending" && !q.mergedInto).length;
  const pendingReports = store.state.experience.rooms[room.id].reports.filter(
    (r) => r.status === "pending",
  ).length;
  const goLive = () =>
    store.dispatch({
      type: "room",
      room: {
        ...room,
        status: "live",
        startsAt: Date.now(),
        endedAt: undefined,
      },
    });
  const statusText = live
    ? t("正在直播", "On air")
    : room.status === "scheduled"
      ? t("等待开播", "Scheduled")
      : t("直播已结束", "Session ended");

  const titles: Record<Panel, string> = {
    more: t("主播工具", "Host tools"),
    mic: t("连麦管理", "Speakers"),
    content: t("内容与画面", "Content & screen"),
    permissions: t("发言与屏蔽", "Chat controls"),
    chat: t("聊天室", "Chat"),
    questions: t("答疑", "Q&A"),
    polls: t("投票与答题", "Activities"),
    strategies: t("策略", "Strategies"),
    replay: t("回放与复盘", "Replay & recap"),
    analytics: t("数据", "Analytics"),
    manage: t("房间管理", "Moderation"),
  };
  const panelProps = { room, store, lang };
  const content = (id: Panel) => {
    switch (id) {
      case "mic":
      case "content":
      case "permissions":
        return (
          <LiveStudioPanel
            room={room}
            store={store}
            instruments={instruments}
            lang={lang}
            onToast={onToast}
            onEdit={onEdit}
            initialTab={id === "permissions" ? "moderation" : id}
          />
        );
      case "chat":
        return <LiveChat {...panelProps} studio />;
      case "questions":
        return <StudioQuestions {...panelProps} />;
      case "polls":
        return <StudioPolls {...panelProps} />;
      case "strategies":
        return <StudioStrategies {...panelProps} instruments={instruments} />;
      case "replay":
        return <StudioReplay {...panelProps} />;
      case "analytics":
        return <StudioAnalytics {...panelProps} />;
      case "manage":
        return <StudioModeration {...panelProps} />;
      default:
        return null;
    }
  };
  const moreTiles = (controls: StageControls) => (
    <>
      <TileGrid
        title={t("控制台", "Control room")}
        tiles={[
          {
            id: "mic",
            icon: <Mic size={20} />,
            label: t("连麦管理", "Speakers"),
            badge: requests,
            onClick: () => setPanel("mic"),
          },
          {
            id: "content",
            icon: <LayoutPanelTop size={20} />,
            label: t("内容与画面", "Content"),
            onClick: () => setPanel("content"),
          },
          {
            id: "permissions",
            icon: <SlidersHorizontal size={20} />,
            label: t("发言与屏蔽", "Chat controls"),
            onClick: () => setPanel("permissions"),
          },
          {
            id: "chat",
            icon: <MessageCircle size={20} />,
            label: t("聊天室", "Chat"),
            onClick: () => setPanel("chat"),
          },
        ]}
      />
      <TileGrid
        title={t("互动", "Engagement")}
        tiles={[
          {
            id: "questions",
            icon: <MessageCircleQuestion size={20} />,
            label: t("答疑", "Q&A"),
            badge: pendingQuestions,
            onClick: () => setPanel("questions"),
          },
          {
            id: "polls",
            icon: <Vote size={20} />,
            label: t("投票答题", "Polls"),
            onClick: () => setPanel("polls"),
          },
          {
            id: "strategies",
            icon: <Target size={20} />,
            label: t("策略", "Strategies"),
            onClick: () => setPanel("strategies"),
          },
          {
            id: "packet",
            icon: <span className="lv-fu">福</span>,
            label: t("发红包", "Red packet"),
            disabled: !live,
            onClick: () => setDialog("packet"),
          },
        ]}
      />
      <TileGrid
        title={t("运营", "Operations")}
        tiles={[
          {
            id: "replay",
            icon: <BookOpen size={20} />,
            label: t("回放与复盘", "Replay"),
            onClick: () => setPanel("replay"),
          },
          {
            id: "analytics",
            icon: <BarChart3 size={20} />,
            label: t("数据", "Analytics"),
            onClick: () => setPanel("analytics"),
          },
          {
            id: "manage",
            icon: <ShieldCheck size={20} />,
            label: t("房间管理", "Moderation"),
            badge: pendingReports,
            onClick: () => setPanel("manage"),
          },
          {
            id: "wallet",
            icon: <Wallet size={20} />,
            label: t("礼物收入", "Gift income"),
            onClick: () => setDialog("wallet"),
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
        title={t("直播", "Broadcast")}
        tiles={[
          {
            id: "settings",
            icon: <Settings2 size={20} />,
            label: t("直播设置", "Settings"),
            onClick: onEdit,
          },
          {
            id: "play",
            icon: controls.playing ? <Pause size={20} /> : <Play size={20} />,
            label: controls.playing
              ? t("暂停预览", "Pause preview")
              : t("继续预览", "Resume preview"),
            disabled: room.status === "scheduled",
            onClick: controls.togglePlayback,
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
          ...(room.status === "scheduled"
            ? [
                {
                  id: "cancel",
                  icon: <XCircle size={20} />,
                  label: t("取消直播", "Cancel session"),
                  tone: "danger" as const,
                  onClick: () => setDialog("cancel"),
                },
              ]
            : live
              ? [
                  {
                    id: "end",
                    icon: <Square size={18} />,
                    label: t("结束直播", "End live"),
                    tone: "danger" as const,
                    onClick: () => setDialog("end"),
                  },
                ]
              : []),
        ]}
      />
    </>
  );

  return (
    <div className="lv-room lv-room-studio">
      {live && (
        <GiftAnimation
          messages={store.state.messages[room.id] || []}
          lang={lang}
        />
      )}
      {desktop && (
        <aside className="lv-panel lv-panel-info">
          <header className="lv-panel-host">
            <Avatar profile={room.host} size="lg" />
            <div>
              <h1>{t(room.title, room.titleEn)}</h1>
              <span className="lv-panel-status">
                <i className={live ? "live-dot" : ""} />
                {statusText} · {room.pinnedSymbol}
              </span>
            </div>
          </header>
          <div className="lv-stats">
            {[
              [t("在线", "Viewers"), compact(room.viewers)],
              [t("连麦申请", "Requests"), requests],
              [t("本场礼物", "Gifts"), `${money(earned)}`],
              [t("点赞", "Likes"), store.state.likes[room.id] || 0],
            ].map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="lv-panel-actions">
            <button className="ui-btn" onClick={onEdit}>
              <Settings2 size={14} />
              {t("设置", "Settings")}
            </button>
            <button className="ui-btn" onClick={() => setDialog("share")}>
              <Share2 size={14} />
              {t("分享", "Share")}
            </button>
            <button className="ui-btn" onClick={() => setDialog("wallet")}>
              <Gift size={14} />
              {t("礼物收入", "Gift income")}
            </button>
            {room.status === "scheduled" && (
              <button className="ui-btn" onClick={() => setDialog("cancel")}>
                {t("取消直播", "Cancel session")}
              </button>
            )}
            <button
              disabled={room.status === "ended"}
              className={`ui-btn ${live ? "live-end-btn" : "ui-btn-primary"}`}
              onClick={() => (live ? setDialog("end") : goLive())}
            >
              {live ? (
                <Square size={12} fill="currentColor" />
              ) : (
                <Play size={14} />
              )}
              {live
                ? t("结束直播", "End live")
                : room.status === "ended"
                  ? t("本场已结束", "Session ended")
                  : t("开始直播", "Go live")}
            </button>
          </div>
          <div className="lv-panel-body lv-panel-tools">
            <LiveStudioTools
              room={room}
              store={store}
              lang={lang}
              instruments={instruments}
            />
          </div>
        </aside>
      )}
      <section className="lv-shell">
        <LiveStage
          room={room}
          store={store}
          instruments={instruments}
          lang={lang}
          onToast={onToast}
          className="is-studio"
          waitingAction={
            <div className="lv-golive">
              <button className="lv-cta" onClick={goLive}>
                <Play size={16} fill="currentColor" />
                {t("开始直播", "Go live")}
              </button>
              <button onClick={() => setDialog("cancel")}>
                {t("取消本场直播", "Cancel session")}
              </button>
            </div>
          }
        >
          {(controls) => (
            <>
              <div
                className="lv-tap"
                onClick={() => setComposing(false)}
                aria-hidden="true"
              />
              <div className="lv-top">
                <button
                  className="lv-round lv-back"
                  aria-label={t("返回直播工作台", "Back to live studio")}
                  onClick={() => navigateStudio()}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="lv-host">
                  <span className="lv-host-id">
                    <Avatar profile={room.host} size="sm" />
                    <span>
                      <b>{t(room.title, room.titleEn)}</b>
                      <small>
                        <i className={live ? "live-dot" : ""} />
                        {statusText}
                      </small>
                    </span>
                  </span>
                </div>
                <div className="lv-top-right">
                  <span className="lv-audience-count">
                    <Users size={12} />
                    {compact(room.viewers)}
                  </span>
                  {live && (
                    <button
                      className="lv-end"
                      onClick={() => setDialog("end")}
                    >
                      <Square size={10} fill="currentColor" />
                      {t("结束", "End")}
                    </button>
                  )}
                </div>
              </div>
              <div className="lv-chips">
                <LiveClock room={room} lang={lang} />
                <button className="lv-chip" onClick={() => setPanel("mic")}>
                  <Mic size={12} />
                  {t("连麦申请", "Requests")} {requests}
                </button>
                <button
                  className="lv-chip"
                  onClick={() => setDialog("wallet")}
                >
                  <Gift size={12} />
                  {money(earned)} USDT
                </button>
                <span className="lv-chip">
                  <Heart size={12} />
                  {compact(store.state.likes[room.id] || 0)}
                </span>
              </div>
              <button
                className="lv-announce"
                onClick={() => setPanel("content")}
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
                  onSeat={() => setPanel("mic")}
                />
              )}
              {room.status === "ended" && (
                <div className="lv-ended">
                  <h2>
                    {room.cancelled
                      ? t("本场直播已取消", "This session was cancelled")
                      : t("本场直播已结束", "This session has ended")}
                  </h2>
                  {!room.cancelled && (
                    <p>
                      {t(
                        "录制内容已保存为回放草稿，核对复盘后即可发布。",
                        "The recording is saved as a replay draft. Review the recap before publishing.",
                      )}
                    </p>
                  )}
                  <div>
                    <button
                      className="lv-cta"
                      onClick={() => setPanel("replay")}
                    >
                      <BookOpen size={15} />
                      {t("回放与复盘", "Replay & recap")}
                    </button>
                    <button onClick={() => setPanel("analytics")}>
                      <BarChart3 size={15} />
                      {t("本场数据", "Analytics")}
                    </button>
                  </div>
                </div>
              )}
              <div className="lv-stack">
                <OnAirQuestion room={room} store={store} lang={lang} />
                <OverlayChat room={room} store={store} lang={lang} />
              </div>
              <div className={`lv-bar${composing ? " is-composing" : ""}`}>
                <Composer
                  room={room}
                  store={store}
                  lang={lang}
                  studio
                  open={composing}
                  onOpen={() => setComposing(true)}
                  onClose={() => setComposing(false)}
                />
                {!composing && (
                  <>
                    <button
                      className="lv-action"
                      aria-label={t("连麦管理", "Speakers")}
                      onClick={() => setPanel("mic")}
                    >
                      <Mic size={19} />
                      {requests > 0 && <b>{requests}</b>}
                    </button>
                    <button
                      className="lv-action"
                      aria-label={t("答疑", "Q&A")}
                      onClick={() => setPanel("questions")}
                    >
                      <MessageCircleQuestion size={19} />
                      {pendingQuestions > 0 && <b>{pendingQuestions}</b>}
                    </button>
                    <button
                      className="lv-action"
                      aria-label={t("策略", "Strategies")}
                      onClick={() => setPanel("strategies")}
                    >
                      <Target size={19} />
                    </button>
                    <button
                      className="lv-action lv-action-packet"
                      aria-label={t("发红包", "Red packet")}
                      disabled={!live}
                      onClick={() => setDialog("packet")}
                    >
                      <span>福</span>
                    </button>
                    <button
                      className="lv-action"
                      aria-label={t("主播工具", "Host tools")}
                      onClick={() => setPanel("more")}
                    >
                      <Ellipsis size={19} />
                      {pendingReports > 0 && <i />}
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
      </section>
      {desktop && (
        <aside className="lv-panel lv-panel-chat">
          <div className="live-sidebar-switch ui-seg">
            <button
              aria-pressed={side === "control"}
              onClick={() => setSide("control")}
            >
              {t("控制台", "Controls")}
            </button>
            <button
              aria-pressed={side === "chat"}
              onClick={() => setSide("chat")}
            >
              {t("聊天室", "Chat")}
            </button>
          </div>
          {side === "control" ? (
            <LiveStudioPanel
              room={room}
              store={store}
              instruments={instruments}
              lang={lang}
              onToast={onToast}
              onEdit={onEdit}
            />
          ) : (
            <LiveChat room={room} store={store} lang={lang} studio />
          )}
        </aside>
      )}
      {dialog === "wallet" && (
        <WalletDialog
          store={store}
          lang={lang}
          userId={room.host.id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "packet" && (
        <PacketDialog
          store={store}
          lang={lang}
          room={room}
          studio
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
      {dialog === "cancel" && (
        <LiveDialog
          title={t("取消本场直播？", "Cancel this session?")}
          onClose={() => setDialog(null)}
        >
          <p>
            {t(
              "已预约的观众将收到取消通知。",
              "Reserved viewers will receive a cancellation notice.",
            )}
          </p>
          <div className="live-dialog-actions">
            <button className="ui-btn" onClick={() => setDialog(null)}>
              {t("保留安排", "Keep session")}
            </button>
            <button
              className="ui-btn live-end-btn"
              onClick={() => {
                store.dispatch({
                  type: "room",
                  room: {
                    ...room,
                    status: "ended",
                    cancelled: true,
                    endedAt: Date.now(),
                  },
                });
                setDialog(null);
              }}
            >
              {t("确认取消", "Confirm cancellation")}
            </button>
          </div>
        </LiveDialog>
      )}
      {dialog === "end" && (
        <LiveDialog
          title={t("结束本场直播？", "End this session?")}
          onClose={() => setDialog(null)}
        >
          <p className="text-ink-2">
            {t(
              "结束后将关闭连麦和互动。录制内容将保存为回放草稿，核对后即可发布。",
              "This closes speakers and chat. Recordings become drafts for review and publication.",
            )}
          </p>
          <div className="live-dialog-actions">
            <button className="ui-btn" onClick={() => setDialog(null)}>
              {t("继续直播", "Keep streaming")}
            </button>
            <button
              className="ui-btn live-end-btn"
              onClick={() => {
                store.dispatch({
                  type: "room",
                  room: { ...room, status: "ended", endedAt: Date.now() },
                });
                setDialog(null);
              }}
            >
              {t("结束直播", "End session")}
            </button>
          </div>
        </LiveDialog>
      )}
    </div>
  );
}
