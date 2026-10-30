import React, { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  CATEGORIES,
  label,
  personName,
  type Lang,
  type LiveRoom,
} from "./liveState";
import { Avatar, DateLabel, EmptyState, RoomCover } from "./LiveShared";

const PAGE = 8;

/** Read-only directory presentation. Each page supplies its own tabs and actions. */
export function RoomCatalog({
  rooms,
  lang,
  tabs,
  tab,
  onTab,
  matchesTab,
  onOpen,
  action,
  empty,
}: {
  rooms: LiveRoom[];
  lang: Lang;
  tabs: [string, string][];
  tab: string;
  onTab: (tab: string) => void;
  matchesTab: (room: LiveRoom, tab: string) => boolean;
  onOpen: (room: LiveRoom) => void;
  action: (room: LiveRoom) => React.ReactNode;
  empty: string;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const filtered = rooms.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      matchesTab(r, tab) &&
      `${r.title} ${r.titleEn} ${r.host.name} ${r.host.nameEn} ${r.symbols.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  const pages = Math.ceil(filtered.length / PAGE),
    safePage = Math.min(page, Math.max(0, pages - 1));
  return (
    <section id="live-list" className="live-list-section">
      <div className="live-discover-tabs">
        <div
          className="ui-tabs"
          role="tablist"
          aria-label={t("直播分类", "Live tabs")}
        >
          {tabs.map(([id, name]) => (
            <button
              key={id}
              className="ui-tab"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                onTab(id);
                setPage(0);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="ui-input live-search">
          <Search size={16} />
          <input
            aria-label={t("搜索直播", "Search live rooms")}
            placeholder={t(
              "搜索主播、主题或品种",
              "Search hosts, topics or markets",
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div className="live-filter-row">
        <div>
          {CATEGORIES.map(([id, zh, en]) => (
            <button
              key={id}
              className="ui-chip"
              aria-pressed={category === id}
              onClick={() => {
                setCategory(id);
                setPage(0);
              }}
            >
              {t(zh, en)}
            </button>
          ))}
        </div>
        <span>
          {filtered.length} {t("场直播", "rooms")}
        </span>
      </div>
      {filtered.length ? (
        <div className="lv-grid">
          {filtered.slice(safePage * PAGE, safePage * PAGE + PAGE).map((room) => (
            <article key={room.id} className="lv-card">
              <button
                className="lv-card-cover"
                aria-label={`${t("打开直播", "Open session")} ${t(room.title, room.titleEn)}`}
                onClick={() => onOpen(room)}
              >
                <RoomCover room={room} lang={lang} />
              </button>
              <div className="lv-card-body">
                <button className="lv-card-title" onClick={() => onOpen(room)}>
                  {t(room.title, room.titleEn)}
                </button>
                <div className="lv-card-host">
                  <Avatar profile={room.host} size="sm" />
                  <span>{personName(room.host, lang)}</span>
                  <span className="lv-card-cat">
                    {t(
                      ...(CATEGORIES.find((c) => c[0] === room.category)!.slice(
                        1,
                      ) as [string, string]),
                    )}
                  </span>
                </div>
                <div className="lv-card-foot">
                  <span>
                    {room.status === "scheduled" ? (
                      <>
                        <CalendarClock size={13} />
                        <DateLabel at={room.startsAt} lang={lang} />
                      </>
                    ) : room.status === "ended" ? (
                      room.cancelled ? (
                        t("已取消", "Cancelled")
                      ) : (
                        t("市场回顾", "Market recap")
                      )
                    ) : (
                      <>
                        <span className="live-dot" />
                        {t("正在进行", "On air")}
                      </>
                    )}
                  </span>
                  {action(room)}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>{empty}</EmptyState>
      )}
      {pages > 1 && (
        <div className="live-pagination">
          <button
            className="live-icon-btn"
            aria-label={t("上一页", "Previous page")}
            disabled={!safePage}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {safePage + 1} / {pages}
          </span>
          <button
            className="live-icon-btn"
            aria-label={t("下一页", "Next page")}
            disabled={safePage === pages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
