import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Search,
  Settings2,
  Share2,
  ThumbsUp,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  ARTICLES,
  ARTICLE_TABS,
  Article,
  FLASH_ITEMS,
  FLASH_TABS,
  FlashItem,
  FlashTab,
} from "./newsContent";
import { useSavedState } from "./marketModel";
import "./news.css";
import {
  CommentCount,
  FollowButton,
  ProfileAvatar,
  useCommunity,
} from "./community/Community";
import { authorId } from "./community/communityState";
import { NewsComments } from "./community/NewsComments";
import { AiSummarySheet, ShareSheet } from "./NewsSheets";
import { useMembership } from "./membership/Membership";

export function NewsDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("button,input")?.focus();
    const key = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (dialogs[dialogs.length - 1] !== ref.current) return;
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
          ) || [],
        ).filter((element) => element.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="news-overlay" onClick={onClose}>
      <div
        className="news-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function ShareDialog({
  title,
  excerpt,
  meta,
  path,
  onClose,
}: {
  title: string;
  excerpt: string;
  meta: string;
  path: string;
  onClose: () => void;
}) {
  return (
    <ShareSheet
      title={title}
      excerpt={excerpt}
      meta={meta}
      path={path}
      onClose={onClose}
    />
  );
}
function NewsTabs({
  tabs,
  value,
  onChange,
  children,
  extraTabs,
}: {
  tabs: readonly string[];
  value: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
  extraTabs?: React.ReactNode;
}) {
  return (
    <div className="news-toolbar">
      <div className="news-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={value === t}
            key={t}
            onClick={() => onChange(t)}
          >
            {t}
          </button>
        ))}
        {extraTabs}
      </div>
      {children}
    </div>
  );
}
export function FlashNewsView({
  onOpenMarket,
}: {
  onOpenMarket: (symbol: string) => void;
}) {
  const requested = FLASH_ITEMS.find(
    (i) => i.id === location.hash.split("/")[1],
  );
  const [tab, setTab] = useState<FlashTab>(requested?.categories[0] || "精选");
  const [important, setImportant] = useSavedState("news.important", false);
  const [titles, setTitles] = useSavedState("news.titles", false);
  const [votes, setVotes] = useSavedState<Record<string, string>>(
    "news.votes",
    {},
  );
  const [reminders, setReminders] = useSavedState<string[]>(
    "news.reminders",
    [],
  );
  const [density, setDensity] = useSavedState("news.density", "comfortable");
  const [font, setFont] = useSavedState("news.font", "normal");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [settings, setSettings] = useState(false);
  const [share, setShare] = useState<FlashItem | null>(null);
  const [detail, setDetail] = useState<FlashItem | null>(null);
  const [query, setQuery] = useState("");
  const topics: FlashTab[] = ["ETF", "BTC", "ETH", "BNB", "币股"];
  const filtered = FLASH_ITEMS.filter(
    (i) =>
      i.categories.includes(tab) &&
      (!important || i.important) &&
      (!query ||
        `${i.title}${i.body}${i.author || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  ).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const toggle = (id: string, value: string) =>
    setVotes((old) => ({ ...old, [id]: old[id] === value ? "" : value }));
  useEffect(() => {
    const sync = () => {
      const item = FLASH_ITEMS.find(
        (i) => i.id === location.hash.split("/")[1],
      );
      if (item) {
        setTab(item.categories[0]);
        setQuery("");
        setImportant(false);
        setTitles(false);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (requested)
      document
        .getElementById(requested.id)
        ?.scrollIntoView({ block: "center" });
  }, [tab, important, titles]);
  return (
    <div className={`news-shell flash-page ${density} font-${font}`}>
      <NewsTabs
        tabs={FLASH_TABS.filter((t) => !topics.includes(t))}
        extraTabs={
          <label
            className={`flash-topic-select ${topics.includes(tab) ? "active" : ""}`}
          >
            <select
              aria-label="快讯主题"
              value={topics.includes(tab) ? tab : ""}
              onChange={(e) => {
                setTab(e.target.value as FlashTab);
                setQuery("");
                window.history.replaceState(null, "", "#flash");
              }}
            >
              <option value="" disabled>
                ETF
              </option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        }
        value={tab}
        onChange={(v) => {
          setTab(v as FlashTab);
          setQuery("");
          window.history.replaceState(null, "", "#flash");
        }}
      >
        <div className="news-options">
          <label>
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            只看重要
          </label>
          <label>
            <input
              type="checkbox"
              checked={titles}
              onChange={(e) => setTitles(e.target.checked)}
            />
            只看标题
          </label>
          <button onClick={() => setSettings(true)} aria-label="快讯设置">
            <Settings2 size={16} />
            <span>设置</span>
          </button>
        </div>
      </NewsTabs>
      <div className="flash-brief">
        <div className="flash-brief-title">
          <span className="news-live-dot" />
          <div>
            <b>7 × 24 全球快讯</b>
            <small>宏观政策 · 机构动态 · 链上资金</small>
          </div>
        </div>
        <div className="flash-brief-stat">
          <span>当前分类</span>
          <b>
            {tab}
            <small>{filtered.length} 条</small>
          </b>
        </div>
        <div className="flash-brief-stat">
          <span>重点关注</span>
          <b>
            {filtered.filter((i) => i.important).length}
            <small>条重要消息</small>
          </b>
        </div>
        <div className="flash-brief-stat">
          <span>最新更新</span>
          <b>
            {filtered[0]?.time || "—"}
            <small>UTC+8</small>
          </b>
        </div>
        <div className="flash-brief-topics">
          {(["股票", "美联储", "链上", "BTC"] as FlashTab[]).map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setTab(topic);
                setQuery("");
              }}
              className={tab === topic ? "active" : ""}
            >
              {topic}
              <ChevronRight size={12} />
            </button>
          ))}
        </div>
      </div>
      <div className="flash-top">
        <div>
          <span className="news-live-dot" />
          快讯
        </div>
        <label className="news-search">
          <Search size={15} />
          <input
            aria-label="搜索快讯"
            placeholder="搜索当前分类"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="flash-timeline" role="tabpanel" aria-label={tab}>
        {filtered.map((item, index) => {
          const social = tab === "推特" || !!item.original;
          const unfolded = expanded.includes(item.id);
          return (
            <article className="flash-entry" key={item.id} id={item.id}>
              <div className="flash-date">
                {(index === 0 || filtered[index - 1].date !== item.date) && (
                  <div>
                    <b>{Number(item.date.split("-")[1])}</b>
                    <span>{Number(item.date.split("-")[0])}月</span>
                  </div>
                )}
              </div>
              <time>{item.time}</time>
              <div className="flash-body">
                <i className={item.important ? "important" : ""} />
                {social && !titles ? (
                  <div className="news-author">
                    {item.author && (
                      <ProfileAvatar id={authorId(item.author)} size="md" />
                    )}
                    <div>
                      <b>{item.author}</b>
                      <span>
                        {item.followers}粉丝 · {item.time}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    className={`flash-title ${item.important ? "important" : ""}`}
                    onClick={() =>
                      titles
                        ? setExpanded((old) =>
                            old.includes(item.id)
                              ? old.filter((x) => x !== item.id)
                              : [...old, item.id],
                          )
                        : setDetail(item)
                    }
                  >
                    {item.title}
                  </button>
                )}
                {(!titles || unfolded) && (
                  <>
                    <p className="flash-copy">{item.body}</p>
                    {item.source && (
                      <div className="news-source">来源：{item.source}</div>
                    )}
                    {item.address && (
                      <div className="whale-info">
                        <span>账户地址</span>
                        <code>{item.address}</code>
                        <button onClick={() => setDetail(item)}>
                          查看巨鲸详情 <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                    {item.original && (
                      <div className="original-text">
                        <button
                          onClick={() =>
                            setExpanded((old) =>
                              old.includes(item.id)
                                ? old.filter((x) => x !== item.id)
                                : [...old, item.id],
                            )
                          }
                        >
                          {unfolded ? "收起原文" : "查看原文"}{" "}
                          <ChevronRight size={13} />
                        </button>
                        {unfolded && <p>{item.original}</p>}
                      </div>
                    )}
                    {item.reminder && (
                      <button
                        className="news-reminder"
                        onClick={() =>
                          setReminders((old) =>
                            old.includes(item.id)
                              ? old.filter((x) => x !== item.id)
                              : [...old, item.id],
                          )
                        }
                      >
                        <Bell size={14} />
                        {item.reminder} SGT ·{" "}
                        {reminders.includes(item.id)
                          ? "已加入日程"
                          : "加入日程"}
                      </button>
                    )}
                    {item.chart && (
                      <div className="fund-summary">
                        <div>
                          <span>大额资金观察</span>
                          <b>{item.symbol?.split("/")[0]} / USDT</b>
                        </div>
                        <div>
                          <span>数据类型</span>
                          <b>
                            {item.id === "fund-3" ? "委托挂单" : "主力成交"}
                          </b>
                        </div>
                        <button onClick={() => onOpenMarket(item.symbol!)}>
                          查看 K 线 <ArrowUpRight size={16} />
                        </button>
                      </div>
                    )}
                    {item.symbol && item.change && (
                      <button
                        className={`news-symbol ${item.change.startsWith("-") ? "negative" : ""}`}
                        onClick={() => onOpenMarket(item.symbol!)}
                      >
                        {item.symbol.split("/")[0]} {item.change}
                      </button>
                    )}
                  </>
                )}
                <div className="news-actions">
                  {social ? (
                    <>
                      <button
                        className={votes[item.id] === "like" ? "selected" : ""}
                        onClick={() => toggle(item.id, "like")}
                      >
                        <ThumbsUp size={15} />
                        {votes[item.id] === "like" ? 1 : 0}
                      </button>
                      <span>
                        <Eye size={15} /> {unfolded ? 1 : 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <button
                        className={votes[item.id] === "up" ? "positive" : ""}
                        onClick={() => toggle(item.id, "up")}
                      >
                        <ArrowUp size={16} />
                        利好{" "}
                        {(item.up || 0) + (votes[item.id] === "up" ? 1 : 0)}
                      </button>
                      <button
                        className={votes[item.id] === "down" ? "negative" : ""}
                        onClick={() => toggle(item.id, "down")}
                      >
                        <ArrowDown size={16} />
                        利空{" "}
                        {(item.down || 0) + (votes[item.id] === "down" ? 1 : 0)}
                      </button>
                    </>
                  )}
                  <button onClick={() => setShare(item)}>
                    <Share2 size={14} />
                    分享
                  </button>
                </div>
                <NewsComments postId={`flash:${item.id}`} />
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <div className="news-empty">
            <Search size={24} />
            <h3>暂无符合条件的快讯</h3>
            <button
              onClick={() => {
                setImportant(false);
                setQuery("");
              }}
            >
              清除筛选
            </button>
          </div>
        )}
        {!!filtered.length && (
          <div className="news-end">已显示该分类全部快讯</div>
        )}
      </div>
      {settings && (
        <NewsDialog title="快讯设置" onClose={() => setSettings(false)}>
          <label className="news-field">
            列表密度
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value)}
            >
              <option value="comfortable">舒适</option>
              <option value="compact">紧凑</option>
            </select>
          </label>
          <label className="news-field">
            文字大小
            <select value={font} onChange={(e) => setFont(e.target.value)}>
              <option value="normal">标准</option>
              <option value="large">大号</option>
            </select>
          </label>
          <p className="news-source">设置将保存在当前设备。</p>
          <button className="news-primary" onClick={() => setSettings(false)}>
            完成
          </button>
        </NewsDialog>
      )}
      {share && (
        <ShareDialog
          title={share.title}
          excerpt={share.body}
          meta={`快讯 · 2026-${share.date} ${share.time}${share.source ? ` · ${share.source}` : ""}`}
          path={`flash/${share.id}`}
          onClose={() => setShare(null)}
        />
      )}
      {detail && (
        <NewsDialog
          title={detail.address ? "巨鲸详情" : "快讯详情"}
          onClose={() => setDetail(null)}
        >
          {detail.address ? (
            <>
              <div className="news-author">
                {detail.author && (
                  <ProfileAvatar id={authorId(detail.author)} size="md" />
                )}
                <b>{detail.author}</b>
              </div>
              <label className="news-field">
                账户地址
                <input
                  readOnly
                  value={detail.address}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <dl className="news-details">
                <div>
                  <dt>平台</dt>
                  <dd>Hyperliquid</dd>
                </div>
                <div>
                  <dt>资金变动</dt>
                  <dd>
                    {detail.action} {detail.amount} USDC
                  </dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>
                    2026-{detail.date} {detail.time} UTC+8
                  </dd>
                </div>
              </dl>
              <h3>相关记录</h3>
              {FLASH_ITEMS.filter((i) => i.address === detail.address).map(
                (i) => (
                  <p key={i.id}>
                    {i.time} · {i.action} {i.amount} USDC
                  </p>
                ),
              )}
            </>
          ) : (
            <>
              <h3>{detail.title}</h3>
              <p className="news-source">
                2026-{detail.date} {detail.time} · {detail.source || "市场动态"}
              </p>
              <p style={{ whiteSpace: "pre-line" }}>{detail.body}</p>
              <div className="flash-detail-actions news-actions">
                <button
                  className={votes[detail.id] === "up" ? "positive" : ""}
                  onClick={() => toggle(detail.id, "up")}
                >
                  <ArrowUp size={16} />
                  利好 {(detail.up || 0) + (votes[detail.id] === "up" ? 1 : 0)}
                </button>
                <button
                  className={votes[detail.id] === "down" ? "negative" : ""}
                  onClick={() => toggle(detail.id, "down")}
                >
                  <ArrowDown size={16} />
                  利空{" "}
                  {(detail.down || 0) + (votes[detail.id] === "down" ? 1 : 0)}
                </button>
                {detail.symbol && (
                  <button
                    onClick={() => {
                      setDetail(null);
                      onOpenMarket(detail.symbol!);
                    }}
                  >
                    <ArrowUpRight size={15} />
                    {detail.symbol.split("/")[0]} {detail.change || "行情"}
                  </button>
                )}
                <button onClick={() => setShare(detail)}>
                  <Share2 size={14} />
                  分享
                </button>
              </div>
            </>
          )}
          <NewsComments key={detail.id} postId={`flash:${detail.id}`} />
        </NewsDialog>
      )}
    </div>
  );
}

export function EditorialArt({
  article,
  large = false,
}: {
  article: Article;
  large?: boolean;
}) {
  const paths = {
    chart:
      "M0 65L18 58L35 68L52 45L70 49L86 35L103 43L123 23L140 30L159 13L178 26L200 8",
    macro: "M0 15Q75 18 100 39T200 63",
    report: "M0 72L25 50L49 63L71 36L95 46L123 19L151 32L173 13L200 20",
  };
  return (
    <div
      aria-hidden="true"
      className={`editorial-art art-${article.theme} ${large ? "large" : ""}`}
    >
      <div className="art-grid" />
      <span className="art-kicker">
        {article.theme === "report"
          ? "MARKET RESEARCH"
          : article.theme === "security"
            ? "SECURITY"
            : article.theme === "network"
              ? "WEB3 INSIGHT"
              : "MARKET BRIEF"}
      </span>
      <svg viewBox="0 0 200 80" preserveAspectRatio="none">
        <path
          d={paths[article.theme as keyof typeof paths] || paths.chart}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        {[30, 68, 110, 152].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={55 - i * 9}
            r={article.theme === "network" ? 9 : 2}
            fill="currentColor"
            fillOpacity=".5"
          />
        ))}
      </svg>
      <strong>
        {article.theme === "report"
          ? "行业洞见"
          : article.theme === "stocks"
            ? "币股日报"
            : article.theme === "security"
              ? "链上安全"
              : article.theme === "network"
                ? "连接下一步"
                : article.theme === "bitcoin"
                  ? "数字资产"
                  : article.theme === "macro"
                    ? "全球视野"
                    : "行情观察"}
      </strong>
    </div>
  );
}
export function HeadlinesView({
  onOpenMarket,
}: {
  onOpenMarket?: (symbol: string) => void;
}) {
  const requested = ARTICLES.find((i) => i.id === location.hash.split("/")[1]);
  const [tab, setTab] = useState<string>(requested?.category || "精选");
  const [selected, setSelected] = useState(requested?.id || ARTICLES[0].id);
  const [summary, setSummary] = useState(false);
  /** AI 摘要 counts as one AI analysis per article per day; regenerating counts again. */
  const membership = useMembership();
  const [reader, setReader] = useState(false);
  const [mobileReading, setMobileReading] = useState(!!requested);
  const [query, setQuery] = useState("");
  const community = useCommunity();
  const [likes, setLikes] = useSavedState<string[]>("articles.likes", []);
  const [saved, setSaved] = useSavedState<string[]>("articles.saved", []);
  const [savedOnly, setSavedOnly] = useState(false);
  const [share, setShare] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const a = ARTICLES.find((i) => i.id === location.hash.split("/")[1]);
      if (a) {
        setTab(a.category);
        setSelected(a.id);
        setSummary(false);
        setMobileReading(true);
        setQuery("");
        setSavedOnly(false);
      }
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const current = ARTICLES.find((i) => i.id === selected) || ARTICLES[0];
  const list = ARTICLES.filter(
    (a) =>
      (tab === "精选"
        ? a.featured || a.category === "精选"
        : a.category === tab) &&
      (!savedOnly || saved.includes(a.id)) &&
      `${a.title}${a.author}`.toLowerCase().includes(query.toLowerCase()),
  );
  const toggle = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) =>
    setter((old) =>
      old.includes(id) ? old.filter((i) => i !== id) : [...old, id],
    );
  const choose = (a: Article) => {
    setSelected(a.id);
    setSummary(false);
    setMobileReading(true);
    readerRef.current?.scrollTo(0, 0);
    window.history.replaceState(null, "", `#headlines/${a.id}`);
  };
  return (
    <div className="news-shell headlines-page">
      <NewsTabs
        tabs={ARTICLE_TABS}
        value={tab}
        onChange={(v) => {
          setTab(v);
          const preferred =
            v === "币股"
              ? "moonpay"
              : v === "科普"
                ? "agent-wallet"
                : undefined;
          const first = ARTICLES.find((a) =>
            preferred
              ? a.id === preferred
              : v === "精选"
                ? a.featured || a.category === "精选"
                : a.category === v,
          )!;
          setSelected(first.id);
          setSummary(false);
          setQuery("");
          setSavedOnly(false);
          setMobileReading(false);
          readerRef.current?.scrollTo(0, 0);
          window.history.replaceState(null, "", "#headlines");
        }}
      >
        <div className="news-options">
          <button
            aria-pressed={reader}
            onClick={() => setReader((v) => !v)}
            aria-label={reader ? "显示文章列表" : "专注阅读"}
          >
            {reader ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
            <span>{reader ? "显示列表" : "专注阅读"}</span>
          </button>
        </div>
      </NewsTabs>
      <div
        className={`headlines-layout ${reader ? "reader-mode" : ""} ${mobileReading ? "mobile-reading" : ""}`}
      >
        {!reader && (
          <aside className="article-sidebar">
            <div className="article-search">
              <label className="news-search">
                <Search size={15} />
                <input
                  aria-label="搜索要闻"
                  placeholder="搜索文章或作者"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button
                className={savedOnly ? "selected" : ""}
                aria-label="只看收藏"
                aria-pressed={savedOnly}
                onClick={() => setSavedOnly((v) => !v)}
              >
                <Bookmark size={16} />
              </button>
            </div>
            <div className="article-list">
              {list.map((a, i) => (
                <button
                  key={a.id}
                  className={`article-preview ${a.id === selected ? "active" : ""}`}
                  onClick={() => choose(a)}
                >
                  <div className="article-preview-top">
                    <h3>
                      {a.id === "yield-curve" && <em>置顶</em>}
                      {a.title}
                    </h3>
                    {i !== 0 || tab !== "精选" ? (
                      <EditorialArt article={a} />
                    ) : null}
                  </div>
                  <div className="article-meta">
                    <span>
                      {a.author} <small>10-05</small>
                    </span>
                    <span>
                      <Eye size={12} />
                      {a.reads}
                    </span>
                    <CommentCount postId={`article:${a.id}`} />
                  </div>
                </button>
              ))}
              {!list.length && (
                <div className="news-empty">
                  <Bookmark size={22} />
                  <p>{savedOnly ? "暂无收藏文章" : "没有找到相关文章"}</p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setSavedOnly(false);
                    }}
                  >
                    显示全部
                  </button>
                </div>
              )}
            </div>
            <div className="article-data-label">10 月 5 日</div>
          </aside>
        )}
        <section
          className="article-reader"
          ref={readerRef}
          aria-label="文章正文"
        >
          <button
            className="reader-back"
            onClick={() => {
              setMobileReading(false);
              setReader(false);
            }}
          >
            <ChevronLeft size={16} />
            文章列表
          </button>
          <article>
            <div className="article-eyebrow">{current.category}</div>
            <h1>{current.title}</h1>
            <div className="article-byline">
              <div className="news-author">
                <ProfileAvatar id={authorId(current.author)} size="md" />
                <div>
                  <button
                    onClick={() =>
                      community.openProfile(authorId(current.author))
                    }
                  >
                    <b>{current.author}</b>
                  </button>
                  <span>{current.date}</span>
                </div>
              </div>
              <FollowButton id={authorId(current.author)} />
            </div>
            <div className="article-summary">
              <span>
                <FileText size={16} /> 阅读约{" "}
                {Math.max(
                  2,
                  Math.ceil(
                    (current.intro.length +
                      current.sections.reduce((n, s) => n + s.text.length, 0)) /
                      250,
                  ),
                )}{" "}
                分钟
              </span>
              <button
                onClick={() => {
                  if (
                    membership.request(
                      "insight",
                      `news:${current.id}`,
                      `${current.title.slice(0, 18)} · AI 摘要`,
                    )
                  )
                    setSummary(true);
                }}
              >
                {membership.isUnlocked(`news:${current.id}`)
                  ? "查看 AI 摘要"
                  : `生成 AI 摘要 · 剩 ${membership.left} 次`}
              </button>
            </div>
            <div className="article-prose">
              <p className="article-lead">{current.intro}</p>
              {current.sections.map((s, i) => (
                <React.Fragment key={s.heading}>
                  <h2>{s.heading}</h2>
                  <p>{s.text}</p>
                  {i === 0 && (
                    <figure>
                      <EditorialArt article={current} large />
                      <figcaption>
                        {current.category} · {current.author}
                      </figcaption>
                    </figure>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="article-end">— 全文完 —</div>
          </article>
          <NewsComments key={current.id} postId={`article:${current.id}`} />
          <footer className="article-footer">
            <button
              className={likes.includes(current.id) ? "selected" : ""}
              onClick={() => toggle(current.id, setLikes)}
            >
              <ThumbsUp size={16} />
              {likes.includes(current.id) ? 1 : 0}
            </button>
            <button
              className={saved.includes(current.id) ? "selected" : ""}
              onClick={() => toggle(current.id, setSaved)}
            >
              <Bookmark size={16} />
              {saved.includes(current.id) ? "已收藏" : "收藏"}
            </button>
            <button onClick={() => setShare(true)}>
              <Share2 size={16} />
              分享
            </button>
          </footer>
        </section>
      </div>
      {summary && (
        <AiSummarySheet
          article={current}
          onOpenMarket={onOpenMarket}
          onClose={() => setSummary(false)}
          onRegenerate={() =>
            membership.request(
              "insight",
              `news:${current.id}`,
              `${current.title.slice(0, 18)} · AI 摘要`,
              { force: true },
            )
          }
        />
      )}
      {share && (
        <ShareDialog
          title={current.title}
          excerpt={current.intro}
          meta={`${current.author} · ${current.date}`}
          path={`headlines/${current.id}`}
          onClose={() => setShare(false)}
        />
      )}
    </div>
  );
}
