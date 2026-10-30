import {
  INITIAL_INSTRUMENTS,
  ECONOMIC_CALENDAR_DATA,
} from "../../data/marketData";
import type { LiveRoom, LiveState } from "./liveState";

const ME = "viewer-me";
export const LIVE_SERIES = [
  {
    id: "macro",
    title: "黄金与外汇观察",
    en: "Gold & FX watch",
    schedule: "工作日 20:00",
    scheduleEn: "Weekdays 20:00",
    category: "macro",
  },
  {
    id: "crypto",
    title: "加密市场周报",
    en: "Crypto market review",
    schedule: "每周五 21:00",
    scheduleEn: "Fridays 21:00",
    category: "crypto",
  },
  {
    id: "stocks",
    title: "美股盘前",
    en: "Wall Street pre-market",
    schedule: "美股交易日",
    scheduleEn: "US trading days",
    category: "stocks",
  },
  {
    id: "academy",
    title: "交易进阶课堂",
    en: "Trading academy",
    schedule: "每周六 15:00",
    scheduleEn: "Saturdays 15:00",
    category: "academy",
  },
];
export type StrategyValues = NonNullable<LiveRoom["strategy"]> & {
  trigger: "above" | "below";
  expiresAt: number;
};
export type LiveStrategy = StrategyValues & {
  id: string;
  at: number;
  status: "watching" | "triggered" | "ended" | "expired";
  changedAt: number;
  revisions: (StrategyValues & { at: number })[];
};
export type LiveQuestion = {
  id: string;
  text: string;
  name: string;
  userId: string;
  at: number;
  votes: string[];
  status: "pending" | "answering" | "answered";
  answer?: string;
  answeredAt?: number;
  mergedInto?: string;
};
export type LivePoll = {
  id: string;
  title: string;
  options: string[];
  kind: "poll" | "quiz";
  correct: number;
  explanation: string;
  votes: Record<string, number>;
  endsAt: number;
  closed: boolean;
};
export type ReplayChapter = {
  id: string;
  title: string;
  second: number;
  text: string;
  source: "host" | "ai";
};
export type Replay = {
  recording: boolean;
  publication: "draft" | "published";
  visibility: "public" | "link";
  title: string;
  cover: string;
  chapters: ReplayChapter[];
  summary: string;
  notes: { id: string; second: number; text: string }[];
  position: number;
  duration: number;
  summaryApproved: boolean;
};
export type RoomExperience = {
  strategies: LiveStrategy[];
  questions: LiveQuestion[];
  polls: LivePoll[];
  replay: Replay;
  moderators: string[];
  slowSeconds: number;
  seriesId: string;
  eventId: string;
  reports: {
    id: string;
    messageId: string;
    reason: string;
    at: number;
    status: "pending" | "removed" | "dismissed";
    text: string;
  }[];
  audit: { id: string; text: string; at: number; actor: string }[];
  visits: Record<string, { at: number; seconds: number; userId: string }>;
  metrics: {
    viewers: number;
    peak: number;
    watchSeconds: number;
    follows: number;
    clicks: number;
    orders: number;
  };
};
export type LiveExperience = {
  rooms: Record<string, RoomExperience>;
  cleanMode: boolean;
  bookmarks: string[];
  reminders: Record<string, number>;
  hostAlerts: string[];
  series: string[];
  notices: {
    id: string;
    roomId: string;
    text: string;
    en: string;
    at: number;
    read: boolean;
  }[];
  sharing: Record<string, { scope: "new" | "all"; since: number }>;
  floatingRoom: string | null;
};
export function newRoomExperience(
  room: LiveRoom,
  seeded = false,
): RoomExperience {
  const i = INITIAL_INSTRUMENTS.find((i) => i.symbol === room.pinnedSymbol);
  const values: StrategyValues = {
    ...(room.strategy || {
      symbol: room.pinnedSymbol,
      side: "buy",
      entry: i?.price || 100,
      target: Number(((i?.price || 100) * 1.012).toFixed(i?.decimals || 2)),
      stop: Number(((i?.price || 100) * 0.994).toFixed(i?.decimals || 2)),
      note: "关注关键位置与成交量确认。",
    }),
    trigger: "above",
    expiresAt: room.startsAt + 3 * 3600000,
  };
  return {
    strategies: seeded
      ? [
          {
            ...values,
            id: room.id + "-opening",
            at: room.startsAt + 60000,
            changedAt: room.startsAt + 60000,
            status: room.status === "ended" ? "ended" : "watching",
            revisions: [],
          },
        ]
      : [],
    questions: seeded
      ? [
          {
            id: room.id + "-question",
            text: "突破后应该关注哪些确认信号？",
            name: "小麦",
            userId: "user-mia",
            at: room.startsAt + 90000,
            votes: ["user-oliver"],
            status: "pending",
          },
        ]
      : [],
    polls:
      seeded && room.status === "live"
        ? [
            {
              id: room.id + "-sentiment",
              title: `本场结束前 ${room.pinnedSymbol} 会怎么走？`,
              options: ["上涨", "震荡", "下跌"],
              kind: "poll",
              correct: 0,
              explanation: "",
              votes: { "user-oliver": 0, "user-mia": 1, "user-noah": 0 },
              endsAt: room.startsAt + 3 * 3600000,
              closed: false,
            },
            {
              id: room.id + "-quiz",
              title: "止损单的主要作用是？",
              options: ["锁定盈利", "限制亏损", "提高杠杆"],
              kind: "quiz",
              correct: 1,
              explanation: "止损单在价格触及预设位置时平仓，用来限制单笔交易的最大亏损。",
              votes: { "user-oliver": 1, "user-mia": 1, "user-noah": 0 },
              endsAt: room.startsAt + 600000,
              closed: true,
            },
          ]
        : [],
    moderators: [],
    slowSeconds: 0,
    seriesId: room.category,
    eventId: room.category === "macro" ? "ec-1" : "",
    reports: [],
    audit: [],
    visits: {},
    replay: {
      recording: true,
      publication: room.status === "ended" ? "published" : "draft",
      visibility: "public",
      title: room.title,
      cover: room.cover || "",
      chapters: seeded
        ? [
            {
              id: room.id + "-intro",
              title: "开场与市场背景",
              second: 0,
              text: `${room.symbols.join("、")} 市场背景与本场关注方向。`,
              source: "host",
            },
            {
              id: room.id + "-levels",
              title: "关键位置与交易计划",
              second: 12,
              text: "结合趋势、成交量与止损位置制定交易计划。",
              source: "host",
            },
            {
              id: room.id + "-risk",
              title: "仓位管理与答疑",
              second: 25,
              text: "控制仓位，等待确认信号，回答观众问题。",
              source: "host",
            },
          ]
        : [],
      summary: "",
      summaryApproved: room.status === "ended",
      notes: [],
      position: 0,
      duration: 0,
    },
    metrics: {
      viewers: seeded ? room.viewers : 0,
      peak: seeded ? room.viewers : 0,
      watchSeconds: seeded ? room.viewers * 520 : 0,
      follows: 0,
      clicks: 0,
      orders: 0,
    },
  };
}
export function seedExperience(rooms: LiveRoom[]): LiveExperience {
  return {
    rooms: Object.fromEntries(
      rooms.map((r) => [r.id, newRoomExperience(r, true)]),
    ),
    cleanMode: false,
    bookmarks: [],
    reminders: {},
    hostAlerts: [],
    series: [],
    notices: [],
    sharing: {},
    floatingRoom: null,
  };
}
export function hydrateLiveState(state: LiveState): LiveState {
  if (!state.experience)
    return { ...state, shared: [], experience: seedExperience(state.rooms) };
  // Saved states from before demo polls existed: seed them into built-in live rooms that never had one.
  const missing = state.rooms.filter((r) => {
    const data = state.experience.rooms[r.id];
    return (
      r.status === "live" &&
      data &&
      data.polls.length === 0 &&
      data.strategies.some((s) => s.id === r.id + "-opening")
    );
  });
  if (!missing.length) return state;
  const rooms = { ...state.experience.rooms };
  for (const r of missing) {
    const polls = newRoomExperience(r, true).polls.map((p) =>
      p.closed ? p : { ...p, endsAt: Math.max(p.endsAt, Date.now() + 2 * 3600000) },
    );
    rooms[r.id] = { ...rooms[r.id], polls };
  }
  return { ...state, experience: { ...state.experience, rooms } };
}
export const canManage = (state: LiveState, roomId: string, actor: string) => {
  const room = state.rooms.find((r) => r.id === roomId);
  return (
    !!room &&
    (room.host.id === actor ||
      (state.experience.rooms[roomId]?.moderators || []).includes(actor))
  );
};
const toggle = (values: string[], id: string) =>
  values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
