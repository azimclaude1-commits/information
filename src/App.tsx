import React, { useState, useEffect, useMemo } from "react";
import {
  Sun,
  Moon,
  Gift,
  User,
  X,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  ArrowLeftRight,
  Banknote,
  FileText,
  QrCode,
  LogOut,
  Activity,
  ChevronDown,
  ChevronRight,
  Languages,
  Home,
  CandlestickChart,
  ScanLine,
  Newspaper,
  Crown,
} from "lucide-react";
import { INITIAL_INSTRUMENTS, Instrument } from "./data/marketData";
import { DividendsAndHotView } from "./components/DividendsAndHotView";
import { NewsAndCalendarView } from "./components/NewsAndCalendarView";
import { LiveStreamView } from "./components/LiveStreamView";
import { LiveStudioView } from "./components/live/LiveStudioView";
import { AccountPanel } from "./components/AccountPanel";
import { CommunityProvider } from "./components/community/Community";
import { FloatingLive } from "./components/live/LivePrograms";
import { useLive } from "./components/live/useLive";
import { LiveBanner } from "./components/live/LiveShared";
import { WithdrawView, AssetSubPage } from "./components/WithdrawView";
import { ResearchView, ResearchTab } from "./components/ResearchViews";
import { HomeDashboard } from "./components/HomeDashboard";
import { FlashNewsView, HeadlinesView } from "./components/NewsViews";
import { NewsHubView } from "./components/NewsHubView";
import { useMinWidth } from "./components/marketModel";
import { AiChartInsightModal } from "./components/AiChartInsightModal";
import { CheckInAndRateModal } from "./components/Modals";
import { SupportCenter } from "./components/SupportCenter";
import { AuthScreen } from "./components/auth/AuthScreen";
import { TradingWorkspace } from "./components/TradingWorkspace";
import {
  MembershipProvider,
  TierBadge,
  useMembershipStore,
} from "./components/membership/Membership";
import { MembershipView } from "./components/membership/MembershipView";
import {
  MarketKind,
  Side,
  marketOf,
  useDemoTrading,
} from "./components/demoTrading";

type NavTab =
  | "flash"
  | "headlines"
  | "market"
  | "home"
  | "market_overview"
  | "trade"
  | "futures"
  | "diagnose"
  | "dividends"
  | "news"
  | "live"
  | "live-studio"
  | "withdraw"
  | "vip";

const NAV_ITEMS: { id: NavTab; zh: string; en: string }[] = [
  { id: "home", zh: "首页", en: "Home" },
  { id: "trade", zh: "CFD交易", en: "CFD" },
  { id: "flash", zh: "快讯", en: "Flash" },
  { id: "headlines", zh: "要闻", en: "Headlines" },
  { id: "diagnose", zh: "AI诊股", en: "AI Diagnose" },
  { id: "dividends", zh: "热门", en: "Hot" },
  { id: "news", zh: "资讯日历", en: "News" },
  { id: "live", zh: "直播间", en: "Live" },
];

/** Phone tab bar: the five entries the compact nav keeps */
const MOBILE_TABS = [
  { id: "home", icon: Home, zh: "首页", en: "Home" },
  { id: "trade", icon: CandlestickChart, zh: "交易", en: "Trade" },
  { id: "diagnose", icon: ScanLine, zh: "AI诊股", en: "AI" },
  { id: "news", icon: Newspaper, zh: "资讯", en: "News" },
  { id: "withdraw", icon: User, zh: "账户", en: "Account" },
] as const;

/** Routes folded into a phone tab, so the bar can highlight the right one */
const ACTIVE_TAB_OF: Record<string, NavTab> = {
  home: "home",
  dividends: "home",
  trade: "trade",
  live: "home",
  "live-studio": "withdraw",
  vip: "withdraw",
  diagnose: "diagnose",
  news: "news",
  flash: "news",
  headlines: "news",
  withdraw: "withdraw",
};

