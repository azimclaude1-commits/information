import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GIFTS, label, type Lang, type Message } from "./liveState";
import { activeGiftEvents, GIFT_ANIMATION_MS } from "./giftEvents";

/** Both perspectives render the same gift receipts; historical gifts never replay. */
export function GiftAnimation({
  messages,
  lang,
}: {
  messages: Message[];
  lang: Lang;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => setNow(Date.now()), [messages]);
  useEffect(() => {
    const active = activeGiftEvents(messages, Date.now());
    if (!active.length) return;
    const end = Math.min(...active.map((m) => m.at + GIFT_ANIMATION_MS));
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(1, end - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [messages, now]);
  const active = activeGiftEvents(messages, now);
  if (!active.length) return null;
  return createPortal(
    <div className="live-gift-effects" aria-live="polite">
      {active.map((message) => {
        const gift = GIFTS.find((g) => g.id === message.giftId)!;
        const quantity =
          message.giftQty ||
          Math.max(1, (message.amount || gift.cents) / gift.cents);
        return (
          <div
            className="live-gift-effect"
            key={message.id}
            data-testid="gift-animation"
            data-gift-event={message.id}
          >
            <span className="live-gift-effect-icon" aria-hidden="true">
              {gift.icon}
            </span>
            <div>
              <strong>{lang === "en" ? message.nameEn : message.name}</strong>
              <span>
                {label(lang, "送出", "sent")} {label(lang, gift.zh, gift.en)}
              </span>
            </div>
            <b>× {quantity}</b>
            <i aria-hidden="true">✦</i>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
