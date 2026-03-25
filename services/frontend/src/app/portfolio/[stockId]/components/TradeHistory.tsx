"use client";

import { useState } from "react";
import { IoArrowForward } from "react-icons/io5";
import Pagination from "@/shared/ui/Pagination";
import type { TradeEntry } from "../types/portfolioStockDetail";

type Props = {
  trades: TradeEntry[];
};

const ITEMS_PER_PAGE = 4;

function StatusBadge({ status }: { status: TradeEntry["status"] }) {
  if (status === "holding") {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded typo-body-sm font-semibold bg-bg-info-subtle text-text-info">
        보유 중
      </span>
    );
  }
  if (status === "best") {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded typo-body-sm font-semibold bg-bg-danger-subtle text-text-danger-bold">
        BEST
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded typo-body-sm font-semibold bg-bg-danger-subtle text-text-danger-bold">
      수익 실현
    </span>
  );
}

function formatPrice(n: number | undefined | null) {
  return (n ?? 0).toLocaleString("ko-KR") + "원";
}

export default function TradeHistory({ trades }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(trades.length / ITEMS_PER_PAGE);
  const paginated = trades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <div className="flex flex-col gap-1 pb-6">
        <h2 className="typo-heading-md font-extrabold text-text-primary tracking-tight">
          전체 매매 내역
        </h2>
        <p className="typo-body-md font-medium text-text-secondary tracking-tight">
          AI 위원회의 모든 과거 매수 및 매도 기록입니다.
        </p>
      </div>

      {/* ===== Mobile: card layout ===== */}
      <div className="flex flex-col gap-2 border-t border-border-primary py-4 md:hidden">
        {paginated.map((trade) => {
          const isPositive = trade.returnRate >= 0;
          const returnColor = isPositive
            ? "var(--color-text-danger)"
            : "var(--color-text-info)";
          const sign = isPositive ? "+" : "";
          const rightPrice = trade.sellPrice ?? trade.currentPrice;

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between gap-3 px-2 py-2"
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={trade.status} />
                  <span className="typo-body-md font-semibold text-text-primary tracking-tight">
                    {trade.dateRange}
                  </span>
                </div>
                <div className="typo-body-md flex items-center gap-2 text-sm">
                  <span className=" font-medium text-text-secondary">
                    {formatPrice(trade.buyPrice)}
                  </span>
                  <IoArrowForward
                    size={14}
                    className="text-text-tertiary shrink-0"
                  />
                  <span className="font-semibold text-text-primary">
                    {rightPrice ? formatPrice(rightPrice) : "-"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <p
                  className="text-[15px] font-black leading-[22.5px] tracking-[-0.32px]"
                  style={{ color: returnColor }}
                >
                  {sign}
                  {trade.returnRate.toFixed(2)}%
                </p>
                <p className="typo-body-md font-medium text-text-secondary tracking-[0.32px]">
                  {trade.durationLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Desktop: table layout ===== */}
      <div className="hidden md:block">
        {/* Table header */}
        <div className="flex gap-6 border-b border-border-primary pb-3">
          <div className="flex-1">
            <p className="typo-body-lg font-semibold text-text-secondary">
              상태 / 매매 기간
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="typo-body-lg font-semibold text-text-secondary">
              매수 단가 → 매도 단가
            </p>
          </div>
          <div className="flex-1 flex gap-4">
            <div className="flex-1 text-right">
              <p className="typo-body-lg font-semibold text-text-secondary">
                보유 기간
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="typo-body-lg font-semibold text-text-secondary">
                수익률
              </p>
            </div>
          </div>
        </div>

        {/* Table rows */}
        {paginated.map((trade) => {
          const isPositive = trade.returnRate >= 0;
          const returnColor = isPositive
            ? "var(--color-text-danger)"
            : "var(--color-text-info)";
          const sign = isPositive ? "+" : "";
          const rightPrice = trade.sellPrice ?? trade.currentPrice;

          return (
            <div key={trade.id} className="flex gap-4 items-center py-6">
              {/* Col 1: status + date */}
              <div className="flex flex-1 items-center gap-2">
                <StatusBadge status={trade.status} />
                <span className="typo-body-md font-semibold text-text-primary tracking-tight">
                  {trade.dateRange}
                </span>
              </div>

              {/* Col 2: buy → sell price */}
              <div className="flex flex-1 items-center justify-center gap-2">
                <span className="typo-body-md font-medium text-text-secondary">
                  {formatPrice(trade.buyPrice)}
                </span>
                <IoArrowForward
                  size={14}
                  className="text-text-tertiary shrink-0"
                />
                <span className="typo-body-md font-semibold text-text-primary">
                  {rightPrice ? formatPrice(rightPrice) : "-"}
                </span>
              </div>

              {/* Col 3: duration + return rate */}
              <div className="flex flex-1 gap-4">
                <div className="flex-1 text-right">
                  <span className="typo-body-md font-medium text-text-secondary tracking-tight">
                    {trade.durationLabel}
                  </span>
                </div>
                <div className="flex-1 text-right">
                  <span
                    className="typo-body-lg font-semibold"
                    style={{ color: returnColor }}
                  >
                    {sign}
                    {trade.returnRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
