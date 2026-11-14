/**
 * Store-review facts shown across the app: operator, contact channels, AI model labelling and report
 * reasons. Keep every value here so the release team can swap in the production details in one place.
 */

export const OPERATOR = {
  zh: "TickVelo 科技有限公司",
  en: "TickVelo Technology Ltd.",
};

export const CONTACT = {
  email: "support@tickvelo.app",
  privacyEmail: "privacy@tickvelo.app",
  phone: "+852 3001 8866",
  hours: {
    zh: "周一至周日 09:00–22:00（UTC+8）",
    en: "Daily 09:00–22:00 (UTC+8)",
  },
  /** Promised first-response times, also quoted in the legal documents. */
  replyZh: "邮件 1 个工作日内回复，举报 24 小时内处理",
  replyEn: "Email replies within 1 business day; reports handled within 24 hours",
};

/** Generative-AI labelling: every AI result names the model and its data sources. */
export const AI_MODEL = {
  name: "Gemini 3.8 Flash",
  vendor: { zh: "Google", en: "Google" },
};

export type AiSource = "market" | "news" | "kline" | "signature" | "research";
export const AI_SOURCES: Record<AiSource, { zh: string; en: string }> = {
  market: { zh: "平台行情数据（模拟报价）与公开宏观资料", en: "Platform quotes (simulated) and public macro data" },
  news: { zh: "资讯原文（平台资讯库）", en: "The original article in the platform news library" },
  kline: { zh: "所选 K 线（模拟行情）与技术指标计算", en: "The selected candles (simulated quotes) and indicator maths" },
  signature: { zh: "特色指标计算结果（模拟行情）", en: "Signature indicator readings (simulated quotes)" },
  research: { zh: "平台行情数据、资讯库与公开市场资料", en: "Platform quotes, news library and public market data" },
};

export type ReportKind = "news" | "flash" | "article" | "comment" | "opportunity" | "ai" | "market" | "live";
export type ReportTarget = {
  kind: ReportKind;
  /** stable id of the reported item */
  id: string;
  /** short title shown in the sheet and the report list */
  title: string;
};

export const REPORT_REASONS: { id: string; zh: string; en: string; hintZh: string; hintEn: string }[] = [
  { id: "misleading", zh: "虚假或误导性信息", en: "False or misleading", hintZh: "内容与事实不符、夸大或断章取义", hintEn: "Inaccurate, exaggerated or out of context" },
  { id: "advice", zh: "违规荐股 / 承诺收益", en: "Promises returns / calls trades", hintZh: "喊单、保证收益、诱导交易", hintEn: "Guaranteed returns or pushing trades" },
  { id: "fraud", zh: "诈骗或引流外部平台", en: "Scam or off-platform promotion", hintZh: "引导加群、私下转账、外部链接", hintEn: "Group invites, private transfers, outside links" },
  { id: "abuse", zh: "辱骂、歧视或人身攻击", en: "Harassment or hate", hintZh: "侮辱、威胁、歧视性言论", hintEn: "Insults, threats or discrimination" },
  { id: "adult", zh: "色情低俗或暴力血腥", en: "Sexual or violent content", hintZh: "不适宜公开展示的内容", hintEn: "Content unsuitable for a public feed" },
  { id: "rights", zh: "侵犯权益（版权 / 隐私）", en: "Infringement (copyright / privacy)", hintZh: "未经授权转载或泄露他人信息", hintEn: "Unauthorised reposts or personal data" },
  { id: "ai", zh: "AI 内容错误或不当", en: "Wrong or inappropriate AI output", hintZh: "数据错误、结论偏差或不当表述", hintEn: "Wrong data, biased or inappropriate wording" },
  { id: "other", zh: "其他", en: "Other", hintZh: "请在下方描述具体问题", hintEn: "Describe the problem below" },
];

export const LEGAL_UPDATED = { zh: "2026 年 11 月 13 日", en: "13 November 2026" };
export const LEGAL_EFFECTIVE = { zh: "2026 年 11 月 13 日", en: "13 November 2026" };
