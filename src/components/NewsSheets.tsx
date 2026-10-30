import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Link2, RefreshCw, Send, Share2, Sparkles } from "lucide-react";
import type { Article } from "./newsContent";
import { Sheet } from "./ui/Sheet";

const SYMBOLS: [RegExp, string, string][] = [
  [/BTC|比特币/i, "BTC/USD", "BTC"],
  [/ETH|以太坊/i, "ETH/USD", "ETH"],
  [/SOL|Solana/i, "SOL/USD", "SOL"],
  [/黄金|金价|XAU/i, "XAU/USD", "黄金"],
  [/纳斯达克|纳指|科技股/i, "NAS100", "纳指100"],
  [/英伟达|NVDA/i, "NVDA", "NVDA"],
  [/原油|油价/i, "USOIL", "原油"],
];
const POS = /上涨|增长|突破|利好|流入|回升|走强|新高|增持|扩张|乐观/g;
const NEG = /下跌|风险|流出|下滑|收紧|抛售|走弱|承压|回落|担忧|攻击|漏洞/g;

/** AI 摘要弹窗: simulated generation, key points, sentiment and related instruments. */
export function AiSummarySheet({
  article,
  onOpenMarket,
  onToast,
  onClose,
}: {
  article: Article;
  onOpenMarket?: (symbol: string) => void;
  onToast?: (s: string) => void;
  onClose: () => void;
}) {
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setStage(0);
    const ids = [500, 1100, 1700].map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    return () => ids.forEach(clearTimeout);
  }, [run, article.id]);
  const text = `${article.title}${article.intro}${article.sections.map((s) => s.heading + s.text).join("")}`;
  const analysis = useMemo(() => {
    const pos = (text.match(POS) || []).length,
      neg = (text.match(NEG) || []).length;
    const mood = pos > neg + 1 ? "bull" : neg > pos + 1 ? "bear" : "neutral";
    const related = SYMBOLS.filter(([re]) => re.test(text)).slice(0, 4);
    const minutes = Math.max(2, Math.ceil(text.length / 250));
    return { mood, related, minutes, pos, neg };
  }, [text]);
  const done = stage >= 3;
  const tldr = article.summary[0] || article.intro.slice(0, 60);
  const copy = () => {
    const body = `【AI 摘要】${article.title}\n${tldr}\n${article.summary.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
    navigator.clipboard?.writeText(body).catch(() => {});
    onToast?.("摘要已复制");
    setCopied(true);
  };
  return (
    <Sheet
      title="AI 摘要"
      subtitle={`原文约 ${analysis.minutes} 分钟 · 摘要 30 秒读完`}
      onClose={onClose}
      footer={
        done ? (
          <>
            <button className="sh-btn" onClick={() => setRun(run + 1)}>
              <RefreshCw size={16} />
              重新生成
            </button>
            <button className="sh-btn sh-btn-primary" onClick={copy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "已复制" : "复制摘要"}
            </button>
          </>
        ) : undefined
      }
    >
      <h3 className="ns-title">{article.title}</h3>
      {!done ? (
        <div className="ns-gen">
          {["阅读全文", "提取关键信息", "生成摘要"].map((s, i) => (
            <div key={s} className={stage > i ? "is-done" : stage === i ? "is-now" : ""}>
              <i>{stage > i ? <Check size={12} strokeWidth={3} /> : null}</i>
              {s}
            </div>
          ))}
          <div className="ns-skeleton">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        <>
          <div className="ns-tldr">
            <Sparkles size={16} />
            <p>{tldr}</p>
          </div>
          <div className="sh-section">
            <h3>核心要点</h3>
            <ol className="ns-points">
              {article.summary.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>
          <div className="sh-section">
            <h3>市场情绪</h3>
            <div className={`ns-mood is-${analysis.mood}`}>
              <b>{analysis.mood === "bull" ? "偏多" : analysis.mood === "bear" ? "偏空" : "中性"}</b>
              <div className="ns-mood-bar">
                <i style={{ width: `${((analysis.pos + 1) / (analysis.pos + analysis.neg + 2)) * 100}%` }} />
              </div>
              <small>
                积极信号 {analysis.pos} · 风险信号 {analysis.neg}
              </small>
            </div>
          </div>
          {analysis.related.length > 0 && (
            <div className="sh-section">
              <h3>相关品种</h3>
              <div className="sh-chips">
                {analysis.related.map(([, symbol, label]) => (
                  <button
                    key={symbol}
                    onClick={() => {
                      onClose();
                      onOpenMarket?.(symbol);
                    }}
                  >
                    {label} ›
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="sh-hint">内容由 AI 根据原文生成，可能存在偏差，仅供参考，不构成投资建议。</p>
        </>
      )}
    </Sheet>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > width) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

/** 分享弹窗: preview card, copy link / text, social intents, system share and poster download. */
export function ShareSheet({
  title,
  excerpt,
  meta,
  path,
  onToast,
  onClose,
}: {
  title: string;
  excerpt: string;
  meta: string;
  path: string;
  onToast?: (s: string) => void;
  onClose: () => void;
}) {
  const url = `${location.origin}${location.pathname}#${path}`;
  const text = `${title} | AlphaPulse`;
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (value: string, key: string, msg: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(key);
    onToast?.(msg);
  };
  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");
  const poster = () => {
    const c = document.createElement("canvas");
    c.width = 750;
    c.height = 1060;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 750, 360);
    g.addColorStop(0, "#1f4fe0");
    g.addColorStop(1, "#0b1f8a");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 750, 1060);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 750, 360);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 28px sans-serif";
    ctx.fillText("AlphaPulse 资讯", 56, 80);
    ctx.fillStyle = "#fff";
    ctx.font = "700 46px sans-serif";
    wrap(ctx, title, 640)
      .slice(0, 4)
      .forEach((l, i) => ctx.fillText(l, 56, 160 + i * 62));
    ctx.fillStyle = "#4b5466";
    ctx.font = "26px sans-serif";
    ctx.fillText(meta, 56, 430);
    ctx.fillStyle = "#111827";
    ctx.font = "30px sans-serif";
    wrap(ctx, excerpt, 640)
      .slice(0, 9)
      .forEach((l, i) => ctx.fillText(l, 56, 500 + i * 48));
    ctx.fillStyle = "#eef0f4";
    ctx.fillRect(0, 940, 750, 120);
    ctx.fillStyle = "#2962ff";
    ctx.font = "700 30px sans-serif";
    ctx.fillText("AlphaPulse", 56, 1008);
    ctx.fillStyle = "#8a93a5";
    ctx.font = "24px sans-serif";
    ctx.fillText("打开 App 阅读全文", 470, 1008);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `alphapulse-${path.replace(/\W+/g, "-")}.png`;
    a.click();
    onToast?.("海报已保存");
  };
  const actions: [string, React.ReactNode, () => void, string?][] = [
    ["复制链接", copied === "link" ? <Check size={20} /> : <Link2 size={20} />, () => copy(url, "link", "链接已复制"), "is-blue"],
    ["复制文案", copied === "text" ? <Check size={20} /> : <Copy size={20} />, () => copy(`${text}\n${excerpt.slice(0, 60)}…\n${url}`, "text", "分享文案已复制"), "is-gray"],
    ["Telegram", <Send size={20} />, () => open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`), "is-tg"],
    ["X", <b key="x">𝕏</b>, () => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`), "is-x"],
    ["微博", <b key="w">微</b>, () => open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`), "is-wb"],
    ["保存海报", <Download size={20} />, poster, "is-gray"],
  ];
  if (typeof navigator.share === "function")
    actions.push(["更多", <Share2 size={20} />, () => navigator.share({ title, text, url }).catch(() => {}), "is-gray"]);
  return (
    <Sheet title="分享" onClose={onClose}>
      <div className="ns-card">
        <small>AlphaPulse 资讯</small>
        <b>{title}</b>
        <p>{excerpt}</p>
        <span>{meta}</span>
      </div>
      <div className="ns-actions">
        {actions.map(([label, icon, run, tone]) => (
          <button key={label} onClick={run}>
            <span className={tone}>{icon}</span>
            {label}
          </button>
        ))}
      </div>
      <label className="sh-field">
        <span>链接</span>
        <div className="sh-inputbox">
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
          <button onClick={() => copy(url, "link", "链接已复制")}>复制</button>
        </div>
      </label>
    </Sheet>
  );
}
