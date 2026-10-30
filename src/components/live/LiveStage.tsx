import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import type { Instrument } from "../../data/marketData";
import { makeCandles } from "../marketModel";
import { Avatar, DateLabel, LiveBadge, useNow, Wave } from "./LiveShared";
import { label, personName, type Lang, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";

const BARS = 34;
const BAR_STEP = 10.3;
const CHART_W = 28 + BARS * BAR_STEP + 76;

function BroadcastChart({
  instrument,
  period,
  paused,
}: {
  instrument: Instrument;
  period: string;
  paused: boolean;
}) {
  const [start] = useState(Date.now);
  const [price, setPrice] = useState(instrument.price);
  useEffect(() => {
    if (!paused) setPrice(instrument.price);
  }, [paused, instrument.price]);
  const bars = useMemo(
    () => makeCandles(instrument, period, start).slice(-BARS),
    [instrument.symbol, period, start],
  );
  const max = Math.max(...bars.map((b) => b.high), price) * 1.001,
    min = Math.min(...bars.map((b) => b.low), price) * 0.999;
  const y = (v: number) => 20 + ((max - v) / (max - min)) * 230;
  const x = (i: number) => 22 + i * BAR_STEP;
  const ma = bars
    .map(
      (b, i) =>
        `${x(i)},${y(bars.slice(Math.max(0, i - 6), i + 1).reduce((s, c) => s + c.close, 0) / Math.min(i + 1, 7))}`,
    )
    .join(" ");
  const axis = CHART_W - 68;
  return (
    <svg
      className="lv-chart-svg"
      viewBox={`0 0 ${CHART_W} 320`}
      role="img"
      aria-label={`${instrument.symbol} ${period} chart`}
      preserveAspectRatio="xMidYMid meet"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line
            x1="10"
            x2={axis - 6}
            y1={24 + i * 56}
            y2={24 + i * 56}
            stroke="#ffffff10"
          />
          <text x={axis} y={28 + i * 56} fill="#8d9ab3" fontSize="10">
            {(max - ((max - min) * i) / 4).toFixed(instrument.decimals)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const up = b.close >= b.open,
          color = up ? "#24bc9a" : "#f16b7c";
        return (
          <g key={i}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={y(b.high)}
              y2={y(b.low)}
              stroke={color}
            />
            <rect
              x={x(i) - 3}
              y={Math.min(y(b.open), y(b.close))}
              width="6"
              height={Math.max(1.5, Math.abs(y(b.open) - y(b.close)))}
              fill={color}
              rx=".5"
            />
            <rect
              x={x(i) - 3}
              y={300 - ((i % 8) + 2) * 3}
              width="6"
              height={((i % 8) + 2) * 3}
              fill={color}
              opacity=".3"
            />
          </g>
        );
      })}
      <polyline
        points={ma}
        stroke="#e4b466"
        strokeWidth="1.25"
        fill="none"
        opacity=".85"
      />
      <line
        x1="10"
        x2={axis - 4}
        y1={y(price)}
        y2={y(price)}
        stroke="#4584ff"
        strokeDasharray="4 4"
        opacity=".85"
      />
      <rect
        x={axis - 4}
        y={y(price) - 10}
        width="70"
        height="20"
        fill="#2962ff"
        rx="3"
      />
      <text x={axis} y={y(price) + 4} fill="white" fontSize="10">
        {price.toFixed(instrument.decimals)}
      </text>
    </svg>
  );
}

export type StageControls = {
  playing: boolean;
  muted: boolean;
  cc: boolean;
  progress: number;
  duration: number;
  togglePlayback: () => void;
  toggleSound: () => void;
  toggleCc: () => void;
  fullscreen: () => void;
  seekTo: (second: number) => void;
};

