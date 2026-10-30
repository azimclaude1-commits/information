import React, { useState } from "react";
import { Check, ThumbsUp, Plus, MessageCircle } from "lucide-react";
import { LiveChat } from "./LiveChat";
import { DateLabel, EmptyState, LiveDialog, useNow } from "./LiveShared";
import { ME, label, uid, type Lang, type LiveRoom } from "./liveState";
import type { LiveStore } from "./useLive";
import type { LiveQuestion } from "./liveExperience";

type Props = { room: LiveRoom; store: LiveStore; lang: Lang };
const pad2 = (n: number) => String(n).padStart(2, "0");
/** 1:05:09 / 4:32 / 12s */
const countdown = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`
    : s >= 60
      ? `${Math.floor(s / 60)}:${pad2(s % 60)}`
      : `${s}s`;
export function ViewerInteraction({ room, store, lang }: Props) {
  const [tab, setTab] = useState("chat"),
    t = (zh: string, en: string) => label(lang, zh, en);
  return (
    <div className="lx-interaction">
      <div
        className="ui-tabs lx-tabs"
        role="tablist"
        aria-label={t("互动功能", "Interaction tools")}
      >
        {[
          ["chat", t("聊天", "Chat")],
          ["questions", t("提问", "Q&A")],
          ["polls", t("投票与答题", "Polls & quizzes")],
        ].map(([id, name]) => (
          <button
            className="ui-tab"
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "chat" ? (
        <LiveChat room={room} store={store} lang={lang} studio={false} />
      ) : tab === "questions" ? (
        <ViewerQuestions room={room} store={store} lang={lang} />
      ) : (
        <PollResults room={room} store={store} lang={lang} />
      )}
    </div>
  );
}
function QuestionCard({
  q,
  lang,
  children,
}: {
  q: LiveQuestion;
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <article className="lx-item">
      <div className="lx-row">
        <small>
          {q.name} · <DateLabel at={q.at} lang={lang} />
        </small>
        <span className="lx-status">
          {label(
            lang,
            q.status === "answered"
              ? "已回答"
              : q.status === "answering"
                ? "正在回答"
                : "待回答",
            q.status === "answered"
              ? "Answered"
              : q.status === "answering"
                ? "Answering"
                : "Pending",
          )}
        </span>
      </div>
      <h4>{q.text}</h4>
      {q.answer && <blockquote>{q.answer}</blockquote>}
      <footer className="lx-row">{children}</footer>
    </article>
  );
}
export function ViewerQuestions({ room, store, lang }: Props) {
  const [text, setText] = useState(""),
    [filter, setFilter] = useState("hot"),
    t = (zh: string, en: string) => label(lang, zh, en);
  const all = store.state.experience.rooms[room.id].questions;
  const list = all
    .filter((q) => !q.mergedInto && (filter !== "mine" || q.userId === ME))
    .sort((a, b) =>
      filter === "new" ? b.at - a.at : b.votes.length - a.votes.length,
    );
  return (
    <div className="lx-panel">
      <div className="lx-options">
        {[
          ["hot", t("热门", "Top")],
          ["new", t("最新", "Latest")],
          ["mine", t("我的提问", "My questions")],
        ].map(([id, name]) => (
          <button
            className="ui-chip"
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="lx-scroll">
        {list.map((q) => (
          <QuestionCard key={q.id} q={q} lang={lang}>
            <button
              className="ui-btn"
              aria-pressed={q.votes.includes(ME)}
              onClick={() =>
                store.dispatch({ type: "x/upvote", roomId: room.id, id: q.id })
              }
            >
              <ThumbsUp size={13} />
              {q.votes.length} {t("同问", "Upvote")}
            </button>
          </QuestionCard>
        ))}
        {filter === "mine" &&
          all
            .filter((q) => q.userId === ME && q.mergedInto)
            .map((q) => (
              <div className="lx-item" key={q.id}>
                <p>{q.text}</p>
                <small>
                  {t("已合并至", "Merged into")}:{" "}
                  {all.find((target) => target.id === q.mergedInto)?.text}
                </small>
              </div>
            ))}
        {!list.length && (
          <EmptyState>{t("暂无提问", "No questions")}</EmptyState>
        )}
      </div>
      <form
        className="lx-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            store.dispatch({
              type: "x/question",
              roomId: room.id,
              id: uid(),
              text,
              at: Date.now(),
            })
          )
            setText("");
        }}
      >
        <label>
          {t("向主播提问", "Ask the host")}
          <textarea
            aria-label={t("提问内容", "Your question")}
            maxLength={300}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(
              "写下你想了解的问题",
              "What would you like to know?",
            )}
          />
        </label>
        <button
          className="ui-btn ui-btn-primary"
          disabled={!text.trim() || room.status !== "live"}
        >
          {t("提交问题", "Submit question")}
        </button>
      </form>
    </div>
  );
}
export function StudioQuestions({ room, store, lang }: Props) {
  const [sort, setSort] = useState("hot"),
    [editing, setEditing] = useState<LiveQuestion | null>(null),
    [answer, setAnswer] = useState(""),
    [mergeInto, setMergeInto] = useState(""),
    t = (zh: string, en: string) => label(lang, zh, en);
  const list = store.state.experience.rooms[room.id].questions
    .filter((q) => !q.mergedInto)
    .sort((a, b) =>
      sort === "hot" ? b.votes.length - a.votes.length : a.at - b.at,
    );
  return (
    <div className="lx-panel">
      <div className="lx-options">
        <button
          className="ui-chip"
          aria-pressed={sort === "hot"}
          onClick={() => setSort("hot")}
        >
          {t("按热度", "Most voted")}
        </button>
        <button
          className="ui-chip"
          aria-pressed={sort === "time"}
          onClick={() => setSort("time")}
        >
          {t("按时间", "Oldest first")}
        </button>
      </div>
      <div className="lx-scroll">
        {list.map((q) => (
          <QuestionCard key={q.id} q={q} lang={lang}>
            <span>
              <ThumbsUp size={13} /> {q.votes.length}
            </span>
            <div className="lx-actions">
              {q.status !== "answered" && (
                <button
                  className="ui-btn"
                  disabled={room.status !== "live"}
                  onClick={() =>
                    store.dispatch({
                      type: "x/answer",
                      roomId: room.id,
                      actor: room.host.id,
                      id: q.id,
                      status: "answering",
                      at: Date.now(),
                    })
                  }
                >
                  {t("展示并回答", "Answer on screen")}
                </button>
              )}
              <button
                className="ui-btn ui-btn-soft"
                disabled={room.status !== "live"}
                onClick={() => {
                  setEditing(q);
                  setAnswer(q.answer || "");
                  setMergeInto("");
                }}
              >
                {t("处理", "Manage")}
              </button>
            </div>
          </QuestionCard>
        ))}
      </div>
      {editing && (
        <LiveDialog
          title={t("处理提问", "Manage question")}
          onClose={() => setEditing(null)}
        >
          <p>{editing.text}</p>
          <form
            className="lx-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                store.dispatch({
                  type: "x/answer",
                  roomId: room.id,
                  actor: room.host.id,
                  id: editing.id,
                  status: "answered",
                  answer,
                  at: Date.now(),
                })
              )
                setEditing(null);
            }}
          >
            <label>
              {t("回答", "Answer")}
              <textarea
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={1000}
              />
            </label>
            <button className="ui-btn ui-btn-primary">
              {t("发布回答", "Publish answer")}
            </button>
          </form>
          {editing.status !== "answered" && (
            <div className="lx-form">
              <label>
                {t("合并到已有问题", "Merge into question")}
                <select
                  value={mergeInto}
                  onChange={(e) => setMergeInto(e.target.value)}
                >
                  <option value="">{t("选择问题", "Select a question")}</option>
                  {list
                    .filter((q) => q.id !== editing.id)
                    .map((q) => (
                      <option value={q.id} key={q.id}>
                        {q.text}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="ui-btn"
                disabled={!mergeInto}
                onClick={() => {
                  if (
                    store.dispatch({
                      type: "x/mergeQuestion",
                      roomId: room.id,
                      actor: room.host.id,
                      id: editing.id,
                      into: mergeInto,
                    })
                  )
                    setEditing(null);
                }}
              >
                {t("合并重复问题", "Merge duplicate")}
              </button>
            </div>
          )}
        </LiveDialog>
      )}
    </div>
  );
}
export function PollResults({
  room,
  store,
  lang,
  studio = false,
}: Props & { studio?: boolean }) {
  const now = useNow(),
    t = (zh: string, en: string) => label(lang, zh, en),
    polls = store.state.experience.rooms[room.id].polls;
  return (
    <div className="lx-scroll lx-panel">
      {polls.map((p) => {
        const closed = p.closed || p.endsAt <= now || room.status !== "live",
          voted = p.votes[ME] !== undefined,
          total = Object.keys(p.votes).length;
        return (
          <article className="lx-item" key={p.id}>
            <div className="lx-row">
              <span className="lx-status">
                {p.kind === "quiz" ? t("知识问答", "Quiz") : t("投票", "Poll")}
              </span>
              <small>
                {closed
                  ? t("已结束", "Closed")
                  : `${t("剩余", "Ends in")} ${countdown(Math.ceil((p.endsAt - now) / 1000))}`}
              </small>
            </div>
            <h4>{p.title}</h4>
            <div className="lx-poll-options">
              {p.options.map((option, index) => {
                const count = Object.values(p.votes).filter(
                    (v) => v === index,
                  ).length,
                  pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <button
                    key={index}
                    className={voted && p.votes[ME] === index ? "selected" : ""}
                    disabled={studio || voted || closed}
                    onClick={() =>
                      store.dispatch({
                        type: "x/vote",
                        roomId: room.id,
                        id: p.id,
                        option: index,
                        at: Date.now(),
                      })
                    }
                  >
                    <span>
                      {option}
                      {p.kind === "quiz" && closed && p.correct === index && (
                        <Check size={14} />
                      )}
                    </span>
                    <b>{voted || closed || studio ? `${pct}%` : ""}</b>
                    {(voted || closed || studio) && (
                      <i style={{ width: `${pct}%` }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="lx-row">
              <small>
                {total} {t("人参与", "responses")}
                {voted && ` · ${t("已提交", "Submitted")}`}
              </small>
              {studio && !closed && (
                <button
                  className="live-text-btn"
                  onClick={() =>
                    store.dispatch({
                      type: "x/closePoll",
                      roomId: room.id,
                      actor: room.host.id,
                      id: p.id,
                    })
                  }
                >
                  {t("结束并公布", "Close & reveal")}
                </button>
              )}
            </div>
            {p.kind === "quiz" && closed && (
              <blockquote>
                {t("答案解析", "Explanation")}：{p.explanation}
                {voted && (
                  <p>
                    {p.votes[ME] === p.correct
                      ? t("回答正确", "Correct answer")
                      : t("再看一下对应知识点", "Review this topic")}
                  </p>
                )}
              </blockquote>
            )}
          </article>
        );
      })}
      {!polls.length && (
        <EmptyState>{t("暂无投票与答题", "No polls or quizzes")}</EmptyState>
      )}
    </div>
  );
}
export function StudioPolls(props: Props) {
  const { room, store, lang } = props,
    t = (zh: string, en: string) => label(lang, zh, en),
    [open, setOpen] = useState(false),
    [kind, setKind] = useState<"poll" | "quiz">("poll"),
    [title, setTitle] = useState(""),
    [options, setOptions] = useState(["", ""]),
    [correct, setCorrect] = useState(0),
    [explanation, setExplanation] = useState(""),
    [seconds, setSeconds] = useState(60);
  return (
    <>
      <div className="lx-panel lx-row">
        <span>{t("本场互动", "Session activities")}</span>
        <button
          className="ui-btn ui-btn-primary"
          disabled={room.status !== "live"}
          onClick={() => setOpen(true)}
        >
          <Plus size={14} />
          {t("发起互动", "Create activity")}
        </button>
      </div>
      <PollResults {...props} studio />
      {open && (
        <LiveDialog
          title={t("发起投票或答题", "Create poll or quiz")}
          onClose={() => setOpen(false)}
        >
          <form
            className="lx-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                store.dispatch({
                  type: "x/poll",
                  roomId: room.id,
                  actor: room.host.id,
                  poll: {
                    id: uid(),
                    title,
                    kind,
                    options: options.map((s) => s.trim()),
                    correct,
                    explanation,
                    votes: {},
                    closed: false,
                    endsAt: Date.now() + seconds * 1000,
                  },
                })
              ) {
                setOpen(false);
                setTitle("");
                setOptions(["", ""]);
              }
            }}
          >
            <div className="lx-two">
              <label>
                {t("类型", "Type")}
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "poll" | "quiz")}
                >
                  <option value="poll">{t("投票", "Poll")}</option>
                  <option value="quiz">{t("知识问答", "Quiz")}</option>
                </select>
              </label>
              <label>
                {t("持续时间", "Duration")}
                <select
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                >
                  {[10, 30, 60, 180, 300].map((s) => (
                    <option value={s} key={s}>
                      {s}s
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {t("题目", "Question")}
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            {options.map((v, index) => (
              <label key={index}>
                {t("选项", "Option")} {index + 1}
                <input
                  required
                  maxLength={80}
                  value={v}
                  onChange={(e) =>
                    setOptions(
                      options.map((o, i) => (i === index ? e.target.value : o)),
                    )
                  }
                />
              </label>
            ))}
            {options.length < 4 && (
              <button
                type="button"
                className="ui-btn"
                onClick={() => setOptions([...options, ""])}
              >
                {t("添加选项", "Add option")}
              </button>
            )}
            {kind === "quiz" && (
              <>
                <label>
                  {t("正确答案", "Correct answer")}
                  <select
                    value={correct}
                    onChange={(e) => setCorrect(Number(e.target.value))}
                  >
                    {options.map((_, i) => (
                      <option key={i} value={i}>
                        {t("选项", "Option")} {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("答案解析", "Explanation")}
                  <textarea
                    required
                    maxLength={500}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                  />
                </label>
              </>
            )}
            <button className="ui-btn ui-btn-primary">
              {t("发布", "Publish")}
            </button>
          </form>
        </LiveDialog>
      )}
    </>
  );
}
export function OnAirQuestion({ room, store, lang }: Props) {
  const q = store.state.experience.rooms[room.id]?.questions.find(
    (q) => q.status === "answering" && !q.mergedInto,
  );
  return q ? (
    <div className="lx-onair-question">
      <MessageCircle size={16} />
      <div>
        <small>
          {label(lang, "正在回答", "Answering")} · {q.name}
        </small>
        <b>{q.text}</b>
      </div>
    </div>
  ) : null;
}
