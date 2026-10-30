import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { COUNTRIES, POPULAR_ISO, countryByIso, type Country } from "../../data/countries";
import { Flag } from "../auth/AuthScreen";
import { Sheet } from "./Sheet";

type Lang = "zh" | "en";

/**
 * Searchable country / region list with round flags: popular regions first, then A–Z (pinyin order
 * in Chinese). `showDial` adds the calling code for phone fields; billing forms show the ISO code.
 */
export function CountrySheet({
  lang,
  selected,
  onPick,
  onClose,
  title,
  showDial = true,
}: {
  lang: Lang;
  selected: string;
  onPick: (iso: string) => void;
  onClose: () => void;
  title?: string;
  showDial?: boolean;
}) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [q, setQ] = useState("");
  const sorted = useMemo(
    () =>
      [...COUNTRIES].sort((a, b) =>
        lang === "zh" ? a.zh.localeCompare(b.zh, "zh-CN") : a.en.localeCompare(b.en, "en"),
      ),
    [lang],
  );
  const query = q.trim().toLowerCase().replace(/^\+/, "");
  const list = query
    ? sorted.filter(
        (c) =>
          c.zh.includes(query) ||
          c.en.toLowerCase().includes(query) ||
          c.iso === query ||
          (showDial && c.dial.startsWith(query)),
      )
    : null;
  const row = (c: Country, group: string) => (
    <button
      key={`${group}-${c.iso}`}
      className="sh-country"
      aria-pressed={c.iso === selected}
      onClick={() => onPick(c.iso)}
    >
      <Flag iso={c.iso} />
      <span>
        {lang === "zh" ? c.zh : c.en}
        {lang === "zh" && <small>{c.en}</small>}
      </span>
      <em>{showDial ? `+${c.dial}` : c.iso.toUpperCase()}</em>
      <i>{c.iso === selected && <Check size={16} strokeWidth={2.6} />}</i>
    </button>
  );
  return (
    <Sheet
      title={title ?? t("选择国家/地区", "Country / region")}
      onClose={onClose}
      size="md"
      className="sh-country-sheet"
    >
      <label className="sh-inputbox sh-country-search">
        <Search size={16} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            showDial
              ? t("搜索国家/地区或区号", "Search country or dial code")
              : t("搜索国家/地区，如 美国 / US", "Search country, e.g. United States / US")
          }
        />
      </label>
      {list ? (
        list.length ? (
          <div className="sh-country-list">{list.map((c) => row(c, "q"))}</div>
        ) : (
          <p className="sh-country-empty">{t("没有找到匹配的国家/地区", "No match")}</p>
        )
      ) : (
        <>
          <h3 className="sh-country-h">{t("常用地区", "Popular")}</h3>
          <div className="sh-country-list">{POPULAR_ISO.map((iso) => row(countryByIso(iso), "p"))}</div>
          <h3 className="sh-country-h">{t("全部国家/地区", "All")}</h3>
          <div className="sh-country-list">{sorted.map((c) => row(c, "a"))}</div>
        </>
      )}
    </Sheet>
  );
}
