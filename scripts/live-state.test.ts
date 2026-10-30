import assert from "node:assert/strict";
import test from "node:test";
import { activeGiftEvents } from "../src/components/live/giftEvents";
import { audienceMessage } from "../src/components/live/roomActivity";
import {
  nextPacketRainBoundary,
  packetRainAt,
} from "../src/components/live/packetRainTiming";
import {
  ME,
  reduceLive,
  seedLiveState,
  type LiveAction,
  type LiveState,
  type Packet,
} from "../src/components/live/liveState";

const now = 1700000000000;
const fresh = (): LiveState => ({
  ...seedLiveState(now),
  packets: [],
  ledger: [],
});
const run = (s: LiveState, a: LiveAction) => {
  const result = reduceLive(s, a);
  assert.equal(result.error, undefined);
  return result.state;
};
const packet = (overrides: Partial<Packet> = {}): Packet => ({
  id: "p-1",
  roomId: "global-desk",
  senderId: "chen",
  total: 1000,
  remaining: 1000,
  count: 10,
  remainingCount: 10,
  mode: "random",
  opensAt: now + 30000,
  expiresAt: now + 60000,
  claims: {},
  closed: false,
  title: "Gift",
  ...overrides,
});
const totalFunds = (s: LiveState) =>
  Object.values(s.wallets).reduce((a, b) => a + b, 0) +
  s.packets.reduce((a, p) => a + (p.closed ? 0 : p.remaining), 0);

test("legacy livestream data migrates without changing virtual funds or history", () => {
  const old = fresh();
  const legacy = {
    ...old,
    shared: ["global-desk"],
    experience: undefined,
  } as unknown as LiveState;
  const next = run(legacy, { type: "x/preference", cleanMode: true });
  assert.deepEqual(next.wallets, old.wallets);
  assert.deepEqual(next.messages, old.messages);
  assert.equal(next.experience.cleanMode, true);
  assert.ok(next.experience.rooms["global-desk"]);
  assert.deepEqual(next.shared, []);
});

test("strategies retain flat revision history, trigger from prices and expire", () => {
  const v = {
    symbol: "XAU/USD",
    side: "buy" as const,
    entry: 100,
    target: 110,
    stop: 90,
    note: "Wait for confirmation",
    trigger: "above" as const,
    expiresAt: now + 60000,
  };
  let s = run(fresh(), {
    type: "x/strategy",
    roomId: "global-desk",
    actor: "chen",
    id: "plan-a",
    values: v,
    at: now,
  });
  s = run(s, {
    type: "x/strategy",
    roomId: "global-desk",
    actor: "chen",
    id: "plan-a",
    values: { ...v, entry: 101 },
    at: now + 1,
  });
  s = run(s, {
    type: "x/strategy",
    roomId: "global-desk",
    actor: "chen",
    id: "plan-a",
    values: { ...v, entry: 102 },
    at: now + 2,
  });
  const history = s.experience.rooms["global-desk"].strategies[0].revisions;
  assert.equal(history.length, 2);
  assert.equal(history[0].entry, 100);
  assert.equal("revisions" in history[1], false);
  s = run(s, { type: "x/tick", at: now + 100, prices: { "XAU/USD": 103 } });
  assert.equal(
    s.experience.rooms["global-desk"].strategies[0].status,
    "triggered",
  );
  s = run(s, { type: "x/tick", at: now + 60001 });
  assert.equal(
    s.experience.rooms["global-desk"].strategies[0].status,
    "expired",
  );
  assert.equal(
    reduceLive(s, {
      type: "x/strategy",
      roomId: "global-desk",
      actor: "chen",
      id: "bad-plan",
      values: { ...v, stop: 120 },
      at: now,
    }).error,
    "invalid",
  );
  assert.equal(
    reduceLive(s, {
      type: "x/strategy",
      roomId: "global-desk",
      actor: ME,
      id: "bad-actor",
      values: v,
      at: now,
    }).error,
    "invalid",
  );
});

