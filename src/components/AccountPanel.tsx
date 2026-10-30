import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeftRight,
  Banknote,
  FileText,
  Headphones,
  LogOut,
  MonitorPlay,
  QrCode,
  Radio,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AssetSubPage } from "./WithdrawView";
import "./accountPanel.css";
import { useCommunity } from "./community/Community";

const ASSETS = [
  { id: "overview", icon: Wallet, zh: "模拟资产", en: "Demo assets" },
  { id: "transfer", icon: ArrowLeftRight, zh: "资金划转", en: "Transfer" },
  {
    id: "reward_withdraw",
    icon: Banknote,
    zh: "奖励提现",
    en: "Withdraw rewards",
  },
  { id: "records", icon: FileText, zh: "资金记录", en: "Funding history" },
] as const;
const SECURITY = [
  { id: "authenticator", icon: QrCode, zh: "谷歌验证器", en: "Google 2FA" },
  {
    id: "security",
    icon: ShieldCheck,
    zh: "安全设置",
    en: "Security settings",
  },
] as const;

export function AccountPanel({
  lang,
  email,
  onClose,
  onAsset,
  onLive,
  onStudio,
  onSupport,
  onLogout,
}: {
  lang: "zh" | "en";
  email: string;
  onClose: () => void;
  onAsset: (page: AssetSubPage) => void;
  onLive: () => void;
  onStudio: () => void;
  onSupport: () => void;
  onLogout: () => void;
}) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const community = useCommunity();
  const panel = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        panel.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) || [],
      );
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0]?.focus();
      }
    };
    const navigate = () => close.current();
    document.addEventListener("keydown", keydown);
    window.addEventListener("hashchange", navigate);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("hashchange", navigate);
      previous?.focus();
    };
  }, []);
  const menu = (
    items: readonly {
      id: string;
      icon: LucideIcon;
      zh: string;
      en: string;
      onClick: () => void;
    }[],
  ) => (
    <div className="account-panel-grid">
      {items.map((item) => (
        <button key={item.id} onClick={item.onClick}>
          <span className="account-panel-icon">
            <item.icon size={20} />
          </span>
          <span>{t(item.zh, item.en)}</span>
        </button>
      ))}
    </div>
  );
  return createPortal(
    <div
      className="account-panel-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="account-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-title"
      >
        <header className="account-panel-header">
          <h1 id="account-panel-title">{t("账户中心", "Account")}</h1>
          <button
            className="ui-icon-btn"
            aria-label={t("关闭账户面板", "Close account panel")}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        <div className="account-panel-body">
          <div className="account-panel-profile">
            <span className="account-panel-avatar">
              <User size={32} />
            </span>
            <div>
              <h2>
                GUEST-16bf <span className="ui-badge-warn">DEMO</span>
              </h2>
              <p>ID 602656</p>
              <span>{email}</span>
            </div>
          </div>
          <section>
            <h2>{t("用户", "User")}</h2>
            {menu([
              {
                id: "following",
                icon: Users,
                zh: "我的关注",
                en: "Following",
                onClick: () => {
                  onClose();
                  community.openFollowing();
                },
              },
            ])}
          </section>
          <section>
            <h2>{t("资产管理", "Assets")}</h2>
            {menu(
              ASSETS.map((item) => ({
                ...item,
                onClick: () => onAsset(item.id),
              })),
            )}
          </section>
          <section>
            <h2>{t("直播", "Live")}</h2>
            {menu([
              {
                id: "live",
                icon: Radio,
                zh: "直播大厅",
                en: "Live rooms",
                onClick: onLive,
              },
              {
                id: "studio",
                icon: MonitorPlay,
                zh: "直播工作台",
                en: "Live studio",
                onClick: onStudio,
              },
            ])}
          </section>
          <section>
            <h2>{t("账户安全", "Security")}</h2>
            {menu(
              SECURITY.map((item) => ({
                ...item,
                onClick: () => onAsset(item.id),
              })),
            )}
          </section>
          <section>
            <h2>{t("服务", "Service")}</h2>
            {menu([
              {
                id: "support",
                icon: Headphones,
                zh: "客服中心",
                en: "Help center",
                onClick: onSupport,
              },
            ])}
          </section>
          <div className="account-panel-footer">
            <span>
              {t("模拟账户 · 虚拟资金", "Demo account · Virtual funds")}
            </span>
            <button className="ui-btn" onClick={onLogout}>
              <LogOut size={16} />
              {t("退出登录", "Log out")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
