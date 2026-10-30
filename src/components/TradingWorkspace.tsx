import React from "react";
import { Instrument } from "../data/marketData";
import { MarketTerminal } from "./MarketTerminal";
import { OrderTicket } from "./OrderTicket";
import { PositionsPanel } from "./PositionsPanel";
import type { PriceLine } from "./MarketChart";
import { signed, useMinWidth } from "./marketModel";
import { DemoTrading, MarketKind, Side, marketOf } from "./demoTrading";

interface Props {
  instruments: Instrument[];
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  demo: DemoTrading;
  side: Side;
  onSideChange: (side: Side) => void;
  lang: "zh" | "en";
  theme: "dark" | "light";
  onOpenAiModal: () => void;
  onToast: (message: string) => void;
  onOpenAssets: (page?: "overview" | "transfer") => void;
  /** Phone-only 直播间 pane shown in the terminal's view switcher */
  live?: React.ReactNode;
}

/** 交易台: one terminal for CFD and crypto — the selected symbol picks the account */
export function TradingWorkspace({
  instruments,
  symbol,
  onSelectSymbol,
  demo,
  side,
  onSideChange,
  lang,
  theme,
  onOpenAiModal,
  onToast,
  onOpenAssets,
  live,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const compact = !useMinWidth(1024);
  const list = instruments;
  const instrument = list.find((i) => i.symbol === symbol) ?? list[0];
  const market: MarketKind = marketOf(instrument);
  const rows = demo.positions.filter((p) => p.market === market);
  const orders = demo.orders.filter((o) => o.market === market);
  const fills = demo.fills.filter((f) => f.market === market);

  const priceLines = (s: string): PriceLine[] => [
    ...rows
      .filter((r) => r.symbol === s)
      .flatMap((r) => {
        const out: PriceLine[] = [
          {
            price: r.entryPrice,
            label: `${r.side === "buy" ? t("多", "Long") : t("空", "Short")} ${r.qty} · ${signed(r.pnl)}`,
            tone: r.pnl >= 0 ? "up" : "down",
          },
        ];
        if (r.takeProfit)
          out.push({ price: r.takeProfit, label: t("止盈", "TP"), tone: "up" });
        if (r.stopLoss)
          out.push({ price: r.stopLoss, label: t("止损", "SL"), tone: "down" });
        if (r.liqPrice)
          out.push({
            price: r.liqPrice,
            label: t("强平", "Liq."),
            tone: "warn",
          });
        return out;
      }),
    ...orders
      .filter((o) => o.symbol === s)
      .map((o): PriceLine => ({
        price: o.price,
        label: `${t("限价", "Limit")} ${o.side === "buy" ? t("买", "Buy") : t("卖", "Sell")} ${o.qty}`,
        tone: "brand",
      })),
  ];

  return (
    <MarketTerminal
      mode={market}
      instruments={list}
      selectedSymbol={instrument.symbol}
      onSelectSymbol={onSelectSymbol}
      lang={lang}
      theme={theme}
      onOpenAiModal={onOpenAiModal}
      onShowToast={onToast}
      priceLines={priceLines}
      positionCount={rows.length}
      livePane={live}
      onTradeSide={onSideChange}
      ticket={
        <OrderTicket
          compact={compact}
          market={market}
          instrument={instrument}
          lang={lang}
          side={side}
          onSideChange={onSideChange}
          summary={demo.summary[market]}
          onPlace={demo.placeOrder}
          onToast={onToast}
          onOpenAssets={(page) => onOpenAssets(page)}
        />
      }
      positions={
        <PositionsPanel
          expanded={compact}
          market={market}
          lang={lang}
          rows={rows}
          orders={orders}
          fills={fills}
          summary={demo.summary[market]}
          instruments={list}
          orderMargin={demo.orderMargin}
          onSelectSymbol={onSelectSymbol}
          onClose={demo.closePosition}
          onCloseAll={() => demo.closeAll(market)}
          onCancel={demo.cancelOrder}
          onUpdateProtection={demo.updateProtection}
          onOpenAssets={() => onOpenAssets("overview")}
        />
      }
    />
  );
}