test("Q&A merges duplicate votes and shows only one on-air question", () => {
  let s = fresh();
  for (const id of ["q1", "q2"]) {
    s = run(s, {
      type: "x/question",
      roomId: "global-desk",
      id,
      text: "What confirms a breakout?",
      at: now,
    });
    s = run(s, { type: "x/upvote", roomId: "global-desk", id });
    s = run(s, {
      type: "x/answer",
      roomId: "global-desk",
      actor: "chen",
      id,
      status: "answering",
      at: now,
    });
  }
  assert.equal(
    s.experience.rooms["global-desk"].questions.filter(
      (q) => q.status === "answering",
    ).length,
    1,
  );
  s = run(s, {
    type: "x/mergeQuestion",
    roomId: "global-desk",
    actor: "chen",
    id: "q1",
    into: "q2",
  });
  assert.equal(
    s.experience.rooms["global-desk"].questions.find((q) => q.id === "q1")
      ?.mergedInto,
    "q2",
  );
  assert.deepEqual(
    s.experience.rooms["global-desk"].questions.find((q) => q.id === "q2")
      ?.votes,
    [ME],
  );
  s = run(s, {
    type: "x/answer",
    roomId: "global-desk",
    actor: "chen",
    id: "q2",
    status: "answered",
    answer: "Check volume and the closing price.",
    at: now + 1,
  });
  assert.equal(
    s.experience.rooms["global-desk"].questions.find((q) => q.id === "q2")
      ?.answer,
    "Check volume and the closing price.",
  );
  assert.equal(
    reduceLive(s, {
      type: "x/question",
      roomId: "global-desk",
      id: "spam",
      text: "稳赚不赔",
      at: now,
    }).error,
    "muted",
  );
});

test("polls accept one response per viewer and reject votes at the deadline", () => {
  const at = Date.now(),
    poll = {
      id: "quiz",
      title: "Which order limits a loss?",
      options: ["Stop loss", "Take profit"],
      kind: "quiz" as const,
      correct: 0,
      explanation: "A stop loss manages downside.",
      votes: {},
      endsAt: at + 30000,
      closed: false,
    };
  let s = run(fresh(), {
    type: "x/poll",
    roomId: "global-desk",
    actor: "chen",
    poll,
  });
  const funds = { ...s.wallets };
  s = run(s, {
    type: "x/vote",
    roomId: "global-desk",
    id: "quiz",
    option: 0,
    at,
  });
  assert.equal(
    reduceLive(s, {
      type: "x/vote",
      roomId: "global-desk",
      id: "quiz",
      option: 1,
      at,
    }).error,
    "invalid",
  );
  assert.equal(
    reduceLive(s, {
      type: "x/vote",
      roomId: "global-desk",
      id: "quiz",
      option: 1,
      at: poll.endsAt,
    }).error,
    "closed",
  );
  s = run(s, { type: "x/tick", at: poll.endsAt });
  assert.equal(s.experience.rooms["global-desk"].polls[0].closed, true);
  assert.deepEqual(s.wallets, funds);
});

test("reservations deduplicate reminders and notify schedule changes and cancellation", () => {
  let s = fresh();
  let room = {
    ...s.rooms.find((r) => r.id === "asia-open")!,
    startsAt: now + 60000,
  };
  s = run(s, { type: "room", room });
  s = run(s, { type: "x/reminder", roomId: room.id, minutes: 5 });
  s = run(s, { type: "x/tick", at: now });
  const n = s.experience.notices.length;
  s = run(s, { type: "x/tick", at: now + 1000 });
  assert.equal(s.experience.notices.length, n);
  room = { ...room, startsAt: now + 3600000 };
  s = run(s, { type: "room", room });
  assert.match(s.experience.notices[0].text, /调整/);
  s = run(s, {
    type: "room",
    room: { ...room, status: "ended", cancelled: true, endedAt: now + 5000 },
  });
  assert.match(s.experience.notices[0].text, /取消/);
  assert.equal(s.experience.rooms[room.id].replay.recording, false);
  assert.equal(s.experience.rooms[room.id].replay.publication, "draft");
});

test("replays require host review and preserve private notes and playback position", () => {
  let s = fresh();
  const room = s.rooms.find((r) => r.id === "global-desk")!;
  s = run(s, {
    type: "room",
    room: { ...room, status: "ended", endedAt: now },
  });
  const publish = {
    type: "x/replay" as const,
    roomId: room.id,
    actor: "chen",
    changes: { publication: "published" as const },
    at: now,
  };
  assert.equal(reduceLive(s, publish).error, "invalid");
  s = run(s, {
    type: "x/replay",
    roomId: room.id,
    actor: "chen",
    changes: {
      summary: "Gold session recap",
      summaryApproved: true,
      visibility: "link",
    },
    at: now,
  });
  s = run(s, publish);
  assert.equal(s.experience.rooms[room.id].replay.publication, "published");
  assert.equal(s.experience.rooms[room.id].replay.visibility, "link");
  s = run(s, { type: "x/progress", roomId: room.id, second: 12, duration: 36 });
  s = run(s, {
    type: "x/note",
    roomId: room.id,
    id: "note",
    text: "Check volume",
    second: 12,
  });
  assert.equal(s.experience.rooms[room.id].replay.position, 12);
  assert.equal(s.experience.rooms[room.id].replay.notes[0].second, 12);
  assert.equal(
    reduceLive(s, {
      type: "x/progress",
      roomId: room.id,
      second: NaN,
      duration: 36,
    }).error,
    "invalid",
  );
  s = run(s, {
    type: "x/replay",
    roomId: room.id,
    actor: "chen",
    changes: { summaryApproved: false, publication: "draft" },
    at: now,
  });
  assert.equal(s.experience.rooms[room.id].replay.publication, "draft");
});

