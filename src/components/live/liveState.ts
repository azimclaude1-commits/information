import {
  afterRoomChange,
  canManage,
  hydrateLiveState,
  reduceExperience,
  seedExperience,
  type ExperienceAction,
  type LiveExperience,
} from "./liveExperience";
export type Lang = "zh" | "en";
export type Category = "crypto" | "macro" | "stocks" | "academy";
export type RoomStatus = "live" | "scheduled" | "ended";
export type StageMode = "chart" | "voice" | "video";
export type Profile = {
  id: string;
  name: string;
  nameEn: string;
  initials: string;
  color: string;
  bio: string;
  bioEn: string;
  followers: number;
};
export type LiveRoom = {
  id: string;
  title: string;
  titleEn: string;
  host: Profile;
  category: Category;
  status: RoomStatus;
  mode: StageMode;
  viewers: number;
  startsAt: number;
  endedAt?: number;
  cancelled?: boolean;
  symbols: string[];
  pinnedSymbol: string;
  announcement: string;
  announcementEn: string;
  chatPermission: "all" | "followers" | "closed";
  access: "all" | "followers";
  cover?: string;
  sharedTrading: boolean;
  strategy?: {
    symbol: string;
    side: "buy" | "sell";
    entry: number;
    target: number;
    stop: number;
    note: string;
  };
};
export type Message = {
  id: string;
  userId: string;
  name: string;
  nameEn: string;
  text: string;
  textEn?: string;
  at: number;
  kind: "chat" | "host" | "gift" | "system";
  amount?: number;
  giftId?: string;
  giftQty?: number;
};
export type Seat = {
  userId: string;
  name: string;
  nameEn: string;
  muted: boolean;
};
export type MicRequest = {
  userId: string;
  name: string;
  nameEn: string;
  status: "pending" | "accepted" | "rejected";
  at: number;
};
export type Packet = {
  id: string;
  roomId: string;
  senderId: string;
  total: number;
  remaining: number;
  count: number;
  remainingCount: number;
  mode: "equal" | "random";
  opensAt: number;
  expiresAt: number;
  claims: Record<string, number>;
  closed: boolean;
  title: string;
};
export type LiveLedger = {
  id: string;
  userId: string;
  roomId: string;
  kind: "gift" | "received" | "packet" | "claim" | "refund";
  amount: number;
  at: number;
  label: string;
  labelEn: string;
};
export type LiveState = {
  experience: LiveExperience;
  version: 1;
  rooms: LiveRoom[];
  following: string[];
  reservations: string[];
  shared: string[];
  wallets: Record<string, number>;
  messages: Record<string, Message[]>;
  seats: Record<string, Seat[]>;
  requests: Record<string, MicRequest[]>;
  packets: Packet[];
  ledger: LiveLedger[];
  muted: Record<string, Record<string, number>>;
  keywords: Record<string, string[]>;
  pinnedMessage: Record<string, string>;
  likes: Record<string, number>;
  gifts: Record<string, Record<string, number>>;
};
export const ME = "viewer-me";
export const VIEWER: Profile = {
  id: ME,
  name: "Alpha Trader",
  nameEn: "Alpha Trader",
  initials: "AT",
  color: "blue",
  bio: "关注全球市场，记录每一次交易。",
  bioEn: "Following global markets, one trade at a time.",
  followers: 128,
};
export const HOSTS: Profile[] = [
  {
    id: "chen",
    name: "陈铭",
    nameEn: "Marcus Chen",
    initials: "CM",
    color: "blue",
    bio: "宏观研究员 · 关注黄金、外汇与全球资产配置",
    bioEn: "Macro analyst · Gold, FX and global markets",
    followers: 42600,
  },
  {
    id: "lin",
    name: "林语",
    nameEn: "Lynn Lin",
    initials: "LY",
    color: "violet",
    bio: "加密市场研究员 · 链上数据与趋势分析",
    bioEn: "Crypto researcher · On-chain data and trends",
    followers: 28400,
  },
  {
    id: "gu",
    name: "顾远",
    nameEn: "Ethan Gu",
    initials: "GY",
    color: "teal",
    bio: "美股研究员 · 科技行业与企业财报",
    bioEn: "Equity analyst · Technology and earnings",
    followers: 19200,
  },
  {
    id: "su",
    name: "苏晴",
    nameEn: "Claire Su",
    initials: "SQ",
    color: "amber",
    bio: "交易教育 · 技术分析与风险管理",
    bioEn: "Trading education · Technicals and risk management",
    followers: 16800,
  },
];
export const CURRENT_CREATOR = HOSTS[0];
export const GIFTS = [
  { id: "heart", icon: "💙", zh: "心意", en: "Heart", cents: 100 },
  { id: "coffee", icon: "☕", zh: "咖啡", en: "Coffee", cents: 200 },
  { id: "rose", icon: "🌹", zh: "鲜花", en: "Rose", cents: 500 },
  { id: "star", icon: "🌟", zh: "星光", en: "Star", cents: 990 },
  { id: "diamond", icon: "💎", zh: "钻石", en: "Diamond", cents: 1990 },
  { id: "rocket", icon: "🚀", zh: "火箭", en: "Rocket", cents: 9990 },
];
export const CATEGORIES: [Category | "all", string, string][] = [
  ["all", "全部", "All"],
  ["macro", "黄金外汇", "Gold & FX"],
  ["crypto", "加密市场", "Crypto"],
  ["stocks", "美股市场", "US equities"],
  ["academy", "交易课堂", "Academy"],
];
export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const compact = (n: number) =>
  n >= 10000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString("en-US");
