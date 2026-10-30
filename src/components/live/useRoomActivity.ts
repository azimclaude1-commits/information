import { useEffect, useRef } from "react";
import type { LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";
import { audienceMessage } from "./roomActivity";

export function useRoomActivity(
  room: LiveRoom,
  store: LiveStore,
  enabled = true,
) {
  const latest = useRef({ room, store });
  latest.current = { room, store };
  useEffect(() => {
    if (!enabled || room.status !== "live") return;
    let timer: number;
    let count = 0;
    const post = () => {
      const { room: current, store: liveStore } = latest.current;
      const message = audienceMessage(current, Date.now());
      if (
        current.chatPermission !== "closed" &&
        (liveStore.state.muted[current.id]?.[message.userId] || 0) <= message.at
      ) {
        liveStore.dispatch({ type: "chat", roomId: current.id, message });
      }
      count++;
      timer = window.setTimeout(
        post,
        count < 4 ? 2200 : 5000 + Math.random() * 4000,
      );
    };
    timer = window.setTimeout(post, 700);
    return () => window.clearTimeout(timer);
  }, [room.id, room.status, enabled]);
}