const ROUTES: NavTab[] = [
  "home",
  "trade",
  "diagnose",
  "flash",
  "headlines",
  "dividends",
  "news",
  "live",
  "live-studio",
  "withdraw",
  "vip",
];

/** Legacy hashes that now resolve to the merged CFD desk */
const NAV_ALIASES: Record<string, NavTab> = {
  market: "trade",
  futures: "trade",
  market_overview: "home",
};

export default function App() {
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const resolveNav = (): NavTab => {
    const parts = window.location.hash.slice(1).split("/");
    if (parts[0] === "live" && parts[1] === "studio") {
      window.history.replaceState(
        null,
        "",
        `#live-studio${parts[2] ? `/${parts[2]}` : ""}`,
      );
      return "live-studio";
    }
    const raw = parts[0];
    if (NAV_ALIASES[raw]) return NAV_ALIASES[raw];
    return ROUTES.includes(raw as NavTab) ? (raw as NavTab) : "home";
  };
  const [activeNav, updateActiveNav] = useState<NavTab>(resolveNav);
  /** Below lg the nav moves to a fixed tab bar and 资讯 becomes a merged hub */
  const isDesktop = useMinWidth(1024);
  const [researchTab, setResearchTab] = useState<ResearchTab>(
    () =>
      (["diagnosis", "ace", "hotlist", "heatmap"].includes(
        window.location.hash.split("/")[1],
      )
        ? window.location.hash.split("/")[1]
        : "diagnosis") as ResearchTab,
  );
  useEffect(() => {
    const sync = () => {
      updateActiveNav(resolveNav());
      const sub = window.location.hash.split("/")[1];
      if (["diagnosis", "ace", "hotlist", "heatmap"].includes(sub))
        setResearchTab(sub as ResearchTab);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const setActiveNav = (tab: NavTab) => {
    const next = NAV_ALIASES[tab] ?? tab;
    updateActiveNav(next);
    window.scrollTo({ top: 0 });
    window.history.replaceState(null, "", `#${next}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const [instruments, setInstruments] =
    useState<Instrument[]>(INITIAL_INSTRUMENTS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("XAU/USD");
  const [deskSymbol, setDeskSymbol] = useState<string>("XAU/USD");
  const [ticketSide, setTicketSide] = useState<Record<MarketKind, Side>>({
    cfd: "buy",
    perp: "buy",
  });

  const [userEmail, setUserEmail] = useState<string>(
    "alpha.trader@mitrade-vip.com",
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState<string>("");

  const [checkInOpen, setCheckInOpen] = useState<boolean>(false);
  const [supportOpen, setSupportOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [aiInsightModalOpen, setAiInsightModalOpen] = useState<boolean>(false);
  const [assetSubPage, setAssetSubPage] = useState<AssetSubPage>("overview");
  const [assetDrawerOpen, setAssetDrawerOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const demo = useDemoTrading(instruments, lang, setToastMsg);
  const [membership, paywall] = useMembershipStore(lang, setToastMsg);
  const liveStore = useLive(lang, setToastMsg, instruments);

  const bySymbol = (symbol: string) =>
    instruments.find(
      (i) => i.symbol === symbol || i.symbol.split("/")[0] === symbol,
    );
  const selectedInstrument = useMemo(
    () =>
      instruments.find((i) => i.symbol === selectedSymbol) || instruments[0],
    [instruments, selectedSymbol],
  );
  const deskOpen = activeNav === "trade";
  const tradeInstrument = deskOpen ? bySymbol(deskSymbol) : undefined;
  const aiInstrument = tradeInstrument ?? selectedInstrument;
  /** The desk keeps USD margin for CFDs and USDT margin for perps in one trading account */
  const deskMarket: MarketKind = marketOf(aiInstrument);

  // Simulated WebSocket Market Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setInstruments((prev) =>
        prev.map((item) => {
          if (Math.random() > 0.38) {
            return item.flash ? { ...item, flash: null } : item;
          }
          const dir = Math.random() > 0.48 ? 1 : -1;
          const basePrice =
            INITIAL_INSTRUMENTS.find((i) => i.symbol === item.symbol)?.price ??
            item.price;
          const pctMove =
            (Math.random() * 0.00016 + 0.00002) * dir -
            ((item.price - basePrice) / basePrice) * 0.04;
          const newPrice = Number(
            Math.max(0.0001, item.price * (1 + pctMove)).toFixed(item.decimals),
          );
          const spreadOffset = (item.ask - item.bid) / 2;
          const newBid = Number(
            (newPrice - spreadOffset).toFixed(item.decimals),
          );
          const newAsk = Number(
            (newPrice + spreadOffset).toFixed(item.decimals),
          );
          const newChange = Number(
            (item.change24h + (newPrice - item.price)).toFixed(item.decimals),
          );
          const newChangePct = Number(
            ((newChange / (newPrice - newChange)) * 100).toFixed(2),
          );

          return {
            ...item,
            price: newPrice,
            bid: newBid,
            ask: newAsk,
            change24h: newChange,
            changePercent24h: newChangePct,
            high24h: Math.max(item.high24h, newPrice),
            low24h: Math.min(item.low24h, newPrice),
            flash: dir > 0 ? "up" : "down",
          };
        }),
      );
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Theme on <html> so page background, overscroll and native controls follow it too
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  /** Every symbol trades on the single desk; crypto just switches the active account */
  const openTrade = (symbol: string, side?: Side) => {
    const inst = bySymbol(symbol);
    if (!inst) return false;
    setDeskSymbol(inst.symbol);
    if (side) setTicketSide((old) => ({ ...old, [marketOf(inst)]: side }));
    setSelectedSymbol(inst.symbol);
    setActiveNav("trade");
    return true;
  };

  const handleQuickTradeFromOtherPage = (symbol: string, side: Side) => {
    if (!openTrade(symbol, side)) {
      setToastMsg(lang === "zh" ? "暂无该品种行情" : "Instrument unavailable");
      return;
    }
    const inst = bySymbol(symbol)!;
    setToastMsg(
      lang === "zh"
        ? `已带入 ${inst.symbol} ${side === "buy" ? "买入做多" : "卖出做空"} 模拟下单面板`
        : `Loaded ${inst.symbol} ${side.toUpperCase()} demo ticket`,
    );
  };

  const openAssetPage = (page: AssetSubPage) => {
    setAssetSubPage(page);
    setActiveNav("withdraw");
    setAssetDrawerOpen(false);
  };

  /** 交易台 AI 解读 draws from the shared daily AI quota; reopening the same symbol today is free. */
  const insightKey = `insight:${aiInstrument.symbol}`;
  const insightLabel = `${aiInstrument.symbol} ${lang === "zh" ? "AI 解读" : "AI insight"}`;
  const openAiInsight = () => {
    if (membership.request("insight", insightKey, insightLabel))
      setAiInsightModalOpen(true);
  };

  const navLabel = (item: (typeof NAV_ITEMS)[number]) =>
    lang === "zh" ? item.zh : item.en;

  return (
    <CommunityProvider live={liveStore} lang={lang}>
      <MembershipProvider value={membership}>
      <div className={theme === "dark" ? "dark" : ""}>
        {assetDrawerOpen && (
          <AccountPanel
            lang={lang}
            email={userEmail}
            onClose={() => setAssetDrawerOpen(false)}
            onAsset={openAssetPage}
            onLive={() => {
              setAssetDrawerOpen(false);
              setActiveNav("live");
            }}
            onStudio={() => {
              setAssetDrawerOpen(false);
              setActiveNav("live-studio");
            }}
            onSupport={() => {
              setAssetDrawerOpen(false);
              setSupportOpen(true);
            }}
            onMembership={(path) => {
              setAssetDrawerOpen(false);
              membership.open(path);
            }}
            onLogout={() => {
              setAssetDrawerOpen(false);
              setIsLoggedIn(false);
              setAuthModalOpen(true);
            }}
          />
        )}
        <div className="min-h-screen flex flex-col bg-canvas text-ink">
          <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_0_var(--ui-line)]">
            <div className="h-14 px-3 sm:px-4 lg:px-6 flex items-center gap-3 lg:gap-5 xl:gap-8">
              <a
                href="#home"
                aria-label="AlphaPulse"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav("home");
                }}
                className="flex items-center gap-2.5 shrink-0"
              >
                <span className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#4b84ff] to-[#1f55f0] text-white flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(41,98,255,0.7)]">
                  <Activity className="w-[17px] h-[17px]" strokeWidth={2.6} />
                </span>
                <span className="hidden xs:flex items-baseline gap-1.5">
                  <span className="text-[17px] font-bold tracking-[-0.02em] text-ink">
                    AlphaPulse
                  </span>
                  <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-ink-3">
                    Pro
                  </span>
                </span>
              </a>

              <nav
                aria-label={lang === "zh" ? "主导航" : "Primary"}
                className="hidden lg:flex self-stretch items-stretch min-w-0 overflow-x-auto no-scrollbar"
              >
                {NAV_ITEMS.map((item) => {
                  const active = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={`relative px-2.5 xl:px-3 text-[14px] whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? "text-ink font-semibold"
                          : "text-ink-2 font-medium hover:text-ink"
                      }`}
                    >
                      {navLabel(item)}
                      <span
                        className={`absolute left-2.5 right-2.5 xl:left-3 xl:right-3 bottom-0 h-[2px] rounded-full bg-brand transition-opacity ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              <div className="relative ml-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
                {isLoggedIn && (
                  <button
                    onClick={() => membership.open()}
                    aria-label={lang === "zh" ? "会员中心" : "Membership"}
                    className={`mb-head-vip is-${membership.tier} ${
                      activeNav === "vip" ? "is-active" : ""
                    }`}
                  >
                    {membership.tier === "free" ? (
                      <>
                        <Crown className="w-4 h-4 shrink-0" />
                        <span>{lang === "zh" ? "开通会员" : "Go Premium"}</span>
                      </>
                    ) : (
                      <TierBadge tier={membership.tier} lang={lang} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => openAssetPage("overview")}
                  className={`ui-btn h-8 px-2.5 sm:px-3 ${
                    activeNav === "withdraw" ? "ui-btn-soft" : ""
                  }`}
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline lg:hidden xl:inline">
                    {lang === "zh" ? "模拟资产" : "Demo Assets"}
                  </span>
                </button>

                <button
                  aria-label={lang === "zh" ? "签到" : "Bonus"}
                  onClick={() => setCheckInOpen(true)}
                  className="ui-btn h-8 px-2.5 sm:px-3 border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline lg:hidden xl:inline">
                    {lang === "zh" ? "签到" : "Bonus"}
                  </span>
                </button>

                <span className="hidden sm:block w-px h-5 bg-line mx-1" />

                <button
                  aria-label={lang === "zh" ? "切换语言" : "Switch language"}
                  onClick={() => setLang(lang === "zh" ? "en" : "zh")}
                  className="ui-icon-btn w-auto px-2 gap-1.5 text-[12px] font-semibold"
                >
                  <Languages className="hidden 2xl:block w-4 h-4" />
                  {lang === "zh" ? "EN" : "中文"}
                </button>

                <button
                  aria-label={lang === "zh" ? "切换主题" : "Toggle theme"}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="ui-icon-btn"
                >
                  {theme === "dark" ? (
                    <Sun className="w-[18px] h-[18px] text-amber-400" />
                  ) : (
                    <Moon className="w-[18px] h-[18px]" />
                  )}
                </button>

                <button
                  aria-label={
                    lang === "zh"
                      ? isLoggedIn
                        ? "账户菜单"
                        : "注册 / 登录"
                      : isLoggedIn
                        ? "Account menu"
                        : "Sign In"
                  }
                  aria-expanded={assetDrawerOpen}
                  onClick={() => {
                    if (!isLoggedIn) {
                      setAuthModalOpen(true);
                    } else {
                      setAssetDrawerOpen(!assetDrawerOpen);
                    }
                  }}
                  className={`flex items-center gap-2 h-9 pl-1 pr-1.5 sm:pr-2 rounded-full text-left transition-colors shrink-0 ${
                    assetDrawerOpen ? "bg-surface-3" : "hover:bg-surface-3"
                  }`}
                >
                  <span
                    className={`mb-ava is-${isLoggedIn ? membership.tier : "free"}`}
                  >
                    <User className="w-4 h-4" />
                    {isLoggedIn &&
                      (membership.tier === "free" ? (
                        <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-surface" />
                      ) : (
                        <i>
                          <Crown strokeWidth={2.6} />
                        </i>
                      ))}
                  </span>
                  <span className="hidden 2xl:block leading-tight">
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-ink">
                      {isLoggedIn
                        ? "GUEST-16bf"
                        : lang === "zh"
                          ? "注册 / 登录"
                          : "Sign In"}
                    </span>
                    <span className="block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      {isLoggedIn
                        ? membership.tier !== "free"
                          ? lang === "zh"
                            ? membership.plan.zh
                            : membership.plan.en
                          : lang === "zh"
                            ? "模拟账户"
                            : "Demo account"
                        : "Email Auth"}
                    </span>
                  </span>
                  <ChevronDown
                    className={`hidden sm:block w-3.5 h-3.5 text-ink-3 transition-transform ${
                      assetDrawerOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live ticker tape (lg+) */}
            <div className="hidden lg:block h-8 border-t border-line overflow-hidden">
              <div className="ticker-track flex items-stretch h-full w-max">
                {[...instruments.slice(0, 14), ...instruments.slice(0, 14)].map(
                  (i, idx) => {
                    const up = i.changePercent24h >= 0;
                    return (
                      <button
                        key={`${i.symbol}-${idx}`}
                        onClick={() => openTrade(i.symbol)}
                        className="group/tk flex items-center gap-2 px-4 text-[12px] whitespace-nowrap shrink-0 hover:bg-surface-2 transition-colors"
                      >
                        <span className="font-medium text-ink-2 group-hover/tk:text-brand transition-colors">
                          {i.symbol}
                        </span>
                        <span className="text-ink tabular-nums">
                          {i.price.toLocaleString("en-US", {
                            minimumFractionDigits: i.decimals,
                            maximumFractionDigits: i.decimals,
                          })}
                        </span>
                        <span
                          className={`font-medium tabular-nums ${
                            up ? "text-up" : "text-down"
                          }`}
                        >
                          {up ? "+" : ""}
                          {i.changePercent24h.toFixed(2)}%
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </header>

          {toastMsg && (
            <div
              role="status"
              className="ui-fade-in fixed bottom-[72px] lg:bottom-5 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-md z-[60] flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#111827] dark:bg-[#1c2433] text-white text-[13px] font-medium leading-5 shadow-xl ring-1 ring-white/10"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <span className="flex-1 min-w-0">{toastMsg}</span>
              <button
                aria-label={lang === "zh" ? "关闭" : "Close"}
                onClick={() => setToastMsg(null)}
                className="-mr-1 p-0.5 rounded text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <main className="flex-1 min-w-0 pb-[var(--app-tabbar-h)]">
            {activeNav === "home" && (
              <HomeDashboard
                instruments={instruments}
                lang={lang}
                demo={demo.summary}
                live={liveStore}
                onSelectSymbol={setSelectedSymbol}
                onNavigate={setActiveNav}
                onOpenTrade={openTrade}
                onResearch={(tab) => {
                  setResearchTab(tab);
                  setActiveNav("diagnose");
                  window.history.replaceState(null, "", `#diagnose/${tab}`);
                }}
              />
            )}
            {activeNav === "flash" && (
              <FlashNewsView
                onOpenMarket={(symbol) => {
                  if (!openTrade(symbol)) setToastMsg("暂无该品种行情");
                }}
              />
            )}
            {activeNav === "headlines" && (
              <HeadlinesView
                onOpenMarket={(symbol) => {
                  if (!openTrade(symbol)) setToastMsg("暂无该品种行情");
                }}
              />
            )}

            {deskOpen && (
              <TradingWorkspace
                instruments={instruments}
                symbol={deskSymbol}
                onSelectSymbol={(s) => {
                  setDeskSymbol(s);
                  setSelectedSymbol(s);
                }}
                demo={demo}
                side={ticketSide[deskMarket]}
                onSideChange={(side) =>
                  setTicketSide((old) => ({ ...old, [deskMarket]: side }))
                }
                lang={lang}
                theme={theme}
                onOpenAiModal={openAiInsight}
                onToast={setToastMsg}
                onOpenAssets={(page = "overview") => openAssetPage(page)}
                live={
                  <div className="live-trade-entry">
                    <LiveBanner
                      store={liveStore}
                      lang={lang}
                      compact
                      onOpen={() => setActiveNav("live")}
                    />
                  </div>
                }
              />
            )}

            {activeNav === "diagnose" && (
              <ResearchView
                instruments={instruments}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                onQuickTrade={handleQuickTradeFromOtherPage}
                lang={lang}
                onNavigate={setActiveNav}
                tab={researchTab}
                onTabChange={(tab) => {
                  setResearchTab(tab);
                  window.history.replaceState(null, "", `#diagnose/${tab}`);
                }}
              />
            )}

            {activeNav === "dividends" && (
              <DividendsAndHotView
                instruments={instruments}
                lang={lang}
                onQuickTrade={handleQuickTradeFromOtherPage}
                onOpenAiDiagnose={(sym) => {
                  setSelectedSymbol(sym);
                  setActiveNav("diagnose");
                }}
              />
            )}

            {activeNav === "news" &&
              (isDesktop ? (
                <NewsAndCalendarView
                  lang={lang}
                  onQuickTrade={handleQuickTradeFromOtherPage}
                />
              ) : (
                <NewsHubView
                  lang={lang}
                  onQuickTrade={handleQuickTradeFromOtherPage}
                  onOpenMarket={(symbol) => {
                    if (!openTrade(symbol)) setToastMsg("暂无该品种行情");
                  }}
                />
              ))}

            {activeNav === "live-studio" && (
              <LiveStudioView
                store={liveStore}
                instruments={instruments}
                lang={lang}
                onToast={setToastMsg}
              />
            )}

            {activeNav === "live" && (
              <LiveStreamView
                store={liveStore}
                demo={demo}
                onToast={setToastMsg}
                instruments={instruments}
                lang={lang}
                onQuickTrade={handleQuickTradeFromOtherPage}
              />
            )}

            {activeNav === "vip" && (
              <MembershipView
                lang={lang}
                onSupport={() => setSupportOpen(true)}
              />
            )}

            {activeNav === "withdraw" && (
              <WithdrawView
                lang={lang}
                userEmail={userEmail}
                isLoggedIn={isLoggedIn}
                initialSubPage={assetSubPage}
                onToast={setToastMsg}
                onLogout={() => {
                  setIsLoggedIn(false);
                  setToastMsg(lang === "zh" ? "已退出登录" : "Logged out");
                }}
                onRegisterEmail={(em) => {
                  setUserEmail(em);
                  setIsLoggedIn(true);
                }}
                phoneVerified={phoneVerified}
                verifiedPhoneNumber={verifiedPhoneNumber}
                onVerifyPhone={(ph) => {
                  setPhoneVerified(true);
                  setVerifiedPhoneNumber(ph);
                  setToastMsg(
                    lang === "zh"
                      ? `手机号 ${ph} 验证成功，账户安全等级已提升`
                      : `Mobile ${ph} verified — account security upgraded.`,
                  );
                }}
                accounts={demo.accounts}
                onAccountsChange={demo.setAccounts}
                ledger={demo.ledger}
                onLedgerChange={demo.setLedger}
                onWithdrawReward={demo.withdrawReward}
                tradingSummary={demo.summary}
                positions={demo.positions}
                orders={demo.orders}
                instruments={instruments}
                onClaimDemoFunds={() => {
                  demo.claimDemoFunds(10000);
                  setToastMsg(
                    lang === "zh"
                      ? "已领取 10,000 USDT 模拟金，已存入模拟资金账户"
                      : "Claimed 10,000 USDT demo funds into the funding account",
                  );
                }}
                onResetDemo={() => {
                  demo.resetDemo();
                  setToastMsg(
                    lang === "zh"
                      ? "模拟账户已重置为初始资金与持仓"
                      : "Demo account reset to initial funds and positions",
                  );
                }}
                onOpenTrade={(m, symbol) => {
                  if (!symbol || !openTrade(symbol)) {
                    setDeskSymbol(m === "perp" ? "BTC/USD" : "XAU/USD");
                    setActiveNav("trade");
                  }
                }}
              />
            )}
          </main>
          <FloatingLive
            store={liveStore}
            lang={lang}
            active={activeNav !== "live" && activeNav !== "live-studio"}
          />

          {/* Phone tab bar — replaces the desktop nav strip below lg */}
          <nav
            aria-label={lang === "zh" ? "主导航" : "Primary"}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-surface/95 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]"
          >
            {MOBILE_TABS.map((item) => {
              const active = ACTIVE_TAB_OF[activeNav] === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex-1 h-14 flex flex-col items-center justify-center gap-1 text-[11px] whitespace-nowrap transition-colors ${
                    active ? "text-brand font-semibold" : "text-ink-3"
                  }`}
                >
                  <Icon
                    className="w-[19px] h-[19px]"
                    strokeWidth={active ? 2.3 : 1.8}
                  />
                  {lang === "zh" ? item.zh : item.en}
                </button>
              );
            })}
          </nav>

          <AiChartInsightModal
            isOpen={aiInsightModalOpen}
            onClose={() => setAiInsightModalOpen(false)}
            instrument={aiInstrument}
            lang={lang}
            onRegenerate={() =>
              membership.request("insight", insightKey, insightLabel, {
                force: true,
              })
            }
            onQuickOrder={(side) => {
              const market = marketOf(aiInstrument);
              setTicketSide((old) => ({ ...old, [market]: side }));
              if (!deskOpen) openTrade(aiInstrument.symbol, side);
              setToastMsg(
                lang === "zh"
                  ? `已根据 AI解读带入 ${aiInstrument.symbol} ${side === "buy" ? "做多" : "做空"}方向`
                  : `Applied AI ${side.toUpperCase()} setup for ${aiInstrument.symbol}`,
              );
            }}
          />

          <CheckInAndRateModal
            isOpen={checkInOpen}
            onClose={() => setCheckInOpen(false)}
            lang={lang}
            rewardBalance={demo.accounts.reward?.USDT ?? 0}
            onWithdraw={() => {
              setCheckInOpen(false);
              openAssetPage("reward_withdraw");
            }}
            onClaimReward={(amt, note) => {
              demo.creditReward(amt, note);
              setToastMsg(
                lang === "zh"
                  ? `奖励已到账：+${amt.toFixed(2)} USDT 已计入奖励账户，可在「奖励提现」中提取`
                  : `Reward credited: +${amt.toFixed(2)} USDT added to your reward account`,
              );
            }}
          />

          {supportOpen && (
            <SupportCenter
              lang={lang}
              account={userEmail}
              onClose={() => setSupportOpen(false)}
            />
          )}

          <AuthScreen
            open={authModalOpen}
            lang={lang}
            onClose={() => setAuthModalOpen(false)}
            onToast={setToastMsg}
            onAuthenticated={(identity) => {
              setUserEmail(identity.display);
              setIsLoggedIn(true);
              setPhoneVerified(!!identity.phone);
              setVerifiedPhoneNumber(identity.phone || "");
            }}
          />
          {paywall}
        </div>
      </div>
      </MembershipProvider>
    </CommunityProvider>
  );
}
