import type { Packet } from "./liveState";

export const PACKET_RAIN_MS = 10000;

/** A visual event belongs to the opening timestamp, never to renders or claims. */
export function packetRainAt(packets: Packet[], roomId: string, now: number) {
  return packets.filter(
    (p) =>
      p.roomId === roomId &&
      !p.closed &&
      p.expiresAt > now &&
      p.opensAt - PACKET_RAIN_MS <= now &&
      now < p.opensAt,
  );
}

export function nextPacketRainBoundary(
  packets: Packet[],
  roomId: string,
  now: number,
) {
  const times = packets
    .filter((p) => p.roomId === roomId && !p.closed && p.expiresAt > now)
    .flatMap((p) => [p.opensAt - PACKET_RAIN_MS, p.opensAt])
    .filter((at) => at > now);
  return times.length ? Math.min(...times) : null;
}
