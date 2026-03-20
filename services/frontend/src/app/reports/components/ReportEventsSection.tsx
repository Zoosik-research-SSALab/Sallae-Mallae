"use client";

import { useMemo, useState } from "react";
import { getMockStockPrices } from "@/app/stocks/utils/mockStockDetailData";
import type { StockPricePoint } from "@/app/stocks/types/stockDetail";
import type { ReportEventItem } from "../types/report";

interface ReportEventsSectionProps {
  stockId: string;
  events: ReportEventItem[];
}

const chartWidth = 550;
const chartHeight = 320;
const chartPadding = { top: 28, right: 16, bottom: 40, left: 16 };

export default function ReportEventsSection({ stockId, events }: ReportEventsSectionProps) {
  const prices = useMemo(() => getMockStockPrices(stockId, "1M").prices, [stockId]);
  const [activeEventId, setActiveEventId] = useState(events[0]?.id ?? "");

  const chartData = buildChartData(prices, events);
  const activeEvent = chartData.eventPoints.find((item) => item.event.id === activeEventId) ?? chartData.eventPoints[0] ?? null;

  return (
    <section className="flex w-full max-w-[1152px] flex-col gap-16 px-4">
      <section className="flex flex-col gap-8">
        <h2 className="heading-reset text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)]">
          주가 변동 주요 이벤트
        </h2>

        <div className="flex items-start gap-4 border-b border-[color:var(--color-border-primary)]">
          <span className="border-b-2 border-[color:var(--color-border-base)] pb-3 text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">
            전체
          </span>
          <span className="pb-3 text-base font-semibold leading-6 text-[color:var(--color-text-tertiary)]">실적발표</span>
          <span className="pb-3 text-base font-semibold leading-6 text-[color:var(--color-text-tertiary)]">주요공시</span>
          <span className="pb-3 text-base font-semibold leading-6 text-[color:var(--color-text-tertiary)]">시세특이</span>
        </div>

        <div className="flex flex-col gap-8 pt-2 lg:flex-row lg:items-start lg:gap-16">
          <div className="flex w-full max-w-[550px] flex-col gap-4">
            <div className="relative h-80 w-full overflow-hidden rounded-xl bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,1)_100%)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-bg-disabled)]">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full" preserveAspectRatio="none" aria-label={`${stockId} 주가 변동 차트`}>
                {chartData.gridLines.map((lineY) => (
                  <line
                    key={lineY}
                    x1={chartPadding.left}
                    x2={chartWidth - chartPadding.right}
                    y1={lineY}
                    y2={lineY}
                    stroke="var(--color-border-primary)"
                    strokeDasharray="6 8"
                  />
                ))}

                <path d={chartData.areaPath} fill="url(#report-events-area-fill)" opacity="0.18" />
                <path
                  d={chartData.linePath}
                  fill="none"
                  stroke="var(--color-text-danger-bold)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chartData.eventPoints.map((point) => {
                  const isActive = point.event.id === activeEvent?.event.id;

                  return (
                    <g key={point.event.id}>
                      <line
                        x1={point.x}
                        x2={point.x}
                        y1={point.y}
                        y2={chartHeight - chartPadding.bottom}
                        stroke={isActive ? "var(--color-text-primary)" : "var(--color-border-disabled)"}
                        strokeDasharray="4 6"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? 7 : 5}
                        fill="var(--color-bg-primary)"
                        stroke={isActive ? "var(--color-text-primary)" : "var(--color-text-danger-bold)"}
                        strokeWidth={isActive ? 3 : 2}
                      />
                      <circle cx={point.x} cy={point.y} r="2.5" fill="var(--color-text-danger-bold)" />
                      <g transform={`translate(${point.x}, ${point.y - 18})`}>
                        <rect
                          x="-13"
                          y="-15"
                          width="26"
                          height="22"
                          rx="11"
                          fill={isActive ? "var(--color-text-primary)" : "var(--color-bg-primary)"}
                          stroke={isActive ? "var(--color-text-primary)" : "var(--color-border-primary)"}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          y="-4"
                          fontSize="12"
                          fontWeight="800"
                          fill={isActive ? "var(--color-text-base)" : "var(--color-text-primary)"}
                        >
                          {point.label}
                        </text>
                      </g>
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="report-events-area-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-text-danger-bold)" />
                    <stop offset="100%" stopColor="var(--color-text-danger-bold)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex items-start justify-between gap-3 text-xs font-semibold leading-4 text-[color:var(--color-text-tertiary)]">
              <span>{chartData.startLabel}</span>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-sm font-bold leading-5 text-[color:var(--color-text-primary)]">{chartData.endPriceLabel}</span>
                <span className={chartData.changeRate >= 0 ? "text-[color:var(--color-text-danger-bold)]" : "text-[color:var(--color-text-info)]"}>
                  {chartData.changeRate >= 0 ? "+" : ""}
                  {chartData.changeRate.toFixed(2)}%
                </span>
              </div>
            </div>

            {activeEvent ? (
              <div className="rounded-xl bg-[color:var(--color-bg-secondary)] px-4 py-4 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[color:var(--color-text-primary)] px-2.5 py-1 text-xs font-extrabold leading-4 text-[color:var(--color-text-base)]">
                    {activeEvent.label}
                  </span>
                  <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">{activeEvent.event.title}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">{activeEvent.event.description}</p>
              </div>
            ) : null}
          </div>

          <div className="flex w-full max-w-80 flex-col gap-5">
            {events.map((event, index) => (
              <EventItemRow
                key={event.id}
                event={event}
                index={index}
                isActive={event.id === activeEvent?.event.id}
                onMouseEnter={() => setActiveEventId(event.id)}
                onFocus={() => setActiveEventId(event.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded-xl bg-[color:var(--color-bg-tertiary)] px-8 py-4 text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]"
        >
          이 종목 포트폴리오 보기
        </button>
      </div>
    </section>
  );
}

function EventItemRow({
  event,
  index,
  isActive,
  onMouseEnter,
  onFocus,
}: {
  event: ReportEventItem;
  index: number;
  isActive: boolean;
  onMouseEnter: () => void;
  onFocus: () => void;
}) {
  const badgeClassName =
    event.tone === "info"
      ? "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]"
      : event.tone === "danger"
        ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]"
        : "bg-[color:var(--color-bg-disabled)] text-[color:var(--color-text-primary)]";

  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      className={`flex items-start gap-5 rounded-xl px-3 py-3 text-left transition-colors ${
        isActive ? "bg-[color:var(--color-bg-secondary)]" : "bg-transparent hover:bg-[color:var(--color-bg-secondary)]"
      }`}
    >
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold leading-5 ${
            isActive
              ? "bg-[color:var(--color-text-primary)] text-[color:var(--color-text-base)]"
              : "bg-[color:var(--color-bg-brand)] text-[color:var(--color-text-base)]"
          }`}
        >
          {String.fromCharCode(65 + index)}
        </div>
        {index < 2 ? <div className="mt-2 h-16 w-px bg-[color:var(--color-bg-disabled)]" /> : <div className="mt-2 h-16 w-px opacity-0" />}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">{event.date}</span>
          <span className={`rounded-sm px-2 py-1 text-xs font-semibold leading-4 ${badgeClassName}`}>{event.category}</span>
        </div>
        <div className="text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{event.title}</div>
        <div className="text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">{event.description}</div>
      </div>
    </button>
  );
}

function buildChartData(prices: StockPricePoint[], events: ReportEventItem[]) {
  const safePrices = prices.length > 1 ? prices : getMockStockPrices("005930", "1M").prices;
  const chartLeft = chartPadding.left;
  const chartTop = chartPadding.top;
  const chartRight = chartWidth - chartPadding.right;
  const chartBottom = chartHeight - chartPadding.bottom;
  const closes = safePrices.map((item) => item.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const range = Math.max(maxClose - minClose, 1);

  const points = safePrices.map((item, index) => {
    const x = chartLeft + (index / (safePrices.length - 1)) * (chartRight - chartLeft);
    const y = chartTop + ((maxClose - item.close) / range) * (chartBottom - chartTop);
    return { x, y, item };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? chartRight} ${chartBottom} L ${points[0]?.x ?? chartLeft} ${chartBottom} Z`;
  const step = (chartBottom - chartTop) / 3;
  const gridLines = Array.from({ length: 4 }, (_, index) => chartTop + step * index);
  const eventPoints = events.map((event, index) => {
    const targetIndex = getEventPointIndex(event, index, events.length, safePrices);
    const targetPoint = points[targetIndex] ?? points[0];

    return {
      event,
      label: String.fromCharCode(65 + index),
      x: targetPoint.x,
      y: targetPoint.y,
    };
  });

  return {
    linePath,
    areaPath,
    gridLines,
    eventPoints,
    startLabel: formatShortDate(safePrices[0]?.timestamp),
    endPriceLabel: `${Math.round(safePrices.at(-1)?.close ?? 0).toLocaleString("ko-KR")}원`,
    changeRate: (((safePrices.at(-1)?.close ?? 0) - (safePrices[0]?.close ?? 0)) / (safePrices[0]?.close ?? 1)) * 100,
  };
}

function getEventPointIndex(event: ReportEventItem, eventIndex: number, totalEvents: number, prices: StockPricePoint[]) {
  const eventDate = parseEventDate(event.date);

  if (eventDate) {
    let nearestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    prices.forEach((price, index) => {
      const distance = Math.abs(new Date(price.timestamp).getTime() - eventDate.getTime());
      if (distance < minDistance) {
        nearestIndex = index;
        minDistance = distance;
      }
    });

    return nearestIndex;
  }

  if (totalEvents <= 1) {
    return Math.max(0, prices.length - 1);
  }

  return Math.round((eventIndex / (totalEvents - 1)) * (prices.length - 1));
}

function parseEventDate(value: string) {
  const normalized = value.replace(/\./g, "-");
  const parsed = new Date(`${normalized}T15:30:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatShortDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}
