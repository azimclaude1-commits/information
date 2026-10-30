import { type LiveRoom, type Message } from "./liveState";

const AUDIENCE = [
  ["user-oliver", "Oliver", "Oliver"],
  ["user-mia", "小麦", "Mia"],
  ["user-noah", "Noah", "Noah"],
  ["user-yu", "余舟", "Yu"],
  ["user-luna", "Luna", "Luna"],
  ["user-zhou", "周末看盘", "Weekend Trader"],
] as const;
const LINES = [
  ["刚进来，赶上了。", "Just joined, made it in time."],
  ["老师能切一下小时线吗？", "Could we look at the hourly chart?"],
  ["先等这根 K 线收完再看。", "Waiting for this candle to close."],
  [
    "这个位置的成交量确实值得留意。",
    "The volume at this level is worth watching.",
  ],
  ["谢谢分享，思路清楚多了。", "Thanks, that makes it much clearer."],
  ["已加入自选，继续观察。", "Added to my watchlist, keeping an eye on it."],
  [
    "今天先控制仓位，不急着进场。",
    "Keeping my position small, no rush to enter.",
  ],
  ["回踩的时候再看看量能。", "Let's watch the volume on the pullback."],
  ["画面很清楚，声音也正常。", "The picture and audio are clear."],
  [
    "这个压力位和我画的差不多。",
    "That resistance is close to the level I marked.",
  ],
  ["刚才的分析记下来了。", "Noted the analysis just now."],
  ["晚点有数据公布，先观察一下。", "Data is due later, watching for now."],
] as const;

/** Stable time slots prevent duplicate audience posts when both perspectives are open. */
export function audienceMessage(room: LiveRoom, at: number): Message {
  const slot = Math.floor(at / 2000);
  const person = AUDIENCE[slot % AUDIENCE.length];
  const line =
    LINES[(Math.floor(slot / AUDIENCE.length) + slot) % LINES.length];
  const topic = slot % 5 === 0;
  return {
    id: `audience-${room.id}-${slot}`,
    userId: person[0],
    name: person[1],
    nameEn: person[2],
    text: topic ? `${room.pinnedSymbol} 这个位置还需要再确认一下。` : line[0],
    textEn: topic
      ? `Watching for confirmation at this level on ${room.pinnedSymbol}.`
      : line[1],
    at,
    kind: "chat",
  };
}
