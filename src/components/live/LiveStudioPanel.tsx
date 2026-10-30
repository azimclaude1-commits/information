import React, { useState } from "react";
import {
  Check,
  Copy,
  Mic,
  MicOff,
  Pin,
  Plus,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { Avatar, EmptyState } from "./LiveShared";
import { label, personName, type Lang, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";

export function LiveStudioPanel({
  room,
  store,
  instruments,
  lang,
  onToast,
  onEdit,
  initialTab = "mic",
}: {
  room: LiveRoom;
  store: LiveStore;
  instruments: Instrument[];
  lang: Lang;
  onToast: (s: string) => void;
  onEdit: () => void;
  initialTab?: "mic" | "content" | "moderation";
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [tab, setTab] = useState<string>(initialTab),
    [query, setQuery] = useState(""),
    [announcement, setAnnouncement] = useState(
      lang === "zh" ? room.announcement : room.announcementEn,
    ),
    [word, setWord] = useState("");
  const requests = (store.state.requests[room.id] || []).filter(
      (r) => r.status === "pending",
    ),
    seats = store.state.seats[room.id] || [];
  const words = store.state.keywords[room.id] || ["稳赚不赔", "代客理财"];
  const update = (changes: Partial<LiveRoom>) =>
    store.dispatch({ type: "room", room: { ...room, ...changes } });
  return (
    <section className="live-studio-panel">
      <header>
        <h2>
          <SlidersHorizontal size={16} />
          {t("直播控制台", "Control room")}
        </h2>
        <button
          className="live-icon-btn"
          aria-label={t("直播设置", "Room settings")}
          onClick={onEdit}
        >
          <Settings2 size={17} />
        </button>
      </header>
      <div className="live-panel-tabs" role="tablist">
        {[
          ["mic", t("连麦", "Speakers")],
          ["content", t("内容", "Content")],
          ["moderation", t("管理", "Moderation")],
        ].map(([id, name]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {name}
            {id === "mic" && requests.length > 0 && <b>{requests.length}</b>}
          </button>
        ))}
      </div>
      <div className="live-studio-panel-body">
        {tab === "mic" ? (
          <>
            <div className="live-panel-label">
              <span>{t("连麦申请", "Requests")}</span>
              <b>{requests.length}</b>
            </div>
            {requests.length ? (
              requests.map((r) => (
                <div className="live-request-row" key={r.userId}>
                  <Avatar
                    profile={{
                      name: r.name,
                      initials: r.name.slice(0, 2),
                      color: "violet",
                    }}
                  />
                  <span>
                    {personName(r, lang)}
                    <small>{t("申请连麦", "Wants to speak")}</small>
                  </span>
                  <button
                    className="live-reject"
                    aria-label={`${t("拒绝", "Decline")} ${personName(r, lang)}`}
                    disabled={room.status !== "live"}
                    onClick={() =>
                      store.dispatch({
                        type: "reviewMic",
                        roomId: room.id,
                        userId: r.userId,
                        accept: false,
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                  <button
                    className="live-accept"
                    aria-label={`${t("同意", "Accept")} ${personName(r, lang)}`}
                    disabled={room.status !== "live"}
                    onClick={() =>
                      store.dispatch({
                        type: "reviewMic",
                        roomId: room.id,
                        userId: r.userId,
                        accept: true,
                      })
                    }
                  >
                    <Check size={16} />
                  </button>
                </div>
              ))
            ) : (
              <EmptyState>
                {t("暂无连麦申请", "No pending requests")}
              </EmptyState>
            )}
            <div className="live-panel-label">
              <span>{t("正在连麦", "On stage")}</span>
              <b>{seats.length} / 5</b>
            </div>
            {seats.map((s) => (
              <div className="live-request-row" key={s.userId}>
                <Avatar
                  profile={{
                    name: s.name,
                    initials: s.name.slice(0, 2),
                    color: "teal",
                  }}
                />
                <span>
                  {personName(s, lang)}
                  <small>
                    {s.muted ? t("已闭麦", "Muted") : t("麦克风开启", "Mic on")}
                  </small>
                </span>
                <button
                  className="live-icon-btn"
                  aria-label={`${s.muted ? t("开启麦克风", "Unmute") : t("关闭麦克风", "Mute")} ${personName(s, lang)}`}
                  onClick={() =>
                    store.dispatch({
                      type: "toggleMic",
                      roomId: room.id,
                      userId: s.userId,
                    })
                  }
                >
                  {s.muted ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
                <button
                  className="live-icon-btn"
                  aria-label={`${t("移出连麦", "Remove speaker")} ${personName(s, lang)}`}
                  onClick={() =>
                    store.dispatch({
                      type: "leaveMic",
                      roomId: room.id,
                      userId: s.userId,
                    })
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </>
        ) : tab === "content" ? (
          <div className="live-form">
            <label>
              {t("直播画面", "Broadcast source")}
              <select
                value={room.mode}
                onChange={(e) =>
                  update({ mode: e.target.value as LiveRoom["mode"] })
                }
              >
                <option value="chart">{t("行情共享", "Market screen")}</option>
                <option value="voice">{t("多人语音", "Audio room")}</option>
                <option value="video">{t("视频直播", "Video")}</option>
              </select>
            </label>
            <label>
              {t("房间公告", "Announcement")}
              <textarea
                rows={3}
                maxLength={180}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
              />
            </label>
            <button
              className="ui-btn ui-btn-soft"
              onClick={() => {
                if (update({ announcement, announcementEn: announcement }))
                  onToast(t("公告已更新", "Announcement updated"));
              }}
            >
              {t("发布公告", "Publish announcement")}
            </button>
            <div className="live-panel-label">
              <span>{t("推荐品种", "Featured markets")}</span>
              <b>{room.symbols.length} / 6</b>
            </div>
            <div className="live-featured-edit">
              {room.symbols.map((s) => (
                <div key={s}>
                  <b>{s}</b>
                  <button
                    className="live-icon-btn"
                    aria-pressed={room.pinnedSymbol === s}
                    aria-label={`${t("置顶", "Pin")} ${s}`}
                    onClick={() => update({ pinnedSymbol: s })}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    className="live-icon-btn"
                    aria-label={`${t("移除", "Remove")} ${s}`}
                    disabled={room.symbols.length < 2}
                    onClick={() =>
                      update({
                        symbols: room.symbols.filter((x) => x !== s),
                        pinnedSymbol:
                          room.pinnedSymbol === s
                            ? room.symbols.find((x) => x !== s)!
                            : room.pinnedSymbol,
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <label className="ui-input">
              <Search size={14} />
              <input
                aria-label={t("搜索推荐品种", "Search featured markets")}
                placeholder={t("搜索品种", "Search markets")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {query && (
              <div className="live-market-results">
                {instruments
                  .filter(
                    (i) =>
                      `${i.symbol} ${i.nameZh} ${i.nameEn}`
                        .toLowerCase()
                        .includes(query.toLowerCase()) &&
                      !room.symbols.includes(i.symbol),
                  )
                  .slice(0, 5)
                  .map((i) => (
                    <button
                      key={i.symbol}
                      disabled={room.symbols.length >= 6}
                      onClick={() => {
                        update({ symbols: [...room.symbols, i.symbol] });
                        setQuery("");
                      }}
                    >
                      {i.symbol}
                      <Plus size={14} />
                    </button>
                  ))}
              </div>
            )}
            <StrategyEditor
              key={room.pinnedSymbol}
              room={room}
              instrument={
                instruments.find((i) => i.symbol === room.pinnedSymbol) ||
                instruments[0]
              }
              lang={lang}
              onSave={(strategy) => {
                if (
                  store.dispatch({
                    type: "x/strategy",
                    roomId: room.id,
                    actor: room.host.id,
                    id: crypto.randomUUID(),
                    values: {
                      ...strategy,
                      trigger: strategy.side === "buy" ? "above" : "below",
                      expiresAt: Date.now() + 3600000,
                    },
                    at: Date.now(),
                  })
                )
                  onToast(t("策略已发布", "Strategy published"));
              }}
            />
            <details className="live-stream-settings">
              <summary>{t("推流设置", "Stream settings")}</summary>
              <label>
                {t("推流地址", "Stream URL")}
                <input
                  readOnly
                  value={`rtmps://stream.alphapulse.example/live/${room.id}`}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <label>
                {t("推流密钥", "Stream key")}
                <input
                  type="password"
                  readOnly
                  value={`local-${room.id}-broadcast`}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </details>
          </div>
        ) : (
          <div className="live-form">
            <label>
              {t("发言权限", "Chat permissions")}
              <select
                value={room.chatPermission}
                onChange={(e) =>
                  update({
                    chatPermission: e.target
                      .value as LiveRoom["chatPermission"],
                  })
                }
              >
                <option value="all">{t("所有人", "Everyone")}</option>
                <option value="followers">{t("仅关注者", "Followers")}</option>
                <option value="closed">{t("仅主播", "Host only")}</option>
              </select>
            </label>
            <label className="live-check-label">
              <input
                type="checkbox"
                checked={room.sharedTrading}
                onChange={(e) => update({ sharedTrading: e.target.checked })}
              />
              {t("开启一起模拟交易", "Enable paper trading hub")}
            </label>
            <div className="live-panel-label">
              <span>{t("屏蔽词", "Blocked words")}</span>
              <Shield size={13} />
            </div>
            <div className="live-keyword-list">
              {words.map((w) => (
                <span key={w}>
                  {w}
                  <button
                    aria-label={`${t("删除屏蔽词", "Remove blocked word")} ${w}`}
                    onClick={() =>
                      store.dispatch({
                        type: "keyword",
                        roomId: room.id,
                        words: words.filter((x) => x !== w),
                      })
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="live-inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (word.trim() && !words.includes(word.trim()))
                  store.dispatch({
                    type: "keyword",
                    roomId: room.id,
                    words: [...words, word.trim()],
                  });
                setWord("");
              }}
            >
              <input
                aria-label={t("新增屏蔽词", "New blocked word")}
                maxLength={30}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder={t("添加屏蔽词", "Add blocked word")}
              />
              <button className="ui-btn" disabled={!word.trim()}>
                <Plus size={15} />
              </button>
            </form>
            <div className="live-panel-label">
              {t("禁言名单", "Muted members")}
            </div>
            {Object.entries(store.state.muted[room.id] || {})
              .filter(([, until]) => until > Date.now())
              .map(([id]) => (
                <div className="live-muted-row" key={id}>
                  <span>
                    {id === "viewer-me"
                      ? "Alpha Trader"
                      : id.replace("user-", "")}
                  </span>
                  <button
                    className="live-text-btn"
                    onClick={() =>
                      store.dispatch({
                        type: "mute",
                        roomId: room.id,
                        userId: id,
                        until: 0,
                      })
                    }
                  >
                    {t("解除", "Unmute")}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
function StrategyEditor({
  room,
  instrument,
  lang,
  onSave,
}: {
  room: LiveRoom;
  instrument: Instrument;
  lang: Lang;
  onSave: (strategy: NonNullable<LiveRoom["strategy"]>) => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    existing =
      room.strategy?.symbol === instrument.symbol ? room.strategy : undefined;
  const [side, setSide] = useState<"buy" | "sell">(existing?.side || "buy"),
    [entry, setEntry] = useState(String(existing?.entry || instrument.price)),
    [target, setTarget] = useState(
      String(
        existing?.target ||
          Number((instrument.price * 1.01).toFixed(instrument.decimals)),
      ),
    ),
    [stop, setStop] = useState(
      String(
        existing?.stop ||
          Number((instrument.price * 0.995).toFixed(instrument.decimals)),
      ),
    ),
    [note, setNote] = useState(existing?.note || "");
  const en = Number(entry),
    tp = Number(target),
    sl = Number(stop),
    valid =
      [en, tp, sl].every((v) => Number.isFinite(v) && v > 0) &&
      (side === "buy" ? sl < en && en < tp : tp < en && en < sl);
  return (
    <details className="live-strategy-editor">
      <summary>
        {t("发布策略", "Publish strategy")} · {instrument.symbol}
      </summary>
      <div className="live-form">
        <label>
          {t("方向", "Direction")}
          <select
            value={side}
            onChange={(e) => {
              const next = e.target.value as "buy" | "sell";
              setSide(next);
              if (next !== side) {
                setTarget(stop);
                setStop(target);
              }
            }}
          >
            <option value="buy">{t("做多", "Long")}</option>
            <option value="sell">{t("做空", "Short")}</option>
          </select>
        </label>
        {[
          [t("参考价", "Entry"), entry, setEntry],
          [t("目标价", "Target"), target, setTarget],
          [t("止损价", "Stop"), stop, setStop],
        ].map(([name, val, setter]) => (
          <label key={name as string}>
            {name as string}
            <input
              type="number"
              step="any"
              min=".00001"
              value={val as string}
              onChange={(e) => (setter as (s: string) => void)(e.target.value)}
            />
          </label>
        ))}
        <label>
          {t("策略说明", "Notes")}
          <textarea
            rows={2}
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {!valid && (
          <small className="live-form-error">
            {t(
              "请检查目标价与止损价的方向",
              "Check the target and stop prices",
            )}
          </small>
        )}
        <button
          className="ui-btn ui-btn-primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              symbol: instrument.symbol,
              side,
              entry: en,
              target: tp,
              stop: sl,
              note,
            })
          }
        >
          {t("发布策略", "Publish")}
        </button>
      </div>
    </details>
  );
}
