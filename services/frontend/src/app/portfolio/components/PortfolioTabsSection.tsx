"use client";

import Link from "next/link";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type {
  PortfolioBoardTab,
  PortfolioHolding,
  PortfolioMonthlyReturn,
  PortfolioTodayTrade,
} from "../types/portfolio";
import {
  formatCurrency,
  formatInteger,
  formatSignedValue,
  getDeltaChartBarClassName,
  getDeltaTextClassName,
  getTradeActionLabel,
} from "../utils/portfolioFormatters";
import StockLogo from "@/app/stocks/components/StockLogo";
import Pagination from "@/shared/ui/Pagination";
import { cn } from "@/shared/utils/cn";

type Props = {
  holdings: PortfolioHolding[];
  todayTrades: PortfolioTodayTrade[];
  monthlyReturns: PortfolioMonthlyReturn[];
};

type HoldingsSortType = "holdingQuantityDesc" | "returnRateDesc";

const tabs: Array<{ id: PortfolioBoardTab; label: string }> = [
  { id: "holdings", label: "현재 보유 종목" },
  { id: "todayTrades", label: "오늘 매매 내역" },
  { id: "monthlyReturns", label: "월간 수익률 추이" },
];

const holdingsSortOptions: Array<{ id: HoldingsSortType; label: string }> = [
  { id: "returnRateDesc", label: "수익률 내림차순" },
  { id: "holdingQuantityDesc", label: "보유 수량 내림차순" },
];

const holdingsPageSize = 6;

function HoldingsSortDropdown({
  value,
  options,
  onChange,
}: {
  value: HoldingsSortType;
  options: Array<{ id: HoldingsSortType; label: string }>;
  onChange: (value: HoldingsSortType) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value) ?? options[0];

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="현재 보유 종목 정렬"
          className={cn(
            "flex min-w-[200px] items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--color-text-primary)] transition-colors",
            "hover:border-[color:var(--color-border-base)] hover:bg-[color:var(--color-bg-secondary)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)]",
          )}
        >
          <span className="truncate">{selectedOption.label}</span>
          <span className="flex h-4 w-4 items-center justify-center text-[color:var(--color-text-tertiary)]">
            <span
              className={cn(
                "relative block h-3 w-3 transition-transform duration-200 ease-out",
                open ? "rotate-180" : "rotate-0",
              )}
            >
              <span className="absolute left-0 top-[5px] h-[1.5px] w-[7px] origin-right rotate-45 rounded-full bg-current transition-transform duration-200 ease-out" />
              <span className="absolute right-0 top-[5px] h-[1.5px] w-[7px] origin-left -rotate-45 rounded-full bg-current transition-transform duration-200 ease-out" />
            </span>
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <AnimatePresence>
        {open ? (
          <PopoverPrimitive.Portal forceMount>
            <PopoverPrimitive.Content asChild align="end" sideOffset={6}>
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="z-50 min-w-[200px] overflow-hidden rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] p-1"
              >
                {options.map((option) => {
                  const selected = option.id === value;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onChange(option.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors",
                        selected
                          ? "bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-primary)]"
                          : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      <span
                        className={cn(
                          "text-[color:var(--color-text-primary)] transition-opacity",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  );
}

function compareNullableNumberDesc(left: number | null, right: number | null) {
  const leftValue = left ?? Number.NEGATIVE_INFINITY;
  const rightValue = right ?? Number.NEGATIVE_INFINITY;

  return rightValue - leftValue;
}

function sortHoldings(items: PortfolioHolding[], sortType: HoldingsSortType) {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sortType === "holdingQuantityDesc") {
      const quantityCompare = compareNullableNumberDesc(left.holdingQuantity, right.holdingQuantity);
      if (quantityCompare !== 0) {
        return quantityCompare;
      }

      return compareNullableNumberDesc(left.returnRate, right.returnRate);
    }

    const returnRateCompare = compareNullableNumberDesc(left.returnRate, right.returnRate);
    if (returnRateCompare !== 0) {
      return returnRateCompare;
    }

    return compareNullableNumberDesc(left.holdingQuantity, right.holdingQuantity);
  });

  return sorted;
}

function getDisplayedTradeQuantity(item: PortfolioTodayTrade) {
  return item.tradeQuantity ?? item.holdingQuantity;
}

function HoldingRows({ items }: { items: PortfolioHolding[] }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center gap-4 border-b border-[color:var(--color-border-secondary)] px-2 py-4">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">종목명 / 정보</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">매입가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">현재가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">
          <span className="block">보유 일수</span>
          <span className="block">/보유 수량</span>
        </span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">수익률</span>
      </div>

      {items.map((item) => (
        <Link
          key={`${item.ticker}-${item.stockId}`}
          href={`/portfolio/${item.stockId}`}
          className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center gap-4 rounded-2xl px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <StockLogo label={item.name.slice(0, 2)} iconUrl={item.iconUrl} />
            <span className="min-w-0 truncate text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">
              {item.name}
            </span>
          </div>
          <span className="text-right text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">
            {formatCurrency(item.buyPrice)}
          </span>
          <span className="text-right text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">
            {formatCurrency(item.currentPrice)}
          </span>
          <div className="text-right">
            <span className="block text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">
              {item.holdingDays == null ? "-" : `${item.holdingDays}일`}
            </span>
            <span className="block text-sm font-medium leading-5 text-[color:var(--color-text-tertiary)]">
              {item.holdingQuantity == null ? "-" : `${formatInteger(item.holdingQuantity)}개`}
            </span>
          </div>
          <span className={cn("text-right text-base font-semibold leading-6", getDeltaTextClassName(item.returnRate))}>
            {formatSignedValue(item.returnRate, 2, "%")}
          </span>
        </Link>
      ))}
    </>
  );
}

function TradeRows({ items }: { items: PortfolioTodayTrade[] }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-[color:var(--color-border-secondary)] px-2 py-4">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">종목명 / 액션</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">가격 정보</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">현재가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">매매 수량</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">성과</span>
      </div>

      {items.map((item) => (
        <div
          key={`${item.id}-${item.ticker}`}
          className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] items-center gap-4 rounded-2xl px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <StockLogo label={item.name.slice(0, 2)} iconUrl={item.iconUrl} />
              <Link
                href={`/stocks/${item.stockId}`}
                className="truncate text-base font-semibold leading-6 text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-secondary)]"
              >
                {item.name}
              </Link>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
                  item.action === "BUY"
                    ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]"
                    : "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]",
                )}
              >
                {getTradeActionLabel(item.action)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="mr-2 inline-flex items-center text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">
              {item.action === "SELL" ? "매도가" : "매수가"}
            </span>
            <span className="inline text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">
              {formatCurrency(item.executedPrice)}
            </span>
            {item.action === "SELL" ? (
              <span className="block text-xs font-medium leading-4 text-[color:var(--color-text-tertiary)]">
                매입가 {formatCurrency(item.buyPrice)}
              </span>
            ) : null}
          </div>
          <span className="text-right text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">
            {formatCurrency(item.currentPrice)}
          </span>
          <span className="text-right text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">
            {getDisplayedTradeQuantity(item) == null ? "-" : `${formatInteger(getDisplayedTradeQuantity(item))}개`}
          </span>
          <span className={cn("text-right text-base font-semibold leading-6", getDeltaTextClassName(item.returnRate))}>
            {formatSignedValue(item.returnRate, 2, "%")}
          </span>
        </div>
      ))}
    </>
  );
}

