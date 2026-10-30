import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  Radio,
} from "lucide-react";
import { Avatar, DateLabel, LiveDialog } from "../live/LiveShared";
import {
  ME,
  compact,
  label,
  personName,
  type Lang,
  type Profile,
} from "../live/liveState";
import type { LiveStore } from "../live/useLive";
import { FollowingPanel } from "./FollowingPanel";
import {
  COMMUNITY_KEY,
  POSTS,
  PROFILES,
  authorId,
  commentCount,
  hydrateCommunity,
  reduceCommunity,
  type CommunityAction,
  type CommunityState,
} from "./communityState";
import "./community.css";

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function loadCommunity() {
  return hydrateCommunity(readJson(COMMUNITY_KEY), readJson("news.comments"));
}
type Community = {
  state: CommunityState;
  live: LiveStore;
  lang: Lang;
  dispatch: (action: CommunityAction) => void;
  profile: (id: string) => Profile;
  openProfile: (id: string) => void;
  openFollowing: () => void;
  close: () => void;
};
const CommunityContext = createContext<Community | null>(null);
export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("CommunityProvider is required");
  return context;
}

export function CommunityProvider({
  children,
  live,
  lang,
}: {
  children: React.ReactNode;
  live: LiveStore;
  lang: Lang;
}) {
  const [state, setState] = useState(loadCommunity);
  const stateRef = useRef(state);
  const [panel, setPanel] = useState<
    | { kind: "following" }
    | { kind: "profile"; id: string; fromFollowing?: boolean }
    | null
  >(null);
  useEffect(() => {
    if (panel)
      document
        .querySelector<HTMLButtonElement>(
          ".community-overlay .live-dialog > header button",
        )
        ?.focus();
  }, [panel]);
  const dispatch = useCallback((action: CommunityAction) => {
    const saved = readJson(COMMUNITY_KEY);
    const current = saved ? hydrateCommunity(saved) : stateRef.current;
    const next = reduceCommunity(current, action);
    stateRef.current = next;
    try {
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(next));
    } catch {
      /* Keep the current session usable. */
    }
    setState(next);
  }, []);
  const migrated = useRef(false);
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    try {
      localStorage.setItem(COMMUNITY_KEY, JSON.stringify(stateRef.current));
      if (
        localStorage.getItem("alphapulse.community.follow-migrated") !== "1"
      ) {
        const legacy = readJson("articles.following");
        if (Array.isArray(legacy))
          for (const name of new Set(
            legacy.filter((v): v is string => typeof v === "string"),
          )) {
            const id = authorId(name);
            if (
              PROFILES.some((p) => p.id === id) &&
              !live.state.following.includes(id)
            )
              live.dispatch({ type: "follow", id });
          }
        localStorage.setItem("alphapulse.community.follow-migrated", "1");
      }
    } catch {
      /* Storage may be unavailable. */
    }
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== COMMUNITY_KEY) return;
      stateRef.current = loadCommunity();
      setState(stateRef.current);
    };
    const close = () => setPanel(null);
    window.addEventListener("storage", sync);
    window.addEventListener("hashchange", close);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("hashchange", close);
    };
  }, []);
  const profiles = useMemo(() => {
    const map = new Map(PROFILES.map((p) => [p.id, p]));
    live.state.rooms.forEach((r) => map.set(r.host.id, r.host));
    Object.values(live.state.messages)
      .flat()
      .forEach((m) => {
        if (m.kind === "system" || map.has(m.userId)) return;
        map.set(m.userId, {
          id: m.userId,
          name: m.name,
          nameEn: m.nameEn,
          initials: m.name.slice(0, 2),
          color: "violet",
          bio: "",
          bioEn: "",
          followers: 0,
        });
      });
    return map;
  }, [live.state.rooms, live.state.messages]);
  const profile = (id: string): Profile =>
    profiles.get(id) || {
      id,
      name: "社区用户",
      nameEn: "Community member",
      initials: "U",
      color: "blue",
      bio: "",
      bioEn: "",
      followers: 0,
    };
  const value: Community = {
    state,
    live,
    lang,
    dispatch,
    profile,
    openProfile: (id) =>
      setPanel((old) => ({
        kind: "profile",
        id,
        fromFollowing:
          old?.kind === "following" ||
          (old?.kind === "profile" && old.fromFollowing),
      })),
    openFollowing: () => setPanel({ kind: "following" }),
    close: () => setPanel(null),
  };
  return (
    <CommunityContext.Provider value={value}>
      {children}
      {panel && (
        <LiveDialog
          overlayClassName={`community-overlay${panel.kind === "following" ? " community-following-overlay" : ""}`}
          title={label(
            lang,
            panel.kind === "following" ? "我的关注" : "个人主页",
            panel.kind === "following" ? "Following" : "Profile",
          )}
          onClose={value.close}
          wide
        >
          <div className="community-panel">
            {(panel.kind === "following" || panel.fromFollowing) && (
              <div
                className="community-following-content"
                hidden={panel.kind !== "following"}
              >
                <FollowingPanel />
              </div>
            )}
            {panel.kind === "profile" && (
              <>
                {panel.fromFollowing && (
                  <button
                    className="community-back"
                    onClick={value.openFollowing}
                  >
                    <ArrowLeft size={15} />
                    {label(lang, "我的关注", "Following")}
                  </button>
                )}
                <UserProfile key={panel.id} id={panel.id} />
              </>
            )}
          </div>
        </LiveDialog>
      )}
    </CommunityContext.Provider>
  );
}

