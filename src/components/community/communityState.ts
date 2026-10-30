import { ARTICLES, FLASH_ITEMS } from "../newsContent";
import { HOSTS, ME, VIEWER, type Profile } from "../live/liveState";

export const COMMUNITY_KEY = "alphapulse.community.v1";
export const authorId = (name: string) => `author:${name}`;
export const POSTS = [
  ...FLASH_ITEMS.map((p) => ({
    id: `flash:${p.id}`,
    title: p.title,
    hash: `#flash/${p.id}`,
    author: p.author,
    text: p.body,
    at: Date.parse(`2026-${p.date}T${p.time}:00+08:00`),
    kind: "flash" as const,
  })),
  ...ARTICLES.map((p) => ({
    id: `article:${p.id}`,
    title: p.title,
    hash: `#headlines/${p.id}`,
    author: p.author,
    text: p.intro,
    at: Date.parse(p.date.replaceAll("/", "-").replace(" ", "T") + ":00+08:00"),
    kind: "article" as const,
  })),
];
export const PROFILES: Profile[] = [
  VIEWER,
  ...HOSTS,
  ...[...new Set(POSTS.flatMap((p) => (p.author ? [p.author] : [])))].map(
    (name, i) => ({
      id: authorId(name),
      name,
      nameEn: name,
      initials: name.slice(0, 2),
      color: ["blue", "teal", "violet", "amber"][i % 4],
      bio: "分享市场观察与研究观点。",
      bioEn: "Market observations and research perspectives.",
      followers: 0,
    }),
  ),
  ...[
    ["user-oliver", "Oliver", "Oliver"],
    ["user-mia", "小麦", "Mia"],
    ["user-noah", "Noah", "Noah"],
    ["user-yu", "余舟", "Yu"],
    ["user-luna", "Luna", "Luna"],
    ["user-zhou", "周末看盘", "Weekend Trader"],
  ].map(([id, name, nameEn], i) => ({
    id,
    name,
    nameEn,
    initials: name.slice(0, 2),
    color: ["teal", "violet", "amber"][i % 3],
    bio: "记录市场，交流交易心得。",
    bioEn: "Following markets and exchanging trading insights.",
    followers: 0,
  })),
];
export type Comment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  at: number;
  parentId?: string;
  replyTo?: string;
  likes: number;
  liked: boolean;
  deleted?: boolean;
};
export type FollowGroup = { id: string; name: string };
export const MAX_FOLLOW_GROUPS = 12;
const DEFAULT_GROUPS: FollowGroup[] = [
  { id: "favorites", name: "特别关注" },
  { id: "creators", name: "交易主播" },
  { id: "research", name: "市场资讯" },
];
export type CommunityState = {
  version: 1;
  comments: Comment[];
  groups: FollowGroup[];
  memberGroups: Record<string, string>;
};
export type CommentAction =
  | {
      type: "add";
      id: string;
      postId: string;
      text: string;
      at: number;
      replyId?: string;
    }
  | { type: "like" | "delete"; id: string };
export type CommunityAction =
  | CommentAction
  | { type: "group/create" | "group/rename"; id: string; name: string }
  | { type: "group/delete"; id: string }
  | { type: "group/assign"; userId: string; groupId: string | null };

export function groupNameError(
  name: string,
  groups: FollowGroup[],
  exceptId?: string,
) {
  const normalized = name.trim().toLocaleLowerCase();
  if (!normalized) return "empty";
  if (name.trim().length > 20 || /[\r\n\t]/.test(name)) return "long";
  if (
    ["全部", "未分组", "all", "ungrouped"].includes(normalized) ||
    groups.some(
      (g) => g.id !== exceptId && g.name.toLocaleLowerCase() === normalized,
    )
  )
    return "duplicate";
  return null;
}

export function seedCommunity(): CommunityState {
  const remarks = [
    [
      "先看数据的统计口径，再判断这次变化的意义。",
      "我也在关注，准备结合后续数据一起看。",
    ],
    [
      "消息和价格反应要分开看，成交量也值得留意。",
      "已经加入观察，等市场给出更明确的信号。",
    ],
    [
      "这一点值得继续跟踪，单次变化还不足以说明趋势。",
      "谢谢整理，回头再对照一下原始数据。",
    ],
  ];
  return {
    version: 1,
    groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
    memberGroups: {},
    comments: POSTS.flatMap((p, i) =>
      i % 5 === 4
        ? []
        : remarks[i % remarks.length].map((text, j) => ({
            id: `seed:${p.id}:${j}`,
            postId: p.id,
            userId: j
              ? ["user-mia", "user-oliver", "user-yu"][i % 3]
              : HOSTS[i % HOSTS.length].id,
            text,
            at: p.at + (j + 1) * 180000,
            likes: (i + j) % 7,
            liked: false,
          })),
    ),
  };
}

