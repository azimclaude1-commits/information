import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Pin,
  Plus,
  Send,
  Smile,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Avatar, useNow, Wave } from "./LiveShared";
import { CHAT_EMOJI, useChatSender } from "./LiveChat";
import type { StageControls } from "./LiveStage";
import {
  GIFTS,
  ME,
  label,
  personName,
  type Lang,
  type LiveRoom,
  type Packet,
  type Seat,
} from "./liveState";
import type { LiveStore } from "./useLive";
import { useCommunity } from "../community/Community";

/** Phone rooms cover the app chrome; keep the page underneath from scrolling. */
export function useImmersiveLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    html.classList.add("lv-locked");
    return () => html.classList.remove("lv-locked");
  }, [active]);
}

/** Bottom sheet that slides up inside the stage, over the video. */
export function Sheet({
  title,
  onClose,
  children,
  tall = false,
  lang,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  tall?: boolean;
  lang: Lang;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      )
        close.current();
    };
    document.addEventListener("keydown", handle);
    ref.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", handle);
  }, []);
  return (
    <div className="lv-sheet-layer">
      <button
        className="lv-sheet-backdrop"
        aria-label={label(lang, "关闭面板", "Close panel")}
        onClick={onClose}
      />
      <section
        ref={ref}
        tabIndex={-1}
        className={`lv-sheet${tall ? " tall" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label={title}
      >
        <header>
          <i aria-hidden="true" />
          <h2>{title}</h2>
          <button
            className="live-icon-btn"
            aria-label={label(lang, "关闭", "Close")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="lv-sheet-body">{children}</div>
      </section>
    </div>
  );
}

export type Tile = {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number | string;
  pressed?: boolean;
  disabled?: boolean;
  tone?: "danger" | "brand";
};

export function TileGrid({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section className="lv-tiles">
      <h3>{title}</h3>
      <div>
        {tiles.map((tile) => (
          <button
            key={tile.id}
            className={`lv-tile${tile.tone ? ` tone-${tile.tone}` : ""}`}
            aria-pressed={tile.pressed}
            disabled={tile.disabled}
            onClick={tile.onClick}
          >
            <span>
              {tile.icon}
              {!!tile.badge && <b>{tile.badge}</b>}
            </span>
            {tile.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Translucent message stream anchored to the lower-left of the video. */
export function OverlayChat({
  room,
  store,
  lang,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
}) {
  const community = useCommunity();
  const t = (zh: string, en: string) => label(lang, zh, en);
  const all = store.state.messages[room.id] || [];
  const messages = all.slice(-60);
  const pinned = all.find((m) => m.id === store.state.pinnedMessage[room.id]);
  const moderators = store.state.experience.rooms[room.id].moderators;
  const list = useRef<HTMLDivElement>(null),
    atBottom = useRef(true);
  const [unread, setUnread] = useState(0);
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (!list.current) return;
    if (atBottom.current) list.current.scrollTop = list.current.scrollHeight;
    else setUnread((n) => n + 1);
  }, [lastId]);
  const toBottom = () => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
    atBottom.current = true;
    setUnread(0);
  };
  return (
    <div className="lv-chat">
      {pinned && (
        <p className="lv-chat-pin">
          <Pin size={12} />
          <span>
            {lang === "en" ? pinned.textEn || pinned.text : pinned.text}
          </span>
        </p>
      )}
      <div
        className="lv-chat-list"
        ref={list}
        aria-live="polite"
        aria-label={t("直播聊天", "Live chat")}
        onScroll={() => {
          const el = list.current;
          if (!el) return;
          atBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 30;
          if (atBottom.current) setUnread(0);
        }}
      >
        <p className="lv-chat-row kind-notice">
          {t(
            "欢迎来到直播间！请文明交流，禁止广告引流与收益承诺。",
            "Welcome! Keep it civil — no spam or promises of returns.",
          )}
        </p>
        {messages.map((m) => {
          const name = lang === "en" ? m.nameEn : m.name;
          return (
            <p
              key={m.id}
              data-message-id={m.id}
              className={`lv-chat-row kind-${m.kind}${m.userId === ME ? " is-me" : ""}`}
            >
              {m.kind !== "system" && (
                <button
                  className="lv-chat-name"
                  onClick={() => community.openProfile(m.userId)}
                >
                  {m.kind === "host" && <em>{t("主播", "HOST")}</em>}
                  {moderators.includes(m.userId) && (
                    <em className="mod">{t("房管", "MOD")}</em>
                  )}
                  {name}
                </button>
              )}
              {m.kind === "gift" && (
                <span aria-hidden="true">
                  {GIFTS.find((g) => g.id === m.giftId)?.icon}{" "}
                </span>
              )}
              <span>{lang === "en" ? m.textEn || m.text : m.text}</span>
            </p>
          );
        })}
      </div>
      {unread > 0 && (
        <button className="lv-chat-more" onClick={toBottom}>
          {unread} {t("条新消息", "new")}
        </button>
      )}
    </div>
  );
}

/** "Say something" pill that expands into an input bar over the stage. */
export function Composer({
  room,
  store,
  lang,
  studio,
  open,
  onOpen,
  onClose,
}: {
  room: LiveRoom;
  store: LiveStore;
  lang: Lang;
  studio: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const sender = useChatSender(room, store, lang, studio);
  const [emoji, setEmoji] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) input.current?.focus({ preventScroll: true });
  }, [open]);
  if (!open)
    return (
      <button
        className="lv-say"
        onClick={onOpen}
        disabled={sender.closed}
        aria-label={t("发送聊天消息", "Write a chat message")}
      >
        {sender.placeholder}
      </button>
    );
  return (
    <form
      className="lv-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (sender.send()) {
          setEmoji(false);
          onClose();
        }
      }}
    >
      {emoji && (
        <div className="lv-emoji">
          {CHAT_EMOJI.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => sender.setText((v) => `${v}${s}`.slice(0, 300))}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <small>
        {sender.hint} · {sender.text.length}/300
      </small>
      <div>
        <button
          type="button"
          className="lv-composer-icon"
          aria-label={t("表情", "Emoji")}
          aria-expanded={emoji}
          onClick={() => setEmoji(!emoji)}
        >
          <Smile size={19} />
        </button>
        <input
          ref={input}
          aria-label={t("聊天内容", "Chat message")}
          value={sender.text}
          maxLength={300}
          onChange={(e) => sender.setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder={sender.placeholder}
        />
        <button
          className="lv-composer-send"
          aria-label={t("发送消息", "Send message")}
          disabled={!sender.canSend}
        >
          <Send size={16} />
        </button>
        <button
          type="button"
          className="lv-composer-icon"
          aria-label={t("收起输入框", "Close input")}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
    </form>
  );
}

/** Floating hearts for likes; returns the layer and a trigger. */
export function useHearts() {
  const [hearts, setHearts] = useState<{ id: number; x: number; hue: number }[]>(
    [],
  );
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const burst = () => {
    const id = Date.now() + Math.random();
    setHearts((h) => [
      ...h.slice(-14),
      { id, x: Math.round(Math.random() * 40 - 20), hue: Math.random() },
    ]);
    timers.current.push(
      window.setTimeout(
        () => setHearts((h) => h.filter((x) => x.id !== id)),
        1500,
      ),
    );
  };
  const layer = (
    <div className="lv-hearts" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.id}
          style={
            {
              "--heart-x": `${h.x}px`,
              color: ["#ff5c7a", "#ff9f43", "#7aa2ff", "#ffd166"][
                Math.floor(h.hue * 4)
              ],
            } as React.CSSProperties
          }
        >
          ♥
        </span>
      ))}
    </div>
  );
  return [layer, burst] as const;
}

/** Host + speaker seats, stacked down the right edge of the video. */
export function SeatRail({
  room,
  seats,
  lang,
  onEmpty,
  emptyLabel,
  onSeat,
}: {
  room: LiveRoom;
  seats: Seat[];
  lang: Lang;
  onEmpty?: () => void;
  emptyLabel?: string;
  onSeat?: () => void;
}) {
  return (
    <div className="lv-rail" aria-label={label(lang, "连麦席位", "Speakers")}>
      <span className="lv-seat is-host" title={personName(room.host, lang)}>
        <Avatar profile={room.host} size="sm" />
        <Wave />
      </span>
      {seats.map((s) => (
        <button
          key={s.userId}
          className="lv-seat"
          title={personName(s, lang)}
          onClick={onSeat}
          disabled={!onSeat}
        >
          <Avatar
            profile={{
              name: s.name,
              initials: s.name.slice(0, 2),
              color: s.userId === ME ? "blue" : "violet",
            }}
            size="sm"
          />
          <i className={s.muted ? "muted" : ""}>
            {s.muted ? <MicOff size={9} /> : <Mic size={9} />}
          </i>
        </button>
      ))}
      {onEmpty && seats.length < 5 && (
        <button className="lv-seat is-empty" onClick={onEmpty}>
          <Plus size={14} />
          <small>{emptyLabel}</small>
        </button>
      )}
    </div>
  );
}

/** "Tap to unmute" pill while muted; a small speaker button once sound is on. */
export function SoundToggle({
  controls,
  lang,
}: {
  controls: StageControls;
  lang: Lang;
}) {
  return (
    <button
      className={`lv-sound${controls.muted ? " is-muted" : ""}`}
      aria-label={
        controls.muted ? label(lang, "开启声音", "Unmute") : label(lang, "静音", "Mute")
      }
      onClick={controls.toggleSound}
    >
      {controls.muted ? <VolumeX size={14} /> : <Volume2 size={15} />}
      {controls.muted && <span>{label(lang, "点击开启声音", "Tap to unmute")}</span>}
    </button>
  );
}

/** Red-packet envelope badge with countdown, shown on the right of the video. */
export function PacketFloat({
  packets,
  lang,
  onOpen,
}: {
  packets: Packet[];
  lang: Lang;
  onOpen: () => void;
}) {
  const now = useNow();
  if (!packets.length) return null;
  const next = packets[0];
  const wait = Math.ceil((next.opensAt - now) / 1000);
  return (
    <button className="lv-packet" onClick={onOpen}>
      <span>福</span>
      <small>
        {wait > 0
          ? `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`
          : label(lang, "可领取", "Open")}
      </small>
      {packets.length > 1 && <b>{packets.length}</b>}
    </button>
  );
}
