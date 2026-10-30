import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Mic,
  Play,
  Radio,
  Users,
  X,
} from "lucide-react";
import {
  compact,
  label,
  personName,
  type Lang,
  type LiveRoom,
  type Profile,
} from "./liveState";
import { navigateLive, type LiveStore } from "./useLive";
import "./live.css";

export function Avatar({
  profile,
  size = "md",
  speaking = false,
}: {
  profile: Pick<Profile, "initials" | "color" | "name">;
  size?: "sm" | "md" | "lg" | "xl";
  speaking?: boolean;
}) {
  return (
    <span
      className={`live-avatar live-avatar-${size} live-avatar-${profile.color}${speaking ? " is-speaking" : ""}`}
      aria-label={profile.name}
    >
      {profile.initials}
    </span>
  );
}
export function Wave({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`live-wave${paused ? " paused" : ""}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} style={{ animationDelay: `${i * 0.14}s` }} />
      ))}
    </span>
  );
}
export function LiveBadge({ room, lang }: { room: LiveRoom; lang: Lang }) {
  return (
    <span className={`live-badge live-badge-${room.status}`}>
      {room.status === "live" ? (
        <>
          <Wave />
          {label(lang, "直播中", "LIVE")}
        </>
      ) : room.status === "scheduled" ? (
        label(lang, "即将开始", "UPCOMING")
      ) : room.cancelled ? (
        label(lang, "已取消", "CANCELLED")
      ) : (
        label(lang, "回放", "REPLAY")
      )}
    </span>
  );
}
export function DateLabel({ at, lang }: { at: number; lang: Lang }) {
  return (
    <>
      {new Date(at).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
    </>
  );
}
export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
let liveDialogCount = 0;
let liveDialogBodyOverflow = "";
export function LiveDialog({
  title,
  onClose,
  children,
  wide = false,
  overlayClassName = "",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  overlayClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose),
    id = useId();
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    if (liveDialogCount === 0)
      liveDialogBodyOverflow = document.body.style.overflow;
    liveDialogCount++;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input,button,select,textarea")
      ?.focus();
    const handle = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (dialogs[dialogs.length - 1] !== ref.current) return;
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]',
          ) || [],
        ).filter((x) => x.offsetParent !== null);
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      liveDialogCount--;
      if (liveDialogCount === 0)
        document.body.style.overflow = liveDialogBodyOverflow;
      document.removeEventListener("keydown", handle);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className={`live-overlay ${overlayClassName}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`live-dialog${wide ? " live-dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header>
          <h2 id={id}>{title}</h2>
          <button
            className="live-icon-btn"
            aria-label="Close / 关闭"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="live-dialog-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="live-empty">
      <Radio size={28} strokeWidth={1.4} />
      <div>{children}</div>
    </div>
  );
}
export function LiveBanner({
  store,
  lang,
  onOpen,
  compact: small = false,
  inLobby = false,
}: {
  store: LiveStore;
  lang: Lang;
  onOpen?: () => void;
  compact?: boolean;
  inLobby?: boolean;
}) {
  const active = store.state.rooms.filter((r) => r.status === "live");
  const featured = active[0];
  return (
    <section className={`live-home-banner${small ? " compact" : ""}`}>
      <img className="live-banner-art" src="/live/studio-hero.png" alt="" />
      <div className="live-banner-copy">
        <span className="live-banner-kicker">
          <Radio size={15} /> AlphaPulse Live{" "}
          <span className="live-banner-count">
            <i />
            {active.length} {label(lang, "场直播中", "on air")}
          </span>
        </span>
        <h2>{label(lang, "全球市场直播", "Global markets live")}</h2>
        <p>
          {label(
            lang,
            "黄金外汇 · 美股 · 加密市场",
            "Gold & FX · US equities · Crypto",
          )}
        </p>
        <button
          className="live-banner-cta"
          onClick={onOpen || (() => navigateLive())}
        >
          {inLobby
            ? label(lang, "查看正在直播", "Browse live sessions")
            : label(lang, "进入直播大厅", "Explore live rooms")}
          <ArrowUpRight size={17} />
        </button>
      </div>
      {!small && featured && (
        <button
          className="live-banner-now"
          onClick={() => navigateLive(`room/${featured.id}`)}
        >
          <span className="live-banner-now-top">
            <Wave />
            {label(lang, "正在讨论", "ON AIR")}
          </span>
          <strong>{label(lang, featured.title, featured.titleEn)}</strong>
          <span>
            <Avatar profile={featured.host} size="sm" />
            {personName(featured.host, lang)}
            <BadgeCheck size={14} />
            <Users size={13} className="ml-auto" />
            {compact(featured.viewers)}
          </span>
        </button>
      )}
    </section>
  );
}
export function RoomCover({
  room,
  lang,
  large = false,
}: {
  room: LiveRoom;
  lang: Lang;
  large?: boolean;
}) {
  return (
    <div
      className={`live-room-cover cover-${room.category}${large ? " large" : ""}`}
    >
      {room.cover ? (
        <img src={room.cover} alt="" />
      ) : room.category === "macro" ? (
        <img src="/live/studio-hero.png" alt="" />
      ) : (
        <>
          <svg
            className="live-cover-chart"
            viewBox="0 0 500 220"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id={`grid-${room.id}-${large}`}
                width="50"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M50 0H0V44"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity=".12"
                />
              </pattern>
            </defs>
            <rect
              width="500"
              height="220"
              fill={`url(#grid-${room.id}-${large})`}
            />
            <path
              d="M0 180L35 162L65 174L95 130L125 146L155 118L180 138L212 82L242 97L272 67L298 83L328 47L350 64L380 29L410 42L450 15L500 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
          <div className="live-cover-symbol">
            {room.category === "crypto" ? (
              "₿"
            ) : room.category === "stocks" ? (
              "US"
            ) : (
              <Mic size={52} strokeWidth={1} />
            )}
          </div>
        </>
      )}
      <div className="live-cover-top">
        <LiveBadge room={room} lang={lang} />
        <span>
          {room.mode === "voice" ? (
            <Mic size={12} />
          ) : (
            <Play size={11} fill="currentColor" />
          )}
          {label(
            lang,
            room.mode === "voice" ? "语音" : "视频",
            room.mode === "voice" ? "Audio" : "Video",
          )}
        </span>
      </div>
      <div className="live-cover-bottom">
        <span>
          {room.symbols.slice(0, 3).map((s) => (
            <b key={s}>{s.replace("/USD", "")}</b>
          ))}
        </span>
        <span>
          <Users size={12} />
          {compact(room.viewers)}
        </span>
      </div>
      <span className="live-cover-play">
        <Play size={24} fill="currentColor" />
      </span>
    </div>
  );
}