function MobileHoldingCards({ items }: { items: PortfolioHolding[] }) {
  return items.map((item) => (
    <Link
      key={`${item.ticker}-${item.stockId}`}
      href={`/portfolio/${item.stockId}`}
      className="block border-b border-[color:var(--color-border-secondary)] px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)] last:border-b-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StockLogo label={item.name.slice(0, 2)} iconUrl={item.iconUrl} />
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">
              {item.name}
            </span>
            <p className="text-[10px] font-medium leading-4 text-[color:var(--color-text-secondary)]">
              {item.holdingDays == null ? "보유 일수 정보 없음" : `보유 일수 ${item.holdingDays}일`}
            </p>
            <p className="mt-0.5 text-[10px] font-medium leading-4 text-[color:var(--color-text-tertiary)]">
              {item.holdingQuantity == null ? "보유 수량 정보 없음" : `보유 수량 ${formatInteger(item.holdingQuantity)}개`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매입가</span>
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">
              {formatCurrency(item.buyPrice)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">현재가</span>
            <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
              {formatCurrency(item.currentPrice)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">수익률</span>
            <span className={cn("text-sm font-semibold leading-5", getDeltaTextClassName(item.returnRate))}>
              {formatSignedValue(item.returnRate, 2, "%")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  ));
}

function MobileTradeCards({ items }: { items: PortfolioTodayTrade[] }) {
  return items.map((item) => (
    <div key={`${item.id}-${item.ticker}`} className="border-b border-[color:var(--color-border-secondary)] px-2 py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <StockLogo label={item.name.slice(0, 2)} iconUrl={item.iconUrl} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/stocks/${item.stockId}`}
                  className="truncate text-sm font-semibold leading-5 text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-secondary)]"
                >
                  {item.name}
                </Link>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold leading-4",
                    item.action === "BUY"
                      ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]"
                      : "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]",
                  )}
                >
                  {getTradeActionLabel(item.action)}
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium leading-4 text-[color:var(--color-text-secondary)]">
                {getDisplayedTradeQuantity(item) == null
                  ? "매매 수량 정보 없음"
                  : `매매 수량 ${formatInteger(getDisplayedTradeQuantity(item))}개`}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">현재가</span>
                <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                  {formatCurrency(item.currentPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">
              {item.action === "SELL" ? "매도가" : "매수가"}
            </span>
            <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
              {formatCurrency(item.executedPrice)}
            </span>
          </div>
          {item.action === "SELL" ? (
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매입가</span>
              <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">
                {formatCurrency(item.buyPrice)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">성과</span>
            <span className={cn("text-sm font-semibold leading-5", getDeltaTextClassName(item.returnRate))}>
              {formatSignedValue(item.returnRate, 2, "%")}
            </span>
          </div>
        </div>
      </div>
    </div>
  ));
}

function EmptyTradeState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl bg-[color:var(--color-bg-secondary)] px-6 py-10 text-center outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
      <p className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)] md:text-base md:leading-6">
        오늘 매매 내역이 없습니다.
      </p>
    </div>
  );
}

function MonthlyReturnBoard({ items }: { items: PortfolioMonthlyReturn[] }) {
  const maxRateMagnitude = Math.max(1, ...items.map((item) => Math.abs(item.portfolioReturnRate ?? 0)));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const portfolioReturnRate = item.portfolioReturnRate ?? 0;
        const barWidth = Math.min(100, Math.max(12, (Math.abs(portfolioReturnRate) / maxRateMagnitude) * 100));

        return (
          <article
            key={item.month}
            className="rounded-2xl bg-[color:var(--color-bg-secondary)] p-4 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{item.month}</h3>
              <span className={cn("text-base font-extrabold leading-6", getDeltaTextClassName(item.portfolioReturnRate))}>
                {formatSignedValue(item.portfolioReturnRate, 1, "%")}
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[color:var(--color-bg-tertiary)]">
              <div
                className={cn(
                  "h-full rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]",
                  getDeltaChartBarClassName(item.portfolioReturnRate),
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">월간 수익률</dt>
                <dd className={cn("mt-1 text-sm font-semibold leading-5", getDeltaTextClassName(item.portfolioReturnRate))}>
                  {formatSignedValue(item.portfolioReturnRate, 1, "%")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">월간 수익량</dt>
                <dd className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">
                  {formatCurrency(item.realizedProfitAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매수 횟수</dt>
                <dd className="mt-1 text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                  {item.buyCount == null ? "-" : `${formatInteger(item.buyCount)}회`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매도 횟수</dt>
                <dd className="mt-1 text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                  {item.sellCount == null ? "-" : `${formatInteger(item.sellCount)}회`}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export default function PortfolioTabsSection({ holdings, todayTrades, monthlyReturns }: Props) {
  const [activeTab, setActiveTab] = useState<PortfolioBoardTab>("holdings");
  const [currentPage, setCurrentPage] = useState(1);
  const [holdingsSort, setHoldingsSort] = useState<HoldingsSortType>("returnRateDesc");

  const sortedHoldings = useMemo(() => sortHoldings(holdings, holdingsSort), [holdings, holdingsSort]);
  const totalPages = Math.max(1, Math.ceil(sortedHoldings.length / holdingsPageSize));
  const pagedHoldings = sortedHoldings.slice((currentPage - 1) * holdingsPageSize, currentPage * holdingsPageSize);

  const handleTabChange = (tab: PortfolioBoardTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleHoldingsSortChange = (sortType: HoldingsSortType) => {
    if (sortType === holdingsSort) {
      return;
    }

    setHoldingsSort(sortType);
    setCurrentPage(1);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 border-b border-[color:var(--color-border-primary)] md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 overflow-x-auto">
          <div className="relative flex items-start gap-6">
            {tabs.map((tab) => {
              const extraLabel = tab.id === "todayTrades" ? ` (${todayTrades.length})` : "";

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative whitespace-nowrap pb-3 text-sm font-semibold leading-5 transition-colors md:text-base md:leading-6",
                    activeTab === tab.id
                      ? "text-[color:var(--color-text-primary)]"
                      : "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]",
                  )}
                >
                  {tab.label}
                  {extraLabel}
                  {activeTab === tab.id ? (
                    <motion.span
                      layoutId="portfolio-tabs-underline"
                      transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[color:var(--color-border-base)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "holdings" ? (
          <div className="flex shrink-0 items-center gap-2 self-end pb-3 md:self-auto">
            <span className="sr-only">현재 보유 종목 정렬</span>
            <HoldingsSortDropdown value={holdingsSort} options={holdingsSortOptions} onChange={handleHoldingsSortChange} />
          </div>
        ) : null}
      </div>

      {activeTab === "holdings" ? (
        <>
          <div className="hidden border-b border-[color:var(--color-border-secondary)] lg:block">
            <HoldingRows items={pagedHoldings} />
          </div>

          <div className="border-b border-[color:var(--color-border-secondary)] lg:hidden">
            <MobileHoldingCards items={pagedHoldings} />
          </div>

          {totalPages > 1 ? (
            <div className="py-4 md:py-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === "todayTrades" ? (
        todayTrades.length > 0 ? (
          <>
            <div className="hidden border-b border-[color:var(--color-border-secondary)] lg:block">
              <TradeRows items={todayTrades} />
            </div>

            <div className="border-b border-[color:var(--color-border-secondary)] lg:hidden">
              <MobileTradeCards items={todayTrades} />
            </div>
          </>
        ) : (
          <EmptyTradeState />
        )
      ) : null}

      {activeTab === "monthlyReturns" ? <MonthlyReturnBoard items={monthlyReturns} /> : null}
    </section>
  );
}
