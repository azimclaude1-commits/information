import React, { useState } from "react";
import { BadgeCheck, ChevronRight, Play, Users } from "lucide-react";
import {
  compact,
  label,
  personName,
  type Lang,
  type LiveRoom,
} from "./liveState";
import { LivePrograms, LiveNotices, ReminderButton } from "./LivePrograms";
import { Avatar, LiveBadge, LiveBanner } from "./LiveShared";
import { RoomCatalog } from "./RoomCatalog";
import { navigateLive, type LiveStore } from "./useLive";

export function LiveLobby({ store, lang }: { store: LiveStore; lang: Lang }) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [tab, setTab] = useState("all");
  const open = (room: LiveRoom) => navigateLive(`room/${room.id}`);
  const onAir = store.state.rooms
    .filter((r) => r.status === "live")
    .sort((a, b) => b.viewers - a.viewers);
  return (
    <div className="live-lobby">
      <div className="lv-lobby-head">
        <h1>{t("直播大厅", "Live rooms")}</h1>
        <div className="lx-actions">
          <LivePrograms store={store} lang={lang} />
          <LiveNotices store={store} lang={lang} />
        </div>
      </div>
      {onAir.length ? (
        <FeaturedLive rooms={onAir} store={store} lang={lang} onOpen={open} />
      ) : (
        <LiveBanner
          store={store}
          lang={lang}
          inLobby
          onOpen={() => {
            setTab("scheduled");
            document
              .getElementById("live-list")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}
      <RoomCatalog
        rooms={store.state.rooms
          .filter(
            (r) =>
              r.status !== "ended" ||
              (store.state.experience.rooms[r.id]?.replay.publication ===
                "published" &&
                store.state.experience.rooms[r.id]?.replay.visibility ===
                  "public" &&
                store.state.experience.rooms[r.id]?.replay.recording),
          )
          .map((r) =>
            r.status === "ended"
              ? {
                  ...r,
                  title: store.state.experience.rooms[r.id].replay.title,
                  cover:
                    store.state.experience.rooms[r.id].replay.cover || r.cover,
                }
              : r,
          )}
        lang={lang}
        tab={tab}
        onTab={setTab}
        onOpen={open}
        tabs={[
          ["all", t("推荐", "For you")],
          ["live", t("正在直播", "On air")],
          ["scheduled", t("直播预告", "Upcoming")],
          ["ended", t("精彩回放", "Replays")],
          ["following", t("我的关注", "Following")],
          ["reserved", t("我的预约", "Reserved")],
        ]}
        matchesTab={(room, filter) =>
          filter === "all" ||
          filter === room.status ||
          (filter === "following" &&
            store.state.following.includes(room.host.id)) ||
          (filter === "reserved" && store.state.reservations.includes(room.id))
        }
        empty={t(
          tab === "reserved"
            ? "还没有预约的直播"
            : tab === "following"
              ? "关注主播后，在这里查看他们的直播"
              : "没有找到相关直播",
          "No rooms found. Try another filter.",
        )}
        action={(room) =>
          room.status === "scheduled" ? (
            <ReminderButton room={room} store={store} lang={lang} />
          ) : (
            <button className="live-text-btn" onClick={() => open(room)}>
              {room.status === "ended"
                ? t("观看回放", "Watch replay")
                : t("进入直播", "Watch now")}
              <ChevronRight size={14} />
            </button>
          )
        }
      />
    </div>
  );
}

/** Hero preview of the busiest live room, with a switcher for the others. */
function FeaturedLive({
  rooms,
  store,
  lang,
  onOpen,
}: {
  rooms: LiveRoom[];
  store: LiveStore;
  lang: Lang;
  onOpen: (room: LiveRoom) => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [index, setIndex] = useState(0);
  const room = rooms[Math.min(index, rooms.length - 1)];
  const following = store.state.following.includes(room.host.id);
  return (
    <section className="lv-featured" aria-label={t("正在直播", "On air")}>
      <button
        className="lv-featured-main"
        onClick={() => onOpen(room)}
        aria-label={`${t("进入直播间", "Enter room")} ${t(room.title, room.titleEn)}`}
      >
        <video
          key={lang}
          src={
            lang === "zh"
              ? "/live/market-briefing.mp4"
              : "/live/market-briefing-en.mp4"
          }
          poster={room.cover || "/live/studio-hero.png"}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <span className="lv-featured-top">
          <LiveBadge room={room} lang={lang} />
          <span>
            <Users size={12} />
            {compact(room.viewers)}
          </span>
        </span>
        <span className="lv-featured-copy">
          <span className="lv-featured-host">
            <Avatar profile={room.host} size="md" />
            <span>
              <b>
                {personName(room.host, lang)}
                <BadgeCheck size={14} />
              </b>
              <small>
                {compact(room.host.followers + (following ? 1 : 0))}{" "}
                {t("关注", "followers")}
              </small>
            </span>
          </span>
          <strong>{t(room.title, room.titleEn)}</strong>
          <span className="lv-featured-tags">
            {room.symbols.slice(0, 3).map((s) => (
              <em key={s}>{s}</em>
            ))}
          </span>
          <span className="lv-featured-cta">
            <Play size={14} fill="currentColor" />
            {t("进入直播间", "Watch live")}
          </span>
        </span>
      </button>
      {rooms.length > 1 && (
        <div className="lv-featured-list" role="tablist">
          {rooms.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.id === room.id}
              onClick={() => setIndex(i)}
              onDoubleClick={() => onOpen(r)}
            >
              <Avatar profile={r.host} size="sm" />
              <span>
                <b>{t(r.title, r.titleEn)}</b>
                <small>
                  {personName(r.host, lang)} · {compact(r.viewers)}{" "}
                  {t("观看", "watching")}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
