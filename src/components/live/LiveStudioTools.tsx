import React, { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { ECONOMIC_CALENDAR_DATA, type Instrument } from "../../data/marketData";
import { DateLabel, EmptyState } from "./LiveShared";
import { ME, label, type Lang, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";
import { LIVE_SERIES } from "./liveExperience";
import { StudioStrategies } from "./LiveStrategies";
import { StudioQuestions, StudioPolls } from "./LiveEngagement";
import { StudioReplay } from "./LiveReplay";

type Props = { room: LiveRoom; store: LiveStore; lang: Lang };
export function LiveStudioTools({
  room,
  store,
  lang,
  instruments,
}: Props & { instruments: Instrument[] }) {
  const [tab, setTab] = useState(
      room.status === "ended" ? "replay" : "strategies",
    ),
    t = (zh: string, en: string) => label(lang, zh, en);
  return (
    <section className="lx-workspace">
      <nav
        className="ui-tabs lx-tabs"
        role="tablist"
        aria-label={t("主播工作区", "Creator workspace")}
      >
        {[
          ["strategies", t("策略", "Strategies")],
          ["questions", t("答疑", "Q&A")],
          ["polls", t("互动", "Activities")],
          ["replay", t("回放与复盘", "Replay & recap")],
          ["analytics", t("数据", "Analytics")],
          ["manage", t("房间管理", "Moderation")],
        ].map(([id, title]) => (
          <button
            role="tab"
            className="ui-tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            key={id}
          >
            {title}
          </button>
        ))}
      </nav>
      {tab === "strategies" ? (
        <StudioStrategies
          room={room}
          store={store}
          lang={lang}
          instruments={instruments}
        />
      ) : tab === "questions" ? (
        <StudioQuestions room={room} store={store} lang={lang} />
      ) : tab === "polls" ? (
        <StudioPolls room={room} store={store} lang={lang} />
      ) : tab === "replay" ? (
        <StudioReplay room={room} store={store} lang={lang} />
      ) : tab === "analytics" ? (
        <StudioAnalytics room={room} store={store} lang={lang} />
      ) : (
        <StudioModeration room={room} store={store} lang={lang} />
      )}
    </section>
  );
}
export function StudioAnalytics({ room, store, lang }: Props) {
  const d = store.state.experience.rooms[room.id],
    m = d.metrics,
    t = (zh: string, en: string) => label(lang, zh, en);
  const metrics = [
    [t("累计观看", "Viewers"), m.viewers],
    [t("峰值在线", "Peak online"), m.peak],
    [
      t("平均观看", "Average watch"),
      `${Math.floor(m.watchSeconds / Math.max(1, m.viewers) / 60)}m ${Math.round((m.watchSeconds / Math.max(1, m.viewers)) % 60)}s`,
    ],
    [t("新增关注", "New followers"), m.follows],
    [t("提问数量", "Questions"), d.questions.length],
    [t("策略 / 下单入口点击", "Trade entry clicks"), m.clicks],
    [t("模拟委托提交", "Paper orders"), m.orders],
    [
      t("答题与投票参与", "Activity responses"),
      d.polls.reduce((n, p) => n + Object.keys(p.votes).length, 0),
    ],
  ];
  return (
    <div className="lx-panel">
      <div className="lx-row">
        <h3>{t("本场数据", "Session analytics")}</h3>
        <button
          className="ui-btn"
          onClick={() => {
            const content =
              "\uFEFF" + metrics.map(([k, v]) => `${k},${v}`).join("\r\n");
            const url = URL.createObjectURL(
              new Blob([content], { type: "text/csv;charset=utf-8" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `live-${room.id}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <Download size={14} />
          {t("导出", "Export")}
        </button>
      </div>
      <div className="lx-metrics">
        {metrics.map(([name, value]) => (
          <div key={name}>
            <small>{name}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <h4>{t("互动完成情况", "Engagement completion")}</h4>
      {[
        [
          t("已回答问题", "Questions answered"),
          d.questions.filter((q) => q.status === "answered").length,
          d.questions.filter((q) => !q.mergedInto).length,
        ],
        [
          t("已结束互动", "Activities closed"),
          d.polls.filter((p) => p.closed).length,
          d.polls.length,
        ],
        [
          t("已归档策略", "Strategies archived"),
          d.strategies.filter((s) => ["ended", "expired"].includes(s.status))
            .length,
          d.strategies.length,
        ],
      ].map(([title, value, total]) => (
        <div className="lx-bar-row" key={title}>
          <div className="lx-row">
            <span>{title}</span>
            <b>
              {value}/{total}
            </b>
          </div>
          <div>
            <i
              style={{
                width: `${Number(total) ? (Number(value) / Number(total)) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function StudioModeration({ room, store, lang }: Props) {
  const d = store.state.experience.rooms[room.id],
    t = (zh: string, en: string) => label(lang, zh, en),
    [tab, setTab] = useState("settings");
  const settings = (changes: {
    slowSeconds?: number;
    seriesId?: string;
    eventId?: string;
    moderators?: string[];
  }) =>
    store.dispatch({
      type: "x/settings",
      roomId: room.id,
      actor: room.host.id,
      at: Date.now(),
      ...changes,
    });
  return (
    <div className="lx-panel">
      <div className="lx-options">
        {[
          ["settings", t("设置", "Settings")],
          ["reports", t("举报", "Reports")],
          ["audit", t("管理记录", "Activity log")],
        ].map(([id, title]) => (
          <button
            className="ui-chip"
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {title}
            {id === "reports" &&
              ` (${d.reports.filter((r) => r.status === "pending").length})`}
          </button>
        ))}
      </div>
      {tab === "settings" ? (
        <div className="lx-form">
          <div className="lx-two">
            <label>
              {t("慢速发言", "Slow mode")}
              <select
                value={d.slowSeconds}
                onChange={(e) =>
                  settings({ slowSeconds: Number(e.target.value) })
                }
              >
                {[0, 5, 10, 30].map((v) => (
                  <option key={v} value={v}>
                    {v ? `${v}s` : t("关闭", "Off")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("所属栏目", "Series")}
              <select
                value={d.seriesId}
                onChange={(e) => settings({ seriesId: e.target.value })}
              >
                <option value="">{t("无", "None")}</option>
                {LIVE_SERIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.title, s.en)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t("关联财经事件", "Economic event")}
            <select
              value={d.eventId}
              onChange={(e) => settings({ eventId: e.target.value })}
            >
              <option value="">{t("无", "None")}</option>
              {ECONOMIC_CALENDAR_DATA.map((e) => (
                <option key={e.id} value={e.id}>
                  {t(e.eventZh, e.eventEn)}
                </option>
              ))}
            </select>
          </label>
          <h4>
            <ShieldCheck size={15} /> {t("房管", "Moderators")}
          </h4>
          {[
            [ME, "Alpha Trader"],
            ["user-oliver", "Oliver"],
            ["user-mia", "小麦"],
          ].map(([id, name]) => (
            <label className="lx-check" key={id}>
              <input
                type="checkbox"
                checked={d.moderators.includes(id)}
                onChange={(e) =>
                  settings({
                    moderators: e.target.checked
                      ? [...d.moderators, id]
                      : d.moderators.filter((v) => v !== id),
                  })
                }
              />
              {name}
            </label>
          ))}
          <small className="text-ink-3">
            {t(
              "房管可置顶、删除消息和禁言；直播设置与策略发布由主播管理。",
              "Moderators can pin, delete and mute. Broadcast settings and strategies stay with the host.",
            )}
          </small>
        </div>
      ) : tab === "reports" ? (
        <div className="lx-scroll">
          {d.reports.map((r) => (
            <article className="lx-item" key={r.id}>
              <div className="lx-row">
                <b>{r.reason}</b>
                <small>
                  {r.status === "pending"
                    ? t("待处理", "Pending")
                    : r.status === "removed"
                      ? t("已删除消息", "Message removed")
                      : t("已驳回", "Dismissed")}
                </small>
              </div>
              <p>{r.text}</p>
              {r.status === "pending" && (
                <div className="lx-actions">
                  <button
                    className="ui-btn"
                    onClick={() =>
                      store.dispatch({
                        type: "x/moderate",
                        roomId: room.id,
                        actor: room.host.id,
                        reportId: r.id,
                        remove: false,
                        at: Date.now(),
                      })
                    }
                  >
                    {t("驳回", "Dismiss")}
                  </button>
                  <button
                    className="ui-btn ui-btn-soft"
                    onClick={() =>
                      store.dispatch({
                        type: "x/moderate",
                        roomId: room.id,
                        actor: room.host.id,
                        reportId: r.id,
                        remove: true,
                        at: Date.now(),
                      })
                    }
                  >
                    {t("删除消息", "Remove message")}
                  </button>
                </div>
              )}
            </article>
          ))}
          {!d.reports.length && (
            <EmptyState>{t("暂无举报", "No reports")}</EmptyState>
          )}
        </div>
      ) : (
        <div className="lx-scroll">
          {d.audit.map((a) => (
            <div className="lx-item lx-row" key={a.id}>
              <span>
                {a.text} ·{" "}
                {a.actor === room.host.id
                  ? room.host.name
                  : a.actor === ME
                    ? "Alpha Trader"
                    : a.actor}
              </span>
              <small>
                <DateLabel at={a.at} lang={lang} />
              </small>
            </div>
          ))}
          {!d.audit.length && (
            <EmptyState>
              {t("暂无管理记录", "No moderation activity")}
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
