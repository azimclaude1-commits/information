import test from "node:test";
import assert from "node:assert/strict";
import {
  commentCount,
  hydrateCommunity,
  reduceCommunity,
  seedCommunity,
  authorId,
  MAX_FOLLOW_GROUPS,
} from "../src/components/community/communityState";
import {
  ME,
  reduceLive,
  seedLiveState,
} from "../src/components/live/liveState";

test("legacy comments migrate once and retain deletion tombstones", () => {
  const legacy = { "etf-defi": ["原来的评论", "另一条观点"] };
  const state = hydrateCommunity(null, legacy);
  assert.equal(
    state.comments.filter((c) => c.id.startsWith("legacy:")).length,
    2,
  );
  assert.equal(
    state.comments.find((c) => c.id === "legacy:etf-defi:0")?.userId,
    ME,
  );
  const deleted = reduceCommunity(state, {
    type: "delete",
    id: "legacy:etf-defi:0",
  });
  const restored = hydrateCommunity(
    JSON.parse(JSON.stringify(deleted)),
    legacy,
  );
  assert.equal(restored.comments.length, state.comments.length);
  assert.equal(
    restored.comments.find((c) => c.id === "legacy:etf-defi:0")?.text,
    "",
  );
});

test("posting is isolated by article and rejects empty, long and duplicate submissions", () => {
  const state = seedCommunity();
  const action = {
    type: "add" as const,
    id: "new-comment",
    postId: "article:yield-curve",
    text: "  对比后续数据  ",
    at: Date.now(),
  };
  const next = reduceCommunity(state, action);
  assert.equal(
    commentCount(next, action.postId),
    commentCount(state, action.postId) + 1,
  );
  assert.equal(
    commentCount(next, "flash:etf-defi"),
    commentCount(state, "flash:etf-defi"),
  );
  assert.equal(next.comments.at(-1)?.text, "对比后续数据");
  assert.equal(reduceCommunity(next, action), next);
  assert.equal(reduceCommunity(state, { ...action, text: "  " }), state);
  assert.equal(
    reduceCommunity(state, { ...action, text: "a".repeat(501) }),
    state,
  );
  assert.equal(reduceCommunity(state, { ...action, postId: "invalid" }), state);
});

test("replies stay in their thread and cannot target another article or a deleted comment", () => {
  const state = seedCommunity(),
    root = state.comments[0];
  const action = {
    type: "add" as const,
    id: "reply",
    postId: root.postId,
    text: "同意，继续跟踪。",
    at: Date.now(),
    replyId: root.id,
  };
  const next = reduceCommunity(state, action);
  assert.equal(next.comments.at(-1)?.parentId, root.id);
  assert.equal(next.comments.at(-1)?.replyTo, root.userId);
  const nested = reduceCommunity(next, {
    ...action,
    id: "nested",
    replyId: "reply",
  });
  assert.equal(nested.comments.at(-1)?.parentId, root.id);
  assert.equal(nested.comments.at(-1)?.replyTo, ME);
  assert.equal(
    reduceCommunity(next, {
      ...action,
      id: "wrong",
      postId: "article:yield-curve",
    }),
    next,
  );
  const deleted = reduceCommunity(next, { type: "delete", id: "reply" });
  assert.equal(
    reduceCommunity(deleted, { ...action, id: "gone", replyId: "reply" }),
    deleted,
  );
});

test("likes toggle once, only owned comments can be deleted, replies survive root deletion", () => {
  const state = seedCommunity(),
    comment = state.comments[0];
  const liked = reduceCommunity(state, { type: "like", id: comment.id });
  assert.equal(liked.comments[0].liked, true);
  assert.equal(
    reduceCommunity(liked, { type: "like", id: comment.id }).comments[0].liked,
    false,
  );
  assert.equal(
    reduceCommunity(state, { type: "delete", id: comment.id }).comments[0]
      .deleted,
    undefined,
  );
  const own = reduceCommunity(state, {
    type: "add",
    id: "mine",
    postId: comment.postId,
    text: "观点",
    at: Date.now(),
  });
  const replied = reduceCommunity(own, {
    type: "add",
    id: "child",
    postId: comment.postId,
    text: "补充",
    at: Date.now(),
    replyId: "mine",
  });
  const deleted = reduceCommunity(replied, { type: "delete", id: "mine" });
  assert.equal(
    commentCount(deleted, comment.postId),
    commentCount(state, comment.postId) + 1,
  );
  assert.equal(deleted.comments.find((c) => c.id === "child")?.text, "补充");
});