export function notifyExperience(
  x: LiveExperience,
  room: LiveRoom,
  id: string,
  text: string,
  en: string,
  at: number,
): LiveExperience {
  if (x.notices.some((n) => n.id === id)) return x;
  return {
    ...x,
    notices: [
      { id, roomId: room.id, text, en, at, read: false },
      ...x.notices,
    ].slice(0, 80),
  };
}
export function afterRoomChange(
  previous: LiveState,
  next: LiveState,
  room: LiveRoom,
  at: number,
): LiveState {
  const old = previous.rooms.find((r) => r.id === room.id);
  let x = next.experience;
  let data = x.rooms[room.id] || newRoomExperience(room);
  const interested =
    next.reservations.includes(room.id) ||
    x.hostAlerts.includes(room.host.id) ||
    x.series.includes(data.seriesId);
  if (old?.status !== "ended" && room.status === "ended") {
    data = {
      ...data,
      replay: {
        ...data.replay,
        publication: "draft",
        summaryApproved: false,
        recording: old?.status === "scheduled" ? false : data.replay.recording,
      },
      polls: data.polls.map((p) => ({ ...p, closed: true })),
      strategies: data.strategies.map((s) =>
        s.status === "watching" || s.status === "triggered"
          ? { ...s, status: "ended", changedAt: at }
          : s,
      ),
    };
    const sharing = { ...x.sharing };
    delete sharing[room.id];
    x = {
      ...x,
      sharing,
      floatingRoom: x.floatingRoom === room.id ? null : x.floatingRoom,
    };
  }
  if (
    interested &&
    old &&
    (old.status !== room.status || old.startsAt !== room.startsAt)
  ) {
    const zh =
      room.status === "live"
        ? "已开播"
        : room.status === "ended" && old.status === "scheduled"
          ? "已取消"
          : room.status === "ended"
            ? "直播已结束"
            : "开播时间已调整";
    x = notifyExperience(
      x,
      room,
      `${room.id}-${room.status}-${room.startsAt}-${room.endedAt || ""}`,
      `${room.title}：${zh}`,
      `${room.titleEn}: ${room.status === "live" ? "Now live" : room.status === "ended" ? "Session closed" : "Schedule changed"}`,
      at,
    );
  }
  return {
    ...next,
    shared:
      room.status === "ended"
        ? next.shared.filter((id) => id !== room.id)
        : next.shared,
    experience: { ...x, rooms: { ...x.rooms, [room.id]: data } },
  };
}
export type ExperienceAction =
  | { type: "x/preference"; cleanMode?: boolean; floatingRoom?: string | null }
  | { type: "x/bookmark"; id: string }
  | { type: "x/subscribe"; kind: "host" | "series"; id: string }
  | { type: "x/reminder"; roomId: string; minutes: number | null }
  | { type: "x/read"; id?: string }
  | { type: "x/tick"; at: number; prices?: Record<string, number> }
  | {
      type: "x/strategy";
      roomId: string;
      actor: string;
      id: string;
      values: StrategyValues;
      at: number;
    }
  | {
      type: "x/strategyStatus";
      roomId: string;
      actor: string;
      id: string;
      status: LiveStrategy["status"];
      at: number;
    }
  | { type: "x/question"; roomId: string; id: string; text: string; at: number }
  | { type: "x/upvote"; roomId: string; id: string }
  | {
      type: "x/answer";
      roomId: string;
      actor: string;
      id: string;
      status: LiveQuestion["status"];
      answer?: string;
      at: number;
    }
  | {
      type: "x/mergeQuestion";
      roomId: string;
      actor: string;
      id: string;
      into: string;
    }
  | { type: "x/poll"; roomId: string; actor: string; poll: LivePoll }
  | { type: "x/vote"; roomId: string; id: string; option: number; at: number }
  | { type: "x/closePoll"; roomId: string; actor: string; id: string }
  | {
      type: "x/replay";
      roomId: string;
      actor: string;
      changes: Partial<
        Pick<
          Replay,
          | "recording"
          | "visibility"
          | "title"
          | "cover"
          | "chapters"
          | "summary"
          | "summaryApproved"
          | "publication"
        >
      >;
      at: number;
    }
  | { type: "x/note"; roomId: string; id: string; text: string; second: number }
  | { type: "x/progress"; roomId: string; second: number; duration: number }
  | {
      type: "x/settings";
      roomId: string;
      actor: string;
      slowSeconds?: number;
      seriesId?: string;
      eventId?: string;
      moderators?: string[];
      at: number;
    }
  | {
      type: "x/report";
      roomId: string;
      messageId: string;
      reason: string;
      id: string;
      at: number;
    }
  | {
      type: "x/moderate";
      roomId: string;
      actor: string;
      messageId?: string;
      reportId?: string;
      remove: boolean;
      at: number;
    }
  | { type: "x/leave"; roomId: string; allowFloating: boolean }
  | { type: "x/share"; roomId: string; scope: "new" | "all" | null; at: number }
  | {
      type: "x/metric";
      roomId: string;
      kind: "visit" | "watch" | "click" | "order";
      id: string;
      at: number;
      seconds?: number;
    };