/** Keep pre-existing plain-text flash comments; IDs make the migration repeatable. */
export function hydrateCommunity(
  saved: unknown,
  legacy?: unknown,
): CommunityState {
  const source = saved as Partial<CommunityState> | null;
  const initial =
    source?.version === 1 && Array.isArray(source.comments)
      ? source
      : seedCommunity();
  const comments = (initial.comments || [])
    .filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.userId === "string" &&
        typeof c.text === "string" &&
        Number.isFinite(c.at) &&
        POSTS.some((p) => p.id === c.postId),
    )
    .map((c) => ({
      ...c,
      text: c.text.slice(0, 500),
      likes: Math.max(0, Number(c.likes) || 0),
      liked: !!c.liked,
    }));
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    for (const [id, values] of Object.entries(legacy)) {
      const post = POSTS.find((p) => p.id === `flash:${id}`);
      if (!post || !Array.isArray(values)) continue;
      values.forEach((text, i) => {
        const commentId = `legacy:${id}:${i}`;
        if (
          typeof text === "string" &&
          text.trim() &&
          !comments.some((c) => c.id === commentId)
        )
          comments.push({
            id: commentId,
            postId: post.id,
            userId: ME,
            text: text.slice(0, 500),
            at: post.at + i,
            likes: 0,
            liked: false,
          });
      });
    }
  }
  const groups: FollowGroup[] = [];
  for (const group of Array.isArray(initial.groups)
    ? initial.groups
    : DEFAULT_GROUPS) {
    if (
      groups.length < MAX_FOLLOW_GROUPS &&
      group &&
      typeof group.id === "string" &&
      group.id &&
      !["all", "ungrouped"].includes(group.id) &&
      typeof group.name === "string" &&
      !groups.some((g) => g.id === group.id) &&
      !groupNameError(group.name, groups)
    )
      groups.push({ id: group.id, name: group.name.trim() });
  }
  const memberGroups =
    initial.memberGroups &&
    typeof initial.memberGroups === "object" &&
    !Array.isArray(initial.memberGroups)
      ? Object.fromEntries(
          Object.entries(initial.memberGroups).filter(
            ([id, groupId]) =>
              id && id !== ME && groups.some((g) => g.id === groupId),
          ),
        )
      : {};
  return {
    version: 1,
    comments: [...new Map(comments.map((c) => [c.id, c])).values()],
    groups,
    memberGroups,
  };
}

export function reduceCommunity(
  state: CommunityState,
  action: CommunityAction,
): CommunityState {
  if (action.type === "group/create" || action.type === "group/rename") {
    if (
      !action.id ||
      ["all", "ungrouped"].includes(action.id) ||
      groupNameError(
        action.name,
        state.groups,
        action.type === "group/rename" ? action.id : undefined,
      )
    )
      return state;
    const exists = state.groups.some((g) => g.id === action.id);
    if (action.type === "group/create")
      return exists || state.groups.length >= MAX_FOLLOW_GROUPS
        ? state
        : {
            ...state,
            groups: [
              ...state.groups,
              { id: action.id, name: action.name.trim() },
            ],
          };
    return !exists
      ? state
      : {
          ...state,
          groups: state.groups.map((g) =>
            g.id === action.id ? { ...g, name: action.name.trim() } : g,
          ),
        };
  }
  if (action.type === "group/delete")
    return {
      ...state,
      groups: state.groups.filter((g) => g.id !== action.id),
      memberGroups: Object.fromEntries(
        Object.entries(state.memberGroups).filter(
          ([, groupId]) => groupId !== action.id,
        ),
      ),
    };
  if (action.type === "group/assign") {
    if (
      !action.userId ||
      action.userId === ME ||
      (action.groupId !== null &&
        !state.groups.some((g) => g.id === action.groupId))
    )
      return state;
    const memberGroups = { ...state.memberGroups };
    if (action.groupId === null) delete memberGroups[action.userId];
    else memberGroups[action.userId] = action.groupId;
    return { ...state, memberGroups };
  }
  if (action.type === "add") {
    const text = action.text.trim();
    const reply = action.replyId
      ? state.comments.find(
          (c) =>
            c.id === action.replyId && c.postId === action.postId && !c.deleted,
        )
      : undefined;
    if (
      !text ||
      text.length > 500 ||
      !Number.isFinite(action.at) ||
      state.comments.some((c) => c.id === action.id) ||
      !POSTS.some((p) => p.id === action.postId) ||
      (action.replyId && !reply)
    )
      return state;
    return {
      ...state,
      comments: [
        ...state.comments,
        {
          id: action.id,
          postId: action.postId,
          userId: ME,
          text,
          at: action.at,
          likes: 0,
          liked: false,
          ...(reply
            ? { parentId: reply.parentId || reply.id, replyTo: reply.userId }
            : {}),
        },
      ],
    };
  }
  return {
    ...state,
    comments: state.comments.map((c) => {
      if (c.id !== action.id || c.deleted) return c;
      if (action.type === "delete")
        return c.userId === ME ? { ...c, text: "", deleted: true } : c;
      return { ...c, liked: !c.liked };
    }),
  };
}

export const commentCount = (state: CommunityState, postId: string) =>
  state.comments.filter((c) => c.postId === postId && !c.deleted).length;
