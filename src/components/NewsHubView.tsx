import React, { useState } from "react";
import { Newspaper, Radio, CalendarDays } from "lucide-react";
import { FlashNewsView, HeadlinesView } from "./NewsViews";
import { NewsAndCalendarView } from "./NewsAndCalendarView";

type HubTab = "flash" | "headlines" | "calendar";

interface Props {
  lang: "zh" | "en";
  onQuickTrade: (symbol: string, side: "buy" | "sell") => void;
  onOpenMarket: (symbol: string) => void;
}

/** Phone-only 资讯 hub: the 快讯 / 要闻 / 资讯日历 entries fold into one tab bar */
export function NewsHubView({ lang, onQuickTrade, onOpenMarket }: Props) {
  const [tab, setTab] = useState<HubTab>("flash");
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  return (
    <div className="w-full min-w-0">
      <div className="ui-subnav">
        <div className="ui-subnav-inner">
          <div role="tablist" className="ui-tabs">
            {(
              [
                ["flash", Newspaper, "快讯", "Flash"],
                ["headlines", Radio, "要闻", "Headlines"],
                ["calendar", CalendarDays, "资讯日历", "Calendar"],
              ] as const
            ).map(([id, Icon, zh, en]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="ui-tab"
              >
                <Icon className="w-4 h-4 text-brand" />
                {t(zh, en)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {tab === "flash" && <FlashNewsView onOpenMarket={onOpenMarket} />}
      {tab === "headlines" && <HeadlinesView onOpenMarket={onOpenMarket} />}
      {tab === "calendar" && (
        <NewsAndCalendarView lang={lang} onQuickTrade={onQuickTrade} />
      )}
    </div>
  );
}
