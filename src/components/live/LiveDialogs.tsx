import React, { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Copy,
  Gift,
  ImagePlus,
  Radio,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  DateLabel,
  EmptyState,
  LiveDialog,
  useNow,
} from "./LiveShared";
import {
  CATEGORIES,
  GIFTS,
  CURRENT_CREATOR,
  ME,
  VIEWER,
  label,
  money,
  personName,
  uid,
  type Lang,
  type LiveRoom,
  type Packet,
  type StageMode,
} from "./liveState";
import { navigateLive, navigateStudio, type LiveStore } from "./useLive";

type Common = { store: LiveStore; lang: Lang; onClose: () => void };
export function GiftDialog({
  store,
  lang,
  room,
  onClose,
}: Common & { room: LiveRoom }) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [selected, setSelected] = useState(GIFTS[0].id),
    [qty, setQty] = useState("1"),
    [confirm, setConfirm] = useState(false);
  const gift = GIFTS.find((g) => g.id === selected)!,
    quantity = Number(qty),
    valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 99;
  const cost = gift.cents * quantity,
    balance = store.state.wallets[ME] || 0;
  return (
    <LiveDialog
      title={
        confirm ? t("确认送出", "Confirm gift") : t("送礼物", "Send a gift")
      }
      onClose={onClose}
    >
      <div className="live-recipient">
        <Avatar profile={room.host} />
        <div>
          <span>{t("送给", "To")}</span>
          <strong>{personName(room.host, lang)}</strong>
        </div>
        <span className="live-virtual-tag">
          {t("虚拟 USDT", "Virtual USDT")}
        </span>
      </div>
      {!confirm ? (
        <>
          <div className="live-gift-grid">
            {GIFTS.map((g) => (
              <button
                key={g.id}
                aria-pressed={selected === g.id}
                onClick={() => setSelected(g.id)}
              >
                <span>{g.icon}</span>
                <strong>{t(g.zh, g.en)}</strong>
                <small>{money(g.cents)}</small>
              </button>
            ))}
          </div>
          <div className="live-quantity">
            <span>{t("数量", "Quantity")}</span>
            <div>
              {[1, 5, 10].map((q) => (
                <button
                  key={q}
                  aria-pressed={quantity === q}
                  onClick={() => setQty(String(q))}
                >
                  {q}
                </button>
              ))}
              <input
                aria-label={t("礼物数量", "Gift quantity")}
                type="number"
                min="1"
                max="99"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="live-gift-confirm">
          <span>{gift.icon}</span>
          <h3>
            {t(gift.zh, gift.en)} × {quantity}
          </h3>
          <strong>
            {money(cost)} <small>USDT</small>
          </strong>
        </div>
      )}
      <div className="live-checkout">
        <span>{t("直播余额", "Live balance")}</span>
        <strong>{money(balance)} USDT</strong>
      </div>
      {valid && cost > balance && (
        <p className="live-form-error">
          {t(
            "余额不足，请选择其他礼物或调整数量",
            "Insufficient balance. Choose another gift or quantity.",
          )}
        </p>
      )}
      <div className="live-dialog-actions">
        {confirm && (
          <button className="ui-btn" onClick={() => setConfirm(false)}>
            <ChevronLeft size={14} />
            {t("返回", "Back")}
          </button>
        )}
        <button
          className="ui-btn ui-btn-primary"
          disabled={!valid || cost > balance || room.status !== "live"}
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            if (
              store.dispatch({
                type: "gift",
                roomId: room.id,
                giftId: selected,
                qty: quantity,
                id: uid(),
                at: Date.now(),
              })
            ) {
              onClose();
            }
          }}
        >
          <Gift size={16} />
          {confirm
            ? t("确认送出", "Confirm & send")
            : `${t("送出", "Send")} · ${valid ? money(cost) : "—"} USDT`}
        </button>
      </div>
    </LiveDialog>
  );
}