test("moderators can remove reported messages but cannot publish strategies or change settings", () => {
  let s = fresh();
  const message = s.messages["global-desk"].find((m) => m.userId !== ME)!;
  s = run(s, {
    type: "x/report",
    roomId: "global-desk",
    id: "report-1",
    messageId: message.id,
    reason: "Spam",
    at: now,
  });
  assert.equal(
    reduceLive(s, {
      type: "x/moderate",
      roomId: "global-desk",
      actor: ME,
      messageId: message.id,
      remove: true,
      at: now,
    }).error,
    "invalid",
  );
  s = run(s, {
    type: "x/settings",
    roomId: "global-desk",
    actor: "chen",
    moderators: [ME],
    slowSeconds: 10,
    at: now,
  });
  assert.equal(
    reduceLive(s, {
      type: "x/settings",
      roomId: "global-desk",
      actor: ME,
      slowSeconds: 0,
      at: now,
    }).error,
    "invalid",
  );
  s = run(s, {
    type: "pinMessage",
    roomId: "global-desk",
    actor: ME,
    messageId: message.id,
  });
  s = run(s, {
    type: "x/moderate",
    roomId: "global-desk",
    actor: ME,
    reportId: "report-1",
    remove: true,
    at: now,
  });
  assert.equal(
    s.messages["global-desk"].some((m) => m.id === message.id),
    false,
  );
  assert.equal(s.pinnedMessage["global-desk"], "");
  assert.equal(s.experience.rooms["global-desk"].reports[0].status, "removed");
  assert.ok(s.experience.rooms["global-desk"].audit.length >= 3);
});

test("slow mode enforces time between viewer messages while allowing hosts", () => {
  let s = run(fresh(), {
    type: "x/settings",
    roomId: "global-desk",
    actor: "chen",
    slowSeconds: 10,
    at: now,
  });
  const msg = {
    id: "slow-1",
    userId: ME,
    name: "Alpha Trader",
    nameEn: "Alpha Trader",
    text: "Hello",
    at: now,
    kind: "chat" as const,
  };
  s = run(s, { type: "chat", roomId: "global-desk", message: msg });
  assert.equal(
    reduceLive(s, {
      type: "chat",
      roomId: "global-desk",
      message: { ...msg, id: "slow-2", at: now + 1000 },
    }).error,
    "muted",
  );
  s = run(s, {
    type: "chat",
    roomId: "global-desk",
    message: { ...msg, id: "slow-3", at: now + 10000 },
  });
  s = run(s, {
    type: "chat",
    roomId: "global-desk",
    message: {
      ...msg,
      id: "host-1",
      userId: "chen",
      kind: "host",
      at: now + 10001,
    },
  });
  assert.equal(s.messages["global-desk"].at(-1)?.id, "host-1");
});

test("sharing is limited to one room, preserves join time, and clears on session end", () => {
  let s = run(fresh(), {
    type: "x/share",
    roomId: "global-desk",
    scope: "new",
    at: now,
  });
  s = run(s, {
    type: "x/share",
    roomId: "global-desk",
    scope: "all",
    at: now + 100,
  });
  assert.equal(s.experience.sharing["global-desk"].since, now);
  s = run(s, { type: "x/preference", floatingRoom: "global-desk" });
  const room = s.rooms.find((r) => r.id === "global-desk")!;
  s = run(s, {
    type: "room",
    room: { ...room, status: "ended", endedAt: now + 1000 },
  });
  assert.deepEqual(s.shared, []);
  assert.equal(s.experience.sharing["global-desk"], undefined);
  assert.equal(s.experience.floatingRoom, null);
});

