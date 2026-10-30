import React, { useState } from "react";
import {
  BookmarkPlus,
  Check,
  FileText,
  Play,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { EmptyState } from "./LiveShared";
import { label, uid, type Lang, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";
import type { ReplayChapter } from "./liveExperience";

type Props = { room: LiveRoom; store: LiveStore; lang: Lang };
export const playbackTime = (second: number) =>
  `${Math.floor(second / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(second % 60)
    .toString()
    .padStart(2, "0")}`;
export function makeRecap(room: LiveRoom, store: LiveStore, lang: Lang) {
  const data = store.state.experience.rooms[room.id],
    t = (zh: string, en: string) => label(lang, zh, en);
  const pieces = [
    `${t("本场品种", "Markets")}: ${room.symbols.join(" · ")}`,
    ...data.replay.chapters.map(
      (c) => `${playbackTime(c.second)} ${c.title}：${c.text}`,
    ),
    ...data.strategies
      .slice(0, 5)
      .map(
        (s) =>
          `${s.symbol} ${s.side === "buy" ? t("做多", "Long") : t("做空", "Short")} · ${t("参考", "Entry")} ${s.entry} · ${t("目标", "Target")} ${s.target} · ${t("止损", "Stop")} ${s.stop}`,
      ),
    ...data.questions
      .filter((q) => q.status === "answered" && !q.mergedInto)
      .slice(0, 5)
      .map((q) => `${t("问", "Q")}: ${q.text}\n${t("答", "A")}: ${q.answer}`),
  ];
  return pieces.join("\n\n");
}
export function ViewerReplay({
  room,
  store,
  lang,
  onSeek,
}: Props & { onSeek: (second: number) => void }) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    data = store.state.experience.rooms[room.id],
    replay = data.replay;
  const [query, setQuery] = useState(""),
    [note, setNote] = useState(""),
    [tab, setTab] = useState("chapters");
  const answered = data.questions.filter(
    (q) => q.status === "answered" && !q.mergedInto,
  );
  return (
    <div className="lx-panel">
      <div className="lx-row">
        <div className="lx-options">
          {[
            ["chapters", t("章节", "Chapters")],
            ["notes", t("我的笔记", "My notes")],
            ["recap", t("本场复盘", "Recap")],
          ].map(([id, name]) => (
            <button
              className="ui-chip"
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </div>
        {room.status === "ended" && replay.position > 0 && (
          <button
            className="live-text-btn"
            onClick={() => onSeek(replay.position)}
          >
            <Play size={13} />
            {t("继续观看", "Resume")} {playbackTime(replay.position)}
          </button>
        )}
      </div>
      {tab === "chapters" ? (
        <>
          <label className="lx-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("搜索章节与知识点", "Search chapters")}
            />
          </label>
          <div className="lx-scroll">
            {replay.chapters
              .filter((c) =>
                `${c.title} ${c.text}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  className="lx-chapter"
                  key={c.id}
                  onClick={() => onSeek(c.second)}
                >
                  <time>{playbackTime(c.second)}</time>
                  <div>
                    <strong>{c.title}</strong>
                    <p>{c.text}</p>
                  </div>
                  <Play size={14} />
                </button>
              ))}
            {!replay.chapters.length && (
              <EmptyState>{t("暂无章节", "No chapters yet")}</EmptyState>
            )}
          </div>
        </>
      ) : tab === "notes" ? (
        <>
          <form
            className="lx-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                store.dispatch({
                  type: "x/note",
                  roomId: room.id,
                  id: uid(),
                  text: note,
                  second: replay.position,
                })
              )
                setNote("");
            }}
          >
            <label>
              {t("记录当前时刻", "Note at")} {playbackTime(replay.position)}
              <textarea
                aria-label={t("直播笔记", "Session note")}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "记录观点、问题或交易计划",
                  "Capture an idea or trading plan",
                )}
              />
            </label>
            <button className="ui-btn ui-btn-soft" disabled={!note.trim()}>
              <BookmarkPlus size={14} />
              {t("保存笔记", "Save note")}
            </button>
          </form>
          <div className="lx-scroll">
            {replay.notes.map((n) => (
              <div className="lx-item" key={n.id}>
                <div className="lx-row">
                  <button
                    className="live-text-btn"
                    onClick={() => onSeek(n.second)}
                  >
                    {playbackTime(n.second)}
                  </button>
                  <button
                    className="live-icon-btn"
                    aria-label={t("删除笔记", "Delete note")}
                    onClick={() =>
                      store.dispatch({
                        type: "x/note",
                        roomId: room.id,
                        id: n.id,
                        text: "",
                        second: n.second,
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p>{n.text}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="lx-scroll">
          <h3>{t("本场观点", "Session takeaways")}</h3>
          <p className="lx-prewrap">
            {replay.summaryApproved && replay.summary
              ? replay.summary
              : room.symbols.join(" · ")}
          </p>
          <h4>
            {t("已解答问题", "Answered questions")} · {answered.length}
          </h4>
          {answered.map((q) => (
            <article className="lx-item" key={q.id}>
              <b>{q.text}</b>
              <p>{q.answer}</p>
            </article>
          ))}
          <h4>
            {t("策略记录", "Strategy archive")} · {data.strategies.length}
          </h4>
          {data.strategies.map((s) => (
            <div className="lx-row lx-item" key={s.id}>
              <span>
                {s.symbol} ·{" "}
                {s.side === "buy" ? t("多", "Long") : t("空", "Short")}
              </span>
              <b>
                {s.entry} → {s.target}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function LiveTakeaways({
  room,
  store,
  lang,
  onSeek,
}: Props & { onSeek: (second: number) => void }) {
  const [topic, setTopic] = useState("summary"),
    [query, setQuery] = useState(""),
    t = (zh: string, en: string) => label(lang, zh, en),
    data = store.state.experience.rooms[room.id];
  const search = query.trim().toLowerCase();
  const hasResults =
    topic === "summary"
      ? data.replay.chapters.some((c) =>
          `${c.title} ${c.text} ${room.symbols.join(" ")}`
            .toLowerCase()
            .includes(search),
        )
      : topic === "levels"
        ? data.strategies.some((s) =>
            `${s.symbol} ${s.note}`.toLowerCase().includes(search),
          )
        : data.questions.some(
            (q) =>
              q.status === "answered" &&
              !q.mergedInto &&
              `${q.text} ${q.answer}`.toLowerCase().includes(search),
          );
  return (
    <div className="lx-panel">
      <div className="lx-row">
        <h3>
          <Sparkles size={16} /> {t("直播要点助手", "Session assistant")}
        </h3>
        <span className="lx-status">{t("AI 整理", "AI summary")}</span>
      </div>
      <div className="lx-options">
        {[
          ["summary", t("前面讲了什么", "Catch me up")],
          ["levels", t("关键价位", "Key levels")],
          ["answers", t("答疑回顾", "Q&A recap")],
        ].map(([id, title]) => (
          <button
            className="ui-chip"
            key={id}
            aria-pressed={topic === id}
            onClick={() => setTopic(id)}
          >
            {title}
          </button>
        ))}
      </div>
      <label className="lx-search">
        <Search size={14} />
        <input
          aria-label={t("搜索直播要点", "Search session insights")}
          placeholder={t("搜索品种或关键词", "Search symbol or keyword")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="lx-scroll">
        {!hasResults && (
          <EmptyState>
            {query
              ? t("没有找到相关内容", "No matching content")
              : t("本场内容整理中", "Session insights will appear here")}
          </EmptyState>
        )}
        {topic === "summary" ? (
          <>
            {data.replay.chapters
              .filter((c) =>
                `${c.title} ${c.text} ${room.symbols.join(" ")}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((c) => (
                <article className="lx-item" key={c.id}>
                  <span className="lx-status">
                    {c.source === "host"
                      ? t("主播内容", "Host content")
                      : t("AI 整理", "AI summary")}
                  </span>
                  <h4>{c.title}</h4>
                  <p>{c.text}</p>
                  <button
                    className="live-text-btn"
                    onClick={() => onSeek(c.second)}
                  >
                    <Play size={12} />
                    {t("查看来源", "View source")} {playbackTime(c.second)}
                  </button>
                </article>
              ))}
          </>
        ) : topic === "levels" ? (
          data.strategies
            .filter((s) =>
              `${s.symbol} ${s.note}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((s) => (
              <article className="lx-item" key={s.id}>
                <strong>{s.symbol}</strong>
                <p>
                  {t("参考价", "Entry")} {s.entry} · {t("目标", "Target")}{" "}
                  {s.target} · {t("止损", "Stop")} {s.stop}
                </p>
                <small>
                  {t("来源：主播策略", "Source: host strategy")} ·{" "}
                  {new Date(s.at).toLocaleTimeString()}
                </small>
                <p>{s.note}</p>
              </article>
            ))
        ) : (
          data.questions
            .filter(
              (q) =>
                q.status === "answered" &&
                !q.mergedInto &&
                `${q.text} ${q.answer}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((q) => (
              <article className="lx-item" key={q.id}>
                <b>{q.text}</b>
                <p>{q.answer}</p>
                <small>{t("来源：主播答疑", "Source: host answer")}</small>
              </article>
            ))
        )}
        <small className="text-ink-3">
          {t(
            "要点来自本场内容，可通过来源核对原文。",
            "Summaries reference this session. Open sources to review the original.",
          )}
        </small>
      </div>
    </div>
  );
}
export function StudioReplay({ room, store, lang }: Props) {
  const data = store.state.experience.rooms[room.id],
    r = data.replay,
    t = (zh: string, en: string) => label(lang, zh, en);
  const [title, setTitle] = useState(r.title),
    [summary, setSummary] = useState(r.summary),
    [chapterTitle, setChapterTitle] = useState(""),
    [second, setSecond] = useState("0"),
    [text, setText] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const save = (changes: Partial<typeof r>) =>
    store.dispatch({
      type: "x/replay",
      roomId: room.id,
      actor: room.host.id,
      changes,
      at: Date.now(),
    });
  const updateChapter = () => {
    const n = Number(second);
    if (
      !chapterTitle.trim() ||
      !Number.isFinite(n) ||
      n < 0 ||
      (r.duration > 0 && n >= r.duration)
    ) {
      setMessage(
        t("请输入有效的章节标题与时间", "Enter a valid title and timestamp"),
      );
      return;
    }
    const c: ReplayChapter = {
      id: editing || uid(),
      title: chapterTitle.trim(),
      second: n,
      text,
      source: "host",
    };
    if (
      save({
        chapters: [...r.chapters.filter((c) => c.id !== editing), c],
        summaryApproved: false,
        publication: "draft",
      })
    ) {
      setEditing(null);
      setChapterTitle("");
      setText("");
      setMessage(t("章节已保存", "Chapter saved"));
    }
  };
  return (
    <div className="lx-panel lx-form">
      <div className="lx-row">
        <span className="lx-status">
          {r.publication === "published"
            ? t("回放已发布", "Replay published")
            : t("待发布", "Draft")}
        </span>
        <label className="lx-check">
          <input
            type="checkbox"
            checked={r.recording}
            disabled={room.status === "ended"}
            onChange={(e) => save({ recording: e.target.checked })}
          />
          {t("录制本场直播", "Record this session")}
        </label>
      </div>
      <div className="lx-two">
        <label>
          {t("回放标题", "Replay title")}
          <input
            value={title}
            maxLength={70}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim()) save({ title: title.trim() });
            }}
          />
        </label>
        <label>
          {t("可见性", "Visibility")}
          <select
            value={r.visibility}
            onChange={(e) =>
              save({ visibility: e.target.value as "public" | "link" })
            }
          >
            <option value="public">{t("公开", "Public")}</option>
            <option value="link">{t("仅链接可见", "Unlisted")}</option>
          </select>
        </label>
      </div>
      <label>
        {t("回放封面", "Replay cover")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
              file.size > 2 * 1024 * 1024
            ) {
              setMessage(
                t("请选择 2 MB 以内的图片", "Choose an image under 2 MB"),
              );
              return;
            }
            const reader = new FileReader();
            reader.onload = () => save({ cover: String(reader.result) });
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {r.cover && (
        <img
          className="lx-cover-preview"
          src={r.cover}
          alt={t("回放封面", "Replay cover")}
        />
      )}
      <details open>
        <summary>
          {t("章节管理", "Chapters")} · {r.chapters.length}
        </summary>
        <div className="lx-scroll lx-chapter-editor">
          {r.chapters.map((c) => (
            <div className="lx-row lx-item" key={c.id}>
              <button
                className="live-text-btn"
                onClick={() => {
                  setEditing(c.id);
                  setChapterTitle(c.title);
                  setSecond(String(c.second));
                  setText(c.text);
                }}
              >
                {playbackTime(c.second)} · {c.title}
              </button>
              <button
                className="live-icon-btn"
                aria-label={t("删除章节", "Delete chapter")}
                onClick={() =>
                  save({
                    chapters: r.chapters.filter((v) => v.id !== c.id),
                    summaryApproved: false,
                    publication: "draft",
                  })
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="lx-two">
          <label>
            {t("章节标题", "Chapter title")}
            <input
              value={chapterTitle}
              maxLength={80}
              onChange={(e) => setChapterTitle(e.target.value)}
            />
          </label>
          <label>
            {t("时间（秒）", "Time (seconds)")}
            <input
              type="number"
              min={0}
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            />
          </label>
        </div>
        <label>
          {t("内容要点", "Key point")}
          <textarea
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button className="ui-btn" onClick={updateChapter}>
          {editing
            ? t("保存修改", "Save chapter")
            : t("添加章节", "Add chapter")}
        </button>
      </details>
      <div className="lx-row">
        <h4>{t("直播复盘", "Session recap")}</h4>
        <button
          className="ui-btn ui-btn-soft"
          onClick={() => {
            const next = makeRecap(room, store, lang);
            setSummary(next);
            save({
              summary: next,
              summaryApproved: false,
              publication: "draft",
            });
          }}
        >
          <Sparkles size={14} />
          {t("生成复盘草稿", "Generate draft")}
        </button>
      </div>
      <textarea
        aria-label={t("复盘内容", "Recap content")}
        rows={6}
        value={summary}
        maxLength={6000}
        onChange={(e) => setSummary(e.target.value)}
        onBlur={() =>
          save({ summary, summaryApproved: false, publication: "draft" })
        }
      />
      <label className="lx-check">
        <input
          type="checkbox"
          checked={r.summaryApproved}
          onChange={(e) =>
            save({
              summary,
              summaryApproved: e.target.checked,
              publication: "draft",
            })
          }
        />
        {t(
          "已核对章节、策略与复盘内容",
          "I have reviewed the chapters, strategies and recap",
        )}
      </label>
      <div className="lx-row">
        <button
          className="ui-btn"
          onClick={() => {
            if (save({ title, summary, publication: "draft" }))
              setMessage(t("草稿已保存", "Draft saved"));
          }}
        >
          <FileText size={14} />
          {t("保存草稿", "Save draft")}
        </button>
        <button
          className="ui-btn ui-btn-primary"
          disabled={
            room.status !== "ended" || !r.recording || !r.summaryApproved
          }
          onClick={() => {
            if (save({ title, summary, publication: "published" }))
              setMessage(t("回放已发布", "Replay published"));
          }}
        >
          <Check size={14} />
          {t("发布回放", "Publish replay")}
        </button>
      </div>
      {message && (
        <p role="status" className="text-brand">
          {message}
        </p>
      )}
      {room.status === "ended" && !r.recording && (
        <p className="text-ink-3">
          {t("本场未开启录制", "Recording was disabled for this session")}
        </p>
      )}
    </div>
  );
}