export function WalletDialog({
  store,
  lang,
  onClose,
  userId = ME,
}: Common & { userId?: string }) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const all = store.state.ledger.filter((l) => l.userId === userId);
  const [filter, setFilter] = useState<"all" | "gift" | "packet" | "refund">("all");
  const matches = (kind: string) =>
    filter === "all" ||
    (filter === "gift" && (kind === "gift" || kind === "received")) ||
    (filter === "packet" && (kind === "packet" || kind === "claim")) ||
    (filter === "refund" && kind === "refund");
  const records = all.filter((l) => matches(l.kind));
  const sum = (kinds: string[]) =>
    all.filter((l) => kinds.includes(l.kind)).reduce((n, l) => n + Math.abs(l.amount), 0);
  const [page, setPage] = useState(0),
    pages = Math.ceil(records.length / 8);
  const host = userId !== ME;
  return (
    <LiveDialog title={t("直播钱包", "Live wallet")} onClose={onClose}>
      <div className="live-wallet-total">
        <Wallet size={22} />
        <span>{t("直播余额 · 虚拟 USDT", "Live balance · Virtual USDT")}</span>
        <strong>{money(store.state.wallets[userId] || 0)}</strong>
      </div>
      <div className="live-wallet-stats">
        {(host
          ? [
              [t("礼物收入", "Gift income"), sum(["received"])],
              [t("发出红包", "Packets sent"), sum(["packet"])],
              [t("红包退回", "Refunds"), sum(["refund"])],
            ]
          : [
              [t("累计送礼", "Gifts sent"), sum(["gift"])],
              [t("领取红包", "Packets received"), sum(["claim"])],
              [t("发出红包", "Packets sent"), sum(["packet"])],
            ]
        ).map(([k, v]) => (
          <div key={k as string}>
            <span>{k as string}</span>
            <b>{money(v as number)}</b>
          </div>
        ))}
      </div>
      <p className="live-wallet-note">
        {t(
          "直播余额为平台发放的虚拟资金，仅用于直播间送礼与红包互动，不可充值、提现或兑换。",
          "Live balance is virtual and only used for gifts and red packets. It cannot be topped up, withdrawn or exchanged.",
        )}
      </p>
      <div className="live-wallet-head">
        <h3 className="live-section-title">{t("收支记录", "Transactions")}</h3>
        <div>
          {(
            [
              ["all", t("全部", "All")],
              ["gift", t("礼物", "Gifts")],
              ["packet", t("红包", "Packets")],
              ["refund", t("退款", "Refunds")],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              className="ui-chip"
              aria-pressed={filter === id}
              onClick={() => {
                setFilter(id);
                setPage(0);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="live-ledger-list">
        {records.length ? (
          records.slice(page * 8, page * 8 + 8).map((r) => (
            <div key={r.id}>
              <span
                className={`live-ledger-icon ${r.amount > 0 ? "positive" : ""}`}
              >
                {r.amount > 0 ? (
                  <ArrowDownLeft size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </span>
              <span>
                <strong>{t(r.label, r.labelEn)}</strong>
                <small>
                  <DateLabel at={r.at} lang={lang} />
                </small>
              </span>
              <b className={r.amount > 0 ? "positive" : ""}>
                {r.amount > 0 ? "+" : ""}
                {money(r.amount)}
              </b>
            </div>
          ))
        ) : (
          <EmptyState>{t("暂无收支记录", "No transactions yet")}</EmptyState>
        )}
      </div>
      {pages > 1 && (
        <div className="live-pagination">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            {t("上一页", "Previous")}
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button
            disabled={page + 1 >= pages}
            onClick={() => setPage(page + 1)}
          >
            {t("下一页", "Next")}
          </button>
        </div>
      )}
    </LiveDialog>
  );
}

export function PacketDialog({
  store,
  lang,
  onClose,
  room,
  studio,
}: Common & { room: LiveRoom; studio: boolean }) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    now = useNow();
  const [tab, setTab] = useState(studio ? "create" : "list"),
    [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"random" | "equal">("random"),
    [amount, setAmount] = useState("20"),
    [count, setCount] = useState("10"),
    [delay, setDelay] = useState(0),
    [title, setTitle] = useState(t("开播好礼", "A gift for everyone"));
  const packets = store.state.packets.filter((p) => p.roomId === room.id),
    packet = packets.find((p) => p.id === selected);
  const cents = Math.round(Number(amount) * 100),
    num = Number(count),
    total = mode === "equal" ? cents * num : cents;
  const valid =
    Number.isFinite(total) &&
    cents > 0 &&
    Number.isInteger(num) &&
    num > 0 &&
    num <= 100 &&
    total >= num &&
    total <= (store.state.wallets[room.host.id] || 0) &&
    /^\d+(\.\d{0,2})?$/.test(amount);
  const status = (p: Packet) =>
    p.claims[ME] != null
      ? t("已领取", "Claimed")
      : p.closed || p.expiresAt <= now
        ? t("已结束", "Ended")
        : !p.remainingCount
          ? t("已领完", "Fully claimed")
          : p.opensAt > now
            ? `${Math.ceil((p.opensAt - now) / 1000)}s`
            : t("领取红包", "Open packet");
  return (
    <LiveDialog title={t("直播红包", "Red packets")} onClose={onClose}>
      {studio && (
        <div className="ui-seg live-modal-tabs">
          <button
            aria-pressed={tab === "create"}
            onClick={() => {
              setTab("create");
              setSelected(null);
            }}
          >
            {t("发红包", "Send")}
          </button>
          <button aria-pressed={tab === "list"} onClick={() => setTab("list")}>
            {t("红包记录", "History")}
          </button>
        </div>
      )}
      {tab === "create" && studio ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            const at = Date.now(),
              id = uid();
            if (
              store.dispatch({
                type: "packet",
                at,
                packet: {
                  id,
                  roomId: room.id,
                  senderId: room.host.id,
                  total,
                  remaining: total,
                  count: num,
                  remainingCount: num,
                  mode,
                  opensAt: at + delay * 1000,
                  expiresAt: at + delay * 1000 + 86400000,
                  claims: {},
                  closed: false,
                  title: title.trim() || t("开播好礼", "A gift for everyone"),
                },
              })
            ) {
              setTab("list");
              setSelected(id);
            }
          }}
          className="live-form"
        >
          <div className="live-mode-choice">
            <button
              type="button"
              aria-pressed={mode === "random"}
              onClick={() => setMode("random")}
            >
              {t("拼手气红包", "Lucky draw")}
            </button>
            <button
              type="button"
              aria-pressed={mode === "equal"}
              onClick={() => setMode("equal")}
            >
              {t("等额红包", "Equal amounts")}
            </button>
          </div>
          <label>
            {mode === "equal"
              ? t("单个金额", "Amount each")
              : t("总金额", "Total amount")}
            <div className="live-field-suffix">
              <input
                type="number"
                min=".01"
                step=".01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span>USDT</span>
            </div>
          </label>
          <label>
            {t("红包数量", "Number of packets")}
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
          <label>
            {t("祝福语", "Message")}
            <input
              maxLength={32}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {t("开启时间", "Opens in")}
            <select
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
            >
              {[
                [0, t("立即", "Now")],
                [10, t("10 秒后", "10 seconds")],
                [20, t("20 秒后", "20 seconds")],
                [30, t("30 秒后", "30 seconds")],
                [120, t("2 分钟后", "2 minutes")],
                [300, t("5 分钟后", "5 minutes")],
              ].map(([v, s]) => (
                <option value={v} key={v}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="live-checkout">
            <span>{t("合计 · 虚拟 USDT", "Total · Virtual USDT")}</span>
            <strong>{Number.isFinite(total) ? money(total) : "—"}</strong>
          </div>
          <small className="text-ink-3">
            {t(
              "24 小时未领取的金额将自动退回。",
              "Unclaimed amounts return after 24 hours.",
            )}
          </small>
          {!valid && (
            <p className="live-form-error">
              {t(
                "请检查金额、数量及可用余额",
                "Check the amount, quantity and available balance",
              )}
            </p>
          )}
          <div className="live-dialog-actions">
            <span>
              {t("余额", "Balance")}{" "}
              {money(store.state.wallets[room.host.id] || 0)}
            </span>
            <button
              className="ui-btn ui-btn-primary"
              disabled={!valid || room.status !== "live"}
            >
              {t("发出红包", "Send red packet")}
            </button>
          </div>
        </form>
      ) : packet ? (
        <>
          <button className="live-text-btn" onClick={() => setSelected(null)}>
            <ChevronLeft size={15} />
            {t("全部红包", "All packets")}
          </button>
          <div className="live-packet-detail">
            <span className="live-packet-seal">福</span>
            <p>{packet.title}</p>
            <small>
              {personName(room.host, lang)} {t("的红包", "sent a gift")}
            </small>
            {packet.claims[ME] != null ? (
              <>
                <strong>
                  {money(packet.claims[ME])} <small>USDT</small>
                </strong>
                <span>{t("已存入直播余额", "Added to your live balance")}</span>
              </>
            ) : (
              <button
                disabled={
                  studio ||
                  packet.opensAt > now ||
                  packet.closed ||
                  packet.expiresAt <= now ||
                  !packet.remainingCount
                }
                onClick={() =>
                  store.dispatch({
                    type: "claim",
                    id: packet.id,
                    at: Date.now(),
                    random: Math.random(),
                  })
                }
              >
                {studio ? t("红包已发出", "Packet sent") : status(packet)}
              </button>
            )}
          </div>
          <div className="live-checkout">
            <span>{t("已领取", "Claimed")}</span>
            <strong>
              {packet.count - packet.remainingCount} / {packet.count}
            </strong>
          </div>
          <div className="live-ledger-list">
            {Object.entries(packet.claims).map(([id, value]) => (
              <div key={id}>
                <Avatar profile={VIEWER} size="sm" />
                <span>{id === ME ? VIEWER.name : id}</span>
                <b>{money(value)} USDT</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="live-packet-list">
          {packets.length ? (
            packets.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id)}>
                <span className="live-packet-small">福</span>
                <span>
                  <strong>{p.title}</strong>
                  <small>
                    {p.mode === "random"
                      ? t("拼手气红包", "Lucky draw")
                      : t("等额红包", "Equal amounts")}{" "}
                    · {p.count - p.remainingCount}/{p.count}
                  </small>
                </span>
                <b>{status(p)}</b>
              </button>
            ))
          ) : (
            <EmptyState>{t("暂无红包", "No red packets yet")}</EmptyState>
          )}
        </div>
      )}
    </LiveDialog>
  );
}

export function ShareDialog({
  room,
  lang,
  onClose,
  onToast,
}: {
  room: LiveRoom;
  lang: Lang;
  onClose: () => void;
  onToast: (s: string) => void;
}) {
  const t = (zh: string, en: string) => label(lang, zh, en),
    url = `${window.location.origin}${window.location.pathname}#live/room/${room.id}`;
  const title = t(room.title, room.titleEn),
    host = personName(room.host, lang);
  const status =
    room.status === "live"
      ? t("正在直播", "Live now")
      : room.status === "scheduled"
        ? t("直播预告", "Upcoming")
        : t("精彩回放", "Replay");
  const passage = t(
    `【AlphaPulse 直播】${host}：${title}\n${status}，点击进入 ${url}`,
    `[AlphaPulse Live] ${host}: ${title}\n${status} — join at ${url}`,
  );
  const copy = (text: string, ok: string) => {
    if (!navigator.clipboard) return onToast(t("请选中链接后复制", "Select the link to copy it"));
    navigator.clipboard
      .writeText(text)
      .then(() => onToast(ok))
      .catch(() => onToast(t("请选中链接后复制", "Select the link to copy it")));
  };
  const savePoster = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 750;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(750 / img.width, 600 / img.height);
      ctx.fillStyle = "#06152d";
      ctx.fillRect(0, 0, 750, 1000);
      ctx.drawImage(img, 750 - img.width * scale, 0, img.width * scale, img.height * scale);
      const g = ctx.createLinearGradient(0, 300, 0, 1000);
      g.addColorStop(0, "rgba(6,21,45,0)");
      g.addColorStop(0.45, "rgba(6,21,45,0.95)");
      g.addColorStop(1, "#06152d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 300, 750, 700);
      ctx.fillStyle = "#f04e6a";
      ctx.fillRect(48, 520, 132, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "600 24px sans-serif";
      ctx.fillText(status, 64, 551);
      ctx.font = "700 46px sans-serif";
      let line = "",
        y = 640;
      for (const ch of title) {
        if (ctx.measureText(line + ch).width > 650) {
          ctx.fillText(line, 48, y);
          line = ch;
          y += 62;
        } else line += ch;
      }
      ctx.fillText(line, 48, y);
      ctx.font = "28px sans-serif";
      ctx.fillStyle = "#a3b8db";
      ctx.fillText(`${host} · ${room.symbols.slice(0, 3).join(" · ")}`, 48, y + 64);
      ctx.fillStyle = "#6f86ad";
      ctx.font = "22px sans-serif";
      ctx.fillText("AlphaPulse Live", 48, 930);
      ctx.fillText(url.replace(/^https?:\/\//, ""), 48, 962);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `alphapulse-live-${room.id}.png`;
      a.click();
      onToast(t("海报已保存", "Poster saved"));
    };
    img.src = room.cover || "/live/studio-hero.png";
  };
  return (
    <LiveDialog title={t("分享直播", "Share room")} onClose={onClose}>
      <div className="live-share-poster">
        <img src={room.cover || "/live/studio-hero.png"} alt="" />
        <div>
          <span className={`live-badge live-badge-${room.status}`}>{status}</span>
          <h3>{title}</h3>
          <p>
            {host} · {room.symbols.slice(0, 3).join(" · ")}
          </p>
        </div>
      </div>
      <div className="live-share-actions">
        <button onClick={() => copy(url, t("链接已复制", "Link copied"))}>
          <span>
            <Copy size={18} />
          </span>
          {t("复制链接", "Copy link")}
        </button>
        <button onClick={() => copy(passage, t("分享文案已复制，可粘贴到聊天", "Share text copied"))}>
          <span>
            <Radio size={18} />
          </span>
          {t("复制口令", "Copy text")}
        </button>
        <button onClick={savePoster}>
          <span>
            <ImagePlus size={18} />
          </span>
          {t("保存海报", "Save poster")}
        </button>
        {"share" in navigator && (
          <button
            onClick={() =>
              navigator.share({ title, text: passage, url }).catch(() => undefined)
            }
          >
            <span>
              <ArrowUpRight size={18} />
            </span>
            {t("更多应用", "More apps")}
          </button>
        )}
      </div>
      <label className="live-form-label">
        {t("直播链接", "Room link")}
        <input className="live-share-url" value={url} readOnly onFocus={(e) => e.target.select()} />
      </label>
    </LiveDialog>
  );
}

export function RoomEditor({
  store,
  lang,
  onClose,
  room,
  onToast,
}: Common & { room?: LiveRoom; onToast: (s: string) => void }) {
  const t = (zh: string, en: string) => label(lang, zh, en);
  const [title, setTitle] = useState(room ? t(room.title, room.titleEn) : ""),
    [category, setCategory] = useState(room?.category || "macro"),
    [mode, setMode] = useState<StageMode>(room?.mode || "chart");
  const creator = room?.host || CURRENT_CREATOR;
  const [scheduled, setScheduled] = useState(room?.status === "scheduled"),
    [date, setDate] = useState(() => {
      const d = new Date(
        room?.status === "scheduled" ? room.startsAt : Date.now() + 3600000,
      );
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    });
  const [cover, setCover] = useState(room?.cover),
    [access, setAccess] = useState(room?.access || "all"),
    [chat, setChat] = useState(room?.chatPermission || "all");
  const [error, setError] = useState("");
  return (
    <LiveDialog
      title={
        room ? t("直播设置", "Room settings") : t("创建直播", "Create live")
      }
      onClose={onClose}
      wide
    >
      <form
        className="live-form"
        onSubmit={(e) => {
          e.preventDefault();
          const start = new Date(date).getTime();
          if (!title.trim()) {
            setError(t("请输入直播标题", "Enter a title"));
            return;
          }
          if (
            scheduled &&
            (!Number.isFinite(start) ||
              start <= Date.now() ||
              start > Date.now() + 14 * 86400000)
          ) {
            setError(
              t(
                "请选择未来 14 天内的时间",
                "Choose a time within the next 14 days",
              ),
            );
            return;
          }
          const symbols =
            room?.symbols ||
            (category === "crypto"
              ? ["BTC/USD", "ETH/USD"]
              : category === "stocks"
                ? ["NVDA", "AAPL"]
                : ["XAU/USD", "EUR/USD"]);
          const r: LiveRoom = {
            ...room,
            id: room?.id || `room-${uid().slice(0, 8)}`,
            title: room && lang === "en" ? room.title : title.trim(),
            titleEn: room && lang === "zh" ? room.titleEn : title.trim(),
            host: creator,
            category,
            mode,
            status:
              room?.status === "live"
                ? "live"
                : scheduled
                  ? "scheduled"
                  : "live",
            startsAt:
              room?.status === "live"
                ? room.startsAt
                : scheduled
                  ? start
                  : Date.now(),
            viewers: room?.viewers || 0,
            symbols,
            pinnedSymbol: room?.pinnedSymbol || symbols[0],
            announcement: room?.announcement || "欢迎来到直播间，理性交流。",
            announcementEn:
              room?.announcementEn ||
              "Welcome. Keep the discussion constructive.",
            access,
            chatPermission: chat,
            sharedTrading: room?.sharedTrading ?? true,
            cover,
            endedAt: undefined,
          };
          if (store.dispatch({ type: "room", room: r })) {
            onClose();
            navigateStudio(r.id);
            onToast(
              t(
                scheduled ? "直播预告已发布" : "直播已更新",
                scheduled ? "Scheduled session published" : "Room updated",
              ),
            );
          }
        }}
      >
        <label>
          {t("直播标题", "Title")}
          <input
            autoComplete="off"
            placeholder={t("这次直播想聊什么？", "What will you talk about?")}
            maxLength={70}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <small>{title.length}/70</small>
        </label>
        <div className="live-form-grid">
          <label>
            {t("分类", "Category")}
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as LiveRoom["category"])
              }
            >
              {CATEGORIES.slice(1).map(([id, zh, en]) => (
                <option key={id} value={id}>
                  {t(zh, en)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("主播", "Host")}
            <input value={personName(creator, lang)} readOnly />
          </label>
        </div>
        <label>
          {t("直播形式", "Format")}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as StageMode)}
          >
            <option value="chart">{t("行情共享", "Market screen")}</option>
            <option value="voice">{t("多人语音", "Audio room")}</option>
            <option value="video">{t("视频直播", "Video")}</option>
          </select>
        </label>
        <label className="live-cover-upload">
          {cover ? (
            <img src={cover} alt={t("直播封面", "Room cover")} />
          ) : (
            <ImagePlus size={25} />
          )}
          <span>
            {t("上传封面", "Upload cover")}
            <small>JPG / PNG / WebP · 2 MB</small>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                file.size > 2 * 1024 * 1024 ||
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)
              ) {
                setError(
                  t(
                    "请选择 2 MB 以内的图片",
                    "Choose an image smaller than 2 MB",
                  ),
                );
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setCover(String(reader.result));
                setError("");
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <div className="live-form-grid">
          <label>
            {t("观看权限", "Who can watch")}
            <select
              value={access}
              onChange={(e) => setAccess(e.target.value as "all" | "followers")}
            >
              <option value="all">{t("所有人", "Everyone")}</option>
              <option value="followers">{t("仅关注者", "Followers")}</option>
            </select>
          </label>
          <label>
            {t("聊天权限", "Who can chat")}
            <select
              value={chat}
              onChange={(e) =>
                setChat(e.target.value as LiveRoom["chatPermission"])
              }
            >
              <option value="all">{t("所有人", "Everyone")}</option>
              <option value="followers">{t("仅关注者", "Followers")}</option>
              <option value="closed">{t("仅主播", "Host only")}</option>
            </select>
          </label>
        </div>
        {room?.status !== "live" && (
          <>
            <label className="live-check-label">
              <input
                type="checkbox"
                checked={scheduled}
                onChange={(e) => setScheduled(e.target.checked)}
              />
              {t("预约开播", "Schedule for later")}
            </label>
            {scheduled && (
              <label>
                {t("开播时间", "Start time")}
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            )}
          </>
        )}
        {error && (
          <p className="live-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="live-dialog-actions">
          <button type="button" className="ui-btn" onClick={onClose}>
            {t("取消", "Cancel")}
          </button>
          <button className="ui-btn ui-btn-primary" type="submit">
            {room
              ? t("保存设置", "Save settings")
              : scheduled
                ? t("发布预告", "Publish schedule")
                : t("开始直播", "Go live")}
          </button>
        </div>
      </form>
    </LiveDialog>
  );
}