test("leaving a viewer room clears consent unless its floating player remains open", () => {
  let s = run(fresh(), {
    type: "x/share",
    roomId: "global-desk",
    scope: "new",
    at: now,
  });
  s = run(s, { type: "x/preference", floatingRoom: "global-desk" });
  s = run(s, { type: "x/leave", roomId: "global-desk", allowFloating: true });
  assert.deepEqual(s.shared, ["global-desk"]);
  s = run(s, { type: "x/leave", roomId: "global-desk", allowFloating: false });
  assert.deepEqual(s.shared, []);
  assert.equal(s.experience.floatingRoom, null);
  assert.deepEqual(s.experience.sharing, {});
});

test("analytics deduplicate a visit and count active watch time and order actions", () => {
  let s = fresh();
  const before = s.experience.rooms["global-desk"].metrics;
  const visit = {
    type: "x/metric" as const,
    roomId: "global-desk",
    kind: "visit" as const,
    id: "visit-1",
    at: now,
  };
  s = run(s, visit);
  s = run(s, visit);
  s = run(s, { ...visit, kind: "watch", seconds: 10 });
  s = run(s, { ...visit, kind: "click" });
  s = run(s, { ...visit, kind: "order" });
  const m = s.experience.rooms["global-desk"].metrics;
  assert.equal(m.viewers, before.viewers + 1);
  assert.equal(m.watchSeconds, before.watchSeconds + 10);
  assert.equal(m.clicks, before.clicks + 1);
  assert.equal(m.orders, before.orders + 1);
});

test("the welcome packet is funded by the host with an opening receipt", () => {
  const state = seedLiveState(now);
  assert.equal(totalFunds(state), 1100000);
  assert.equal(state.wallets.chen, 248000);
  assert.equal(state.ledger[0].amount, -2000);
});

