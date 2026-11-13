import React, { createContext, useContext, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Flag,
  Headphones,
  Mail,
  Phone,
  ShieldAlert,
  Sparkles,
  UserX,
} from "lucide-react";
import { ConfirmSheet, Sheet } from "../ui/Sheet";
import { useSavedState } from "../marketModel";
import {
  AI_MODEL,
  AI_SOURCES,
  CONTACT,
  OPERATOR,
  REPORT_REASONS,
  type AiSource,
  type ReportTarget,
} from "./complianceInfo";
import { LEGAL_DOCS, LEGAL_META, type LegalBlock, type LegalDocId } from "./legalDocs";
import "./compliance.css";

type Lang = "zh" | "en";
const tr = (lang: Lang) => (zh: string, en: string) => (lang === "zh" ? zh : en);

export const REPORTS_KEY = "alphapulse.reports.v1";
export type ContentReport = {
  id: string;
  target: ReportTarget;
  reason: string;
  text: string;
  at: number;
};
/** Reports are reviewed within 24 h; the prototype shows a result one minute after submitting. */
const REVIEW_MS = 60_000;

type Ctx = {
  lang: Lang;
  openLegal: (doc: LegalDocId, section?: string) => void;
  openContact: () => void;
  openReports: () => void;
  report: (target: ReportTarget) => void;
  openDeleteAccount: () => void;
};
const ComplianceContext = createContext<Ctx | null>(null);

export function useCompliance(): Ctx {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error("useCompliance must be used inside ComplianceProvider");
  return ctx;
}

type Open =
  | { kind: "legal"; doc: LegalDocId; section?: string }
  | { kind: "contact" }
  | { kind: "reports" }
  | { kind: "report"; target: ReportTarget }
  | { kind: "delete" }
  | null;

/**
 * Store-review compliance layer: legal documents, contact details, content reports and account
 * deletion. Mounted once in App; any component opens these sheets through `useCompliance()`.
 */