/** Status badge plus on-air timer / replay label / scheduled date. */
export function LiveClock({ room, lang }: { room: LiveRoom; lang: Lang }) {
  const now = useNow();
  const elapsed = Math.max(0, Math.floor((now - room.startsAt) / 1000));
  return (
    <span className="lv-clock">
      <LiveBadge room={room} lang={lang} />
      <span>
        {room.status === "live" ? (
          `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor(elapsed / 60) % 60).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
        ) : room.status === "ended" ? (
          label(lang, "市场回放", "Market replay")
        ) : (
          <DateLabel at={room.startsAt} lang={lang} />
        )}
      </span>
    </span>
  );
}

/**
 * Full-bleed broadcast surface. The video covers its container; overlays are
 * rendered by the caller through `children`, which receives playback controls
 * so they stay inside the fullscreen element.
 */
export function LiveStage({
  room,
  store,
  instruments,
  lang,
  onToast,
  waitingAction,
  seek,
  remember = false,
  className = "",
  children,
}: {
  room: LiveRoom;
  store: LiveStore;
  instruments: Instrument[];
  lang: Lang;
  onToast: (s: string) => void;
  waitingAction?: React.ReactNode;
  seek?: { id: number; second: number };
  remember?: boolean;
  className?: string;
  children?: (controls: StageControls) => React.ReactNode;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [playing, setPlaying] = useState(true),
    [muted, setMuted] = useState(true),
    [cc, setCc] = useState(false),
    [period, setPeriod] = useState("15m"),
    [captionIndex, setCaptionIndex] = useState(0);
  const [progress, setProgress] = useState(0),
    [duration, setDuration] = useState(0);
  const stage = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const savedProgress = useRef(
    store.state.experience.rooms[room.id]?.replay.position || 0,
  );
  const lastSaved = useRef(0);
  const persist = (v: HTMLVideoElement, force = false) => {
    if (
      remember &&
      Number.isFinite(v.duration) &&
      (force || Date.now() - lastSaved.current > 4000)
    ) {
      lastSaved.current = Date.now();
      store.dispatch({
        type: "x/progress",
        roomId: room.id,
        second: v.currentTime,
        duration: v.duration,
      });
    }
  };
  useEffect(() => {
    if (seek && video.current && Number.isFinite(video.current.duration)) {
      video.current.currentTime = Math.min(
        seek.second,
        Math.max(0, video.current.duration - 0.1),
      );
      setProgress(video.current.currentTime);
      setPlaying(true);
      void video.current.play().catch(() => setPlaying(false));
    }
  }, [seek]);
  const instrument =
    instruments.find((i) => i.symbol === room.pinnedSymbol) || instruments[0];
  const seats = store.state.seats[room.id] || [],
    active = room.status !== "scheduled";
  const subtitles =
    lang === "zh"
      ? [
          "欢迎来到全球市场直播间。",
          "今天我们一起关注黄金、美元和科技股的走势。",
          "先看较大的时间周期，再结合成交量寻找关键位置。",
          "大家可以在聊天区分享观察，也可以申请连麦。",
          "接下来我们继续观察不同市场之间的变化。",
        ]
      : [
          "Welcome to the global markets live desk.",
          "Today we are watching gold, the dollar and technology stocks.",
          "Start with the broader timeframe, then look at price and volume.",
          "Share your views in chat or request a speaker seat.",
          "Next, we will look at the connections across markets.",
        ];
  useEffect(() => {
    if (!video.current || !active) return;
    if (playing) void video.current.play().catch(() => setPlaying(false));
    else video.current.pause();
  }, [playing, active, room.id]);
  const controls: StageControls = {
    playing,
    muted,
    cc,
    progress,
    duration,
    togglePlayback: () => {
      setPlaying(!playing);
      if (!playing)
        void video.current
          ?.play()
          .catch(() => onToast(t("请再次点击播放", "Tap play to continue")));
    },
    toggleSound: () => {
      if (video.current) {
        video.current.muted = !muted;
        if (muted) {
          setPlaying(true);
          void video.current
            .play()
            .catch(() =>
              onToast(t("请点击播放开启声音", "Press play to enable sound")),
            );
        }
      }
      setMuted(!muted);
    },
    toggleCc: () => setCc(!cc),
    fullscreen: () => {
      const request = document.fullscreenElement
        ? document.exitFullscreen()
        : stage.current?.requestFullscreen();
      request?.catch(() =>
        onToast(
          t("当前设备不支持全屏", "Fullscreen is unavailable on this device"),
        ),
      );
    },
    seekTo: (second) => {
      if (video.current) video.current.currentTime = second;
    },
  };
  return (
    <div
      className={`lv-stage mode-${room.mode}${!playing ? " is-paused" : ""} ${className}`}
      ref={stage}
    >
      <video
        ref={video}
        className="lv-video"
        src={
          lang === "zh"
            ? "/live/market-briefing.mp4"
            : "/live/market-briefing-en.mp4"
        }
        poster={
          store.state.experience.rooms[room.id]?.replay.cover ||
          "/live/studio-hero.png"
        }
        loop={room.status === "live"}
        playsInline
        muted={muted}
        autoPlay={active}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (
            remember &&
            room.status === "ended" &&
            savedProgress.current > 0 &&
            savedProgress.current < e.currentTarget.duration - 1
          )
            e.currentTarget.currentTime = savedProgress.current;
          if (seek)
            e.currentTarget.currentTime = Math.min(
              seek.second,
              Math.max(0, e.currentTarget.duration - 0.1),
            );
        }}
        onPause={(e) => persist(e.currentTarget, true)}
        onTimeUpdate={(e) => {
          setProgress(e.currentTarget.currentTime);
          persist(e.currentTarget);
          setCaptionIndex(
            Math.min(
              4,
              Math.floor(
                e.currentTarget.currentTime /
                  Math.max(1, e.currentTarget.duration / 5),
              ),
            ),
          );
        }}
        onEnded={() => setPlaying(false)}
        aria-label={t("直播画面", "Live video")}
      />
      <div className="lv-scrim" aria-hidden="true" />
      {room.status === "scheduled" ? (
        <div className="lv-waiting">
          <Avatar profile={room.host} size="xl" />
          <h2>{t("直播即将开始", "Starting soon")}</h2>
          <p>
            <DateLabel at={room.startsAt} lang={lang} />
          </p>
          {waitingAction}
        </div>
      ) : (
        <>
          {room.mode === "chart" && (
            <div className="lv-chart-card">
              <div className="lv-chart-head">
                <div>
                  <strong>{instrument.symbol}</strong>
                  <span>{t(instrument.nameZh, instrument.nameEn)}</span>
                </div>
                <div>
                  <b>{instrument.price.toFixed(instrument.decimals)}</b>
                  <em
                    className={
                      instrument.changePercent24h >= 0 ? "positive" : "negative"
                    }
                  >
                    {instrument.changePercent24h >= 0 ? "+" : ""}
                    {instrument.changePercent24h.toFixed(2)}%
                  </em>
                </div>
              </div>
              <div className="lv-chart-periods">
                {["1m", "15m", "1H", "4H", "1D"].map((p) => (
                  <button
                    key={p}
                    aria-pressed={p === period}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
                <span>MA 7 · VOL</span>
              </div>
              <BroadcastChart
                instrument={instrument}
                period={period}
                paused={!playing}
              />
            </div>
          )}
          {room.mode === "voice" && (
            <div className="lv-voice">
              <div className="lv-voice-orbit">
                <Avatar profile={room.host} size="xl" speaking={playing} />
              </div>
              <h2>{personName(room.host, lang)}</h2>
              <span>
                {t("主播", "Host")}
                <Wave paused={!playing} />
              </span>
              <div className="lv-voice-guests">
                {seats.slice(0, 4).map((s) => (
                  <div key={s.userId}>
                    <Avatar
                      profile={{
                        initials: s.name.slice(0, 2).toUpperCase(),
                        color: "violet",
                        name: s.name,
                      }}
                      size="lg"
                      speaking={playing && !s.muted}
                    />
                    <span>
                      {personName(s, lang)}
                      {s.muted ? <MicOff size={12} /> : <Mic size={12} />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {cc && (
            <div className="lv-captions" aria-live="off">
              {subtitles[captionIndex]}
            </div>
          )}
        </>
      )}
      {children?.(controls)}
    </div>
  );
}