test("gift payment transfers exactly once and updates contributions with receipts", () => {
  const before = fresh(),
    action: LiveAction = {
      type: "gift",
      roomId: "global-desk",
      giftId: "star",
      qty: 3,
      id: "gift-1",
      at: now,
    };
  const next = run(before, action);
  assert.equal(next.wallets[ME], before.wallets[ME] - 2970);
  assert.equal(next.wallets.chen, before.wallets.chen + 2970);
  assert.equal(next.gifts["global-desk"][ME], 2970);
  assert.equal(next.ledger.length, 2);
  assert.equal(totalFunds(next), totalFunds(before));
  assert.equal(reduceLive(next, action).state, next);
});
test("insufficient funds, invalid quantities and ended rooms cannot charge a viewer", () => {
  const state = fresh();
  for (const qty of [0, -1, 0.5, 100, NaN])
    assert.equal(
      reduceLive(state, {
        type: "gift",
        roomId: "global-desk",
        giftId: "heart",
        qty,
        id: "bad",
        at: now,
      }).state,
      state,
    );
  assert.equal(
    reduceLive(state, {
      type: "gift",
      roomId: "global-desk",
      giftId: "rocket",
      qty: 99,
      id: "expensive",
      at: now,
    }).error,
    "funds",
  );
  assert.equal(
    reduceLive(state, {
      type: "gift",
      roomId: "crypto-week",
      giftId: "heart",
      qty: 1,
      id: "ended",
      at: now,
    }).error,
    "closed",
  );
  assert.equal(state.ledger.length, 0);
});
test("packet countdown, single claim and expiry conserve virtual funds", () => {
  const before = fresh();
  let state = run(before, { type: "packet", packet: packet(), at: now });
  assert.equal(state.wallets.chen, before.wallets.chen - 1000);
  assert.equal(
    reduceLive(state, { type: "claim", id: "p-1", at: now + 1000, random: 0.5 })
      .error,
    "early",
  );
  state = run(state, {
    type: "claim",
    id: "p-1",
    at: now + 30000,
    random: 0.5,
  });
  const claimed = state.packets[0].claims[ME];
  assert.ok(Number.isInteger(claimed) && claimed > 0);
  assert.equal(state.wallets[ME], before.wallets[ME] + claimed);
  assert.equal(
    reduceLive(state, {
      type: "claim",
      id: "p-1",
      at: now + 31000,
      random: 0.2,
    }).error,
    "claimed",
  );
  assert.equal(totalFunds(state), totalFunds(before));
  state = run(state, { type: "expire", at: now + 60001 });
  assert.equal(state.wallets.chen, before.wallets.chen - claimed);
  assert.equal(state.packets[0].remaining, 0);
  assert.equal(totalFunds(state), totalFunds(before));
  assert.equal(run(state, { type: "expire", at: now + 100000 }), state);
});
test("equal packets and last recipient get exact cents; exhausted packets are closed", () => {
  const start = fresh();
  let state = run(start, {
    type: "packet",
    packet: packet({ mode: "equal", count: 1, total: 123, opensAt: now }),
    at: now,
  });
  state = run(state, { type: "claim", id: "p-1", at: now, random: 0.99 });
  assert.equal(state.packets[0].claims[ME], 123);
  assert.equal(state.packets[0].remaining, 0);
  assert.equal(
    reduceLive(start, {
      type: "packet",
      packet: packet({ mode: "equal", total: 101, count: 3 }),
      at: now,
    }).error,
    "invalid",
  );
});
test("packet input rejects negative budgets and unowned senders", () => {
  for (const change of [
    { total: -1 },
    { count: 0 },
    { count: 101 },
    { total: 2, count: 3 },
    { total: 100000000 },
    { senderId: ME },
  ]) {
    const state = fresh();
    assert.equal(
      reduceLive(state, { type: "packet", packet: packet(change), at: now })
        .state,
      state,
    );
  }
});
test("viewer request appears in host review and cancellation/rejection keep seats clean", () => {
  let state = run(fresh(), {
    type: "mic",
    roomId: "global-desk",
    request: {
      userId: ME,
      name: "Trader",
      nameEn: "Trader",
      status: "pending",
      at: now,
    },
  });
  state = run(state, {
    type: "reviewMic",
    roomId: "global-desk",
    userId: ME,
    accept: true,
  });
  assert.ok(state.seats["global-desk"].some((s) => s.userId === ME));
  assert.equal(
    state.requests["global-desk"].find((r) => r.userId === ME)?.status,
    "accepted",
  );
  assert.equal(
    reduceLive(state, {
      type: "reviewMic",
      roomId: "global-desk",
      userId: ME,
      accept: true,
    }).error,
    "invalid",
  );
  state = run(state, { type: "toggleMic", roomId: "global-desk", userId: ME });
  assert.equal(
    state.seats["global-desk"].find((s) => s.userId === ME)?.muted,
    true,
  );
  state = run(state, { type: "leaveMic", roomId: "global-desk", userId: ME });
  assert.ok(!state.seats["global-desk"].some((s) => s.userId === ME));
  assert.ok(!state.requests["global-desk"].some((s) => s.userId === ME));
});
test("moderation blocks audience but allows the host; literal punctuation in keywords is safe", () => {
  let state = fresh();
  const message = {
    id: "m",
    userId: ME,
    name: "Trader",
    nameEn: "Trader",
    text: "a+b [x]",
    at: now,
    kind: "chat" as const,
  };
  state = run(state, {
    type: "keyword",
    roomId: "global-desk",
    words: ["a+b", "[x]"],
  });
  state = run(state, { type: "chat", roomId: "global-desk", message });
  assert.equal(state.messages["global-desk"].at(-1)?.text, "*** ***");
  state = run(state, {
    type: "room",
    room: { ...state.rooms[0], chatPermission: "followers" },
  });
  assert.equal(
    reduceLive(state, { type: "chat", roomId: "global-desk", message }).error,
    "followers",
  );
  state = run(state, { type: "follow", id: "chen" });
  state = run(state, { type: "chat", roomId: "global-desk", message });
  state = run(state, {
    type: "mute",
    roomId: "global-desk",
    userId: ME,
    until: now + 10000,
  });
  assert.equal(
    reduceLive(state, { type: "chat", roomId: "global-desk", message }).error,
    "muted",
  );
  state = run(state, {
    type: "room",
    room: { ...state.rooms[0], chatPermission: "closed" },
  });
  state = run(state, {
    type: "chat",
    roomId: "global-desk",
    message: { ...message, id: "host-post", userId: "chen", kind: "host" },
  });
  assert.equal(state.messages["global-desk"].at(-1)?.kind, "host");
});
test("ending a room clears speaker requests and connections but retains records", () => {
  const before = fresh();
  const state = run(before, {
    type: "room",
    room: { ...before.rooms[0], status: "ended", endedAt: now },
  });
  assert.deepEqual(state.seats["global-desk"], []);
  assert.deepEqual(state.requests["global-desk"], []);
  assert.deepEqual(state.messages, before.messages);
  assert.equal(
    reduceLive(state, {
      type: "mic",
      roomId: "global-desk",
      request: {
        userId: ME,
        name: "T",
        nameEn: "T",
        status: "pending",
        at: now,
      },
    }).error,
    "closed",
  );
});