test("news authors and live creators share the same follow list", () => {
  const state = seedLiveState(),
    id = authorId("研究编辑部");
  const followed = reduceLive(state, { type: "follow", id }).state;
  assert.ok(followed.following.includes(id));
  assert.ok(followed.following.includes("lin"));
  assert.ok(
    !reduceLive(followed, { type: "follow", id }).state.following.includes(id),
  );
});

test("existing community data gains groups without changing comments or restoring deleted groups", () => {
  const seed = seedCommunity();
  const migrated = hydrateCommunity({ version: 1, comments: seed.comments });
  assert.deepEqual(migrated.comments, seed.comments);
  assert.equal(migrated.groups.length, 3);
  assert.deepEqual(migrated.memberGroups, {});
  assert.deepEqual(hydrateCommunity({ ...migrated, groups: [] }).groups, []);
});

test("group names are trimmed and reject duplicates, reserved names and excessive lengths", () => {
  const seed = seedCommunity();
  const created = reduceCommunity(seed, {
    type: "group/create",
    id: "macro",
    name: "  宏观观察  ",
  });
  assert.equal(created.groups.at(-1)?.name, "宏观观察");
  for (const name of [
    "",
    "   ",
    "全部",
    "Ungrouped",
    "宏观观察",
    "a".repeat(21),
  ]) {
    assert.equal(
      reduceCommunity(created, { type: "group/create", id: "bad", name }),
      created,
    );
  }
  assert.equal(
    reduceCommunity(created, {
      type: "group/create",
      id: "macro",
      name: "新名称",
    }),
    created,
  );
  assert.equal(
    reduceCommunity(created, {
      type: "group/rename",
      id: "macro",
      name: "交易主播",
    }),
    created,
  );
  assert.equal(
    reduceCommunity(created, {
      type: "group/rename",
      id: "missing",
      name: "观察名单",
    }),
    created,
  );
});

test("members move between groups and group renaming retains membership", () => {
  const seed = seedCommunity();
  const assigned = reduceCommunity(seed, {
    type: "group/assign",
    userId: "lin",
    groupId: "creators",
  });
  const moved = reduceCommunity(assigned, {
    type: "group/assign",
    userId: "lin",
    groupId: "favorites",
  });
  assert.equal(moved.memberGroups.lin, "favorites");
  const renamed = reduceCommunity(moved, {
    type: "group/rename",
    id: "favorites",
    name: "重点关注",
  });
  assert.equal(renamed.memberGroups.lin, "favorites");
  assert.equal(
    reduceCommunity(renamed, {
      type: "group/assign",
      userId: "lin",
      groupId: "missing",
    }),
    renamed,
  );
  assert.equal(
    reduceCommunity(renamed, {
      type: "group/assign",
      userId: ME,
      groupId: "favorites",
    }),
    renamed,
  );
  assert.deepEqual(
    reduceCommunity(renamed, {
      type: "group/assign",
      userId: "lin",
      groupId: null,
    }).memberGroups,
    {},
  );
});

test("deleting a group unassigns its members while preserving other memberships and comments", () => {
  let state = seedCommunity();
  state = reduceCommunity(state, {
    type: "group/assign",
    userId: "lin",
    groupId: "creators",
  });
  state = reduceCommunity(state, {
    type: "group/assign",
    userId: "chen",
    groupId: "favorites",
  });
  const removed = reduceCommunity(state, {
    type: "group/delete",
    id: "creators",
  });
  assert.equal(removed.memberGroups.lin, undefined);
  assert.equal(removed.memberGroups.chen, "favorites");
  assert.deepEqual(removed.comments, state.comments);
  const restored = hydrateCommunity(JSON.parse(JSON.stringify(removed)));
  assert.deepEqual(restored, removed);
  assert.ok(!restored.groups.some((g) => g.id === "creators"));
});

test("group hydration drops dangling memberships and creation observes the group limit", () => {
  let state = seedCommunity();
  for (let i = state.groups.length; i < MAX_FOLLOW_GROUPS; i++)
    state = reduceCommunity(state, {
      type: "group/create",
      id: `group-${i}`,
      name: `分组${i}`,
    });
  assert.equal(state.groups.length, MAX_FOLLOW_GROUPS);
  assert.equal(
    reduceCommunity(state, {
      type: "group/create",
      id: "extra",
      name: "额外分组",
    }),
    state,
  );
  const loaded = hydrateCommunity({
    ...state,
    memberGroups: { lin: "missing", chen: "favorites", [ME]: "favorites" },
  });
  assert.deepEqual(loaded.memberGroups, { chen: "favorites" });
});
