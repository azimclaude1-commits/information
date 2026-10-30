import React, { useState, useEffect, type SetStateAction } from 'react';
import {
  CandlestickChart,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ShieldCheck,
  Smartphone,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Building2,
  HelpCircle,
  FileText,
  CreditCard,
  KeyRound,
  LogOut,
  Copy,
  Plus,
  Trash2,
  QrCode,
  Lock,
} from 'lucide-react';
import {
  stamp,
  REWARD_WITHDRAW_FEE_USDT,
  type AccountKey,
  type AccountSummary,
  type DemoAccounts,
  type DemoOrder,
  type LedgerRecord,
  type MarketKind,
  type PositionRow,
} from './demoTrading';
import type { Instrument } from '../data/marketData';
import { AssetPortfolio, buildPortfolio } from './AssetPortfolio';
import { AssetHome } from './AssetHome';
import { PhoneBindSheet, PinPrompt, SecurityCenter } from './security/SecurityCenter';
import { useSecurity } from './security/securityState';
import { RecordDetail } from './RecordDetail';

export type AssetSubPage =
  | 'overview'
  | 'details'
  | 'deposit'
  | 'withdraw'
  | 'reward_withdraw'
  | 'transfer'
  | 'records'
  | 'address_book'
  | 'bank_cards'
  | 'authenticator'
  | 'security';

/** The funding wallet and the single trading account that margin moves in and out of */
type WalletAcct = 'cash' | 'stock';

interface WithdrawAndAuthViewsProps {
  lang: 'zh' | 'en';
  userEmail: string;
  isLoggedIn: boolean;
  onRegisterEmail: (email: string) => void;
  phoneVerified: boolean;
  verifiedPhoneNumber: string;
  onVerifyPhone: (phone: string) => void;
  /** Shared demo account balances (cash / CFD / perpetual) */
  accounts: DemoAccounts;
  onAccountsChange: (action: SetStateAction<DemoAccounts>) => void;
  ledger: LedgerRecord[];
  onLedgerChange: (action: SetStateAction<LedgerRecord[]>) => void;
  tradingSummary: Record<MarketKind, AccountSummary>;
  positions: PositionRow[];
  orders: DemoOrder[];
  instruments: Instrument[];
  onClaimDemoFunds: () => void;
  onResetDemo: () => void;
  onOpenTrade: (market: MarketKind, symbol?: string) => void;
  /** Move USDT out of the reward account; returns false when the balance is insufficient */
  onWithdrawReward: (amount: number, fee: number, network: string, address: string) => boolean;
  onCompleteWithdrawal?: (amount: number, method: string) => void;
  onCompleteDeposit?: (amount: number) => void;
  initialSubPage?: AssetSubPage;
  onLogout?: () => void;
  onToast: (text: string) => void;
}

/** Demo-only prototype: real-money pages (deposit / exchange withdrawal / address book / bank cards) are not reachable */
const DEMO_PAGES: AssetSubPage[] = ['overview', 'details', 'reward_withdraw', 'transfer', 'records', 'authenticator', 'security'];
const demoPage = (page: AssetSubPage) => (DEMO_PAGES.includes(page) ? page : 'overview');

