import React, { useState } from "react";
import type { Instrument } from "../../data/marketData";
import { RoomEditor } from "./LiveDialogs";
import { LiveBreadcrumb } from "./LiveBreadcrumb";
import { EmptyState } from "./LiveShared";
import { LiveStudioDashboard } from "./LiveStudioDashboard";
import { LiveStudioRoom } from "./LiveStudioRoom";
import { CURRENT_CREATOR, label, type Lang } from "./liveState";
import { navigateStudio, useLiveRoute, type LiveStore } from "./useLive";
import "./live.css";
import "./liveExperience.css";
import "./liveImmersive.css";
import "./liveViewerPanels.css";

/** Creator route with isolated management state and access to the creator's rooms. */
export function LiveStudioView({
  store,
  instruments,
  lang,
  onToast,
}: {
  store: LiveStore;
  instruments: Instrument[];
  lang: Lang;
  onToast: (s: string) => void;
}) {
  const [id] = useLiveRoute();
  const [editing, setEditing] = useState<string | null>(null);
  const room = store.state.rooms.find(
    (r) => r.id === id && r.host.id === CURRENT_CREATOR.id,
  );
  return (
    <div className="ui-page live-app">
      <LiveBreadcrumb
        lang={lang}
        items={[
          { label: label(lang, "账户", "Account"), href: "#withdraw" },
          {
            label: label(lang, "直播工作台", "Live studio"),
            href: "#live-studio",
          },
          ...(id
            ? [
                {
                  label: room
                    ? label(lang, room.title, room.titleEn)
                    : label(lang, "直播管理", "Session management"),
                  href: `#live-studio/${id}`,
                },
              ]
            : []),
        ]}
      />
      {id && !room ? (
        <EmptyState>
          <p>{label(lang, "无法管理此直播", "This session is unavailable")}</p>
          <button
            className="ui-btn ui-btn-primary"
            onClick={() => navigateStudio()}
          >
            {label(lang, "返回直播工作台", "Back to live studio")}
          </button>
        </EmptyState>
      ) : room ? (
        <LiveStudioRoom
          key={room.id}
          room={room}
          store={store}
          instruments={instruments}
          lang={lang}
          onToast={onToast}
          onEdit={() => setEditing(room.id)}
        />
      ) : (
        <LiveStudioDashboard
          store={store}
          lang={lang}
          onCreate={() => setEditing("new")}
        />
      )}
      {editing && (
        <RoomEditor
          store={store}
          lang={lang}
          room={store.state.rooms.find((r) => r.id === editing)}
          onToast={onToast}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
