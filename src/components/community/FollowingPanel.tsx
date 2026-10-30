import React, { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Folder,
  FolderCog,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Avatar, LiveDialog } from "../live/LiveShared";
import {
  HOSTS,
  ME,
  label,
  personName,
  uid,
  type Profile,
} from "../live/liveState";
import {
  CommunityPagination,
  FollowButton,
  ProfileAvatar,
  useCommunity,
} from "./Community";
import {
  authorId,
  groupNameError,
  MAX_FOLLOW_GROUPS,
  PROFILES,
} from "./communityState";
import "./following.css";

const RECOMMENDED_IDS = [
  ...HOSTS.map((p) => p.id),
  authorId("Walter Bloomberg"),
  authorId("Dan Held"),
];

export function FollowingPanel() {
  const c = useCommunity(),
    t = (zh: string, en: string) => label(c.lang, zh, en);
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [group, setGroup] = useState("all");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false),
    [managing, setManaging] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLInputElement>(null),
    suggestionsId = useId();
  const following = c.live.state.following.filter((id) => id !== ME);
  const selectedGroup =
    group === "all" ||
    group === "ungrouped" ||
    c.state.groups.some((g) => g.id === group)
      ? group
      : "all";
  const needle = query.trim().toLocaleLowerCase();
  const matches = (p: Profile) =>
    `${p.name} ${p.nameEn} ${p.bio} ${p.bioEn}`
      .toLocaleLowerCase()
      .includes(needle);
  const groupOf = (id: string) => c.state.memberGroups[id] || "ungrouped";
  const list = following
    .filter((id) => selectedGroup === "all" || groupOf(id) === selectedGroup)
    .map(c.profile)
    .filter(matches);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(list.length / 8) - 1),
  );
  const directory = [
    ...new Map(
      [
        ...PROFILES,
        ...c.live.state.rooms.map((r) => r.host),
        ...following.map(c.profile),
      ]
        .filter((p) => p.id !== ME)
        .map((p) => [p.id, p]),
    ).values(),
  ];
  const recommended = RECOMMENDED_IDS.map((id) =>
    directory.find((p) => p.id === id),
  )
    .filter((p): p is Profile => !!p)
    .sort(
      (a, b) =>
        Number(following.includes(a.id)) - Number(following.includes(b.id)),
    );
  const results = needle
    ? directory
        .filter(matches)
        .sort(
          (a, b) =>
            Number(following.includes(b.id)) - Number(following.includes(a.id)),
        )
    : recommended;
  const suggestions = (results.length ? results : recommended).slice(0, 8);
  useEffect(() => {
    if (!suggestionsOpen) return;
    const outside = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node))
        setSuggestionsOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [suggestionsOpen]);
  const liveNow = (id: string) =>
    c.live.state.rooms.some((r) => r.host.id === id && r.status === "live");
  const openProfile = (id: string) => {
    setSuggestionsOpen(false);
    c.openProfile(id);
  };
  const recommendationRow = (p: Profile) => (
    <div className="following-suggestion-row" key={p.id}>
      <button
        className="following-suggestion-main"
        onClick={() => openProfile(p.id)}
        aria-label={t(`查看${p.name}的主页`, `View ${p.nameEn}'s profile`)}
      >
        <Avatar profile={p} size="md" />
        <span>
          <strong>
            {personName(p, c.lang)}
            {liveNow(p.id) && (
              <small className="following-live-dot">
                {t("直播中", "LIVE")}
              </small>
            )}
          </strong>
          <small>
            {label(c.lang, p.bio, p.bioEn) ||
              t("市场动态与观点", "Market updates and views")}
          </small>
        </span>
      </button>
      <FollowButton id={p.id} />
    </div>
  );
  return (
    <div className="following-panel">
      <div className="following-heading">
        <span>
          <Users size={17} />
          {t("已关注", "Following")}
          <b>{following.length}</b>
        </span>
        <button
          className="following-manage"
          onClick={() => {
            setSuggestionsOpen(false);
            setManaging(true);
          }}
        >
          <FolderCog size={15} />
          {t("管理分组", "Manage groups")}
        </button>
      </div>
      <div
        className="following-search-wrap"
        ref={searchRef}
        onBlur={(event) => {
          if (
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget as Node)
          )
            setSuggestionsOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && suggestionsOpen) {
            event.preventDefault();
            event.stopPropagation();
            inputRef.current?.focus();
            setSuggestionsOpen(false);
          }
        }}
      >
        <label className="community-search">
          <Search size={16} />
          <input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="dialog"
            aria-expanded={suggestionsOpen}
            aria-controls={suggestionsOpen ? suggestionsId : undefined}
            aria-label={t("搜索用户", "Search users")}
            placeholder={t(
              "搜索昵称、名人或主播",
              "Search names, creators or hosts",
            )}
            value={query}
            onFocus={() => setSuggestionsOpen(true)}
            onClick={() => setSuggestionsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
              setSuggestionsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (!suggestionsOpen) setSuggestionsOpen(true);
                else
                  searchRef.current
                    ?.querySelector<HTMLButtonElement>(
                      ".following-suggestion-main",
                    )
                    ?.focus();
              }
            }}
          />
          {query && (
            <button
              type="button"
              aria-label={t("清空搜索", "Clear search")}
              onClick={() => {
                setQuery("");
                setPage(0);
                inputRef.current?.focus();
              }}
            >
              <X size={14} />
            </button>
          )}
        </label>
        {suggestionsOpen && (
          <div
            className="following-suggestions"
            id={suggestionsId}
            role="dialog"
            aria-label={t("推荐用户", "Suggested users")}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const rows = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  ".following-suggestion-main",
                ),
              );
              const current = rows.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (current < 0) return;
              event.preventDefault();
              rows[
                (current + (event.key === "ArrowDown" ? 1 : -1) + rows.length) %
                  rows.length
              ]?.focus();
            }}
          >
            <div className="following-suggestions-title">
              <span>
                {!needle
                  ? t("推荐关注", "Recommended")
                  : results.length
                    ? t("搜索结果", "Search results")
                    : t("你可能感兴趣", "People to discover")}
              </span>
              <button
                aria-label={t("收起推荐", "Close suggestions")}
                onClick={() => {
                  inputRef.current?.focus();
                  setSuggestionsOpen(false);
                }}
              >
                <X size={14} />
              </button>
            </div>
            {!!needle && !results.length && (
              <p className="following-no-match">
                {t(
                  "未找到相关用户，看看这些主播和作者",
                  "No matches. Explore these hosts and authors.",
                )}
              </p>
            )}
            <div className="following-suggestions-list">
              {suggestions.map(recommendationRow)}
            </div>
          </div>
        )}
      </div>
      <div
        className="following-group-tabs"
        role="tablist"
        aria-label={t("关注分组", "Follow groups")}
      >
        {[
          { id: "all", name: t("全部", "All"), count: following.length },
          {
            id: "ungrouped",
            name: t("未分组", "Ungrouped"),
            count: following.filter((id) => groupOf(id) === "ungrouped").length,
          },
          ...c.state.groups.map((g) => ({
            ...g,
            count: following.filter((id) => groupOf(id) === g.id).length,
          })),
        ].map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={selectedGroup === g.id}
            onClick={() => {
              setGroup(g.id);
              setPage(0);
              setSuggestionsOpen(false);
            }}
          >
            {g.name}
            <span>{g.count}</span>
          </button>
        ))}
      </div>
      <div
        className="following-results"
        role="tabpanel"
        aria-label={t("关注列表", "Following list")}
      >
        {list.slice(currentPage * 8, currentPage * 8 + 8).map((p) => (
          <div className="following-person-row" key={p.id}>
            <ProfileAvatar id={p.id} size="md" />
            <div className="following-person-main">
              <button
                className="following-person-name"
                onClick={() => openProfile(p.id)}
              >
                {personName(p, c.lang)}
              </button>
              <p>
                {label(c.lang, p.bio, p.bioEn) || t("暂无简介", "No bio yet")}
              </p>
              <div className="following-person-tags">
                <label className="following-group-select">
                  <Folder size={12} />
                  <select
                    aria-label={t(
                      `设置${p.name}的分组`,
                      `Set group for ${p.nameEn}`,
                    )}
                    value={c.state.memberGroups[p.id] || ""}
                    onChange={(event) =>
                      c.dispatch({
                        type: "group/assign",
                        userId: p.id,
                        groupId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">{t("未分组", "Ungrouped")}</option>
                    {c.state.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={10} />
                </label>
                {liveNow(p.id) && (
                  <span className="following-live-dot">
                    {t("正在直播", "Live now")}
                  </span>
                )}
              </div>
            </div>
            <FollowButton id={p.id} />
          </div>
        ))}
        {!list.length && (
          <>
            <div className="following-empty">
              <span>
                <Users size={28} strokeWidth={1.5} />
              </span>
              <h3>
                {needle
                  ? t("未找到已关注用户", "No matching followed users")
                  : !following.length
                    ? t("还没有关注用户", "No followed users yet")
                    : t("这个分组还没有用户", "This group is empty")}
              </h3>
              <button
                className="ui-btn ui-btn-soft"
                onClick={() => {
                  if (following.length && selectedGroup !== "all") {
                    setGroup("all");
                    setQuery("");
                  } else {
                    setQuery("");
                    inputRef.current?.focus();
                    setSuggestionsOpen(true);
                  }
                }}
              >
                {following.length && selectedGroup !== "all"
                  ? t("查看全部关注", "View all following")
                  : t("发现主播与作者", "Discover creators")}
              </button>
            </div>
            {!following.length && !needle && (
              <div className="following-empty-recommendations">
                <h3>{t("推荐关注", "Recommended")}</h3>
                {recommended.slice(0, 4).map(recommendationRow)}
              </div>
            )}
          </>
        )}
      </div>
      <CommunityPagination
        page={currentPage}
        count={list.length}
        onChange={setPage}
      />
      {managing && <GroupManager onClose={() => setManaging(false)} />}
    </div>
  );
}

function GroupManager({ onClose }: { onClose: () => void }) {
  const c = useCommunity(),
    t = (zh: string, en: string) => label(c.lang, zh, en);
  const [name, setName] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const reason = groupNameError(name, c.state.groups, editing || undefined);
    if (reason) {
      setError(
        reason === "empty"
          ? t("请输入分组名称", "Enter a group name")
          : reason === "duplicate"
            ? t(
                "该分组名称已存在或不可用",
                "This name already exists or is reserved",
              )
            : t(
                "分组名称最多 20 个字符，不能换行",
                "Use up to 20 characters on one line",
              ),
      );
      return;
    }
    if (editing && !c.state.groups.some((g) => g.id === editing)) {
      setEditing(null);
      setError(
        t(
          "该分组已被删除，请重新创建",
          "This group was deleted. Create a new group.",
        ),
      );
      return;
    }
    if (!editing && c.state.groups.length >= MAX_FOLLOW_GROUPS) {
      setError(
        t(
          `最多创建 ${MAX_FOLLOW_GROUPS} 个分组`,
          `Up to ${MAX_FOLLOW_GROUPS} groups`,
        ),
      );
      return;
    }
    c.dispatch({
      type: editing ? "group/rename" : "group/create",
      id: editing || uid(),
      name,
    });
    setName("");
    setEditing(null);
    setError("");
  };
  return (
    <LiveDialog
      title={t("管理分组", "Manage groups")}
      onClose={onClose}
      overlayClassName="community-overlay following-manager-overlay"
    >
      <div className="following-manager">
        <form onSubmit={submit}>
          <label htmlFor="follow-group-name">
            {editing
              ? t("重命名分组", "Rename group")
              : t("新建分组", "New group")}
          </label>
          <div>
            <input
              id="follow-group-name"
              ref={input}
              className="ui-input"
              value={name}
              maxLength={20}
              placeholder={t("输入分组名称", "Group name")}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
            />
            <button
              className="ui-btn ui-btn-primary"
              type="submit"
              disabled={!name.trim()}
            >
              {editing ? <Check size={14} /> : <Plus size={14} />}
              {editing ? t("保存", "Save") : t("创建", "Create")}
            </button>
          </div>
          {editing && (
            <button
              type="button"
              className="following-cancel-edit"
              onClick={() => {
                setEditing(null);
                setName("");
                setError("");
              }}
            >
              {t("取消重命名", "Cancel renaming")}
            </button>
          )}
          {error && (
            <p className="community-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="following-managed-groups">
          {c.state.groups.map((g) => (
            <div key={g.id}>
              <Folder size={16} />
              <span>
                <strong>{g.name}</strong>
                <small>
                  {
                    c.live.state.following.filter(
                      (id) => c.state.memberGroups[id] === g.id,
                    ).length
                  }{" "}
                  {t("人", "members")}
                </small>
              </span>
              <button
                aria-label={t(`重命名${g.name}`, `Rename ${g.name}`)}
                onClick={() => {
                  setEditing(g.id);
                  setName(g.name);
                  setError("");
                  input.current?.focus();
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                aria-label={t(`删除${g.name}`, `Delete ${g.name}`)}
                title={t(
                  "删除分组，成员移至未分组",
                  "Delete group and move members to Ungrouped",
                )}
                onClick={() => {
                  c.dispatch({ type: "group/delete", id: g.id });
                  if (editing === g.id) {
                    setEditing(null);
                    setName("");
                    setError("");
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <p className="following-group-note">
          {t(
            "删除分组后，成员移至未分组，关注关系保留。",
            "Deleting a group moves its members to Ungrouped and keeps them followed.",
          )}
        </p>
      </div>
    </LiveDialog>
  );
}
