import React from "react";
import type { Instrument } from "../data/marketData";
import type { DemoTrading } from "./demoTrading";
import { LiveLobby } from "./live/LiveLobby";
import { LiveBreadcrumb } from "./live/LiveBreadcrumb";
import { LiveRoomView } from "./live/LiveRoomView";
import { EmptyState } from "./live/LiveShared";
import { label, type Lang } from "./live/liveState";
import { navigateLive, useLiveRoute, type LiveStore } from "./live/useLive";
import "./live/live.css";
import "./live/liveExperience.css";
import "./live/liveImmersive.css";
import "./live/liveViewerPanels.css";

/** Audience route: no room creation, broadcast management or creator navigation. */
export function LiveStreamView({
  instruments,
  lang,
  onQuickTrade,
  onToast,
  store,
  demo,
}: {
  instruments: Instrument[];
  lang: Lang;
  onQuickTrade: (symbol: string, side: "buy" | "sell") => void;
  onToast: (s: string) => void;
  store: LiveStore;
  demo: DemoTrading;
}) {
  const [section, id] = useLiveRoute();
  const room =
    section === "room" ? store.state.rooms.find((r) => r.id === id) : undefined;
  const replay = room && store.state.experience.rooms[room.id]?.replay;
  const roomTitle = room
    ? room.status === "ended" && replay?.title && replay.title !== room.title
      ? replay.title
      : label(lang, room.title, room.titleEn)
    : label(lang, "直播间", "Live room");
  return (
    <div className="ui-page live-app">
      <LiveBreadcrumb
        lang={lang}
        items={[
          { label: label(lang, "首页", "Home"), href: "#home" },
          { label: label(lang, "直播大厅", "Live rooms"), href: "#live" },
          ...(section
            ? [{ label: roomTitle, href: `#live/${section}/${id || ""}` }]
            : []),
        ]}
      />
      {section && !room ? (
        <EmptyState>
          <p>{label(lang, "直播间不存在", "Room not found")}</p>
          <button
            className="ui-btn ui-btn-primary"
            onClick={() => navigateLive()}
          >
            {label(lang, "返回直播大厅", "Back to live rooms")}
          </button>
        </EmptyState>
      ) : room &&
        room.status === "ended" &&
        (store.state.experience.rooms[room.id]?.replay.publication !==
          "published" ||
          !store.state.experience.rooms[room.id]?.replay.recording) ? (
        <EmptyState>
          <p>
            {label(
              lang,
              "本场直播已结束，回放尚未发布",
              "This session has ended. Replay is not published yet.",
            )}
          </p>
          <button className="ui-btn" onClick={() => navigateLive()}>
            {label(lang, "返回直播大厅", "Back to live rooms")}
          </button>
        </EmptyState>
      ) : room ? (
        <LiveRoomView
          key={room.id}
          room={
            room.status === "ended"
              ? {
                  ...room,
                  title: store.state.experience.rooms[room.id].replay.title,
                  titleEn:
                    store.state.experience.rooms[room.id].replay.title !==
                    room.title
                      ? store.state.experience.rooms[room.id].replay.title
                      : room.titleEn,
                }
              : room
          }
          store={store}
          instruments={instruments}
          demo={demo}
          lang={lang}
          onToast={onToast}
          onQuickTrade={onQuickTrade}
        />
      ) : (
        <LiveLobby store={store} lang={lang} />
      )}
    </div>
  );
}
