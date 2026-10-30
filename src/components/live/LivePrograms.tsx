import React, { useState } from "react";
import { Bell, CalendarDays, Check, X } from "lucide-react";
import { ECONOMIC_CALENDAR_DATA } from "../../data/marketData";
import { LiveDialog, DateLabel, EmptyState } from "./LiveShared";
import { HOSTS, label, type Lang, type LiveRoom } from "./liveState";
import { LIVE_SERIES } from "./liveExperience";
import { navigateLive, type LiveStore } from "./useLive";

export function ReminderButton({
  room,
  store,
  lang,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const t = (zh: string, en: string) => label(lang, zh, en);
  const reserved = store.state.reservations.includes(room.id);
  return (
    <>
      <button
        className={`ui-btn ${reserved ? "" : "ui-btn-soft"}`}
        onClick={() => setOpen(true)}
      >
        <Bell size={14} />
        {reserved ? t("已预约", "Reserved") : t("预约直播", "Reserve")}
      </button>
      {open && (
        <LiveDialog
          title={t("开播提醒", "Live reminder")}
          onClose={() => setOpen(false)}
        >
          <p>{t(room.title, room.titleEn)}</p>
          <p className="text-ink-3">
            <DateLabel at={room.startsAt} lang={lang} />
          </p>
          <div className="lx-options">
            {[1, 5, 10, 30, 60, 1440].map((minutes) => (
              <button
                className="ui-chip"
                aria-pressed={
                  reserved &&
                  (store.state.experience.reminders[room.id] ?? 10) === minutes
                }
                key={minutes}
                onClick={() => {
                  store.dispatch({
                    type: "x/reminder",
                    roomId: room.id,
                    minutes,
                  });
                  setOpen(false);
                }}
              >
                {minutes === 1440
                  ? t("提前一天", "1 day before")
                  : `${t("提前", "")} ${minutes} ${t("分钟", "minutes before")}`}
              </button>
            ))}
          </div>
          {reserved && (
            <button
              className="ui-btn lx-full"
              onClick={() => {
                store.dispatch({
                  type: "x/reminder",
                  roomId: room.id,
                  minutes: null,
                });
                setOpen(false);
              }}
            >
              {t("取消预约", "Cancel reservation")}
            </button>
          )}
        </LiveDialog>
      )}
    </>
  );
}

export function LiveNotices({
  store,
  lang,
  className = "ui-btn",
}: {
  store: LiveStore;
  lang: Lang;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = (zh: string, en: string) => label(lang, zh, en);
  const unread = store.state.experience.notices.filter((n) => !n.read).length;
  return (
    <>
      <button
        className={className}
        onClick={() => setOpen(true)}
        aria-label={t("直播通知", "Live notifications")}
      >
        <Bell size={15} />
        <span>{t("通知", "Inbox")}</span>
        {unread > 0 && <b className="lx-count">{unread}</b>}
      </button>
      {open && (
        <NoticesDialog
          store={store}
          lang={lang}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function NoticesDialog({
  store,
  lang,
  onClose,
}: {
  store: LiveStore;
  lang: Lang;
  onClose: () => void;
}) {
  const x = store.state.experience;
  const t = (zh: string, en: string) => label(lang, zh, en);
  const unread = x.notices.filter((n) => !n.read).length;
  const [tab, setTab] = useState<"inbox" | "subs">("inbox");
  const reserved = store.state.rooms.filter(
    (r) => store.state.reservations.includes(r.id) && r.status === "scheduled",
  );
  return (
    <LiveDialog title={t("直播通知", "Live notifications")} onClose={onClose}>
      <div className="lx-options">
        <button className="ui-chip" aria-pressed={tab === "inbox"} onClick={() => setTab("inbox")}>
          {t("消息", "Inbox")}
          {unread > 0 && ` (${unread})`}
        </button>
        <button className="ui-chip" aria-pressed={tab === "subs"} onClick={() => setTab("subs")}>
          {t("订阅管理", "Subscriptions")}
        </button>
      </div>
      {tab === "subs" ? (
        <div className="lx-subs">
          <h4>{t("开播提醒", "Live alerts")}</h4>
          {x.hostAlerts.length ? (
            HOSTS.filter((h) => x.hostAlerts.includes(h.id)).map((h) => (
              <div className="lx-row" key={h.id}>
                <span>{lang === "zh" ? h.name : h.nameEn}</span>
                <button
                  className="ui-btn"
                  onClick={() => store.dispatch({ type: "x/subscribe", kind: "host", id: h.id })}
                >
                  {t("关闭提醒", "Turn off")}
                </button>
              </div>
            ))
          ) : (
            <p className="text-ink-3">{t("在直播间开启开播提醒后，主播开播时会通知你", "Turn on alerts in a room to hear when the host goes live")}</p>
          )}
          <h4>{t("已预约直播", "Reserved sessions")}</h4>
          {reserved.length ? (
            reserved.map((r) => (
              <div className="lx-row" key={r.id}>
                <span>
                  {t(r.title, r.titleEn)}
                  <small className="block text-ink-3">
                    <DateLabel at={r.startsAt} lang={lang} />
                    {" · "}
                    {t(`提前 ${x.reminders[r.id] ?? 10} 分钟提醒`, `${x.reminders[r.id] ?? 10} min before`)}
                  </small>
                </span>
                <button
                  className="ui-btn"
                  onClick={() => store.dispatch({ type: "x/reminder", roomId: r.id, minutes: null })}
                >
                  {t("取消预约", "Cancel")}
                </button>
              </div>
            ))
          ) : (
            <p className="text-ink-3">{t("暂无预约", "No reservations")}</p>
          )}
          <h4>{t("栏目订阅", "Programs")}</h4>
          {LIVE_SERIES.map((s) => {
            const on = x.series.includes(s.id);
            return (
              <div className="lx-row" key={s.id}>
                <span>
                  {t(s.title, s.en)}
                  <small className="block text-ink-3">{t(s.schedule, s.scheduleEn)}</small>
                </span>
                <button
                  className={`ui-btn ${on ? "" : "ui-btn-soft"}`}
                  onClick={() => store.dispatch({ type: "x/subscribe", kind: "series", id: s.id })}
                >
                  {on ? t("已订阅", "Subscribed") : t("订阅", "Subscribe")}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="lx-row">
            <span className="text-ink-3">
              {unread} {t("条未读", "unread")}
            </span>
            <button
              className="live-text-btn"
              onClick={() => store.dispatch({ type: "x/read" })}
            >
              {t("全部已读", "Mark all read")}
            </button>
          </div>
          <div className="lx-scroll">
            {x.notices.map((n) => (
              <button
                className={`lx-notice ${n.read ? "" : "unread"}`}
                key={n.id}
                onClick={() => {
                  store.dispatch({ type: "x/read", id: n.id });
                  onClose();
                  navigateLive(`room/${n.roomId}`);
                }}
              >
                <strong>{lang === "zh" ? n.text : n.en}</strong>
                <small>
                  <DateLabel at={n.at} lang={lang} />
                </small>
              </button>
            ))}
            {!x.notices.length && (
              <EmptyState>
                {t(
                  "暂无通知。开启开播提醒或预约直播后，相关动态会出现在这里",
                  "No notifications yet. Alerts and reservations will show up here.",
                )}
              </EmptyState>
            )}
          </div>
        </>
      )}
    </LiveDialog>
  );
}

export function LivePrograms({
  store,
  lang,
}: {
  store: LiveStore;
  lang: Lang;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState("macro");
  const rooms = store.state.rooms
    .filter(
      (r) =>
        store.state.experience.rooms[r.id]?.seriesId === selected &&
        (r.status !== "ended" ||
          (store.state.experience.rooms[r.id]?.replay.publication ===
            "published" &&
            store.state.experience.rooms[r.id]?.replay.visibility ===
              "public")),
    )
    .sort((a, b) => a.startsAt - b.startsAt);
  return (
    <>
      <button className="ui-btn" onClick={() => setOpen(true)}>
        <CalendarDays size={15} />
        {t("栏目与日程", "Programs")}
      </button>
      {open && (
        <LiveDialog
          title={t("栏目与直播日程", "Programs & schedule")}
          onClose={() => setOpen(false)}
          wide
        >
          <div className="lx-options">
            {LIVE_SERIES.map((s) => (
              <button
                className="ui-chip"
                aria-pressed={selected === s.id}
                key={s.id}
                onClick={() => setSelected(s.id)}
              >
                {t(s.title, s.en)}
              </button>
            ))}
          </div>
          {LIVE_SERIES.filter((s) => s.id === selected).map((s) => (
            <div className="lx-program-head" key={s.id}>
              <div>
                <h3>{t(s.title, s.en)}</h3>
                <span>{t(s.schedule, s.scheduleEn)} · UTC+8</span>
              </div>
              <button
                className="ui-btn ui-btn-soft"
                onClick={() =>
                  store.dispatch({
                    type: "x/subscribe",
                    kind: "series",
                    id: s.id,
                  })
                }
              >
                {store.state.experience.series.includes(s.id) ? (
                  <Check size={14} />
                ) : (
                  <Bell size={14} />
                )}{" "}
                {store.state.experience.series.includes(s.id)
                  ? t("已订阅", "Subscribed")
                  : t("订阅栏目", "Subscribe")}
              </button>
            </div>
          ))}
          <div className="lx-scroll">
            {rooms.map((r) => (
              <div className="lx-item" key={r.id}>
                <div className="lx-row">
                  <div>
                    <small>
                      <DateLabel at={r.startsAt} lang={lang} />
                    </small>
                    <h4>{t(r.title, r.titleEn)}</h4>
                  </div>
                  {r.status === "scheduled" ? (
                    <ReminderButton room={r} store={store} lang={lang} />
                  ) : (
                    <button
                      className="ui-btn ui-btn-soft"
                      onClick={() => {
                        setOpen(false);
                        navigateLive(`room/${r.id}`);
                      }}
                    >
                      {r.status === "live"
                        ? t("进入直播", "Watch live")
                        : t("回放", "Replay")}
                    </button>
                  )}
                </div>
                <RoomEvent room={r} store={store} lang={lang} />
              </div>
            ))}
            {!rooms.length && (
              <EmptyState>
                {t("新节目安排中", "New sessions coming soon")}
              </EmptyState>
            )}
          </div>
        </LiveDialog>
      )}
    </>
  );
}

export function RoomEvent({
  room,
  store,
  lang,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
}) {
  const event = ECONOMIC_CALENDAR_DATA.find(
    (e) => e.id === store.state.experience.rooms[room.id]?.eventId,
  );
  if (!event) return null;
  return (
    <div className="lx-event">
      <CalendarDays size={15} />
      <div>
        <b>{lang === "zh" ? event.eventZh : event.eventEn}</b>
        <span>
          {label(lang, "前值", "Previous")} {event.previous} ·{" "}
          {label(lang, "预期", "Forecast")} {event.forecast} ·{" "}
          {label(lang, "公布", "Actual")} {event.actual}
        </span>
      </div>
    </div>
  );
}

export function FloatingLive({
  store,
  lang,
  active,
}: {
  store: LiveStore;
  lang: Lang;
  active: boolean;
}) {
  const room = store.state.rooms.find(
    (r) => r.id === store.state.experience.floatingRoom,
  );
  if (!room || room.status !== "live" || !active) return null;
  return (
    <aside className="lx-floating">
      <div>
        <button onClick={() => navigateLive(`room/${room.id}`)}>
          {label(lang, room.title, room.titleEn)}
        </button>
        <button
          aria-label={label(lang, "关闭小窗", "Close mini player")}
          onClick={() => {
            store.dispatch({
              type: "x/leave",
              roomId: room.id,
              allowFloating: false,
            });
          }}
        >
          <X size={16} />
        </button>
      </div>
      <video
        src={
          lang === "zh"
            ? "/live/market-briefing.mp4"
            : "/live/market-briefing-en.mp4"
        }
        autoPlay
        loop
        muted
        playsInline
        controls
      />
    </aside>
  );
}