export const WithdrawView: React.FC<WithdrawAndAuthViewsProps> = ({
  lang,
  userEmail,
  phoneVerified,
  verifiedPhoneNumber,
  onVerifyPhone,
  accounts,
  onAccountsChange,
  ledger,
  onLedgerChange,
  tradingSummary,
  positions,
  orders,
  instruments,
  onClaimDemoFunds,
  onResetDemo,
  onOpenTrade,
  onWithdrawReward,
  onCompleteWithdrawal = () => {},
  onCompleteDeposit,
  initialSubPage = 'overview',
  onLogout,
  onToast,
}) => {
  const [subPage, setPage] = useState<AssetSubPage>(demoPage(initialSubPage));
  const setSubPage = (page: AssetSubPage) => setPage(demoPage(page));

  useEffect(() => {
    if (initialSubPage) {
      setSubPage(initialSubPage);
    }
  }, [initialSubPage]);

  const [withdrawMethod, setWithdrawMethod] = useState<'onchain' | 'assisted'>('onchain');

  // 奖励提现 form
  const [rewardNet, setRewardNet] = useState<'TRC20' | 'ERC20' | 'BEP20'>('TRC20');
  const [rewardAddress, setRewardAddress] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardNote, setRewardNote] = useState<{ ok: boolean; text: string } | null>(null);
  const rewardBalance = accounts.reward?.USDT ?? 0;
  const rewardFee = REWARD_WITHDRAW_FEE_USDT;
  const rewardAmountNum = Number(rewardAmount);
  const rewardValid =
    rewardAddress.trim().length >= 16 &&
    rewardAmountNum > 0 &&
    rewardAmountNum + rewardFee <= rewardBalance;

  const submitRewardWithdrawal = (e: React.FormEvent, pinChecked = false) => {
    e.preventDefault?.();
    if (!phoneVerified) {
      setRewardNote({
        ok: false,
        text: lang === 'zh' ? '请先绑定手机号再发起提现' : 'Bind a mobile number first',
      });
      setShowPhoneVerifyModal(true);
      return;
    }
    if (!rewardValid) {
      setRewardNote({
        ok: false,
        text:
          lang === 'zh'
            ? '请填写有效收款地址，且提现金额加手续费不超过可提现余额'
            : 'Check the address, amount and fee against your balance',
      });
      return;
    }
    if (security.pin.value && security.pin.scopes.withdraw && !pinChecked) {
      setPinPrompt(() => () => submitRewardWithdrawal(e, true));
      return;
    }
    const ok = onWithdrawReward(
      rewardAmountNum,
      rewardFee,
      rewardNet,
      rewardAddress.trim(),
    );
    setRewardNote(
      ok
        ? {
            ok: true,
            text:
              lang === 'zh'
                ? `提现已提交：${rewardAmountNum.toFixed(2)} USDT，网络手续费 ${rewardFee} USDT，模拟 ${rewardNet} 链上确认约需 2 小时`
                : `Withdrawal submitted: ${rewardAmountNum.toFixed(2)} USDT via ${rewardNet}`,
          }
        : {
            ok: false,
            text: lang === 'zh' ? '奖励账户余额不足' : 'Insufficient reward balance',
          },
    );
    if (ok) {
      setRewardAmount('');
      setRewardAddress('');
    }
  };

  const accountId = `D${String(
    [...userEmail].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % 100000000,
  ).padStart(8, '0')}`;
  const portfolio = buildPortfolio({
    accounts,
    positions,
    orders,
    summary: tradingSummary,
    instruments,
  });

  // Account Balances State (funding wallet + one trading account + rewards) — lifted to App so trading and assets share one demo account
  const acctBalances = accounts;
  const setAcctBalances = onAccountsChange;
  const availableBalance = accounts.stock.USD ?? 0;
  /** The trading account only lets go of margin that open positions / orders are not holding */
  const transferable = (acct: WalletAcct, coin: string) => {
    const bal = (acctBalances[acct] as Record<string, number>)[coin] || 0;
    const free =
      acct === 'stock'
        ? coin === 'USD'
          ? tradingSummary.cfd.freeMargin
          : coin === 'USDT'
            ? tradingSummary.perp.freeMargin
            : Infinity
        : Infinity;
    return Math.max(0, Math.floor(Math.min(bal, free) * 100) / 100);
  };
  const acctName = (acct: WalletAcct) =>
    lang === 'zh'
      ? { cash: '资金账户 (模拟)', stock: '交易账户 (模拟)' }[acct]
      : { cash: 'Funding (demo)', stock: 'Trading (demo)' }[acct];

  // Deposit State
  const [depositCoin, setDepositCoin] = useState<'USDT' | 'USDC' | 'BTC' | 'ETH'>('USDT');
  const [depositNet, setDepositNet] = useState<'TRC20' | 'ERC20' | 'ARB' | 'SOL'>('TRC20');
  const [depositTargetAcct, setDepositTargetAcct] = useState<WalletAcct>('cash');

  // Transfer State
  const [fromAcct, setFromAcct] = useState<WalletAcct>('cash');
  const [toAcct, setToAcct] = useState<WalletAcct>('stock');
  const [transferCoin, setTransferCoin] = useState<'USDT' | 'USD' | 'BTC' | 'ETH'>('USDT');

  // Records Filter State
  const [recordFilter, setRecordFilter] = useState<'all' | 'transfer' | 'trade' | 'credit' | 'dividend'>('all');

  // Address Book State
  const [savedAddresses, setSavedAddresses] = useState<{
    id: string; label: string; coin: string;
    network: 'TRC20' | 'ERC20' | 'ARB' | 'SOL';
    address: string; whitelisted: boolean; addedDate: string;
  }[]>([
    {
      id: 'ADDR-01',
      label: 'Binance 冷钱包主地址',
      coin: 'USDT',
      network: 'TRC20' as const,
      address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
      whitelisted: true,
      addedDate: '2026-09-12',
    },
    {
      id: 'ADDR-02',
      label: 'OKX 多签机构金库',
      coin: 'USDT',
      network: 'ARB' as const,
      address: '0x71C94F8B1E2904A2B68E28A9210E89A2F10489A2',
      whitelisted: true,
      addedDate: '2026-09-18',
    },
    {
      id: 'ADDR-03',
      label: 'Ledger 硬件冷钱包',
      coin: 'USDC',
      network: 'ERC20' as const,
      address: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
      whitelisted: false,
      addedDate: '2026-09-26',
    },
  ]);
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrCoin, setNewAddrCoin] = useState<'USDT' | 'USDC' | 'BTC' | 'ETH'>('USDT');
  const [newAddrNet, setNewAddrNet] = useState<'TRC20' | 'ERC20' | 'ARB' | 'SOL'>('TRC20');
  const [newAddrValue, setNewAddrValue] = useState('');
  const [newAddrWhitelist, setNewAddrWhitelist] = useState(true);

  // Bank Cards State
  const [bankCards, setBankCards] = useState([
    {
      id: 'BK-01',
      bankName: 'HSBC Hong Kong (香港汇丰银行)',
      holder: 'CHEN MING / ALPHA HOLDINGS LTD',
      accountNo: '801-492810-838',
      swift: 'HSBCHKHHHKH',
      currency: 'USD / HKD',
      region: 'Hong Kong',
      isDefault: true,
    },
    {
      id: 'BK-02',
      bankName: 'Citibank N.A. New York (美国花旗银行)',
      holder: 'CHEN MING',
      accountNo: '4928-1049-8821',
      swift: 'CITIUS33XXX',
      currency: 'USD',
      region: 'United States',
      isDefault: false,
    },
  ]);
  const [newBankName, setNewBankName] = useState('');
  const [newBankHolder, setNewBankHolder] = useState('CHEN MING');
  const [newBankNo, setNewBankNo] = useState('');
  const [newBankSwift, setNewBankSwift] = useState('');
  const [newBankCurrency, setNewBankCurrency] = useState('USD / HKD');

  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState<boolean>(false);
  const [pinPrompt, setPinPrompt] = useState<(() => void) | null>(null);
  const [recordDetail, setRecordDetail] = useState<LedgerRecord | null>(null);
  const { state: security } = useSecurity();

  // Step 1-2-3 Exchange On-Chain Withdrawal State
  const [selectedCoin, setSelectedCoin] = useState<'USDT' | 'USDC' | 'BTC' | 'ETH'>('USDT');
  const [network, setNetwork] = useState<'TRC20' | 'ERC20' | 'ARB' | 'SOL'>('TRC20');
  const [address, setAddress] = useState('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE');
  const [amount, setAmount] = useState<string>('1000');
  const [showAddressBook, setShowAddressBook] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'warn'; text: string } | null>(null);

  // Assisted / Dedicated CS Withdrawal State
  const [settlementChannel, setSettlementChannel] = useState<'swift' | 'hk_fps' | 'otc_block'>('swift');
  const [beneficiaryName, setBeneficiaryName] = useState('CHEN MING / ALPHA HOLDINGS LTD');
  const [bankName, setBankName] = useState('HSBC Hong Kong (SWIFT: HSBCHKHHHKH)');
  const [bankAccount, setBankAccount] = useState('801-492810-838');
  const [assistedAmount, setAssistedAmount] = useState('5000');
  const [csChatLogs, setCsChatLogs] = useState<{ sender: 'desk' | 'user'; time: string; msg: string }[]>([
    {
      sender: 'desk',
      time: '10:25',
      msg:
        lang === 'zh'
          ? '您好，这里是资金清算中心人工出金专席（工号 #019 Anna）。您可在此提交国际电汇 (SWIFT)、港美银行卡或大宗场外提现申请，专员为您提供 1 对 1 优先结算。'
          : 'Welcome to the Institutional Treasury Desk (Specialist #019 Anna). Submit SWIFT wire, HK/US bank transfer, or OTC block withdrawal requests here.',
    },
  ]);
  const [csInput, setCsInput] = useState('');
  const [transferAmount, setTransferAmount] = useState('500');

  const records = ledger;
  const setRecords = onLedgerChange;
  const ledgerRows = [
    ...records,
    {
      id: 'DIV-20261001802',
      time: '2026-10-01 21:00:00',
      coin: 'USD (股息)',
      network: '模拟 CFD 账户 · KO 季度派息',
      address: 'Ex-Dividend Cash Credit',
      amount: 485.0,
      fee: 0,
      statusZh: '已派发',
      statusEn: 'Distributed',
      txId: 'DIV-KO-Q3',
    },
    {
      id: 'TR-20260930512',
      time: '2026-09-30 14:18:22',
      coin: 'USDT',
      network: 'CASH → FUTURES 划转',
      address: 'Internal 0-Fee Transfer',
      amount: 20000.0,
      fee: 0,
      statusZh: '已完成',
      statusEn: 'Completed',
      txId: 'INTERNAL-9921',
    },
  ].filter((r) => {
    if (recordFilter === 'all') return true;
    if (recordFilter === 'trade') return r.id.startsWith('TS-');
    if (recordFilter === 'transfer') return r.id.startsWith('TR-');
    if (recordFilter === 'credit') return r.id.startsWith('DC-');
    if (recordFilter === 'dividend') return r.id.startsWith('DIV-') || r.id.startsWith('DV-');
    return true;
  });
  const ledgerSign = (r: LedgerRecord) => (r.amount < 0 || /^(WD|OTC)-/.test(r.id) ? '-' : '+');
  const ledgerTone = (r: LedgerRecord) => (r.id.startsWith('TS-') ? (r.amount >= 0 ? 'text-up' : 'text-down') : 'text-ink');

  const networkSpecs: Record<
    typeof network,
    { label: string; fee: number; min: number; arrival: string; confirms: string }
  > = {
    TRC20: { label: 'TRON (TRC20)', fee: 1.0, min: 10, arrival: '~ 2 mins', confirms: '20 Blocks' },
    ERC20: { label: 'Ethereum (ERC20)', fee: 4.0, min: 20, arrival: '~ 5 mins', confirms: '12 Blocks' },
    ARB: { label: 'Arbitrum One', fee: 0.5, min: 10, arrival: '~ 1 min', confirms: '15 Blocks' },
    SOL: { label: 'Solana (SPL)', fee: 0.8, min: 10, arrival: '~ 30 secs', confirms: '32 Blocks' },
  };

  const currentNet = networkSpecs[network];
  const parsedAmount = Math.max(0, Number(amount) || 0);
  const actualReceive = Math.max(0, parsedAmount - currentNet.fee);

  const handleOnChainWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneVerified) {
      setShowPhoneVerifyModal(true);
      return;
    }
    if (parsedAmount < currentNet.min || parsedAmount > availableBalance) {
      setSubmitFeedback({
        type: 'warn',
        text:
          lang === 'zh'
            ? `提现数量需不低于 ${currentNet.min} ${selectedCoin} 且不超过可用余额`
            : `Withdrawal amount must be between ${currentNet.min} ${selectedCoin} and available balance`,
      });
      return;
    }

    onCompleteWithdrawal(parsedAmount, `${selectedCoin}-${network}`);
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:18`;

    setRecords((prev) => [
      {
        id: `WD-${Date.now().toString().slice(-8)}`,
        time: ts,
        coin: selectedCoin,
        network: currentNet.label,
        address: `${address.slice(0, 6)}...${address.slice(-6)}`,
        amount: parsedAmount,
        fee: currentNet.fee,
        statusZh: '区块确认中 (1/20)',
        statusEn: 'Confirming (1/20)',
        txId: `0x${Math.random().toString(16).slice(2, 8)}...9b2a`,
      },
      ...prev,
    ]);

    setSubmitFeedback({
      type: 'success',
      text:
        lang === 'zh'
          ? `提币申请已提交：${parsedAmount.toFixed(2)} ${selectedCoin} (实际到账 ${actualReceive.toFixed(2)} ${selectedCoin})，区块广播处理中。`
          : `Withdrawal submitted: ${parsedAmount.toFixed(2)} ${selectedCoin} (Net ${actualReceive.toFixed(2)} ${selectedCoin}).`,
    });
  };

  const handleAssistedWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneVerified) {
      setShowPhoneVerifyModal(true);
      return;
    }
    const amt = Number(assistedAmount) || 0;
    if (amt < 500 || amt > availableBalance) {
      setSubmitFeedback({
        type: 'warn',
        text:
          lang === 'zh'
            ? '人工客服清算单笔最低 500 USD，且不可超过可用净值'
            : 'Minimum assisted settlement is $500 USD within available balance',
      });
      return;
    }

    onCompleteWithdrawal(amt, 'VIP-Assisted-Settlement');
    const ticketId = `OTC-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    setRecords((prev) => [
      {
        id: ticketId,
        time: ts,
        coin: 'USD',
        network: settlementChannel === 'swift' ? 'SWIFT国际电汇' : settlementChannel === 'hk_fps' ? '香港转数快 FPS' : '大宗OTC专席',
        address: `${bankName.slice(0, 12)}...`,
        amount: amt,
        fee: 0,
        statusZh: '专员清算汇出中',
        statusEn: 'Specialist Processing',
        txId: ticketId,
      },
      ...prev,
    ]);

    setCsChatLogs((prev) => [
      ...prev,
      {
        sender: 'user',
        time: '10:29',
        msg:
          lang === 'zh'
            ? `已提交人工提现申请单 [${ticketId}]：金额 $${amt.toLocaleString()} USD，收款行：${bankName} (${bankAccount})`
            : `Submitted Assisted Withdrawal [${ticketId}]: $${amt.toLocaleString()} USD to ${bankName} (${bankAccount})`,
      },
      {
        sender: 'desk',
        time: '10:29',
        msg:
          lang === 'zh'
            ? `已受理您的提现工单 [${ticketId}]！系统已核验您的绑定手机 (${verifiedPhoneNumber})，财务专席正在安排优先打款，预计 15 分钟内完成清算。`
            : `Ticket [${ticketId}] accepted! Mobile (${verifiedPhoneNumber}) verified. Our treasury desk is executing your wire transfer within 15 minutes.`,
      },
    ]);

    setSubmitFeedback({
      type: 'success',
      text:
        lang === 'zh'
          ? `专属客服提现工单 [${ticketId}] 已生成，专员 Anna 正在为您跟进打款。`
          : `Dedicated CS Withdrawal Order [${ticketId}] created and assigned to Specialist Anna.`,
    });
  };

  return (
    <div className="min-h-[calc(100dvh_-_var(--app-header-h))] flex flex-col lg:flex-row">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 w-full mx-auto p-3 md:p-6 xl:p-8 max-w-[1240px] space-y-6">
        {subPage !== 'overview' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubPage(subPage === 'authenticator' ? 'security' : 'overview')}
              aria-label={lang === 'zh' ? '返回资产' : 'Back to assets'}
              className="ui-icon-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[17px] font-semibold text-ink">
              {
                ({
                  details: ['资产明细', 'Asset breakdown'],
                  records: ['资金记录', 'Funding history'],
                  transfer: ['资金划转', 'Transfer'],
                  reward_withdraw: ['奖励提现', 'Reward withdrawal'],
                  authenticator: ['身份验证器', 'Authenticator'],
                  security: ['安全中心', 'Security'],
                } as Partial<Record<AssetSubPage, [string, string]>>)[subPage]?.[lang === 'zh' ? 0 : 1] ??
                  (lang === 'zh' ? '资产' : 'Assets')
              }
            </h1>
          </div>
        )}
        {submitFeedback && (
          <div
            className={`px-4 py-3 rounded-2xl border text-xs font-medium flex items-center justify-between ${
              submitFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <span>{submitFeedback.text}</span>
            <button onClick={() => setSubmitFeedback(null)} className="underline ml-4 cursor-pointer">
              {lang === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        )}

        {/* FORMAL EXCHANGE WITHDRAWAL PAGE */}
        {subPage === 'withdraw' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>{lang === 'zh' ? '资产管理' : 'Assets'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-slate-900 dark:text-slate-200 font-medium">
                      {lang === 'zh' ? '提币与出金' : 'Withdrawal'}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {lang === 'zh' ? '提币 / 出金' : 'Withdrawal'}
                  </h1>
                </div>

                <div className="flex items-center gap-6 ui-card px-4 py-2.5">
                  <div>
                    <div className="text-[11px] text-slate-500">{lang === 'zh' ? '可提现余额 (Available)' : 'Available Balance'}</div>
                    <div className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">USDT</span>
                    </div>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <div className="text-[11px] text-slate-500">{lang === 'zh' ? '24h 提现额度' : '24h Limit'}</div>
                    <div className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {phoneVerified ? '500,000.00 USDT' : '0.00 / 待绑定手机'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Exchange Underline Navigation */}
              <div className="flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-semibold -mb-px overflow-x-auto">
                <button
                  onClick={() => setWithdrawMethod('onchain')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    withdrawMethod === 'onchain'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {lang === 'zh' ? '链上提币 (USDT / 数字资产)' : 'On-Chain Crypto Withdrawal'}
                </button>
                <button
                  onClick={() => setWithdrawMethod('assisted')}
                  className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    withdrawMethod === 'assisted'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{lang === 'zh' ? '联系专属客服提现 (大额电汇 / 人工清算)' : 'Dedicated CS Assisted Withdrawal'}</span>
                </button>
              </div>
            </div>

            {!phoneVerified && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === 'zh'
                        ? '安全合规要求：首次提现前需完成手机号码绑定验证'
                        : 'Security Requirement: Mobile Verification Required Before Withdrawal'}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {lang === 'zh'
                        ? `当前登录邮箱为 ${userEmail}。为保障账户资金安全，请绑定手机号以开启链上提币与人工出金权限。`
                        : `Signed in as ${userEmail}. Please bind your mobile number to enable withdrawal permissions.`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPhoneVerifyModal(true)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  {lang === 'zh' ? '立即绑定手机号' : 'Verify Mobile Now'}
                </button>
              </div>
            )}

            {withdrawMethod === 'onchain' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleOnChainWithdrawSubmit}
                  className="lg:col-span-8 ui-card p-6 space-y-6"
                >
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <label className="block text-sm font-bold text-slate-900 dark:text-white">
                        {lang === 'zh' ? '选择币种' : 'Select Coin'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {(['USDT', 'USDC', 'BTC', 'ETH'] as const).map((coin) => (
                          <button
                            key={coin}
                            type="button"
                            onClick={() => setSelectedCoin(coin)}
                            className={`px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                              selectedCoin === coin
                                ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-mono text-xs">{coin}</span>
                            {selectedCoin === coin && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-bold text-slate-900 dark:text-white">
                            {lang === 'zh' ? '提币地址' : 'Withdrawal Address'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAddressBook(!showAddressBook)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{lang === 'zh' ? '地址簿' : 'Address Book'}</span>
                          </button>
                        </div>

                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg text-xs font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                        />

                        {showAddressBook && (
                          <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                            {[
                              { tag: 'Binance 冷钱包 (TRC20)', addr: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', net: 'TRC20' as const },
                              { tag: 'OKX 多签金库 (Arbitrum)', addr: '0x71C94F8B1E2904A2B68E28A9210E89A2F10489A2', net: 'ARB' as const },
                            ].map((saved, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setAddress(saved.addr);
                                  setNetwork(saved.net);
                                  setShowAddressBook(false);
                                }}
                                className="w-full text-left p-2 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                              >
                                <span className="font-medium">{saved.tag}</span>
                                <span className="font-mono text-slate-400">{saved.addr.slice(0, 10)}...</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                          {lang === 'zh' ? '转账网络 (Network)' : 'Transfer Network'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(['TRC20', 'ERC20', 'ARB', 'SOL'] as const).map((netKey) => {
                            const spec = networkSpecs[netKey];
                            const active = network === netKey;
                            return (
                              <button
                                key={netKey}
                                type="button"
                                onClick={() => setNetwork(netKey)}
                                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                                  active
                                    ? 'border-blue-600 bg-blue-600/10'
                                    : 'border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                    {spec.label}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-500">
                                    {lang === 'zh' ? '手续费' : 'Fee'} {spec.fee} {selectedCoin}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  {lang === 'zh' ? `预计 ${spec.arrival} · ${spec.confirms}` : `Est. ${spec.arrival} · ${spec.confirms}`}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-bold text-slate-900 dark:text-white">
                            {lang === 'zh' ? '提币数量' : 'Withdrawal Amount'}
                          </label>
                          <span className="text-xs text-slate-500 font-mono">
                            {lang === 'zh' ? '最低提币:' : 'Min:'} {currentNet.min} {selectedCoin}
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3.5 py-2.5 pr-24 rounded-lg text-sm font-mono font-bold bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                          />
                          <div className="absolute right-2.5 top-2 flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">{selectedCoin}</span>
                            <button
                              type="button"
                              onClick={() => setAmount(String(Math.floor(availableBalance)))}
                              className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer"
                            >
                              {lang === 'zh' ? '全部' : 'MAX'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">
                            {lang === 'zh' ? '实际到账数量' : 'Receive Amount'}
                          </div>
                          <div className="text-xl font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {actualReceive.toFixed(2)} {selectedCoin}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {lang === 'zh' ? `网络手续费: ${currentNet.fee.toFixed(2)} ${selectedCoin}` : `Network Fee: ${currentNet.fee.toFixed(2)} ${selectedCoin}`}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                        >
                          {phoneVerified
                            ? lang === 'zh'
                              ? `确认提币 ${selectedCoin}`
                              : `Withdraw ${selectedCoin}`
                            : lang === 'zh'
                            ? '验证手机号并提币'
                            : 'Verify Phone to Withdraw'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Right 4 Cols: Security Notice & CS Quick Switch */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="ui-card p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                      <span>{lang === 'zh' ? '提币安全说明' : 'Withdrawal Notes'}</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-4">
                      <li>
                        {lang === 'zh'
                          ? '请确认收款地址与所选主网协议一致（如 TRC20 地址以 T 开头，ERC20/Arbitrum 以 0x 开头）。'
                          : 'Verify the recipient address matches your selected blockchain network.'}
                      </li>
                      <li>
                        {lang === 'zh'
                          ? '若存在未平仓 CFD 头寸，可提现金额将自动预留维持保证金以确保仓位安全。'
                          : 'Free withdrawable balance automatically reserves maintenance margin for open CFD positions.'}
                      </li>
                    </ul>
                  </div>

                  <div className="ui-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === 'zh' ? '大额电汇与人工清算专席' : 'Bank Wire & OTC Desk'}
                      </span>
                      <Headphones className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {lang === 'zh'
                        ? '支持 7×24 小时专属客服经理 1 对 1 办理 SWIFT 银行电汇、香港转数快 FPS 及场外大宗出金。'
                        : '24/7 dedicated settlement officer for SWIFT bank wires and OTC block payouts.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('assisted')}
                      className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {lang === 'zh' ? '切换至联系专属客服提现 →' : 'Switch to Assisted CS Desk →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DEDICATED CS ASSISTED WITHDRAWAL */}
            {withdrawMethod === 'assisted' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleAssistedWithdrawSubmit}
                  className="lg:col-span-6 ui-card p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {lang === 'zh' ? '人工清算与银行电汇出金申请' : 'Assisted Bank Wire & OTC Settlement'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lang === 'zh' ? '专属资金专员实时对接清算' : 'Direct 1-on-1 treasury desk settlement'}
                      </p>
                    </div>
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'swift', zh: 'SWIFT 电汇', en: 'SWIFT Wire' },
                      { id: 'hk_fps', zh: '香港 FPS', en: 'HK FPS Fast' },
                      { id: 'otc_block', zh: '大宗 OTC', en: 'OTC Block' },
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setSettlementChannel(ch.id as typeof settlementChannel)}
                        className={`py-2 px-2 rounded-lg border font-semibold whitespace-nowrap cursor-pointer ${
                          settlementChannel === ch.id
                            ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {lang === 'zh' ? ch.zh : ch.en}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang === 'zh' ? '收款人户名' : 'Beneficiary Name'}
                    </label>
                    <input
                      type="text"
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg text-xs font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang === 'zh' ? '收款银行及 SWIFT 代码' : 'Receiving Bank & SWIFT'}
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg text-xs bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {lang === 'zh' ? '收款银行账号 / IBAN' : 'Account Number / IBAN'}
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {lang === 'zh' ? '申请提现金额 (USD)' : 'Amount (USD)'}
                      </label>
                      <input
                        type="number"
                        value={assistedAmount}
                        onChange={(e) => setAssistedAmount(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    {phoneVerified
                      ? lang === 'zh'
                        ? '提交专属客服提现申请单'
                        : 'Submit Assisted Withdrawal Request'
                      : lang === 'zh'
                      ? '验证手机号并提交申请'
                      : 'Verify Mobile Phone to Submit'}
                  </button>
                </form>

                {/* Live Dedicated Treasury Specialist Desk */}
                <div className="lg:col-span-6 ui-card flex flex-col h-[440px]">
                  <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        CS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {lang === 'zh' ? '专属出金客服专席 · Anna (工号 #019)' : 'Dedicated Settlement Specialist · Anna'}
                        </div>
                        <div className="text-[11px] text-emerald-500 font-mono">
                          ● {lang === 'zh' ? '在线实时响应' : 'Online'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                    {csChatLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-2xl max-w-[85%] ${
                          log.sender === 'desk'
                            ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200'
                            : 'ml-auto bg-blue-600 text-white'
                        }`}
                      >
                        <div className="text-[10px] opacity-65 font-mono mb-1">{log.time}</div>
                        <div className="leading-relaxed">{log.msg}</div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!csInput.trim()) return;
                      const txt = csInput.trim();
                      setCsInput('');
                      setCsChatLogs((prev) => [
                        ...prev,
                        { sender: 'user', time: '10:30', msg: txt },
                        {
                          sender: 'desk',
                          time: '10:30',
                          msg:
                            lang === 'zh'
                              ? '已收到您的指令，清算部专员正在优先核验您的出金申请单。'
                              : 'Received! Our settlement specialist is prioritizing your withdrawal request.',
                        },
                      ]);
                    }}
                    className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2"
                  >
                    <input
                      type="text"
                      value={csInput}
                      onChange={(e) => setCsInput(e.target.value)}
                      placeholder={lang === 'zh' ? '与出金客服专员在线沟通...' : 'Message settlement specialist...'}
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      {lang === 'zh' ? '发送' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Recent Withdrawal History Table */}
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'zh' ? '最近提现记录' : 'Recent Withdrawal History'}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
                      <th className="py-3 px-4 font-medium">{lang === 'zh' ? '单号 / 时间' : 'Order ID / Time'}</th>
                      <th className="py-3 px-3 font-medium">{lang === 'zh' ? '币种 / 网络' : 'Asset / Network'}</th>
                      <th className="py-3 px-3 font-medium">{lang === 'zh' ? '收款地址 / 账户' : 'Recipient'}</th>
                      <th className="py-3 px-3 font-medium text-right">{lang === 'zh' ? '提现数量' : 'Amount'}</th>
                      <th className="py-3 px-3 font-medium text-right">{lang === 'zh' ? '手续费' : 'Fee'}</th>
                      <th className="py-3 px-3 font-medium">{lang === 'zh' ? '区块哈希 / 凭证' : 'TxID / Ref'}</th>
                      <th className="py-3 px-4 font-medium text-right">{lang === 'zh' ? '状态' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white">{r.id}</div>
                          <div className="text-[11px] text-slate-400">{r.time}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{r.coin}</div>
                          <div className="text-[11px] text-slate-500">{r.network}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{r.address}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                          {r.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                          {r.fee.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">{r.txId}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {lang === 'zh' ? r.statusZh : r.statusEn}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 奖励账户提现 */}
        {subPage === 'reward_withdraw' && (
          <div className="ui-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-line">
              <div className="min-w-0">
                <h1 className="text-[18px] font-semibold text-ink">
                  {lang === 'zh' ? '奖励提现' : 'Withdraw rewards'}
                </h1>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  {lang === 'zh'
                    ? '签到与评分奖励计入奖励账户，奖励账户余额可发起提现。本原型为模拟流程，不会真实到账。'
                    : 'Check-in and rating bonuses land in the reward account and can be withdrawn. Simulated flow — nothing settles for real.'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-ink-3">
                  {lang === 'zh' ? '可提现余额 (USDT)' : 'Available (USDT)'}
                </div>
                <div className="text-[20px] font-semibold text-ink tabular-nums">
                  {rewardBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {!phoneVerified && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-300">
                  {lang === 'zh'
                    ? '安全合规要求：首次提现前需完成手机号绑定。'
                    : 'Security requirement: bind a mobile number before your first withdrawal.'}
                </p>
                <button
                  onClick={() => setShowPhoneVerifyModal(true)}
                  className="ui-btn ui-btn-soft h-8 shrink-0 text-[12px]"
                >
                  {lang === 'zh' ? '立即绑定手机号' : 'Bind mobile'}
                </button>
              </div>
            )}

            <form onSubmit={submitRewardWithdrawal} className="space-y-4">
              <div>
                <div className="text-[12px] font-medium text-ink-2 mb-1.5">
                  {lang === 'zh' ? '提现网络' : 'Network'}
                </div>
                <div className="ui-seg">
                  {(['TRC20', 'ERC20', 'BEP20'] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={rewardNet === n}
                      onClick={() => setRewardNet(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  {lang === 'zh' ? '收款地址' : 'Destination address'}
                </span>
                <span className="ui-input w-full">
                  <input
                    value={rewardAddress}
                    onChange={(e) => setRewardAddress(e.target.value)}
                    placeholder={
                      lang === 'zh' ? `请输入 ${rewardNet} 地址` : `Enter your ${rewardNet} address`
                    }
                    spellCheck={false}
                  />
                </span>
              </label>

              <label className="block">
                <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  {lang === 'zh' ? '提现数量 (USDT)' : 'Amount (USDT)'}
                </span>
                <span className="ui-input w-full">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRewardAmount(
                        String(Math.max(0, rewardBalance - rewardFee).toFixed(2)),
                      )
                    }
                    className="ui-link shrink-0"
                  >
                    {lang === 'zh' ? '全部' : 'Max'}
                  </button>
                </span>
              </label>

              <dl className="rounded-xl bg-surface-2 border border-line px-4 py-3 text-[12px] divide-y divide-line">
                <div className="flex items-center justify-between py-1.5">
                  <dt className="text-ink-3">{lang === 'zh' ? '网络手续费' : 'Network fee'}</dt>
                  <dd className="text-ink tabular-nums">{rewardFee.toFixed(2)} USDT</dd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <dt className="text-ink-3">{lang === 'zh' ? '预计到账' : 'You receive'}</dt>
                  <dd className="font-semibold text-ink tabular-nums">
                    {(rewardAmountNum > 0 ? rewardAmountNum : 0).toFixed(2)} USDT
                  </dd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <dt className="text-ink-3">{lang === 'zh' ? '每日提现额度' : 'Daily limit'}</dt>
                  <dd className="text-ink tabular-nums">50,000.00 USDT</dd>
                </div>
              </dl>

              {rewardNote && (
                <p
                  className={`text-[12px] leading-relaxed ${
                    rewardNote.ok ? 'text-up' : 'text-down'
                  }`}
                >
                  {rewardNote.text}
                </p>
              )}

              <button
                type="submit"
                className="ui-btn ui-btn-primary h-10 w-full sm:w-auto sm:px-6 text-[13px]"
              >
                {lang === 'zh' ? '申请提现' : 'Request withdrawal'}
              </button>
            </form>

            <div className="pt-2 border-t border-line">
              <div className="text-[12px] font-medium text-ink-2 mb-2">
                {lang === 'zh' ? '提现记录' : 'Withdrawal history'}
              </div>
              {ledger.filter((r) => r.network.startsWith('奖励提现')).length === 0 ? (
                <p className="text-[12px] text-ink-3 py-3">
                  {lang === 'zh' ? '暂无提现记录' : 'No withdrawals yet'}
                </p>
              ) : (
                <ul className="divide-y divide-line text-[12px]">
                  {ledger
                    .filter((r) => r.network.startsWith('奖励提现'))
                    .map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="font-medium text-ink tabular-nums">
                            {r.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {r.coin}
                          </div>
                          <div className="text-ink-3 truncate">
                            {r.network} · {r.address.slice(0, 10)}…{r.address.slice(-6)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-amber-600 dark:text-amber-400 font-medium">
                            {lang === 'zh' ? r.statusZh : r.statusEn}
                          </div>
                          <div className="text-ink-3">{r.time}</div>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {subPage === 'overview' && (
          <AssetHome
            lang={lang}
            portfolio={portfolio}
            accountId={accountId}
            onClaim={onClaimDemoFunds}
            onTransfer={() => setSubPage('transfer')}
            onRewardWithdraw={() => setSubPage('reward_withdraw')}
            onRecords={() => setSubPage('records')}
            onDetails={() => setSubPage('details')}
            onOpenTrade={onOpenTrade}
            onReset={onResetDemo}
          />
        )}

        {subPage === 'details' && (
          <div className="space-y-6">
            <AssetPortfolio
              lang={lang}
              portfolio={portfolio}
              onOpenTrade={onOpenTrade}
              onTransfer={() => setSubPage('transfer')}
            />
          </div>
        )}

        {/* SUBPAGE 2: 充值 (On-Chain Crypto Deposit + QR Code + Instant Simulation) */}
        {subPage === 'deposit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 ui-card p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {lang === 'zh' ? '数字资产链上充值' : 'On-Chain Crypto Deposit'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'zh' ? '支持 7×24 小时自动入账，区块确认后即时划入所选账户' : '24/7 automated on-chain deposit'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-mono font-bold">
                  0 {lang === 'zh' ? '充值手续费' : 'Deposit Fee'}
                </span>
              </div>

              {/* Step 1: Select Coin & Target Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                    1. {lang === 'zh' ? '选择充值币种' : 'Select Coin'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['USDT', 'USDC', 'BTC', 'ETH'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDepositCoin(c)}
                        className={`py-2 rounded-lg border text-xs font-mono font-bold cursor-pointer ${
                          depositCoin === c
                            ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                    2. {lang === 'zh' ? '入账目标账户' : 'Target Account'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cash', zh: '现金账户', en: 'Cash' },
                      { id: 'stock', zh: '交易账户', en: 'Trading' },
                    ].map((ac) => (
                      <button
                        key={ac.id}
                        type="button"
                        onClick={() => setDepositTargetAcct(ac.id as typeof depositTargetAcct)}
                        className={`py-2 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer ${
                          depositTargetAcct === ac.id
                            ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {lang === 'zh' ? ac.zh : ac.en}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Select Blockchain Network */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  3. {lang === 'zh' ? '选择充值网络 (Network)' : 'Select Blockchain Network'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['TRC20', 'ERC20', 'ARB', 'SOL'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setDepositNet(net)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer ${
                        depositNet === net
                          ? 'border-blue-600 bg-blue-600/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">{net}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{networkSpecs[net].arrival}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Deposit Address & QR Code */}
              <div className="p-5 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-28 h-28 rounded-2xl bg-white p-2 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                  <QrCode className="w-20 h-20 text-slate-900" />
                  <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                    {depositCoin}-{depositNet}
                  </span>
                </div>

                <div className="flex-1 space-y-3 w-full min-w-0">
                  <div className="text-xs text-slate-500">
                    {lang === 'zh'
                      ? `您的专属 ${depositCoin} (${networkSpecs[depositNet].label}) 充币地址：`
                      : `Your Dedicated ${depositCoin} (${networkSpecs[depositNet].label}) Address:`}
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#111722] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white break-all flex items-center justify-between gap-2">
                    <span>
                      {depositNet === 'TRC20'
                        ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
                        : depositNet === 'SOL'
                        ? '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
                        : '0x71C94F8B1E2904A2B68E28A9210E89A2F10489A2'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSubmitFeedback({
                          type: 'success',
                          text: lang === 'zh' ? '充币地址已复制到剪贴板' : 'Deposit address copied to clipboard',
                        })
                      }
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-sans font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '复制' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-400">
                      {lang === 'zh' ? '最低充值金额: 10.00 USDT · 12个区块确认后自动入账' : 'Min deposit: 10.00 USDT'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onCompleteDeposit) onCompleteDeposit(1000);
                        setAcctBalances((prev) => ({
                          ...prev,
                          [depositTargetAcct]: {
                            ...prev[depositTargetAcct],
                            USDT: prev[depositTargetAcct].USDT + 1000,
                          },
                        }));
                        setRecords((prev) => [
                          {
                            id: `DP-${Date.now().toString().slice(-8)}`,
                            time: '2026-10-04 12:30:00',
                            coin: depositCoin,
                            network: `${networkSpecs[depositNet].label} (充值)`,
                            address: 'On-Chain Deposit',
                            amount: 1000.0,
                            fee: 0,
                            statusZh: '已入账',
                            statusEn: 'Credited',
                            txId: `0x${Math.random().toString(16).slice(2, 10)}`,
                          },
                          ...prev,
                        ]);
                        setSubmitFeedback({
                          type: 'success',
                          text:
                            lang === 'zh'
                              ? `模拟链上充值已到账：+1,000.00 ${depositCoin} 已划入您的${depositTargetAcct === 'cash' ? '资金账户' : '交易账户'}`
                              : `Simulated Deposit Credited: +1,000.00 ${depositCoin}`,
                        });
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      {lang === 'zh' ? '模拟链上充值到账 +$1,000' : 'Simulate Deposit +$1,000'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 ui-card p-5 space-y-4 text-xs">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'zh' ? '充值温馨提示' : 'Deposit Guidelines'}
              </div>
              <ul className="space-y-2.5 text-slate-500 dark:text-slate-400 list-disc pl-4 leading-relaxed">
                <li>
                  {lang === 'zh'
                    ? `请勿向上述地址充值任何非 ${depositCoin} (${depositNet}) 资产，否则资产将无法找回。`
                    : `Only send ${depositCoin} (${depositNet}) to this address.`}
                </li>
                <li>
                  {lang === 'zh'
                    ? '充值到账后可通过「划转」功能 0 手续费秒级划转至交易账户。'
                    : 'Use internal Transfer for instant 0-fee allocation between Cash, Stock, and Contract accounts.'}
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* SUBPAGE 4: 划转 (Cash <-> Stock/CFD <-> Perpetual Contract Account Transfer) */}
        {subPage === 'transfer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 ui-card p-6 space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {lang === 'zh' ? '账户间资金划转' : 'Internal Account Transfer'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'zh'
                      ? '模拟资金账户与模拟交易账户之间实时 0 手续费划转（交易账户仅可转出未被占用的保证金）'
                      : 'Instant 0-fee transfer between demo accounts (trading accounts can only move out free margin)'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  0 {lang === 'zh' ? '手续费 · 实时到账' : 'Fee · Instant'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-12">{lang === 'zh' ? '从账户' : 'From'}</span>
                    <select
                      value={fromAcct}
                      onChange={(e) => setFromAcct(e.target.value as typeof fromAcct)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-[#111722] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                    >
                      <option value="cash">{acctName('cash')}</option>
                      <option value="stock">{acctName('stock')}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-12">{lang === 'zh' ? '到账户' : 'To'}</span>
                    <select
                      value={toAcct}
                      onChange={(e) => setToAcct(e.target.value as typeof toAcct)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-white dark:bg-[#111722] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                    >
                      <option value="stock">{acctName('stock')}</option>
                      <option value="cash">{acctName('cash')}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const tmp = fromAcct;
                    setFromAcct(toAcct);
                    setToAcct(tmp);
                  }}
                  className="w-10 h-10 rounded-full bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title={lang === 'zh' ? '互换划转方向' : 'Swap Accounts'}
                >
                  <ArrowLeftRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1.5">{lang === 'zh' ? '划转币种' : 'Currency'}</label>
                  <select
                    value={transferCoin}
                    onChange={(e) => setTransferCoin(e.target.value as typeof transferCoin)}
                    className="w-full px-3.5 py-2.5 rounded-lg font-mono font-bold bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                  >
                    <option value="USDT">USDT (Tether)</option>
                    <option value="USD">USD (美元)</option>
                    <option value="BTC">BTC (Bitcoin)</option>
                    <option value="ETH">ETH (Ethereum)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 mb-1.5">
                    <span>{lang === 'zh' ? '划转数量' : 'Transfer Amount'}</span>
                    <span className="font-mono">
                      {lang === 'zh' ? '可划转:' : 'Avail:'}{' '}
                      {transferable(fromAcct, transferCoin).toLocaleString()} {transferCoin}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-16 rounded-lg font-mono font-bold bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setTransferAmount(String(transferable(fromAcct, transferCoin)))}
                      className="absolute right-2 top-2 px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold cursor-pointer"
                    >
                      {lang === 'zh' ? '全部' : 'MAX'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const amt = Number(transferAmount) || 0;
                  if (fromAcct === toAcct) {
                    setSubmitFeedback({
                      type: 'warn',
                      text: lang === 'zh' ? '转出账户与转入账户不能相同' : 'Source and destination accounts must differ',
                    });
                    return;
                  }
                  const avail = transferable(fromAcct, transferCoin);
                  if (amt <= 0 || amt > avail) {
                    setSubmitFeedback({
                      type: 'warn',
                      text: lang === 'zh' ? '请输入有效的划转数量（不超过可划转余额）' : 'Invalid transfer amount',
                    });
                    return;
                  }
                  const run = () => {
                  setAcctBalances((prev) => ({
                    ...prev,
                    [fromAcct]: {
                      ...prev[fromAcct],
                      [transferCoin]: ((prev[fromAcct] as Record<string, number>)[transferCoin] || 0) - amt,
                    },
                    [toAcct]: {
                      ...prev[toAcct],
                      [transferCoin]: ((prev[toAcct] as Record<string, number>)[transferCoin] || 0) + amt,
                    },
                  }));
                  setRecords((prev) => [
                    {
                      id: `TR-${Date.now().toString().slice(-8)}`,
                      time: stamp(Date.now()),
                      coin: transferCoin,
                      network: `${fromAcct.toUpperCase()} → ${toAcct.toUpperCase()}`,
                      address: 'Internal Transfer',
                      amount: amt,
                      fee: 0,
                      statusZh: '已完成',
                      statusEn: 'Completed',
                      txId: 'INTERNAL-0FEE',
                    },
                    ...prev,
                  ]);
                  setSubmitFeedback({
                    type: 'success',
                    text:
                      lang === 'zh'
                        ? `划转成功：已将 ${amt.toLocaleString()} ${transferCoin} 从${acctName(fromAcct)}划转至${acctName(toAcct)}`
                        : `Transferred ${amt.toLocaleString()} ${transferCoin} successfully`,
                  });
                  };
                  if (security.pin.value && security.pin.scopes.transfer) setPinPrompt(() => run);
                  else run();
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white font-bold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                {lang === 'zh' ? '确认即时划转 (0 手续费)' : 'Confirm Instant Transfer'}
              </button>
            </div>

            <div className="lg:col-span-5 ui-card p-5 space-y-4">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'zh' ? '三大模拟账户实时余额' : 'Demo account balances'}
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { id: 'cash', zh: acctName('cash'), desc: lang === 'zh' ? '模拟金储备，用于向交易账户划转' : 'Virtual reserve for funding the trading account', usdt: acctBalances.cash.USDT },
                  { id: 'stock', zh: acctName('stock'), desc: lang === 'zh' ? `CFD 以 USD、永续以 USDT 计保证金 · 可转出 $${transferable('stock', 'USD').toLocaleString()} / ${transferable('stock', 'USDT').toLocaleString()} USDT` : `USD margins CFDs, USDT margins perpetuals · free $${transferable('stock', 'USD').toLocaleString()} / ${transferable('stock', 'USDT').toLocaleString()} USDT`, usdt: acctBalances.stock.USD + acctBalances.stock.USDT },
                  { id: 'reward', zh: lang === 'zh' ? '奖励账户' : 'Rewards', desc: lang === 'zh' ? '签到与评分奖励 · 可发起提现' : 'Check-in and rating bonuses · withdrawable', usdt: acctBalances.reward?.USDT ?? 0 },
                ].map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{a.zh}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{a.desc}</div>
                    </div>
                    <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      ${a.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBPAGE 5: 资金记录 (Comprehensive Funding & Ledger Records) */}
        {subPage === 'records' && (
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-ink-3">
                {lang === 'zh'
                  ? '涵盖模拟金发放、账户间划转、CFD / 合约平仓结算、奖励提现与模拟持仓股息'
                  : 'Demo credits, internal transfers, CFD / perpetual settlements, reward withdrawals and dividends'}
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', zh: '全部', en: 'All' },
                  { id: 'trade', zh: '交易结算', en: 'Settlements' },
                  { id: 'transfer', zh: '划转', en: 'Transfers' },
                  { id: 'credit', zh: '模拟金', en: 'Demo credits' },
                  { id: 'dividend', zh: '股息派发', en: 'Dividends' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={recordFilter === f.id}
                    onClick={() => setRecordFilter(f.id as typeof recordFilter)}
                    className="ui-chip shrink-0"
                  >
                    {lang === 'zh' ? f.zh : f.en}
                  </button>
                ))}
              </div>
            </div>

            {ledgerRows.length === 0 && (
              <p className="py-10 text-center text-[13px] text-ink-3">{lang === 'zh' ? '暂无记录' : 'No records'}</p>
            )}

            <ul className="sm:hidden divide-y divide-line">
              {ledgerRows.map((r) => (
                <li key={r.id} role="button" tabIndex={0} onClick={() => setRecordDetail(r)} onKeyDown={(e) => e.key === 'Enter' && setRecordDetail(r)} className="py-3 flex items-start justify-between gap-3 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-ink truncate">{r.network}</div>
                    <div className="mt-0.5 text-[12px] text-ink-3 truncate">{r.address}</div>
                    <div className="mt-0.5 text-[11px] text-ink-3 tabular-nums">{r.time}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[14px] font-semibold tabular-nums ${ledgerTone(r)}`}>
                      {ledgerSign(r)}
                      {Math.abs(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-ink-3">{r.coin}</div>
                    <span className="mt-1 inline-block px-1.5 rounded bg-up-soft text-up text-[11px] font-medium">
                      {lang === 'zh' ? r.statusZh : r.statusEn}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line text-ink-3 bg-surface-2">
                    <th className="py-3 px-4 font-semibold">{lang === 'zh' ? '流水单号 / 时间' : 'Order ID / Time'}</th>
                    <th className="py-3 px-3 font-semibold">{lang === 'zh' ? '类型 / 币种' : 'Type / Asset'}</th>
                    <th className="py-3 px-3 font-semibold">{lang === 'zh' ? '网络 / 路径' : 'Network / Route'}</th>
                    <th className="py-3 px-3 font-semibold">{lang === 'zh' ? '地址 / 备注' : 'Address / Note'}</th>
                    <th className="py-3 px-3 font-semibold text-right">{lang === 'zh' ? '变动金额' : 'Amount'}</th>
                    <th className="py-3 px-3 font-semibold text-right">{lang === 'zh' ? '手续费' : 'Fee'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{lang === 'zh' ? '状态' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ledgerRows.map((r) => (
                    <tr key={r.id} onClick={() => setRecordDetail(r)} className="hover:bg-surface-2 cursor-pointer">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink tabular-nums">{r.id}</div>
                        <div className="text-[11px] text-ink-3 tabular-nums">{r.time}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-ink">{r.coin}</td>
                      <td className="py-3 px-3 text-ink-2">{r.network}</td>
                      <td className="py-3 px-3 text-ink-3">{r.address}</td>
                      <td className={`py-3 px-3 text-right font-semibold tabular-nums ${ledgerTone(r)}`}>
                        {ledgerSign(r)}
                        {Math.abs(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-ink-3">{r.fee.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded bg-up-soft text-up font-semibold">
                          {lang === 'zh' ? r.statusZh : r.statusEn}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBPAGE 6: 地址簿 (Crypto Withdrawal Whitelist Address Book) */}
        {subPage === 'address_book' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 ui-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {lang === 'zh' ? '提币地址簿与白名单管理' : 'Withdrawal Address Book'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'zh' ? '开启白名单免验证后，向常用安全地址提币更加快捷' : 'Manage whitelisted crypto addresses for fast withdrawals'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                  {savedAddresses.length} {lang === 'zh' ? '个常用地址' : 'Saved'}
                </span>
              </div>

              <div className="space-y-3">
                {savedAddresses.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{item.label}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
                          {item.coin} · {item.network}
                        </span>
                        {item.whitelisted && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                            {lang === 'zh' ? '✓ 白名单免审' : '✓ Whitelisted'}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-slate-500 break-all">{item.address}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAddress(item.address);
                          setNetwork(item.network);
                          setSubPage('withdraw');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                      >
                        {lang === 'zh' ? '去提币' : 'Withdraw'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSavedAddresses((prev) => prev.filter((a) => a.id !== item.id))
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAddrLabel.trim() || !newAddrValue.trim()) {
                  setSubmitFeedback({
                    type: 'warn',
                    text: lang === 'zh' ? '请填写完整的地址备注名与钱包地址' : 'Please fill in label and wallet address',
                  });
                  return;
                }
                setSavedAddresses((prev) => [
                  {
                    id: `ADDR-0${prev.length + 1}`,
                    label: newAddrLabel.trim(),
                    coin: newAddrCoin,
                    network: newAddrNet,
                    address: newAddrValue.trim(),
                    whitelisted: newAddrWhitelist,
                    addedDate: '2026-10-04',
                  },
                  ...prev,
                ]);
                setNewAddrLabel('');
                setNewAddrValue('');
                setSubmitFeedback({
                  type: 'success',
                  text: lang === 'zh' ? '新提币地址已成功添加至安全地址簿' : 'New withdrawal address added to Address Book',
                });
              }}
              className="lg:col-span-5 ui-card p-6 space-y-4 text-xs"
            >
              <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>{lang === 'zh' ? '添加新提币地址' : 'Add New Address'}</span>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{lang === 'zh' ? '地址备注标签' : 'Address Label'}</label>
                <input
                  type="text"
                  value={newAddrLabel}
                  onChange={(e) => setNewAddrLabel(e.target.value)}
                  placeholder={lang === 'zh' ? '例如：Bybit 个人冷钱包' : 'e.g. Personal Cold Wallet'}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">{lang === 'zh' ? '币种' : 'Coin'}</label>
                  <select
                    value={newAddrCoin}
                    onChange={(e) => setNewAddrCoin(e.target.value as typeof newAddrCoin)}
                    className="w-full px-3 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">{lang === 'zh' ? '转账网络' : 'Network'}</label>
                  <select
                    value={newAddrNet}
                    onChange={(e) => setNewAddrNet(e.target.value as typeof newAddrNet)}
                    className="w-full px-3 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                  >
                    <option value="TRC20">TRON (TRC20)</option>
                    <option value="ERC20">Ethereum (ERC20)</option>
                    <option value="ARB">Arbitrum One</option>
                    <option value="SOL">Solana (SPL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{lang === 'zh' ? '钱包收款地址' : 'Wallet Address'}</label>
                <input
                  type="text"
                  value={newAddrValue}
                  onChange={(e) => setNewAddrValue(e.target.value)}
                  placeholder="T... / 0x..."
                  className="w-full px-3.5 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-shadow"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newAddrWhitelist}
                  onChange={(e) => setNewAddrWhitelist(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-slate-600 dark:text-slate-300">
                  {lang === 'zh' ? '设为白名单安全地址（提现免二次人工审核）' : 'Add to Trusted Whitelist'}
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white font-bold cursor-pointer"
              >
                {lang === 'zh' ? '保存至地址簿' : 'Save Address'}
              </button>
            </form>
          </div>
        )}

        {/* SUBPAGE 7: 银行卡 (Bound International Bank Cards & SWIFT Accounts) */}
        {subPage === 'bank_cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {lang === 'zh' ? '我的银行卡与国际电汇账户' : 'Bound Bank Cards & Wire Accounts'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'zh' ? '支持绑定香港 FPS、美国 ACH 及全球 SWIFT 美元/港币同名银行卡' : 'Manage HK FPS, US ACH & global SWIFT bank accounts'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {bankCards.map((card) => (
                    <div
                      key={card.id}
                      className="p-5 rounded-2xl bg-gradient-to-br from-[#1e40af] via-[#2f56d4] to-[#4f46e5] text-white shadow-[0_8px_24px_-10px_rgba(41,98,255,0.5)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-400" />
                          <span className="font-bold text-sm">{card.bankName}</span>
                          {card.isDefault && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                              {lang === 'zh' ? '默认收款卡' : 'Default'}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-base tracking-wider text-slate-100">{card.accountNo}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {card.holder} · SWIFT: {card.swift} · {card.currency}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setBankName(`${card.bankName} (SWIFT: ${card.swift})`);
                            setBankAccount(card.accountNo);
                            setBeneficiaryName(card.holder);
                            setWithdrawMethod('assisted');
                            setSubPage('withdraw');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                        >
                          {lang === 'zh' ? '提现至此卡' : 'Withdraw Here'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBankCards((prev) => prev.filter((c) => c.id !== card.id))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBankName.trim() || !newBankNo.trim()) {
                  setSubmitFeedback({
                    type: 'warn',
                    text: lang === 'zh' ? '请填写完整的开户银行名称与银行卡号/IBAN' : 'Please enter bank name and account number',
                  });
                  return;
                }
                setBankCards((prev) => [
                  ...prev,
                  {
                    id: `BK-0${prev.length + 1}`,
                    bankName: newBankName.trim(),
                    holder: newBankHolder.trim() || 'CHEN MING',
                    accountNo: newBankNo.trim(),
                    swift: newBankSwift.trim() || 'SCBLHKHHXXX',
                    currency: newBankCurrency,
                    region: 'International',
                    isDefault: false,
                  },
                ]);
                setNewBankName('');
                setNewBankNo('');
                setNewBankSwift('');
                setSubmitFeedback({
                  type: 'success',
                  text: lang === 'zh' ? '银行卡绑定成功，可用于大额电汇与专属客服出金清算' : 'Bank card bound successfully',
                });
              }}
              className="lg:col-span-5 ui-card p-6 space-y-4 text-xs"
            >
              <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>{lang === 'zh' ? '绑定新银行卡 / 电汇账户' : 'Add Bank Account'}</span>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{lang === 'zh' ? '持卡人同名户名 (英文/拼音)' : 'Account Holder Name'}</label>
                <input
                  type="text"
                  value={newBankHolder}
                  onChange={(e) => setNewBankHolder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{lang === 'zh' ? '开户银行名称' : 'Bank Name'}</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder={lang === 'zh' ? '例如：Standard Chartered HK (香港渣打银行)' : 'e.g. Standard Chartered HK'}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{lang === 'zh' ? '银行卡号 / IBAN 账号' : 'Account No. / IBAN'}</label>
                <input
                  type="text"
                  value={newBankNo}
                  onChange={(e) => setNewBankNo(e.target.value)}
                  placeholder="4728-9910-2841"
                  className="w-full px-3.5 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">SWIFT / BIC</label>
                  <input
                    type="text"
                    value={newBankSwift}
                    onChange={(e) => setNewBankSwift(e.target.value)}
                    placeholder="SCBLHKHHXXX"
                    className="w-full px-3 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">{lang === 'zh' ? '结算币种' : 'Currency'}</label>
                  <select
                    value={newBankCurrency}
                    onChange={(e) => setNewBankCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg font-mono bg-[#f5f7fa] dark:bg-[#0B0E14] border border-slate-200 dark:border-slate-800"
                  >
                    <option value="USD / HKD">USD / HKD</option>
                    <option value="USD">USD Only</option>
                    <option value="EUR">EUR (SEPA)</option>
                    <option value="SGD">SGD (FAST)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 text-white font-bold cursor-pointer"
              >
                {lang === 'zh' ? '确认添加银行卡' : 'Bind Bank Card'}
              </button>
            </form>
          </div>
        )}

        {(subPage === 'security' || subPage === 'authenticator') && (
          <SecurityCenter
            lang={lang}
            page={subPage}
            account={userEmail}
            phone={phoneVerified ? verifiedPhoneNumber : ''}
            onVerifyPhone={onVerifyPhone}
            onToast={onToast}
            onPage={setSubPage}
          />
        )}
      </div>

      {showPhoneVerifyModal && (
        <PhoneBindSheet
          lang={lang}
          current={phoneVerified ? verifiedPhoneNumber : ''}
          onDone={onVerifyPhone}
          onClose={() => setShowPhoneVerifyModal(false)}
        />
      )}
      {recordDetail && (
        <RecordDetail
          lang={lang}
          record={recordDetail}
          sign={ledgerSign(recordDetail)}
          onCopy={onToast}
          onClose={() => setRecordDetail(null)}
        />
      )}
      {pinPrompt && (
        <PinPrompt
          lang={lang}
          title={lang === 'zh' ? '验证资金密码' : 'Fund password'}
          onClose={() => setPinPrompt(null)}
          onPass={() => {
            const run = pinPrompt;
            setPinPrompt(null);
            run();
          }}
        />
      )}
    </div>
  );
};
