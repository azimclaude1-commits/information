import React from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CandlestickChart, Check, Copy, Gift, Landmark } from "lucide-react";
import type { LedgerRecord } from "./demoTrading";
import { Sheet, SheetRows } from "./ui/Sheet";

type Lang = "zh" | "en";

/** Ledger kind from the id prefix used by demoTrading / WithdrawView. */
export function recordKind(r: LedgerRecord) {
  const p = r.id.split("-")[0];
  if (p === "TS") return "trade";
  if (p === "TR") return "transfer";
  if (p === "WD" || p === "OTC") return "withdraw";
  if (p === "DIV" || p === "DV") return "dividend";
  if (p === "DC") return /奖励|签到|评分|reward/i.test(`${r.network}${r.address}`) ? "reward" : "credit";
  return "credit";
}

export function RecordDetail({
  lang,
  record: r,
  sign,
  onCopy,
  onClose,
}: {
  lang: Lang;
  record: LedgerRecord;
  sign: string;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const kind = recordKind(r);
  const meta = {
    trade: [t("交易结算", "Trade settlement"), <CandlestickChart key="i" size={22} />],
    transfer: [t("资金划转", "Transfer"), <ArrowLeftRight key="i" size={22} />],
    withdraw: [t("奖励提现", "Reward withdrawal"), <ArrowUpRight key="i" size={22} />],
    dividend: [t("股息派发", "Dividend"), <Landmark key="i" size={22} />],
    reward: [t("奖励发放", "Reward"), <Gift key="i" size={22} />],
    credit: [t("模拟金发放", "Demo credit"), <ArrowDownLeft key="i" size={22} />],
  }[kind] as [string, React.ReactNode];
  const amount = Math.abs(r.amount);
  const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  const status = lang === "zh" ? r.statusZh : r.statusEn;
  const done = /完成|成功|已到账|已发放|已派发|已结算|Completed|Credited|Settled|Paid/i.test(status);
  const copyable = (v: string) => (
    <span className="rd-copy">
      {v}
      <button
        aria-label={t("复制", "Copy")}
        onClick={() => {
          navigator.clipboard?.writeText(v).catch(() => {});
          onCopy(t("已复制", "Copied"));
        }}
      >
        <Copy size={13} />
      </button>
    </span>
  );
  const rows: [React.ReactNode, React.ReactNode, string?][] = [
    [t("类型", "Type"), meta[0]],
    [t("币种", "Asset"), r.coin],
    [kind === "withdraw" ? t("提现网络", "Network") : t("路径 / 说明", "Route / note"), r.network],
    [kind === "withdraw" ? t("收款地址", "Address") : t("备注", "Note"), r.address || "—", kind === "withdraw" ? "mono" : undefined],
    [t("手续费", "Fee"), `${fmt(r.fee)} ${r.coin}`],
  ];
  if (kind === "withdraw") rows.push([t("实际到账", "Receive"), `${fmt(Math.max(0, amount))} ${r.coin}`]);
  rows.push([t("时间", "Time"), r.time], [t("流水单号", "Record ID"), copyable(r.id), "mono"]);
  if (r.txId && !/^INTERNAL/.test(r.txId)) rows.push([kind === "withdraw" ? t("交易哈希", "TxID") : t("关联单号", "Reference"), copyable(r.txId), "mono"]);

  const steps =
    kind === "withdraw"
      ? [
          [t("提交申请", "Submitted"), true],
          [t("风控审核", "Review"), true],
          [t("链上确认", "On-chain"), done],
          [t("提现完成", "Completed"), done],
        ]
      : null;

  return (
    <Sheet title={t("记录详情", "Record details")} onClose={onClose}>
      <div className="rd-head">
        <span className={`rd-ic is-${kind}`}>{meta[1]}</span>
        <small>{meta[0]}</small>
        <strong className={kind === "trade" ? (r.amount >= 0 ? "sh-up" : "sh-down") : ""}>
          {sign}
          {fmt(amount)} <em>{r.coin}</em>
        </strong>
        <span className={`sh-badge ${done ? "is-ok" : "is-info"}`}>
          {done && <Check size={12} />}
          {status}
        </span>
      </div>
      {steps && (
        <ol className="rd-steps">
          {steps.map(([label, on], i) => (
            <li key={i} className={on ? "is-on" : ""}>
              <i />
              <span>{label as string}</span>
            </li>
          ))}
        </ol>
      )}
      <SheetRows rows={rows} />
      <p className="sh-note">
        {t("模拟账户记录，仅用于练习，不涉及真实资金。", "Demo account record — no real funds involved.")}
      </p>
    </Sheet>
  );
}