export const uid = () => globalThis.crypto.randomUUID();
export const label = (lang: Lang, zh: string, en: string) =>
  lang === "zh" ? zh : en;
export const personName = (p: Pick<Profile, "name" | "nameEn">, lang: Lang) =>
  lang === "zh" ? p.name : p.nameEn;
export function seedLiveState(now = Date.now()): LiveState {
  const make = (
    id: string,
    title: string,
    titleEn: string,
    host: Profile,
    category: Category,
    status: RoomStatus,
    mode: StageMode,
    symbols: string[],
    viewers: number,
    startsAt: number,
  ): LiveRoom => ({
    id,
    title,
    titleEn,
    host,
    category,
    status,
    mode,
    symbols,
    viewers,
    startsAt,
    pinnedSymbol: symbols[0],
    announcement: "欢迎来到直播间。理性交流，注意仓位管理。",
    announcementEn:
      "Welcome. Keep the discussion constructive and manage your risk.",
    chatPermission: "all",
    access: "all",
    sharedTrading: true,
  });
  const rooms = [
    make(
      "global-desk",
      "黄金与美元：今晚的关键交易位",
      "Gold & the dollar: levels to watch",
      HOSTS[0],
      "macro",
      "live",
      "chart",
      ["XAU/USD", "EUR/USD", "BTC/USD"],
      2486,
      now - 2520000,
    ),
    make(
      "crypto-desk",
      "BTC 关键位置，资金正在往哪里走？",
      "BTC at a crossroads: following the flows",
      HOSTS[1],
      "crypto",
      "live",
      "voice",
      ["BTC/USD", "ETH/USD", "SOL/USD"],
      1832,
      now - 1380000,
    ),
    make(
      "wall-street",
      "美股盘前：科技龙头与财报焦点",
      "Wall Street pre-market: tech & earnings",
      HOSTS[2],
      "stocks",
      "live",
      "video",
      ["NVDA", "AAPL", "TSLA"],
      968,
      now - 720000,
    ),
    make(
      "price-action",
      "从 K 线读懂趋势与支撑阻力",
      "Reading trends, support and resistance",
      HOSTS[3],
      "academy",
      "scheduled",
      "chart",
      ["XAU/USD", "EUR/USD"],
      326,
      now + 3600000,
    ),
    make(
      "asia-open",
      "亚洲早盘：BTC 与黄金市场观察",
      "Asia opening: BTC and gold",
      HOSTS[0],
      "macro",
      "scheduled",
      "voice",
      ["BTC/USD", "XAU/USD"],
      218,
      now + 39600000,
    ),
    {
      ...make(
        "crypto-week",
        "本周加密市场复盘与交易笔记",
        "Crypto weekly review and trading notes",
        HOSTS[1],
        "crypto",
        "ended",
        "video",
        ["BTC/USD", "ETH/USD"],
        3260,
        now - 86400000,
      ),
      endedAt: now - 82800000,
    },
  ];
  return {
    version: 1,
    experience: seedExperience(rooms),
    rooms,
    following: ["lin"],
    reservations: [],
    shared: [],
    wallets: {
      [ME]: 100000,
      ...Object.fromEntries(
        HOSTS.map((h) => [h.id, h.id === "chen" ? 248000 : 250000]),
      ),
    },
    messages: Object.fromEntries(
      rooms.map((r) => [
        r.id,
        [
          {
            id: `${r.id}-welcome`,
            userId: r.host.id,
            name: r.host.name,
            nameEn: r.host.nameEn,
            text: "欢迎大家，今天重点关注量能和关键位置。",
            textEn: "Welcome. Today we are watching volume and key levels.",
            at: now - 160000,
            kind: "host",
          },
          {
            id: `${r.id}-a`,
            userId: "user-oliver",
            name: "Oliver",
            nameEn: "Oliver",
            text: "到位了，先看一下小时线。",
            textEn: "Here! Let's look at the hourly chart first.",
            at: now - 90000,
            kind: "chat",
          },
          {
            id: `${r.id}-b`,
            userId: "user-mia",
            name: "小麦",
            nameEn: "Mia",
            text: "老师能聊聊量价关系吗？",
            textEn: "Could we talk about price and volume?",
            at: now - 60000,
            kind: "chat",
          },
          {
            id: `${r.id}-c`,
            userId: "user-noah",
            name: "Noah",
            nameEn: "Noah",
            text: "今天先观察，等待确认信号。",
            textEn: "Watching for a confirmation today.",
            at: now - 30000,
            kind: "chat",
          },
        ] as Message[],
      ]),
    ),
    seats: Object.fromEntries(
      rooms.map((r) => [
        r.id,
        [{ userId: "guest-alex", name: "Alex", nameEn: "Alex", muted: false }],
      ]),
    ),
    requests: Object.fromEntries(
      rooms.map((r) => [
        r.id,
        [
          {
            userId: "user-mia",
            name: "小麦",
            nameEn: "Mia",
            status: "pending",
            at: now - 30000,
          },
        ],
      ]),
    ),
    packets: [
      {
        id: "welcome-packet",
        roomId: rooms[0].id,
        senderId: "chen",
        total: 2000,
        remaining: 2000,
        count: 10,
        remainingCount: 10,
        mode: "random",
        opensAt: now,
        expiresAt: now + 86400000,
        claims: {},
        closed: false,
        title: "开播好礼",
      },
    ],
    ledger: [
      {
        id: "welcome-packet",
        userId: "chen",
        roomId: rooms[0].id,
        kind: "packet",
        amount: -2000,
        at: now,
        label: "发出红包",
        labelEn: "Red packet sent",
      },
    ],
    muted: {},
    keywords: {},
    pinnedMessage: {},
    likes: Object.fromEntries(
      rooms.map((r) => [r.id, r.status === "scheduled" ? 0 : 368]),
    ),
    gifts: Object.fromEntries(
      rooms.map((r) => [
        r.id,
        { "user-oliver": 3990, "user-mia": 1990, "user-noah": 990 },
      ]),
    ),
  };
}
export type LiveAction =
  | ExperienceAction
  | { type: "follow"; id: string; roomId?: string }
  | { type: "reserve"; id: string }
  | { type: "shareTrading"; id: string }
  | { type: "like"; id: string }
  | { type: "chat"; roomId: string; message: Message }
  | {
      type: "gift";
      roomId: string;
      giftId: string;
      qty: number;
      id: string;
      at: number;
    }
  | { type: "packet"; packet: Packet; at: number }
  | { type: "claim"; id: string; at: number; random: number }
  | { type: "expire"; at: number }
  | { type: "mic"; roomId: string; request: MicRequest }
  | { type: "reviewMic"; roomId: string; userId: string; accept: boolean }
  | { type: "leaveMic"; roomId: string; userId: string }
  | { type: "toggleMic"; roomId: string; userId: string }
  | { type: "room"; room: LiveRoom }
  | {
      type: "mute";
      actor?: string;
      roomId: string;
      userId: string;
      until: number;
    }
  | { type: "keyword"; roomId: string; words: string[] }
  | { type: "pinMessage"; actor?: string; roomId: string; messageId: string };