test("10 and 20 second packets reject early claims and open exactly at the deadline", () => {
  for (const seconds of [10, 20]) {
    const opensAt = now + seconds * 1000;
    const state = run(fresh(), {
      type: "packet",
      packet: packet({ opensAt }),
      at: now,
    });
    assert.equal(
      reduceLive(state, {
        type: "claim",
        id: "p-1",
        at: opensAt - 1,
        random: 0.5,
      }).error,
      "early",
    );
    assert.equal(
      reduceLive(state, { type: "claim", id: "p-1", at: opensAt, random: 0.5 })
        .error,
      undefined,
    );
  }
});

test("packet rain covers only the final ten seconds before opening", () => {
  const p = packet({ opensAt: now + 20000 });
  assert.deepEqual(packetRainAt([p], "global-desk", now + 9999), []);
  assert.equal(nextPacketRainBoundary([p], "global-desk", now), now + 10000);
  assert.equal(packetRainAt([p], "global-desk", now + 10000).length, 1);
  assert.equal(
    nextPacketRainBoundary([p], "global-desk", now + 10000),
    now + 20000,
  );
  assert.equal(packetRainAt([p], "global-desk", now + 19999).length, 1);
  assert.deepEqual(packetRainAt([p], "global-desk", now + 20000), []);
  assert.equal(nextPacketRainBoundary([p], "global-desk", now + 20000), null);
  assert.equal(
    packetRainAt([packet({ opensAt: now + 10000 })], "global-desk", now).length,
    1,
  );
  assert.deepEqual(
    packetRainAt([packet({ opensAt: now })], "global-desk", now),
    [],
  );
});

test("rain ignores other rooms, closed packets and expired openings", () => {
  const p = packet({ opensAt: now + 10000 });
  assert.deepEqual(packetRainAt([p], "crypto-desk", now), []);
  assert.deepEqual(
    packetRainAt([{ ...p, closed: true }], "global-desk", now),
    [],
  );
  assert.deepEqual(
    packetRainAt([{ ...p, expiresAt: now }], "global-desk", now),
    [],
  );
  assert.equal(
    nextPacketRainBoundary([{ ...p, closed: true }], "global-desk", now),
    null,
  );
});

test("a gift creates one shared chat receipt and an animation lasting three seconds", () => {
  const action: LiveAction = {
    type: "gift",
    roomId: "global-desk",
    giftId: "rose",
    qty: 5,
    id: "gift-animation",
    at: now,
  };
  const state = run(fresh(), action);
  const messages = state.messages["global-desk"];
  const receipt = messages.at(-1)!;
  assert.equal(receipt.kind, "gift");
  assert.equal(receipt.giftQty, 5);
  assert.equal(receipt.text, "送出 鲜花 × 5");
  assert.deepEqual(activeGiftEvents(messages, now - 1), []);
  assert.equal(activeGiftEvents(messages, now).length, 1);
  assert.equal(activeGiftEvents(messages, now + 2999).length, 1);
  assert.deepEqual(activeGiftEvents(messages, now + 3000), []);
  assert.equal(
    reduceLive(state, action).state.messages["global-desk"].length,
    messages.length,
  );
  assert.deepEqual(
    activeGiftEvents(state.messages["crypto-desk"] || [], now),
    [],
  );
});

test("audience activity varies, deduplicates across perspectives and respects moderation", () => {
  let state = fresh();
  const room = state.rooms[0];
  const first = audienceMessage(room, now);
  const second = audienceMessage(room, now + 2200);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.userId, second.userId);
  assert.notEqual(first.text, second.text);
  const action: LiveAction = { type: "chat", roomId: room.id, message: first };
  state = run(state, action);
  assert.equal(run(state, action), state);
  const length = state.messages[room.id].length;
  state = run(state, {
    type: "mute",
    roomId: room.id,
    userId: second.userId,
    until: now + 60000,
  });
  assert.equal(
    reduceLive(state, { type: "chat", roomId: room.id, message: second }).error,
    "muted",
  );
  state = run(state, {
    type: "room",
    room: { ...room, chatPermission: "closed" },
  });
  assert.equal(
    reduceLive(state, {
      type: "chat",
      roomId: room.id,
      message: audienceMessage(room, now + 4500),
    }).error,
    "muted",
  );
  assert.equal(state.messages[room.id].length, length);
});