export function reduceExperience(
  state: LiveState,
  action: ExperienceAction,
): { state: LiveState; error?: "invalid" | "closed" | "muted" | "followers" } {
  const x = state.experience;
  const done = (
    experience: LiveExperience,
    extra: Partial<LiveState> = {},
  ) => ({ state: { ...state, ...extra, experience } });
  const fail = (
    error: "invalid" | "closed" | "muted" | "followers" = "invalid",
  ) => ({ state, error });
  if (action.type === "x/preference")
    return done({
      ...x,
      ...(action.cleanMode !== undefined
        ? { cleanMode: action.cleanMode }
        : {}),
      ...(action.floatingRoom !== undefined
        ? { floatingRoom: action.floatingRoom }
        : {}),
    });
  if (action.type === "x/bookmark")
    return done({ ...x, bookmarks: toggle(x.bookmarks, action.id) });
  if (action.type === "x/subscribe")
    return done(
      action.kind === "host"
        ? { ...x, hostAlerts: toggle(x.hostAlerts, action.id) }
        : { ...x, series: toggle(x.series, action.id) },
    );
  if (action.type === "x/read")
    return done({
      ...x,
      notices: x.notices.map((n) =>
        !action.id || n.id === action.id ? { ...n, read: true } : n,
      ),
    });
  if (action.type === "x/tick") {
    let next = x;
    for (const room of state.rooms) {
      const data = next.rooms[room.id];
      if (!data) continue;
      const interested =
        state.reservations.includes(room.id) ||
        next.series.includes(data.seriesId);
      const minutes = next.reminders[room.id] ?? 10;
      if (
        interested &&
        room.status === "scheduled" &&
        room.startsAt > action.at &&
        room.startsAt - action.at <= minutes * 60000
      )
        next = notifyExperience(
          next,
          room,
          `${room.id}-remind-${room.startsAt}-${minutes}`,
          `${room.title} 即将开始`,
          `${room.titleEn} starts soon`,
          action.at,
        );
      let changed = false;
      const strategies = data.strategies.map((s) => {
        if (s.status !== "watching" && s.status !== "triggered") return s;
        if (s.expiresAt <= action.at) {
          changed = true;
          return { ...s, status: "expired" as const, changedAt: action.at };
        }
        const price = action.prices?.[s.symbol];
        if (
          room.status === "live" &&
          s.status === "watching" &&
          Number.isFinite(price) &&
          (s.trigger === "above" ? price! >= s.entry : price! <= s.entry)
        ) {
          changed = true;
          return { ...s, status: "triggered" as const, changedAt: action.at };
        }
        return s;
      });
      const polls = data.polls.map((p) => {
        if (!p.closed && p.endsAt <= action.at) {
          changed = true;
          return { ...p, closed: true };
        }
        return p;
      });
      if (changed)
        next = {
          ...next,
          rooms: { ...next.rooms, [room.id]: { ...data, strategies, polls } },
        };
    }
    return next === x ? { state } : done(next);
  }
  const room =
    "roomId" in action
      ? state.rooms.find((r) => r.id === action.roomId)
      : undefined;
  if (!room) return fail();
  const data = x.rooms[room.id] || newRoomExperience(room);
  const save = (
    changes: Partial<RoomExperience>,
    extra: Partial<LiveState> = {},
  ) =>
    done(
      { ...x, rooms: { ...x.rooms, [room.id]: { ...data, ...changes } } },
      extra,
    );
  if ("actor" in action && !canManage(state, room.id, action.actor))
    return fail();
  if (
    "actor" in action &&
    [
      "x/strategy",
      "x/strategyStatus",
      "x/poll",
      "x/replay",
      "x/settings",
    ].includes(action.type) &&
    action.actor !== room.host.id
  )
    return fail();
  switch (action.type) {
    case "x/reminder": {
      if (room.status !== "scheduled") return fail("closed");
      if (
        action.minutes !== null &&
        ![1, 5, 10, 30, 60, 1440].includes(action.minutes)
      )
        return fail();
      const reminders = { ...x.reminders };
      if (action.minutes === null) delete reminders[room.id];
      else reminders[room.id] = action.minutes;
      return done(
        { ...x, reminders },
        {
          reservations:
            action.minutes === null
              ? state.reservations.filter((id) => id !== room.id)
              : [...new Set([...state.reservations, room.id])],
        },
      );
    }
    case "x/strategy": {
      if (room.status !== "live") return fail("closed");
      const v = action.values;
      if (
        !room.symbols.includes(v.symbol) ||
        ![v.entry, v.target, v.stop, v.expiresAt].every(Number.isFinite) ||
        Math.min(v.entry, v.target, v.stop) <= 0 ||
        v.expiresAt <= action.at ||
        (v.side === "buy"
          ? v.target <= v.entry || v.stop >= v.entry
          : v.target >= v.entry || v.stop <= v.entry)
      )
        return fail();
      const old = data.strategies.find((s) => s.id === action.id);
      if (old && ["ended", "expired"].includes(old.status))
        return fail("closed");
      const strategy: LiveStrategy = {
        ...v,
        note: v.note.slice(0, 400),
        id: action.id,
        at: old?.at || action.at,
        changedAt: action.at,
        status: "watching",
        revisions: old
          ? [
              ...old.revisions,
              {
                symbol: old.symbol,
                side: old.side,
                entry: old.entry,
                target: old.target,
                stop: old.stop,
                note: old.note,
                trigger: old.trigger,
                expiresAt: old.expiresAt,
                at: action.at,
              },
            ].slice(-20)
          : [],
      };
      return save(
        {
          strategies: old
            ? data.strategies.map((s) => (s.id === old.id ? strategy : s))
            : [strategy, ...data.strategies].slice(0, 100),
        },
        {
          rooms: state.rooms.map((r) =>
            r.id === room.id ? { ...r, strategy: v } : r,
          ),
        },
      );
    }
    case "x/strategyStatus":
      return save({
        strategies: data.strategies.map((s) =>
          s.id === action.id && !["ended", "expired"].includes(s.status)
            ? { ...s, status: action.status, changedAt: action.at }
            : s,
        ),
      });
    case "x/question": {
      if (room.status !== "live") return fail("closed");
      if (
        (state.muted[room.id]?.[ME] || 0) > action.at ||
        room.chatPermission === "closed"
      )
        return fail("muted");
      if (
        room.chatPermission === "followers" &&
        !state.following.includes(room.host.id)
      )
        return fail("followers");
      if (!action.text.trim() || data.questions.some((q) => q.id === action.id))
        return fail();
      if (
        (state.keywords[room.id] || ["稳赚不赔", "代客理财"]).some(
          (word) =>
            word && action.text.toLowerCase().includes(word.toLowerCase()),
        )
      )
        return fail("muted");
      return save({
        questions: [
          ...data.questions,
          {
            id: action.id,
            text: action.text.trim().slice(0, 300),
            name: "Alpha Trader",
            userId: ME,
            at: action.at,
            votes: [],
            status: "pending" as const,
          },
        ].slice(-100),
      });
    }
    case "x/upvote":
      return save({
        questions: data.questions.map((q) =>
          q.id === action.id && !q.mergedInto
            ? { ...q, votes: toggle(q.votes, ME) }
            : q,
        ),
      });
    case "x/answer": {
      if (room.status !== "live") return fail("closed");
      if (action.status === "answered" && !action.answer?.trim()) return fail();
      return save({
        questions: data.questions.map((q) =>
          q.id === action.id
            ? {
                ...q,
                status: action.status,
                answer: action.answer?.trim().slice(0, 1000),
                answeredAt:
                  action.status === "answered" ? action.at : undefined,
              }
            : action.status === "answering" && q.status === "answering"
              ? { ...q, status: "pending" }
              : q,
        ),
      });
    }
    case "x/mergeQuestion": {
      if (room.status !== "live") return fail("closed");
      const from = data.questions.find((q) => q.id === action.id),
        into = data.questions.find((q) => q.id === action.into);
      if (
        !from ||
        !into ||
        from.id === into.id ||
        from.mergedInto ||
        into.mergedInto ||
        from.status === "answered"
      )
        return fail();
      return save({
        questions: data.questions.map((q) =>
          q.id === from.id
            ? { ...q, mergedInto: into.id }
            : q.id === into.id
              ? { ...q, votes: [...new Set([...q.votes, ...from.votes])] }
              : q,
        ),
      });
    }
    case "x/poll": {
      const p = action.poll;
      if (room.status !== "live") return fail("closed");
      if (
        !p.title.trim() ||
        p.options.length < 2 ||
        p.options.length > 4 ||
        p.options.some((o) => !o.trim()) ||
        new Set(p.options).size !== p.options.length ||
        p.endsAt <= Date.now() ||
        data.polls.some((v) => v.id === p.id) ||
        (p.kind === "quiz" &&
          (!p.explanation.trim() ||
            !Number.isInteger(p.correct) ||
            p.correct < 0 ||
            p.correct >= p.options.length))
      )
        return fail();
      return save({
        polls: [{ ...p, votes: {}, closed: false }, ...data.polls].slice(0, 30),
      });
    }
    case "x/vote": {
      const p = data.polls.find((p) => p.id === action.id);
      if (!p || p.closed || room.status !== "live" || action.at >= p.endsAt)
        return fail("closed");
      if (
        p.votes[ME] !== undefined ||
        !Number.isInteger(action.option) ||
        action.option < 0 ||
        action.option >= p.options.length
      )
        return fail();
      return save({
        polls: data.polls.map((v) =>
          v.id === p.id
            ? { ...v, votes: { ...v.votes, [ME]: action.option } }
            : v,
        ),
      });
    }
    case "x/closePoll":
      return save({
        polls: data.polls.map((p) =>
          p.id === action.id ? { ...p, closed: true } : p,
        ),
      });
    case "x/replay": {
      if (
        room.status === "ended" &&
        action.changes.recording !== undefined &&
        action.changes.recording !== data.replay.recording
      )
        return fail("closed");
      const replay = { ...data.replay, ...action.changes };
      if (
        !replay.title.trim() ||
        replay.chapters.some(
          (c) =>
            !Number.isFinite(c.second) ||
            c.second < 0 ||
            (replay.duration > 0 && c.second >= replay.duration) ||
            !c.title.trim(),
        ) ||
        (replay.publication === "published" &&
          (!replay.recording ||
            room.status !== "ended" ||
            !replay.summaryApproved))
      )
        return fail();
      let next = {
        ...x,
        rooms: {
          ...x.rooms,
          [room.id]: {
            ...data,
            replay: {
              ...replay,
              chapters: [...replay.chapters].sort(
                (a, b) => a.second - b.second,
              ),
            },
          },
        },
      };
      if (
        data.replay.publication !== "published" &&
        replay.publication === "published" &&
        (state.reservations.includes(room.id) ||
          x.hostAlerts.includes(room.host.id) ||
          x.series.includes(data.seriesId))
      )
        next = notifyExperience(
          next,
          room,
          room.id + "-replay-" + (room.endedAt || action.at),
          `${replay.title}：回放已发布`,
          `${room.titleEn}: replay published`,
          action.at,
        );
      return done(next);
    }
    case "x/note":
      if (!Number.isFinite(action.second)) return fail();
      return save({
        replay: {
          ...data.replay,
          notes: action.text.trim()
            ? [
                ...data.replay.notes.filter((n) => n.id !== action.id),
                {
                  id: action.id,
                  text: action.text.trim().slice(0, 500),
                  second: Math.max(0, action.second),
                },
              ].slice(-100)
            : data.replay.notes.filter((n) => n.id !== action.id),
        },
      });
    case "x/progress":
      if (
        !Number.isFinite(action.second) ||
        !Number.isFinite(action.duration) ||
        action.duration < 0
      )
        return fail();
      return save({
        replay: {
          ...data.replay,
          position: Math.min(
            Math.max(0, action.second),
            action.duration || action.second,
          ),
          duration: action.duration,
        },
      });
    case "x/settings": {
      if (action.seriesId && !LIVE_SERIES.some((s) => s.id === action.seriesId))
        return fail();
      if (
        action.eventId &&
        !ECONOMIC_CALENDAR_DATA.some((e) => e.id === action.eventId)
      )
        return fail();
      if (
        action.slowSeconds !== undefined &&
        ![0, 5, 10, 30].includes(action.slowSeconds)
      )
        return fail();
      return save({
        ...(action.slowSeconds !== undefined
          ? { slowSeconds: action.slowSeconds }
          : {}),
        ...(action.seriesId !== undefined ? { seriesId: action.seriesId } : {}),
        ...(action.eventId !== undefined ? { eventId: action.eventId } : {}),
        ...(action.moderators
          ? {
              moderators: [...new Set(action.moderators)].filter(
                (id) => id !== room.host.id,
              ),
            }
          : {}),
        audit: [
          {
            id: `settings-${action.at}`,
            text: "更新房间管理设置",
            at: action.at,
            actor: action.actor,
          },
          ...data.audit,
        ].slice(0, 100),
      });
    }
    case "x/report": {
      const message = state.messages[room.id]?.find(
        (m) => m.id === action.messageId,
      );
      if (
        !message ||
        !action.reason.trim() ||
        data.reports.some(
          (r) => r.messageId === message.id && r.status === "pending",
        )
      )
        return fail();
      return save({
        reports: [
          {
            id: action.id,
            messageId: message.id,
            text: message.text,
            reason: action.reason,
            at: action.at,
            status: "pending" as const,
          },
          ...data.reports,
        ].slice(0, 100),
      });
    }
    case "x/moderate": {
      const report = data.reports.find((r) => r.id === action.reportId),
        id = action.messageId || report?.messageId;
      if (!id) return fail();
      return save(
        {
          reports: data.reports.map((r) =>
            r.id === action.reportId
              ? { ...r, status: action.remove ? "removed" : "dismissed" }
              : r,
          ),
          audit: [
            {
              id: `moderate-${action.at}-${id}`,
              text: action.remove ? "删除消息" : "举报已驳回",
              at: action.at,
              actor: action.actor,
            },
            ...data.audit,
          ].slice(0, 100),
        },
        action.remove
          ? {
              messages: {
                ...state.messages,
                [room.id]: (state.messages[room.id] || []).filter(
                  (m) => m.id !== id,
                ),
              },
              pinnedMessage: {
                ...state.pinnedMessage,
                [room.id]:
                  state.pinnedMessage[room.id] === id
                    ? ""
                    : state.pinnedMessage[room.id],
              },
            }
          : {},
      );
    }
    case "x/leave": {
      if (action.allowFloating && x.floatingRoom === room.id) return { state };
      return done(
        {
          ...x,
          floatingRoom: x.floatingRoom === room.id ? null : x.floatingRoom,
          sharing: Object.fromEntries(
            Object.entries(x.sharing).filter(([id]) => id !== room.id),
          ),
        },
        { shared: state.shared.filter((id) => id !== room.id) },
      );
    }
    case "x/share": {
      if (action.scope && (room.status !== "live" || !room.sharedTrading))
        return fail("closed");
      return done(
        {
          ...x,
          sharing: action.scope
            ? {
                [room.id]: {
                  scope: action.scope,
                  since: x.sharing[room.id]?.since || action.at,
                },
              }
            : Object.fromEntries(
                Object.entries(x.sharing).filter(([id]) => id !== room.id),
              ),
        },
        {
          shared: action.scope
            ? [room.id]
            : state.shared.filter((id) => id !== room.id),
        },
      );
    }
    case "x/metric": {
      const visits = { ...data.visits },
        m = { ...data.metrics };
      if (action.kind === "visit") {
        if (visits[action.id]) return { state };
        visits[action.id] = { at: action.at, seconds: 0, userId: ME };
        m.viewers++;
        m.peak = Math.max(m.peak, room.viewers + 1);
      }
      if (action.kind === "watch" && visits[action.id]) {
        const seconds = Math.max(0, Math.min(30, action.seconds || 0));
        visits[action.id] = {
          ...visits[action.id],
          seconds: visits[action.id].seconds + seconds,
        };
        m.watchSeconds += seconds;
      }
      if (action.kind === "click") m.clicks++;
      if (action.kind === "order") m.orders++;
      return save({ visits, metrics: m });
    }
  }
}