export function ProfileAvatar({
  id,
  size = "sm",
}: {
  id: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const c = useCommunity(),
    p = c.profile(id);
  return (
    <button
      type="button"
      className="community-avatar-button"
      onClick={() => c.openProfile(id)}
      aria-label={label(
        c.lang,
        `查看${p.name}的主页`,
        `View ${p.nameEn}'s profile`,
      )}
    >
      <Avatar profile={p} size={size} />
    </button>
  );
}

export function FollowButton({ id }: { id: string }) {
  const c = useCommunity(),
    followed = c.live.state.following.includes(id);
  if (id === ME) return null;
  return (
    <button
      className={`community-follow ${followed ? "is-following" : ""}`}
      aria-pressed={followed}
      onClick={() => c.live.dispatch({ type: "follow", id })}
    >
      {followed ? <Check size={14} /> : <Plus size={14} />}
      {label(
        c.lang,
        followed ? "已关注" : "关注",
        followed ? "Following" : "Follow",
      )}
    </button>
  );
}

export function CommunityPagination({
  page,
  count,
  size = 8,
  onChange,
}: {
  page: number;
  count: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const { lang } = useCommunity(),
    pages = Math.max(1, Math.ceil(count / size));
  if (pages === 1) return null;
  return (
    <div className="community-pagination">
      <button
        aria-label={label(lang, "上一页", "Previous page")}
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      <span>
        {page + 1} / {pages}
      </span>
      <button
        aria-label={label(lang, "下一页", "Next page")}
        disabled={page >= pages - 1}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function UserProfile({ id }: { id: string }) {
  const c = useCommunity(),
    p = c.profile(id),
    [tab, setTab] = useState("history"),
    [page, setPage] = useState(0);
  const followed = c.live.state.following.includes(id);
  const rooms = c.live.state.rooms
    .filter(
      (r) =>
        r.host.id === id &&
        !r.cancelled &&
        (r.status !== "ended" ||
          (c.live.state.experience.rooms[r.id]?.replay.publication ===
            "published" &&
            c.live.state.experience.rooms[r.id]?.replay.recording)),
    )
    .sort((a, b) => b.startsAt - a.startsAt);
  const entries = [
    ...POSTS.filter((post) => post.author && authorId(post.author) === id).map(
      (post) => ({
        id: post.id,
        text: post.text,
        at: post.at,
        source: post.title,
        hash: post.hash,
        kind: label(c.lang, "发布资讯", "Published"),
      }),
    ),
    ...c.state.comments
      .filter((comment) => comment.userId === id && !comment.deleted)
      .map((comment) => {
        const post = POSTS.find((p) => p.id === comment.postId)!;
        return {
          id: comment.id,
          text: comment.text,
          at: comment.at,
          source: post.title,
          hash: post.hash,
          kind: label(
            c.lang,
            comment.parentId ? "回复" : "评论",
            comment.parentId ? "Reply" : "Comment",
          ),
        };
      }),
    ...c.live.state.rooms
      .filter(
        (room) =>
          room.status !== "ended" ||
          (c.live.state.experience.rooms[room.id]?.replay.publication ===
            "published" &&
            c.live.state.experience.rooms[room.id]?.replay.recording),
      )
      .flatMap((room) =>
        (c.live.state.messages[room.id] || [])
          .filter(
            (m) => m.userId === id && (m.kind === "chat" || m.kind === "host"),
          )
          .map((m) => ({
            id: m.id,
            text: c.lang === "en" ? m.textEn || m.text : m.text,
            at: m.at,
            source: label(c.lang, room.title, room.titleEn),
            hash: `#live/room/${room.id}`,
            kind: label(c.lang, "直播发言", "Live chat"),
          })),
      ),
  ].sort((a, b) => b.at - a.at);
  const listCount = tab === "history" ? entries.length : rooms.length;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(listCount / 8) - 1));
  const go = (hash: string) => {
    c.close();
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <>
      <div className="community-profile-top">
        <Avatar profile={p} size="xl" />
        <div>
          <h2>{personName(p, c.lang)}</h2>
          <span>
            @
            {id === ME
              ? "alpha-trader"
              : id.startsWith("author:")
                ? p.name
                : id}
          </span>
        </div>
        <FollowButton id={id} />
      </div>
      <p className="community-bio">
        {label(c.lang, p.bio, p.bioEn) ||
          label(c.lang, "这个人还没有填写简介", "No bio yet")}
      </p>
      <div className="community-profile-stats">
        <span>
          <b>{compact(p.followers + (followed ? 1 : 0))}</b>
          {label(c.lang, "粉丝", "Followers")}
        </span>
        <span>
          <b>{entries.length}</b>
          {label(c.lang, "发言", "Posts")}
        </span>
        <span>
          <b>{rooms.length}</b>
          {label(c.lang, "直播", "Sessions")}
        </span>
      </div>
      <div
        className="ui-tabs community-profile-tabs"
        role="tablist"
        aria-label={label(c.lang, "用户内容", "Profile content")}
      >
        <button
          role="tab"
          className="ui-tab"
          aria-selected={tab === "history"}
          onClick={() => {
            setTab("history");
            setPage(0);
          }}
        >
          <MessageCircle size={15} />
          {label(c.lang, "历史发言", "History")}
        </button>
        <button
          role="tab"
          className="ui-tab"
          aria-selected={tab === "live"}
          onClick={() => {
            setTab("live");
            setPage(0);
          }}
        >
          <Radio size={15} />
          {label(c.lang, "他的直播", "Livestreams")}
        </button>
      </div>
      <div className="community-profile-feed" role="tabpanel">
        {tab === "history"
          ? entries.slice(currentPage * 8, currentPage * 8 + 8).map((entry) => (
              <article className="community-history-item" key={entry.id}>
                <header>
                  <span>{entry.kind}</span>
                  <time>
                    <DateLabel at={entry.at} lang={c.lang} />
                  </time>
                </header>
                <p>{entry.text}</p>
                <button onClick={() => go(entry.hash)}>
                  <span>{entry.source}</span>
                  <ArrowUpRight size={14} />
                </button>
              </article>
            ))
          : rooms.slice(currentPage * 8, currentPage * 8 + 8).map((room) => (
              <button
                className="community-room"
                key={room.id}
                onClick={() => go(`#live/room/${room.id}`)}
              >
                <span className={`community-room-status status-${room.status}`}>
                  <Radio size={17} />
                  {label(
                    c.lang,
                    room.status === "live"
                      ? "直播中"
                      : room.status === "scheduled"
                        ? "预告"
                        : "回放",
                    room.status === "live"
                      ? "LIVE"
                      : room.status === "scheduled"
                        ? "Upcoming"
                        : "Replay",
                  )}
                </span>
                <strong>{label(c.lang, room.title, room.titleEn)}</strong>
                <small>
                  <DateLabel at={room.startsAt} lang={c.lang} />
                </small>
                <ChevronRight size={16} />
              </button>
            ))}
        {!listCount && (
          <div className="community-empty">
            <MessageCircle size={24} />
            <p>
              {label(
                c.lang,
                tab === "history" ? "暂无公开发言" : "暂无公开直播",
                tab === "history"
                  ? "No public posts yet"
                  : "No public sessions yet",
              )}
            </p>
          </div>
        )}
      </div>
      <CommunityPagination
        page={currentPage}
        count={listCount}
        onChange={setPage}
      />
    </>
  );
}

export function CommentCount({ postId }: { postId: string }) {
  const c = useCommunity();
  return (
    <span className="community-count">
      <MessageCircle size={12} />
      {commentCount(c.state, postId)}
    </span>
  );
}
