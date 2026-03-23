"use client";

import { useEffect, useMemo, useState } from "react";
import type { StockPricePoint } from "@/app/stocks/types/stockDetail";
import { getMockStockPrices } from "@/app/stocks/utils/mockStockDetailData";
import { getTradeHistory } from "../api/getTradeHistory";
import type { TradeHistoryItem } from "../types/report";
import TradeHistoryModal from "./TradeHistoryModal";
import { getMockTradeHistory } from "../utils/mockReportPageData";

interface InvestmentPerformanceSectionProps {
  stockId: string;
  companyName: string;
  hitRate: string;
  hitCount: string;
  averageReturn: string;
  cumulativeReturn: string;
}

export default function InvestmentPerformanceSection({
  stockId,
  companyName,
  hitRate,
  hitCount,
  averageReturn,
  cumulativeReturn,
}: InvestmentPerformanceSectionProps) {
  const prices = useMemo(() => getMockStockPrices(stockId, "3Y").prices, [stockId]);
  const chartData = useMemo(() => buildPerformanceChartData(prices), [prices]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [isTradeHistoryLoading, setIsTradeHistoryLoading] = useState(false);
  const [tradeHistoryError, setTradeHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    let isCancelled = false;

    const loadTradeHistory = async () => {
      setIsTradeHistoryLoading(true);
      setTradeHistoryError(null);

      try {
        const response = await getTradeHistory(stockId, 0, 100);
        if (!isCancelled) {
          setTradeHistory(response.trades);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setTradeHistory(getMockTradeHistory(stockId, { offset: 0, limit: 100 }).trades);
        setTradeHistoryError(error instanceof Error ? error.message : "매매 내역을 불러오지 못했습니다.");
      } finally {
        if (!isCancelled) {
          setIsTradeHistoryLoading(false);
        }
      }
    };

    void loadTradeHistory();

    return () => {
      isCancelled = true;
    };
  }, [isModalOpen, stockId]);

  return (
    <>
      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="heading-reset text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)]">
              AI 모의투자 성과
            </h2>
            <p className="text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">
              최근 3년간의 AI 매매 신호 기준 백테스팅 결과입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-[color:var(--color-bg-tertiary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
          >
            내역 전체보기
          </button>
        </div>

        <div className="flex items-start gap-4">
          <MetricCard
            label="예측 적중률"
            value={hitRate}
            valueClassName="text-[color:var(--color-text-danger)]"
            caption={`(${hitCount})`}
          />
          <MetricCard label="평균 수익률" value={averageReturn} valueClassName="text-[color:var(--color-text-primary)]" />
          <MetricCard
            label="누적 수익률"
            value={cumulativeReturn}
            valueClassName="text-[color:var(--color-text-danger)]"
          />
        </div>

        <div className="overflow-hidden rounded-xl bg-[color:var(--color-bg-primary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-primary)]">
          <div className="relative h-80">
            <svg viewBox="0 0 1022 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-label={`${stockId} 백테스트 차트`}>
              {chartData.gridLines.map((lineY) => (
                <line
                  key={lineY}
                  x1="36"
                  x2="986"
                  y1={lineY}
                  y2={lineY}
                  stroke="var(--color-border-primary)"
                  strokeDasharray="6 8"
                />
              ))}

              <path d={chartData.areaPath} fill="url(#investment-performance-fill)" opacity="0.14" />
              <path
                d={chartData.linePath}
                fill="none"
                stroke="var(--color-text-primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chartData.signalPoints.map((point) => (
                <g key={point.id}>
                  <line
                    x1={point.x}
                    x2={point.x}
                    y1={point.y}
                    y2="280"
                    stroke={point.tone === "buy" ? "var(--color-text-danger-bold)" : "var(--color-text-info)"}
                    strokeDasharray="4 6"
                    opacity="0.8"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="11"
                    fill={point.tone === "buy" ? "var(--color-bg-danger-subtle)" : "var(--color-bg-info-subtle)"}
                    stroke={point.tone === "buy" ? "var(--color-text-danger-bold)" : "var(--color-text-info)"}
                    strokeWidth="2.5"
                  />
                  <text
                    x={point.x}
                    y={point.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={point.tone === "buy" ? "var(--color-text-danger-bold)" : "var(--color-text-info)"}
                  >
                    {point.label}
                  </text>
                </g>
              ))}

              <defs>
                <linearGradient id="investment-performance-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-text-primary)" />
                  <stop offset="100%" stopColor="var(--color-text-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--color-border-secondary)] px-6 py-4">
            <div className="flex items-center gap-4 text-sm font-semibold leading-5">
              <div className="flex items-center gap-2 text-[color:var(--color-text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-text-danger-bold)]" />
                <span>매수</span>
              </div>
              <div className="flex items-center gap-2 text-[color:var(--color-text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-text-info)]" />
                <span>매도</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{chartData.startLabel}</div>
              <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{chartData.endLabel}</div>
            </div>
          </div>
        </div>
      </section>

      <TradeHistoryModal
        open={isModalOpen}
        companyName={companyName}
        trades={tradeHistory}
        isLoading={isTradeHistoryLoading}
        error={tradeHistoryError}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

function MetricCard({
  label,
  value,
  caption,
  valueClassName,
}: {
  label: string;
  value: string;
  caption?: string;
  valueClassName: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[color:var(--color-bg-secondary)] px-2 py-3">
      <div className="pb-1.5 text-center text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{label}</div>
      <div className="flex flex-col items-center gap-1">
        <div className={`text-3xl font-extrabold leading-9 ${valueClassName}`}>{value}</div>
        {caption ? <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{caption}</div> : null}
      </div>
    </div>
  );
}

function buildPerformanceChartData(prices: StockPricePoint[]) {
  const safePrices = prices.length > 1 ? prices : getMockStockPrices("005930", "3Y").prices;
  const chartLeft = 36;
  const chartTop = 28;
  const chartRight = 986;
  const chartBottom = 280;
  const closes = safePrices.map((item) => item.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const range = Math.max(maxClose - minClose, 1);

  const points = safePrices.map((item, index) => {
    const x = chartLeft + (index / (safePrices.length - 1)) * (chartRight - chartLeft);
    const y = chartTop + ((maxClose - item.close) / range) * (chartBottom - chartTop);
    return { x, y, close: item.close, timestamp: item.timestamp };
  });

  const signalIndexes = [6, 15, 24, 34, 43, 52]
    .map((ratioIndex) => Math.min(points.length - 1, Math.round((ratioIndex / 52) * (points.length - 1))))
    .filter((value, index, list) => list.indexOf(value) === index);

  const signalPoints = signalIndexes.map((pointIndex, index) => {
    const point = points[pointIndex];
    const tone = index % 2 === 0 ? "buy" : "sell";

    return {
      id: `${tone}-${pointIndex}`,
      label: tone === "buy" ? "B" : "S",
      tone,
      x: point.x,
      y: point.y,
    };
  });

  const step = (chartBottom - chartTop) / 3;

  return {
    linePath: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
    areaPath: `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} L ${points.at(-1)?.x ?? chartRight} ${chartBottom} L ${points[0]?.x ?? chartLeft} ${chartBottom} Z`,
    gridLines: Array.from({ length: 4 }, (_, index) => chartTop + step * index),
    signalPoints,
    startLabel: formatMonthLabel(points[0]?.timestamp),
    endLabel: formatMonthLabel(points.at(-1)?.timestamp),
  };
}

function formatMonthLabel(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}
