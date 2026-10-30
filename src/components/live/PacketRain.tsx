import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { label, type Lang, type Packet } from "./liveState";
import { nextPacketRainBoundary, packetRainAt } from "./packetRainTiming";

export function PacketRain({
  packets,
  roomId,
  lang,
}: {
  packets: Packet[];
  roomId: string;
  lang: Lang;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => setNow(Date.now()), [packets, roomId]);
  useEffect(() => {
    const at = Date.now();
    const next = nextPacketRainBoundary(packets, roomId, at);
    const countdown = packetRainAt(packets, roomId, at);
    const tick = countdown.length
      ? Math.min(
          ...countdown.map(
            (p) => p.opensAt - (Math.ceil((p.opensAt - at) / 1000) - 1) * 1000,
          ),
        )
      : null;
    const boundary =
      next == null ? tick : tick == null ? next : Math.min(next, tick);
    if (boundary == null) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(1, boundary - at),
    );
    return () => window.clearTimeout(timer);
  }, [packets, roomId, now]);
  const ready = packetRainAt(packets, roomId, now);
  if (!ready.length) return null;
  const opened = Math.min(...ready.map((p) => p.opensAt));
  return createPortal(
    <div className="live-packet-rain" data-testid="packet-rain" key={opened}>
      {Array.from({ length: 26 }, (_, index) => (
        <span
          className="live-rain-envelope"
          aria-hidden="true"
          key={index}
          style={
            {
              "--rain-x": `${(index * 37 + 7) % 100}%`,
              "--rain-delay": `${-(index % 13) * 170}ms`,
              "--rain-rotate": `${index % 2 ? 19 : -17}deg`,
              "--rain-drift": `${index % 2 ? 65 : -65}px`,
            } as React.CSSProperties
          }
        >
          <i>福</i>
        </span>
      ))}
      <div
        className="live-packet-countdown"
        role="timer"
        aria-label={label(lang, "红包开启倒计时", "Red packet countdown")}
      >
        <span>{label(lang, "红包即将开启", "Red packet opens in")}</span>
        <strong key={Math.ceil((opened - now) / 1000)}>
          {Math.ceil((opened - now) / 1000)}
        </strong>
        <small>{label(lang, "秒", "seconds")}</small>
      </div>
    </div>,
    document.body,
  );
}
