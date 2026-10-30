import { GIFTS, type Message } from "./liveState";

export const GIFT_ANIMATION_MS = 3000;
export function activeGiftEvents(messages: Message[], now: number) {
  return messages.filter(
    (message) =>
      message.kind === "gift" &&
      GIFTS.some((gift) => gift.id === message.giftId) &&
      message.at <= now &&
      now < message.at + GIFT_ANIMATION_MS,
  );
}
