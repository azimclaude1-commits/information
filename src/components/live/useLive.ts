import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Instrument } from "../../data/marketData";
import { hydrateLiveState } from "./liveExperience";
import { useSavedState } from "../marketModel";
import {
  label,
  reduceLive,
  seedLiveState,
  type Lang,
  type LiveAction,
  type LiveState,
} from "./liveState";

const LIVE_STORAGE_KEY = "alphapulse.live.v1";
function storedLiveState(fallback: LiveState): LiveState {
  try {
    const saved = localStorage.getItem(LIVE_STORAGE_KEY);
    if (!saved || saved === JSON.stringify(fallback)) return fallback;
    const value = JSON.parse(saved);
    return value.version === 1 &&
      Array.isArray(value.rooms) &&
      Array.isArray(value.packets) &&
      value.wallets
      ? hydrateLiveState(value)
      : fallback;
  } catch {
    return fallback;
  }
}

export function useLive(
  lang: Lang,
  onToast: (text: string) => void,
  instruments: Instrument[] = [],
) {
  const prices = useRef(instruments);
  prices.current = instruments;
  const [initial] = useState(seedLiveState);
  const [savedState, setState] = useSavedState(LIVE_STORAGE_KEY, initial);
  const state = useMemo(() => hydrateLiveState(savedState), [savedState]);
  const noticeIds = useRef(new Set(state.experience.notices.map((n) => n.id)));
  useEffect(() => {
    const fresh = state.experience.notices.find(
      (n) => !noticeIds.current.has(n.id),
    );
    state.experience.notices.forEach((n) => noticeIds.current.add(n.id));
    if (fresh) onToast(lang === "zh" ? fresh.text : fresh.en);
  }, [state.experience.notices, lang, onToast]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LIVE_STORAGE_KEY)
        setState((old) => storedLiveState(old));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [setState]);
  const dispatch = useCallback(
    (action: LiveAction) => {
      let error: string | undefined;
      setState((old) => {
        const result = reduceLive(storedLiveState(old), action);
        error = result.error;
        return result.state;
      });
      const errors: Record<string, [string, string]> = {
        funds: ["直播余额不足", "Insufficient live balance"],
        closed: [
          "当前操作已结束或暂不可用",
          "This action has ended or is unavailable",
        ],
        invalid: ["请检查输入内容", "Please check your input"],
        claimed: ["你已领取过这个红包", "You have already claimed this packet"],
        early: ["红包尚未开启", "This packet is not open yet"],
        full: ["连麦席位已满", "All speaker seats are occupied"],
        muted: ["当前暂时无法发言", "Chat is currently restricted"],
        followers: ["关注主播后即可发言", "Follow the host to join the chat"],
      };
      if (error) onToast(label(lang, ...errors[error]));
      return !error;
    },
    [setState, lang, onToast],
  );
  useEffect(() => {
    const expire = () =>
      setState(
        (old) =>
          reduceLive(
            reduceLive(storedLiveState(old), { type: "expire", at: Date.now() })
              .state,
            {
              type: "x/tick",
              at: Date.now(),
              prices: Object.fromEntries(
                prices.current.map((i) => [i.symbol, i.price]),
              ),
            },
          ).state,
      );
    expire();
    const timer = window.setInterval(expire, 5000);
    return () => window.clearInterval(timer);
  }, [setState]);
  return { state, dispatch };
}
export type LiveStore = ReturnType<typeof useLive>;

export function navigateLive(path = "") {
  window.location.hash = `live${path ? `/${path}` : ""}`;
  window.scrollTo({ top: 0, behavior: "instant" });
}
export function navigateStudio(roomId = "") {
  window.location.hash = `live-studio${roomId ? `/${roomId}` : ""}`;
  window.scrollTo({ top: 0, behavior: "instant" });
}
export function useLiveRoute() {
  const read = () => window.location.hash.slice(1).split("/").slice(1);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const handler = () => setRoute(read());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return route;
}
