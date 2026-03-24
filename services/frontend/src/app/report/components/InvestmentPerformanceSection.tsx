"use client";

import { useEffect, useMemo, useState } from "react";
import type { InvestmentPerformanceResponse, TradeHistoryItem } from "../types/report";
import TradeHistoryModal from "./TradeHistoryModal";

type ChartPeriodKey = "1M" | "3M" | "1Y";

interface InvestmentPerformanceSectionProps {
  companyName: string;
  performance: InvestmentPerformanceResponse | null;
  trades: TradeHistoryItem[];
  isLoading?: boolean;
  error?: string | null;
}

export default function InvestmentPerformanceSection({
  companyName,
  performance,
  trades,
  isLoading = false,
  error = null,
}: InvestmentPerformanceSectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriodKey>("3M");
  const chartData = useMemo(() => buildPerformanceChartData(performance, trades, selectedPeriod), [performance, trades, selectedPeriod]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <>
      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="heading-reset text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)]">
              AI 모의투자 성과
            </h2>
            <p className="text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">
              최근 1년간 실제 주가 흐름 위에 AI 매매 신호를 표시한 결과입니다.
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
            value={formatPercent(performance?.winRate)}
            valueClassName="text-[color:var(--color-text-danger)]"
            caption={buildHitCountCaption(trades)}
          />
          <MetricCard
            label="평균 수익률"
            value={formatPercent(performance?.recentReturn, true)}
            valueClassName="text-[color:var(--color-text-primary)]"
          />
          <MetricCard
            label="누적 수익률"
            value={formatPercent(performance?.cumulativeReturn, true)}
            valueClassName="text-[color:var(--color-text-danger)]"
          />
        </div>

        <div className="overflow-hidden rounded-xl bg-[color:var(--color-bg-primary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-primary)]">
          <div className="flex items-center justify-end border-b border-[color:var(--color-border-secondary)] px-6 py-4">
            <div className="inline-flex rounded-lg bg-[color:var(--color-bg-secondary)] p-1">
              {CHART_PERIOD_OPTIONS.map((option) => {
                const isActive = option.value === selectedPeriod;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedPeriod(option.value)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                        : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative h-80">
            {chartData ? (
              <svg viewBox="0 0 1022 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-label={`${companyName} 백테스트 차트`}>
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
                      stroke={point.tone === "buy" ? "var(--color-text-danger)" : "var(--color-text-info)"}
                      strokeDasharray="4 6"
                      opacity="0.8"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="11"
                      fill={point.tone === "buy" ? "var(--color-bg-danger-subtle)" : "var(--color-bg-info-subtle)"}
                      stroke={point.tone === "buy" ? "var(--color-text-danger)" : "var(--color-text-info)"}
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
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-[color:var(--color-text-tertiary)]">
                {isLoading ? "성과 데이터를 불러오는 중입니다." : error ?? "성과 차트 데이터가 없습니다."}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--color-border-secondary)] px-6 py-4">
            <div className="flex items-center gap-4 text-sm font-semibold leading-5">
              <div className="flex items-center gap-2 text-[color:var(--color-text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-text-danger)]" />
                <span>매수</span>
              </div>
              <div className="flex items-center gap-2 text-[color:var(--color-text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-text-info)]" />
                <span>매도</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{chartData?.startLabel ?? ""}</div>
              <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{chartData?.endLabel ?? ""}</div>
            </div>
          </div>
        </div>
      </section>

      <TradeHistoryModal
        open={isModalOpen}
        companyName={companyName}
        trades={trades}
        isLoading={isLoading}
        error={error}
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
    <div className="flex min-h-[126px] flex-1 flex-col rounded-lg bg-[color:var(--color-bg-secondary)] px-2 py-3">
      <div className="pb-1.5 text-center text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{label}</div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <div className={`text-3xl font-extrabold leading-9 ${valueClassName}`}>{value}</div>
        {caption ? <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">{caption}</div> : null}
      </div>
    </div>
  );
}

function buildPerformanceChartData(
  performance: InvestmentPerformanceResponse | null,
  trades: TradeHistoryItem[],
  selectedPeriod: ChartPeriodKey,
) {
  const chartSeries = buildChartSeries(performance?.chart, selectedPeriod);

  if (chartSeries.length < 2) {
    return null;
  }

  const chartLeft = 36;
  const chartTop = 28;
  const chartRight = 986;
  const chartBottom = 280;
  const priceValues = chartSeries.map((item) => item.close);
  const minClose = Math.min(...priceValues);
  const maxClose = Math.max(...priceValues);
  const range = Math.max(maxClose - minClose, 1);

  const points = chartSeries.map((item, index) => {
    const x = chartLeft + (index / (chartSeries.length - 1)) * (chartRight - chartLeft);
    const y = chartTop + ((maxClose - item.close) / range) * (chartBottom - chartTop);
    return { x, y, timestamp: item.timestamp, close: item.close, tradeType: item.tradeType };
  });

  const signalPointsFromPerformance = points
    .map((point, index) => {
      if (!point.tradeType) {
        return null;
      }
      return {
        id: `${point.timestamp}-${point.tradeType}-${index}`,
        label: point.tradeType === "BUY" ? "B" : "S",
        tone: point.tradeType === "BUY" ? "buy" : "sell",
        x: point.x,
        y: point.y,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
  const signalPoints = signalPointsFromPerformance;

  const step = (chartBottom - chartTop) / 3;
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return {
    linePath,
    areaPath: `${linePath} L ${points.at(-1)?.x ?? chartRight} ${chartBottom} L ${points[0]?.x ?? chartLeft} ${chartBottom} Z`,
    gridLines: Array.from({ length: 4 }, (_, index) => chartTop + step * index),
    signalPoints,
    startLabel: formatMonthLabel(points[0]?.timestamp),
    endLabel: formatMonthLabel(points.at(-1)?.timestamp),
  };
}

const CHART_PERIOD_OPTIONS: Array<{ value: ChartPeriodKey; label: string }> = [
  { value: "1M", label: "1개월" },
  { value: "3M", label: "3개월" },
  { value: "1Y", label: "1년" },
];

function buildChartSeries(performanceChart: InvestmentPerformanceResponse["chart"] | undefined, selectedPeriod: ChartPeriodKey) {
  const filteredChart = filterPerformanceChartByPeriod(performanceChart ?? [], selectedPeriod);

  if (filteredChart.length >= 2) {
    return filteredChart.map((point) => ({
      timestamp: point.date,
      close: point.price,
      tradeType: point.tradeType,
    }));
  }

  return [];
}

function filterPerformanceChartByPeriod(chart: InvestmentPerformanceResponse["chart"], selectedPeriod: ChartPeriodKey) {
  const cutoffTime = getCutoffTime(chart.map((item) => item.date), selectedPeriod);
  if (cutoffTime === null) {
    return chart;
  }

  return chart.filter((item) => {
    const time = new Date(item.date).getTime();
    return !Number.isNaN(time) && time >= cutoffTime;
  });
}

function getCutoffTime(values: string[], selectedPeriod: ChartPeriodKey) {
  if (selectedPeriod === "1Y") {
    return null;
  }

  const latestTime = values.reduce((max, value) => {
    const time = new Date(value).getTime();
    return !Number.isNaN(time) && time > max ? time : max;
  }, Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(latestTime)) {
    return null;
  }

  const cutoffDate = new Date(latestTime);
  cutoffDate.setMonth(cutoffDate.getMonth() - (selectedPeriod === "1M" ? 1 : 3));
  return cutoffDate.getTime();
}

function buildHitCountCaption(trades: TradeHistoryItem[]) {
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const positiveTrades = closedTrades.filter((trade) => typeof trade.returnRate === "number" && Number.isFinite(trade.returnRate) && trade.returnRate > 0);
  const totalTrades = closedTrades.length;

  return `${positiveTrades.length}/${totalTrades}회 수익실현`;
}

function formatPercent(value: number | undefined, withSign = false) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const sign = withSign && safeValue > 0 ? "+" : "";
  return `${sign}${safeValue.toFixed(1)}%`;
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