export function ComplianceProvider({
  lang,
  account,
  onToast,
  onDeleteAccount,
  onSupport,
  children,
}: {
  lang: Lang;
  /** signed-in identity shown in the deletion flow */
  account: string;
  onToast: (message: string) => void;
  /** removes the account and its local data; App signs out afterwards */
  onDeleteAccount: () => void;
  onSupport: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<Open>(null);
  const [stack, setStack] = useState<Open[]>([]);
  const [reports, setReports] = useSavedState<ContentReport[]>(REPORTS_KEY, []);
  const show = (next: Open) => {
    setStack((s) => (open ? [...s, open] : s));
    setOpen(next);
  };
  const back = () => {
    setOpen(stack.at(-1) ?? null);
    setStack((s) => s.slice(0, -1));
  };
  const close = () => {
    setOpen(null);
    setStack([]);
  };
  // Sheets belong to the page they were opened from.
  React.useEffect(() => {
    const onNav = () => {
      setOpen(null);
      setStack([]);
    };
    window.addEventListener("hashchange", onNav);
    return () => window.removeEventListener("hashchange", onNav);
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      lang,
      openLegal: (doc, section) => show({ kind: "legal", doc, section }),
      openContact: () => show({ kind: "contact" }),
      openReports: () => show({ kind: "reports" }),
      report: (target) => show({ kind: "report", target }),
      openDeleteAccount: () => show({ kind: "delete" }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, open],
  );
  const onBack = stack.length ? back : undefined;

  return (
    <ComplianceContext.Provider value={value}>
      {children}
      {open?.kind === "legal" && <LegalSheet lang={lang} doc={open.doc} section={open.section} onBack={onBack} onClose={close} />}
      {open?.kind === "contact" && (
        <ContactSheet
          lang={lang}
          onBack={onBack}
          onClose={close}
          onToast={onToast}
          onSupport={() => {
            close();
            onSupport();
          }}
          onLegal={(doc) => show({ kind: "legal", doc })}
          onReports={() => show({ kind: "reports" })}
        />
      )}
      {open?.kind === "reports" && <ReportsSheet lang={lang} reports={reports} onBack={onBack} onClose={close} />}
      {open?.kind === "report" && (
        <ReportSheet
          lang={lang}
          target={open.target}
          onClose={close}
          onSubmit={(r) => {
            setReports((old) => [r, ...old].slice(0, 100));
          }}
          onReports={() => {
            setStack([]);
            setOpen({ kind: "reports" });
          }}
        />
      )}
      {open?.kind === "delete" && (
        <DeleteAccountSheet
          lang={lang}
          account={account}
          onClose={close}
          onLegal={(doc) => show({ kind: "legal", doc })}
          onConfirm={() => {
            close();
            onDeleteAccount();
          }}
        />
      )}
    </ComplianceContext.Provider>
  );
}

/* ---------------- Inline notices ---------------- */

/**
 * Generative-AI label for every AI result: marks the content as AI-generated, names the model and the
 * data source, says it is not investment advice and offers a report entry.
 */
export function AiNotice({
  source,
  target,
  compact = false,
  className = "",
}: {
  source: AiSource;
  target?: ReportTarget;
  compact?: boolean;
  className?: string;
}) {
  const c = useCompliance();
  const t = tr(c.lang);
  const src = AI_SOURCES[source];
  return (
    <aside className={`cm-ai${compact ? " is-compact" : ""} ${className}`} aria-label={t("AI 生成内容提示", "AI-generated content notice")}>
      <p className="cm-ai-main">
        <span className="cm-ai-tag">
          <Sparkles size={12} strokeWidth={2.4} />
          {t("AI 生成", "AI-generated")}
        </span>
        <span>
          {t(
            "本内容由人工智能生成，仅供参考，不构成投资建议，请谨慎识别内容。",
            "This content is generated by AI for reference only. It is not investment advice; please judge it carefully.",
          )}
        </span>
      </p>
      <p className="cm-ai-meta">
        <span>
          {t("模型", "Model")}：{AI_MODEL.name}（{t(AI_MODEL.vendor.zh, AI_MODEL.vendor.en)}）
        </span>
        <span>
          {t("数据来源", "Source")}：{t(src.zh, src.en)}
        </span>
        {target && (
          <button type="button" className="cm-link" onClick={() => c.report(target)}>
            <Flag size={12} />
            {t("举报", "Report")}
          </button>
        )}
      </p>
    </aside>
  );
}

/** Prominent paper-trading notice for order tickets. */
export function SimNotice({ className = "" }: { className?: string }) {
  const c = useCompliance();
  const t = tr(c.lang);
  return (
    <aside className={`cm-sim ${className}`} role="note">
      <ShieldAlert size={16} strokeWidth={2.2} />
      <div>
        <b>{t("模拟交易 · 虚拟资金", "Paper trading · Virtual funds")}</b>
        <p>
          {t(
            "该交易属于模拟交易，不构成任何投资收益，盈亏只作为模拟交易练习或工具学习目的。",
            "This is a simulated trade. It creates no real investment return; profit and loss are only for practice and learning.",
          )}
          <button type="button" className="cm-link" onClick={() => c.openLegal("risk")}>
            {t("风险提示", "Risk notice")}
            <ChevronRight size={12} />
          </button>
        </p>
      </div>
    </aside>
  );
}

/** Small "举报" button for any content item. */
export function ReportButton({
  target,
  className = "",
  iconOnly = false,
  size = 14,
}: {
  target: ReportTarget;
  className?: string;
  iconOnly?: boolean;
  size?: number;
}) {
  const c = useCompliance();
  const t = tr(c.lang);
  return (
    <button
      type="button"
      className={`cm-report-btn ${className}`}
      aria-label={t(`举报：${target.title}`, `Report: ${target.title}`)}
      title={t("举报", "Report")}
      onClick={(e) => {
        e.stopPropagation();
        c.report(target);
      }}
    >
      <Flag size={size} />
      {!iconOnly && <span>{t("举报", "Report")}</span>}
    </button>
  );
}

/* ---------------- Legal ---------------- */

export function LegalBody({ lang, doc, className = "" }: { lang: Lang; doc: LegalDocId; className?: string }) {
  const t = tr(lang);
  const d = LEGAL_DOCS[doc];
  const block = (b: LegalBlock, i: number) =>
    "p" in b ? (
      <p key={i}>{t(b.p.zh, b.p.en)}</p>
    ) : "list" in b ? (
      <ul key={i}>
        {(lang === "zh" ? b.list.zh : b.list.en).map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    ) : (
      <div key={i} className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              {b.table.head.map((h) => (
                <th key={h.en}>{t(h.zh, h.en)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((cell, ci) => (
                  <td key={ci}>{t(cell.zh, cell.en)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className={`cm-doc ${className}`}>
      <p className="cm-doc-meta">
        {t(
          `更新日期：${LEGAL_META.updated.zh} · 生效日期：${LEGAL_META.effective.zh}`,
          `Updated ${LEGAL_META.updated.en} · Effective ${LEGAL_META.effective.en}`,
        )}
      </p>
      <p className="cm-doc-intro">{t(d.intro.zh, d.intro.en)}</p>
      {d.sections.length > 2 && (
        <nav className="cm-doc-toc" aria-label={t("目录", "Contents")}>
          {d.sections.map((s) => (
            <a
              key={s.id}
              href={`#legal-${doc}-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`legal-${doc}-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {t(s.h.zh, s.h.en)}
            </a>
          ))}
        </nav>
      )}
      {d.sections.map((s) => (
        <section key={s.id} id={`legal-${doc}-${s.id}`}>
          <h3>{t(s.h.zh, s.h.en)}</h3>
          {s.body.map(block)}
        </section>
      ))}
      <p className="cm-doc-foot">{t(OPERATOR.zh, OPERATOR.en)}</p>
    </div>
  );
}

export function LegalSheet({
  lang,
  doc,
  section,
  onBack,
  onClose,
}: {
  lang: Lang;
  doc: LegalDocId;
  section?: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const d = LEGAL_DOCS[doc];
  React.useEffect(() => {
    if (!section) return;
    const id = window.setTimeout(() => document.getElementById(`legal-${doc}-${section}`)?.scrollIntoView({ block: "start" }), 220);
    return () => window.clearTimeout(id);
  }, [doc, section]);
  return (
    <Sheet
      title={t(d.title.zh, d.title.en)}
      onBack={onBack}
      onClose={onClose}
      size="lg"
      className="cm-legal-sheet"
      footer={
        <button className="sh-btn sh-btn-primary sh-btn-block" onClick={onBack ?? onClose}>
          {t("我已阅读", "Done")}
        </button>
      }
    >
      <LegalBody lang={lang} doc={doc} />
    </Sheet>
  );
}

/* ---------------- Contact ---------------- */

function ContactSheet({
  lang,
  onBack,
  onClose,
  onToast,
  onSupport,
  onLegal,
  onReports,
}: {
  lang: Lang;
  onBack?: () => void;
  onClose: () => void;
  onToast: (m: string) => void;
  onSupport: () => void;
  onLegal: (doc: LegalDocId) => void;
  onReports: () => void;
}) {
  const t = tr(lang);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    onToast(t("已复制", "Copied"));
  };
  const docs: [LegalDocId, string, string][] = [
    ["terms", "用户协议", "Terms of Service"],
    ["privacy", "隐私政策", "Privacy Policy"],
    ["subscription", "会员服务与自动续费协议", "Membership & Auto-renewal Terms"],
    ["risk", "风险提示与免责声明", "Risk Disclosure"],
  ];
  return (
    <Sheet title={t("联系我们", "Contact us")} subtitle={t(CONTACT.replyZh, CONTACT.replyEn)} onBack={onBack} onClose={onClose} size="md">
      <div className="cm-contact">
        <a className="cm-contact-row" href={`mailto:${CONTACT.email}`}>
          <span className="cm-contact-ic">
            <Mail size={18} />
          </span>
          <span className="cm-contact-main">
            <small>{t("客服邮箱", "Support email")}</small>
            <b>{CONTACT.email}</b>
          </span>
          <button
            type="button"
            className="cm-icon-btn"
            aria-label={t("复制邮箱", "Copy email")}
            onClick={(e) => {
              e.preventDefault();
              copy(CONTACT.email);
            }}
          >
            <Copy size={15} />
          </button>
        </a>
        <a className="cm-contact-row" href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>
          <span className="cm-contact-ic">
            <Phone size={18} />
          </span>
          <span className="cm-contact-main">
            <small>{t("客服电话", "Phone")}</small>
            <b>{CONTACT.phone}</b>
            <em>{t(CONTACT.hours.zh, CONTACT.hours.en)}</em>
          </span>
          <ChevronRight size={16} className="cm-chev" />
        </a>
        <button className="cm-contact-row" onClick={onSupport}>
          <span className="cm-contact-ic">
            <Headphones size={18} />
          </span>
          <span className="cm-contact-main">
            <small>{t("在线客服", "Live chat")}</small>
            <b>{t("客服中心 · 智能助手与人工客服", "Help center · bot and agents")}</b>
          </span>
          <ChevronRight size={16} className="cm-chev" />
        </button>
        <a className="cm-contact-row" href={`mailto:${CONTACT.privacyEmail}`}>
          <span className="cm-contact-ic">
            <ShieldAlert size={18} />
          </span>
          <span className="cm-contact-main">
            <small>{t("隐私与个人信息", "Privacy requests")}</small>
            <b>{CONTACT.privacyEmail}</b>
            <em>{t("15 个工作日内答复", "Reply within 15 business days")}</em>
          </span>
          <ChevronRight size={16} className="cm-chev" />
        </a>
      </div>
      <div className="sh-section">
        <h3>{t("协议与政策", "Terms & policies")}</h3>
        <div className="cm-menu">
          {docs.map(([id, zh, en]) => (
            <button key={id} onClick={() => onLegal(id)}>
              <FileText size={16} />
              <span>{t(zh, en)}</span>
              <ChevronRight size={15} />
            </button>
          ))}
          <button onClick={onReports}>
            <Flag size={16} />
            <span>{t("我的举报", "My reports")}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <p className="cm-operator">{t(`运营方：${OPERATOR.zh}`, `Operated by ${OPERATOR.en}`)}</p>
    </Sheet>
  );
}

/* ---------------- Reports ---------------- */

const KIND_LABEL: Record<ReportTarget["kind"], [string, string]> = {
  news: ["资讯", "News"],
  flash: ["快讯", "Flash"],
  article: ["要闻", "Article"],
  comment: ["评论", "Comment"],
  opportunity: ["市场机会", "Opportunity"],
  ai: ["AI 内容", "AI content"],
  market: ["行情信息", "Market info"],
  live: ["直播", "Live"],
};

function ReportSheet({
  lang,
  target,
  onClose,
  onSubmit,
  onReports,
}: {
  lang: Lang;
  target: ReportTarget;
  onClose: () => void;
  onSubmit: (r: ContentReport) => void;
  onReports: () => void;
}) {
  const t = tr(lang);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [done, setDone] = useState<ContentReport | null>(null);
  const needsText = reason === "other";
  const valid = !!reason && (!needsText || text.trim().length >= 5);
  const picked = REPORT_REASONS.find((r) => r.id === reason);

  if (done)
    return (
      <Sheet title={t("举报已提交", "Report sent")} onClose={onClose} size="sm">
        <div className="cm-done">
          <CheckCircle2 size={46} />
          <b>{t("感谢你的反馈", "Thanks for letting us know")}</b>
          <p>
            {t(
              "我们会在 24 小时内核实处理，处理结果会在「我的举报」中更新。被举报内容核实违规后将被下架，相关账号会受到处罚。",
              "We review reports within 24 hours and post the outcome in My reports. Content found to break the rules is removed and the account penalised.",
            )}
          </p>
          <small>
            {t("举报编号", "Report ID")} {done.id}
          </small>
        </div>
        <div className="cm-actions">
          <button className="sh-btn" onClick={onReports}>
            {t("查看我的举报", "My reports")}
          </button>
          <button className="sh-btn sh-btn-primary" onClick={onClose}>
            {t("完成", "Done")}
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      title={t("举报内容", "Report content")}
      subtitle={t(`${KIND_LABEL[target.kind][0]} · ${target.title}`, `${KIND_LABEL[target.kind][1]} · ${target.title}`)}
      onClose={onClose}
      size="md"
      footer={
        <button
          className="sh-btn sh-btn-primary sh-btn-block"
          disabled={!valid}
          onClick={() => {
            const r: ContentReport = {
              id: `RP${Date.now().toString().slice(-9)}`,
              target,
              reason,
              text: text.trim(),
              at: Date.now(),
            };
            onSubmit(r);
            setDone(r);
          }}
        >
          {t("提交举报", "Submit report")}
        </button>
      }
    >
      <div className="sh-section" style={{ marginTop: 4 }}>
        <h3>{t("举报类型", "Reason")}</h3>
        <div className="cm-reasons" role="radiogroup" aria-label={t("举报类型", "Reason")}>
          {REPORT_REASONS.map((r) => (
            <button key={r.id} role="radio" aria-checked={reason === r.id} onClick={() => setReason(r.id)}>
              <span className="cm-radio" aria-hidden>
                {reason === r.id && <Check size={11} strokeWidth={3.2} />}
              </span>
              <span>
                <b>{t(r.zh, r.en)}</b>
                <small>{t(r.hintZh, r.hintEn)}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <label className="sh-field">
        <span>
          <span>
            {t("举报内容", "Details")}
            {needsText ? <i className="cm-req"> *</i> : <i className="cm-opt">{t("（选填）", " (optional)")}</i>}
          </span>
          <em>{text.length}/300</em>
        </span>
        <textarea
          className="sh-input"
          rows={4}
          maxLength={300}
          value={text}
          placeholder={
            needsText
              ? t("请描述具体问题（至少 5 个字）", "Describe the problem (min. 5 characters)")
              : picked
                ? t(`补充说明：${picked.hintZh}`, `Add details: ${picked.hintEn}`)
                : t("请先选择举报类型", "Pick a reason first")
          }
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="sh-hint">
        {t(
          "请如实举报，恶意举报可能导致账号受限。举报信息仅用于内容审核。",
          "Please report in good faith; abusive reports may limit your account. Report details are used only for moderation.",
        )}
      </p>
    </Sheet>
  );
}

function ReportsSheet({
  lang,
  reports,
  onBack,
  onClose,
}: {
  lang: Lang;
  reports: ContentReport[];
  onBack?: () => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const now = Date.now();
  return (
    <Sheet title={t("我的举报", "My reports")} subtitle={t("24 小时内处理", "Handled within 24 hours")} onBack={onBack} onClose={onClose} size="md">
      {reports.length ? (
        <div className="sh-list cm-report-list">
          {reports.map((r) => {
            const reason = REPORT_REASONS.find((x) => x.id === r.reason);
            const reviewed = now - r.at > REVIEW_MS;
            return (
              <div key={r.id}>
                <span className="sh-li-icon">
                  <Flag size={16} />
                </span>
                <div className="sh-li-main">
                  <b>{r.target.title}</b>
                  <small>
                    {t(KIND_LABEL[r.target.kind][0], KIND_LABEL[r.target.kind][1])} · {reason ? t(reason.zh, reason.en) : r.reason} ·{" "}
                    {new Date(r.at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { hour12: false })}
                  </small>
                  {reviewed && (
                    <small className="cm-result">
                      {t("处理结果：已核实，相关内容已下架或修正，感谢你的举报。", "Outcome: verified; the content was removed or corrected. Thank you.")}
                    </small>
                  )}
                </div>
                <span className={`sh-badge ${reviewed ? "is-ok" : "is-info"}`}>
                  {reviewed ? (
                    <>
                      <Check size={12} />
                      {t("已处理", "Resolved")}
                    </>
                  ) : (
                    <>
                      <Clock3 size={12} />
                      {t("处理中", "In review")}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cm-empty">
          <Flag size={28} />
          <p>{t("暂无举报记录。看到违规内容时，可点击内容旁的「举报」。", "No reports yet. Use Report next to any content that breaks the rules.")}</p>
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- Account deletion ---------------- */

const DELETE_REASONS: [string, string][] = [
  ["不再使用", "I no longer use it"],
  ["担心隐私", "Privacy concerns"],
  ["功能不满足需求", "Missing features"],
  ["已有其他账号", "I have another account"],
  ["其他", "Other"],
];

function DeleteAccountSheet({
  lang,
  account,
  onClose,
  onLegal,
  onConfirm,
}: {
  lang: Lang;
  account: string;
  onClose: () => void;
  onLegal: (doc: LegalDocId) => void;
  onConfirm: () => void;
}) {
  const t = tr(lang);
  const [step, setStep] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [confirm, setConfirm] = useState(false);
  const phrase = t("确认注销", "DELETE");
  const d = LEGAL_DOCS.deletion;
  const list = (id: string) => {
    const b = d.sections.find((s) => s.id === id)!.body[0];
    return "list" in b ? (lang === "zh" ? b.list.zh : b.list.en) : [];
  };
  const para = (id: string) => {
    const b = d.sections.find((s) => s.id === id)!.body[0];
    return "p" in b ? t(b.p.zh, b.p.en) : "";
  };

  if (step === 1)
    return (
      <Sheet
        title={t("注销账户", "Delete account")}
        subtitle={account}
        onClose={onClose}
        size="md"
        footer={
          <button className="sh-btn sh-btn-danger sh-btn-block" disabled={!agreed} onClick={() => setStep(2)}>
            {t("下一步", "Continue")}
          </button>
        }
      >
        <div className="cm-del-hero">
          <UserX size={26} />
          <p>{t("注销后账户无法恢复，请确认以下信息。", "Deletion cannot be undone. Please review the following.")}</p>
        </div>
        <div className="sh-section">
          <h3>{t("将被永久删除的信息", "What will be deleted")}</h3>
          <ul className="cm-del-list">
            {list("effects").map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="sh-section">
          <h3>{t("依法保留的信息", "What we must keep")}</h3>
          <p className="cm-del-p">{para("retained")}</p>
        </div>
        <p className="sh-note is-warn">
          <AlertTriangle size={15} />
          <span>{para("store")}</span>
        </p>
        <label className="cm-agree">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {t("我已阅读并同意", "I have read and agree to the ")}
            <button type="button" className="cm-link" onClick={() => onLegal("deletion")}>
              {t("《账户注销须知》", "Account Deletion Notice")}
            </button>
            {t("与", " and the ")}
            <button type="button" className="cm-link" onClick={() => onLegal("privacy")}>
              {t("《隐私政策》", "Privacy Policy")}
            </button>
          </span>
        </label>
      </Sheet>
    );

  return (
    <>
      <Sheet
        title={t("确认注销", "Confirm deletion")}
        subtitle={account}
        onBack={() => setStep(1)}
        onClose={onClose}
        size="md"
        footer={
          <button className="sh-btn sh-btn-danger sh-btn-block" disabled={typed.trim() !== phrase} onClick={() => setConfirm(true)}>
            {t("注销账户", "Delete account")}
          </button>
        }
      >
        <div className="sh-section" style={{ marginTop: 4 }}>
          <h3>
            {t("注销原因", "Why are you leaving?")} <small className="cm-opt">{t("选填", "optional")}</small>
          </h3>
          <div className="sh-chips">
            {DELETE_REASONS.map(([zh, en]) => (
              <button
                key={zh}
                aria-pressed={reasons.includes(zh)}
                onClick={() => setReasons((old) => (old.includes(zh) ? old.filter((x) => x !== zh) : [...old, zh]))}
              >
                {t(zh, en)}
              </button>
            ))}
          </div>
        </div>
        <label className="sh-field">
          <span>{t(`请输入「${phrase}」以确认`, `Type "${phrase}" to confirm`)}</span>
          <input className="sh-input" value={typed} autoComplete="off" placeholder={phrase} onChange={(e) => setTyped(e.target.value)} />
        </label>
        <p className="sh-hint">
          {t(
            "提交后账户立即停用并退出登录，个人信息将在 15 个工作日内删除或匿名化。同一手机号或邮箱可在之后重新注册。",
            "Your account is closed and signed out immediately; personal data is deleted or anonymised within 15 business days. You can register again later with the same number or email.",
          )}
        </p>
      </Sheet>
      {confirm && (
        <ConfirmSheet
          title={t("最后确认", "Last check")}
          confirm={t("永久注销", "Delete permanently")}
          cancel={t("再想想", "Cancel")}
          danger
          onClose={() => setConfirm(false)}
          onConfirm={onConfirm}
        >
          <p className="cm-del-p">{t("确定要永久注销该账户吗？此操作无法撤销。", "Permanently delete this account? This cannot be undone.")}</p>
        </ConfirmSheet>
      )}
    </>
  );
}
