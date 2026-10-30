import React, { useState } from "react";
import { ChevronRight, MonitorPlay, Plus, Radio } from "lucide-react";
import { Avatar, DateLabel } from "./LiveShared";
import { CURRENT_CREATOR, label, personName, type Lang } from "./liveState";
import { StudioAnalytics } from "./LiveStudioTools";
import { RoomCatalog } from "./RoomCatalog";
import { navigateStudio, type LiveStore } from "./useLive";

export function LiveStudioDashboard({
  store,
  lang,
  onCreate,
}: {
  store: LiveStore;
  lang: Lang;
  onCreate: () => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    [tab, setTab] = useState("all");
  const [view, setView] = useState("sessions"),
    [selected, setSelected] = useState("");
  const rooms = store.state.rooms.filter(
    (room) => room.host.id === CURRENT_CREATOR.id,
  );
  const onAir = rooms.find((r) => r.status === "live");
  const next = rooms
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => a.startsAt - b.startsAt)[0];
  return (
    <div className="live-lobby">
      <section className="lv-studio-hero">
        <img src="/live/studio-hero.png" alt="" aria-hidden="true" />
        <div className="lv-studio-id">
          <Avatar profile={CURRENT_CREATOR} size="lg" />
          <div>
            <h1>
              <MonitorPlay size={18} />
              {t("直播工作台", "Live studio")}
            </h1>
            <p>
              {personName(CURRENT_CREATOR, lang)} ·{" "}
              {t(CURRENT_CREATOR.bio, CURRENT_CREATOR.bioEn)}
            </p>
          </div>
        </div>
        <div className="lv-studio-cta">
          {onAir ? (
            <button
              className="lv-cta is-live"
              onClick={() => navigateStudio(onAir.id)}
            >
              <Radio size={16} />
              {t("返回直播间", "Back to live room")}
            </button>
          ) : next ? (
            <button className="lv-cta" onClick={() => navigateStudio(next.id)}>
              <Radio size={16} />
              {t("去开播", "Go live")}
              <small>
                <DateLabel at={next.startsAt} lang={lang} />
              </small>
            </button>
          ) : null}
          <button className="lv-cta is-ghost" onClick={onCreate}>
            <Plus size={16} />
            {t("创建直播", "Create live")}
          </button>
        </div>
      </section>
      <div className="live-studio-overview">
        {[
          [
            t("正在直播", "On air"),
            rooms.filter((r) => r.status === "live").length,
          ],
          [
            t("已安排", "Scheduled"),
            rooms.filter((r) => r.status === "scheduled").length,
          ],
          [
            t("历史场次", "Past sessions"),
            rooms.filter((r) => r.status === "ended").length,
          ],
          [
            t("累计关注", "Followers"),
            (
              CURRENT_CREATOR.followers +
              Number(store.state.following.includes(CURRENT_CREATOR.id))
            ).toLocaleString(),
          ],
        ].map(([name, value]) => (
          <div key={name}>
            <span>{name}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div
        className="ui-tabs lx-tabs"
        role="tablist"
        aria-label={t("工作台视图", "Studio views")}
      >
        <button
          className="ui-tab"
          role="tab"
          aria-selected={view === "sessions"}
          onClick={() => setView("sessions")}
        >
          {t("直播管理", "Sessions")}
        </button>
        <button
          className="ui-tab"
          role="tab"
          aria-selected={view === "analytics"}
          onClick={() => setView("analytics")}
        >
          {t("数据中心", "Analytics")}
        </button>
      </div>
      {view === "analytics" ? (
        <section className="lx-workspace">
          <div className="lx-panel lx-form">
            <label>
              {t("选择场次", "Select session")}
              <select
                value={selected || rooms[0]?.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {rooms.map((r) => (
                  <option value={r.id} key={r.id}>
                    {t(r.title, r.titleEn)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {rooms.length > 0 && (
            <StudioAnalytics
              room={rooms.find((r) => r.id === selected) || rooms[0]}
              store={store}
              lang={lang}
            />
          )}
        </section>
      ) : (
        <RoomCatalog
          rooms={rooms}
          lang={lang}
          tab={tab}
          onTab={setTab}
          onOpen={(room) => navigateStudio(room.id)}
          tabs={[
            ["all", t("全部直播", "All sessions")],
            ["live", t("正在直播", "On air")],
            ["scheduled", t("直播预告", "Upcoming")],
            ["ended", t("历史直播", "Past sessions")],
          ]}
          matchesTab={(room, filter) =>
            filter === "all" || filter === room.status
          }
          empty={t("暂无相关直播", "No sessions found")}
          action={(room) => (
            <button
              className="ui-btn ui-btn-soft"
              onClick={() => navigateStudio(room.id)}
            >
              {t("管理直播", "Manage")}
              <ChevronRight size={14} />
            </button>
          )}
        />
      )}
    </div>
  );
}
