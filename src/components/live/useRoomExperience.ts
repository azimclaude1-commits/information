import { useEffect, useRef } from "react";
import { uid, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";

export function useRoomExperience(
  room: LiveRoom,
  store: LiveStore,
  enabled: boolean,
) {
  const visit = useRef(uid());
  const dispatch = store.dispatch;
  useEffect(() => {
    dispatch({ type: "x/preference", floatingRoom: null });
    const leave = () => {
      if (window.location.hash !== `#live/room/${room.id}`)
        dispatch({
          type: "x/leave",
          roomId: room.id,
          allowFloating: !window.location.hash.startsWith("#live"),
        });
    };
    const unload = () =>
      dispatch({ type: "x/leave", roomId: room.id, allowFloating: false });
    window.addEventListener("hashchange", leave);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("hashchange", leave);
      window.removeEventListener("beforeunload", unload);
      leave();
    };
  }, [room.id, dispatch]);
  useEffect(() => {
    if (!enabled || room.status === "scheduled") return;
    dispatch({
      type: "x/metric",
      roomId: room.id,
      kind: "visit",
      id: visit.current,
      at: Date.now(),
    });
    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (!document.hidden)
        dispatch({
          type: "x/metric",
          roomId: room.id,
          kind: "watch",
          id: visit.current,
          at: now,
          seconds: (now - last) / 1000,
        });
      last = now;
    }, 10000);
    return () => window.clearInterval(timer);
  }, [room.id, room.status, enabled, dispatch]);
}