type Result = {
  state: LiveState;
  error?:
    | "funds"
    | "closed"
    | "invalid"
    | "claimed"
    | "early"
    | "full"
    | "muted"
    | "followers";
};
const toggle = (xs: string[], id: string) =>
  xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id];
const addMessage = (state: LiveState, roomId: string, message: Message) => ({
  ...state.messages,
  [roomId]: [...(state.messages[roomId] || []), message].slice(-150),
});
/** All virtual wallet operations are atomic and use integer cents. */
export function reduceLive(state: LiveState, action: LiveAction): Result {
  state = hydrateLiveState(state);
  if (action.type.startsWith("x/"))
    return reduceExperience(state, action as ExperienceAction);
  const fail = (error: Result["error"]): Result => ({ state, error });
  const room =
    "roomId" in action
      ? state.rooms.find((r) => r.id === action.roomId)
      : undefined;
  switch (action.type) {
    case "follow":
      return {
        state: {
          ...state,
          following: toggle(state.following, action.id),
          experience:
            action.roomId &&
            !state.following.includes(action.id) &&
            state.experience.rooms[action.roomId]
              ? {
                  ...state.experience,
                  rooms: {
                    ...state.experience.rooms,
                    [action.roomId]: {
                      ...state.experience.rooms[action.roomId],
                      metrics: {
                        ...state.experience.rooms[action.roomId].metrics,
                        follows:
                          state.experience.rooms[action.roomId].metrics
                            .follows + 1,
                      },
                    },
                  },
                }
              : state.experience,
        },
      };
    case "reserve":
      return {
        state: {
          ...state,
          reservations: toggle(state.reservations, action.id),
        },
      };
    case "shareTrading":
      return { state: { ...state, shared: toggle(state.shared, action.id) } };
    case "like":
      return {
        state: {
          ...state,
          likes: {
            ...state.likes,
            [action.id]: (state.likes[action.id] || 0) + 1,
          },
        },
      };
    case "chat": {
      if (!room || room.status !== "live") return fail("closed");
      const message = {
        ...action.message,
        text: action.message.text.trim().slice(0, 300),
      };
      if (!message.text) return fail("invalid");
      if (message.userId !== room.host.id) {
        const slow = state.experience.rooms[room.id]?.slowSeconds || 0;
        const previous = [...(state.messages[room.id] || [])]
          .reverse()
          .find((m) => m.userId === message.userId && m.kind === "chat");
        if (slow && previous && message.at - previous.at < slow * 1000)
          return fail("muted");
        if (
          (state.muted[room.id]?.[message.userId] || 0) > message.at ||
          room.chatPermission === "closed"
        )
          return fail("muted");
        if (
          room.chatPermission === "followers" &&
          message.userId === ME &&
          !state.following.includes(room.host.id)
        )
          return fail("followers");
      }
      if (state.messages[room.id]?.some((m) => m.id === message.id))
        return { state };
      for (const word of state.keywords[room.id] || ["稳赚不赔", "代客理财"]) {
        if (word)
          message.text = message.text.replace(
            new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
            "***",
          );
      }
      return {
        state: { ...state, messages: addMessage(state, room.id, message) },
      };
    }
    case "gift": {
      const gift = GIFTS.find((g) => g.id === action.giftId);
      if (!room || room.status !== "live") return fail("closed");
      if (
        !gift ||
        !Number.isInteger(action.qty) ||
        action.qty < 1 ||
        action.qty > 99
      )
        return fail("invalid");
      if (state.ledger.some((l) => l.id === action.id)) return fail("invalid");
      const cost = gift.cents * action.qty;
      if ((state.wallets[ME] || 0) < cost) return fail("funds");
      const entry = {
        roomId: room.id,
        at: action.at,
        label: `${gift.zh} × ${action.qty}`,
        labelEn: `${gift.en} × ${action.qty}`,
      };
      return {
        state: {
          ...state,
          wallets: {
            ...state.wallets,
            [ME]: state.wallets[ME] - cost,
            [room.host.id]: (state.wallets[room.host.id] || 0) + cost,
          },
          ledger: [
            {
              ...entry,
              id: action.id,
              userId: ME,
              kind: "gift",
              amount: -cost,
            },
            {
              ...entry,
              id: `${action.id}-host`,
              userId: room.host.id,
              kind: "received",
              amount: cost,
            },
            ...state.ledger,
          ],
          gifts: {
            ...state.gifts,
            [room.id]: {
              ...state.gifts[room.id],
              [ME]: (state.gifts[room.id]?.[ME] || 0) + cost,
            },
          },
          messages: addMessage(state, room.id, {
            id: action.id,
            userId: ME,
            name: VIEWER.name,
            nameEn: VIEWER.nameEn,
            text: `送出 ${gift.zh} × ${action.qty}`,
            textEn: `sent ${gift.en} × ${action.qty}`,
            at: action.at,
            kind: "gift",
            giftId: gift.id,
            giftQty: action.qty,
            amount: cost,
          }),
        },
      };
    }
    case "packet": {
      const p = action.packet,
        r = state.rooms.find((x) => x.id === p.roomId);
      if (!r || r.status !== "live") return fail("closed");
      if (
        p.senderId !== r.host.id ||
        !Number.isInteger(p.total) ||
        !Number.isInteger(p.count) ||
        p.total < p.count ||
        p.count < 1 ||
        p.count > 100 ||
        p.opensAt < action.at ||
        p.expiresAt <= p.opensAt ||
        (p.mode === "equal" && p.total % p.count !== 0) ||
        state.packets.some((x) => x.id === p.id)
      )
        return fail("invalid");
      if ((state.wallets[p.senderId] || 0) < p.total) return fail("funds");
      const packet = {
        ...p,
        remaining: p.total,
        remainingCount: p.count,
        claims: {},
        closed: false,
      };
      return {
        state: {
          ...state,
          wallets: {
            ...state.wallets,
            [p.senderId]: state.wallets[p.senderId] - p.total,
          },
          packets: [packet, ...state.packets],
          ledger: [
            {
              id: p.id,
              roomId: p.roomId,
              userId: p.senderId,
              kind: "packet",
              amount: -p.total,
              at: action.at,
              label: "发出红包",
              labelEn: "Red packet sent",
            },
            ...state.ledger,
          ],
          messages: addMessage(state, p.roomId, {
            id: p.id,
            userId: p.senderId,
            name: r.host.name,
            nameEn: r.host.nameEn,
            text: "发出了一个红包",
            textEn: "sent a red packet",
            at: action.at,
            kind: "system",
          }),
        },
      };
    }
    case "claim": {
      const p = state.packets.find((x) => x.id === action.id);
      if (!p || p.closed || p.expiresAt <= action.at || p.remainingCount < 1)
        return fail("closed");
      if (p.claims[ME] != null) return fail("claimed");
      if (p.opensAt > action.at) return fail("early");
      const max = Math.min(
        p.remaining - (p.remainingCount - 1),
        Math.max(1, Math.floor((p.remaining / p.remainingCount) * 2)),
      );
      const amount =
        p.remainingCount === 1
          ? p.remaining
          : p.mode === "equal"
            ? p.total / p.count
            : 1 +
              Math.floor(Math.max(0, Math.min(0.999999, action.random)) * max);
      return {
        state: {
          ...state,
          wallets: { ...state.wallets, [ME]: state.wallets[ME] + amount },
          packets: state.packets.map((x) =>
            x.id !== p.id
              ? x
              : {
                  ...p,
                  remaining: p.remaining - amount,
                  remainingCount: p.remainingCount - 1,
                  claims: { ...p.claims, [ME]: amount },
                },
          ),
          ledger: [
            {
              id: `${p.id}-${ME}`,
              userId: ME,
              roomId: p.roomId,
              kind: "claim",
              amount,
              at: action.at,
              label: "领取红包",
              labelEn: "Red packet received",
            },
            ...state.ledger,
          ],
        },
      };
    }
    case "expire": {
      const due = state.packets.filter(
        (p) => !p.closed && p.expiresAt <= action.at,
      );
      if (!due.length) return { state };
      const wallets = { ...state.wallets },
        ledger = [...state.ledger];
      for (const p of due)
        if (p.remaining > 0) {
          wallets[p.senderId] = (wallets[p.senderId] || 0) + p.remaining;
          ledger.unshift({
            id: `${p.id}-refund`,
            roomId: p.roomId,
            userId: p.senderId,
            kind: "refund",
            amount: p.remaining,
            at: action.at,
            label: "红包余款退回",
            labelEn: "Unclaimed packet refunded",
          });
        }
      return {
        state: {
          ...state,
          wallets,
          ledger,
          packets: state.packets.map((p) =>
            due.some((d) => d.id === p.id)
              ? { ...p, closed: true, remaining: 0 }
              : p,
          ),
        },
      };
    }
    case "mic": {
      if (!room || room.status !== "live") return fail("closed");
      if (state.seats[room.id]?.some((s) => s.userId === action.request.userId))
        return fail("invalid");
      return {
        state: {
          ...state,
          requests: {
            ...state.requests,
            [room.id]: [
              ...(state.requests[room.id] || []).filter(
                (r) => r.userId !== action.request.userId,
              ),
              action.request,
            ],
          },
        },
      };
    }
    case "reviewMic": {
      if (!room || room.status !== "live") return fail("closed");
      const req = state.requests[room.id]?.find(
        (r) => r.userId === action.userId && r.status === "pending",
      );
      if (!req) return fail("invalid");
      if (action.accept && (state.seats[room.id] || []).length >= 5)
        return fail("full");
      return {
        state: {
          ...state,
          requests: {
            ...state.requests,
            [room.id]: state.requests[room.id].map((r) =>
              r.userId === action.userId
                ? { ...r, status: action.accept ? "accepted" : "rejected" }
                : r,
            ),
          },
          seats: {
            ...state.seats,
            [room.id]: action.accept
              ? [
                  ...(state.seats[room.id] || []),
                  {
                    userId: req.userId,
                    name: req.name,
                    nameEn: req.nameEn,
                    muted: false,
                  },
                ]
              : state.seats[room.id] || [],
          },
        },
      };
    }
    case "leaveMic":
      return {
        state: {
          ...state,
          seats: {
            ...state.seats,
            [action.roomId]: (state.seats[action.roomId] || []).filter(
              (s) => s.userId !== action.userId,
            ),
          },
          requests: {
            ...state.requests,
            [action.roomId]: (state.requests[action.roomId] || []).filter(
              (s) => s.userId !== action.userId,
            ),
          },
        },
      };
    case "toggleMic":
      return {
        state: {
          ...state,
          seats: {
            ...state.seats,
            [action.roomId]: (state.seats[action.roomId] || []).map((s) =>
              s.userId === action.userId ? { ...s, muted: !s.muted } : s,
            ),
          },
        },
      };
    case "room": {
      const r = action.room;
      if (!r.title.trim() || r.title.length > 70 || !r.symbols.length)
        return fail("invalid");
      return {
        state: afterRoomChange(
          state,
          {
            ...state,
            rooms: state.rooms.some((x) => x.id === r.id)
              ? state.rooms.map((x) => (x.id === r.id ? r : x))
              : [r, ...state.rooms],
            wallets: {
              ...state.wallets,
              [r.host.id]: state.wallets[r.host.id] ?? 250000,
            },
            ...(r.status === "ended"
              ? {
                  seats: { ...state.seats, [r.id]: [] },
                  requests: { ...state.requests, [r.id]: [] },
                }
              : {}),
          },
          r,
          Date.now(),
        ),
      };
    }
    case "mute":
      if (action.actor && !canManage(state, action.roomId, action.actor))
        return fail("invalid");
      if (
        action.actor &&
        action.userId ===
          state.rooms.find((r) => r.id === action.roomId)?.host.id
      )
        return fail("invalid");
      return {
        state: {
          ...state,
          experience: moderationLog(
            state,
            action.roomId,
            action.actor,
            action.until > Date.now() ? "禁言用户" : "解除禁言",
          ),
          muted: {
            ...state.muted,
            [action.roomId]: {
              ...state.muted[action.roomId],
              [action.userId]: action.until,
            },
          },
        },
      };
    case "keyword":
      return {
        state: {
          ...state,
          keywords: { ...state.keywords, [action.roomId]: action.words },
        },
      };
    case "pinMessage":
      if (action.actor && !canManage(state, action.roomId, action.actor))
        return fail("invalid");
      return {
        state: {
          ...state,
          experience: moderationLog(
            state,
            action.roomId,
            action.actor,
            action.messageId ? "置顶消息" : "取消置顶",
          ),
          pinnedMessage: {
            ...state.pinnedMessage,
            [action.roomId]: action.messageId,
          },
        },
      };
  }
  return fail("invalid");
}

function moderationLog(
  state: LiveState,
  roomId: string,
  actor: string | undefined,
  text: string,
) {
  const data = state.experience.rooms[roomId];
  if (!data) return state.experience;
  return {
    ...state.experience,
    rooms: {
      ...state.experience.rooms,
      [roomId]: {
        ...data,
        audit: [
          {
            id: uid(),
            text,
            actor:
              actor || state.rooms.find((r) => r.id === roomId)?.host.id || "",
            at: Date.now(),
          },
          ...data.audit,
        ].slice(0, 100),
      },
    },
  };
}
