"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StockAnnouncementItem, StockPricePoint } from "@/app/stocks/types/stockDetail";
import type { ReportEventItem } from "../types/report";

interface ReportEventsSectionProps {
  stockId: string;
  companyName: string;
  prices: StockPricePoint[];
  events: ReportEventItem[];
  isLoading?: boolean;
  error?: string | null;
}

type EventTab = "전체" | "실적발표" | "주요공시" | "시세특이";

const chartWidth = 720;
const chartHeight = 420;
const chartPadding = { top: 28, right: 16, bottom: 40, left: 16 };
const eventTabs: EventTab[] = ["전체", "실적발표", "주요공시", "시세특이"];

export default function ReportEventsSection({ stockId, companyName, prices, events, isLoading = false, error = null }: ReportEventsSectionProps) {
  const [activeTab, setActiveTab] = useState<EventTab>("전체");
  const [activeEventId, setActiveEventId] = useState("");
  const filteredEvents = useMemo(() => filterEventsByTab(events, activeTab), [activeTab, events]);
  const chartData = buildChartData(prices, filteredEvents);
  const activeEvent = chartData.eventPoints.find((item) => item.event.id === activeEventId) ?? chartData.eventPoints[0] ?? null;

  return (
    <section className="flex w-full max-w-[1152px] flex-col gap-16 px-4">
      <section className="flex flex-col gap-8">
        <h2 className="heading-reset text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)]">
          주가 변동 주요 이벤트
        </h2>

        <div className="flex items-start gap-4 border-b border-[color:var(--color-border-primary)]">
          {eventTabs.map((tab) => {
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setActiveEventId("");
                }}
                className={`border-b-2 pb-3 text-base font-semibold leading-6 transition-colors ${
                  isActive
                    ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                    : "border-transparent text-[color:var(--color-text-tertiary)]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-8 pt-2 lg:flex-row lg:items-start lg:gap-10">
          <div className="flex w-full flex-col gap-4 lg:max-w-[720px] lg:flex-[1.35]">
            <div className="relative aspect-[12/7] w-full overflow-hidden rounded-xl bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,1)_100%)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-bg-disabled)]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                aria-label={`${companyName} 주가 변동 차트`}
              >
                {chartData.hasChart ? (
                  <>
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
                      stroke="var(--color-text-danger)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {chartData.eventPoints.map((point) => {
                      const isActive = point.event.id === activeEvent?.event.id;
                      const labelY = Math.max(point.y - 18, 18);

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
                          <circle cx={point.x} cy={point.y} r="2.5" fill="var(--color-text-danger)" />
                          <g transform={`translate(${point.x}, ${labelY})`}>
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
                        <stop offset="0%" stopColor="var(--color-text-danger)" />
                        <stop offset="100%" stopColor="var(--color-text-danger)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </>
                ) : null}
              </svg>
              {!chartData.hasChart ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-[color:var(--color-text-tertiary)]">
                  {isLoading ? "이벤트 차트를 불러오는 중입니다." : error ?? "이벤트 차트 데이터가 없습니다."}
                </div>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3 text-xs font-semibold leading-4 text-[color:var(--color-text-tertiary)]">
              <span>{chartData.startLabel}</span>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-sm font-bold leading-5 text-[color:var(--color-text-primary)]">{chartData.endPriceLabel}</span>
                <span className={chartData.changeRate >= 0 ? "text-[color:var(--color-text-danger)]" : "text-[color:var(--color-text-info)]"}>
                  {chartData.changeRate >= 0 ? "+" : ""}
                  {chartData.changeRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-5 lg:max-w-[320px] lg:flex-[0.75]">
            {filteredEvents.map((event, index) => (
              <EventItemRow
                key={event.id}
                event={event}
                index={index}
                isActive={event.id === activeEvent?.event.id}
                onMouseEnter={() => setActiveEventId(event.id)}
                onFocus={() => setActiveEventId(event.id)}
              />
            ))}
            {filteredEvents.length === 0 ? (
              <div className="rounded-xl bg-[color:var(--color-bg-secondary)] px-4 py-5 text-sm font-medium leading-6 text-[color:var(--color-text-tertiary)]">
                해당 탭에 표시할 이벤트가 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <Link
          href={`/portfolio/${stockId}`}
          className="rounded-xl bg-[color:var(--color-bg-tertiary)] px-8 py-4 text-base font-semibold leading-6 text-[color:var(--color-text-secondary)] transition-opacity hover:opacity-80"
        >
          이 종목 포트폴리오 보기
        </Link>
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
        ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger)]"
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

export function mapAnnouncementsToEvents(announcements: StockAnnouncementItem[]): ReportEventItem[] {
  return announcements.map((announcement) => ({
    id: String(announcement.id),
    date: formatEventDate(announcement.announcedAt),
    category: "주요공시",
    title: announcement.title,
    description: "공시 원문 기반 이벤트입니다.",
    tone: "neutral",
  }));
}

function filterEventsByTab(events: ReportEventItem[], tab: EventTab) {
  if (tab === "전체") {
    return events;
  }

  return events.filter((event) => normalizeEventTab(event.category) === tab);
}

function normalizeEventTab(category: string): EventTab {
  if (category.includes("실적")) {
    return "실적발표";
  }
  if (category.includes("공시")) {
    return "주요공시";
  }
  if (category.includes("시세")) {
    return "시세특이";
  }
  return "전체";
}

function buildChartData(prices: StockPricePoint[], events: ReportEventItem[]) {
  const chartLeft = chartPadding.left;
  const chartTop = chartPadding.top;
  const chartRight = chartWidth - chartPadding.right;
  const chartBottom = chartHeight - chartPadding.bottom;
  const step = (chartBottom - chartTop) / 3;
  const gridLines = Array.from({ length: 4 }, (_, index) => chartTop + step * index);

  if (prices.length < 2) {
    return {
      hasChart: false,
      linePath: "",
      areaPath: "",
      gridLines,
      eventPoints: [],
      startLabel: "",
      endPriceLabel: "",
      changeRate: 0,
    };
  }

  const closes = prices.map((item) => item.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const range = Math.max(maxClose - minClose, 1);

  const points = prices.map((item, index) => {
    const x = chartLeft + (index / (prices.length - 1)) * (chartRight - chartLeft);
    const y = chartTop + ((maxClose - item.close) / range) * (chartBottom - chartTop);
    return { x, y, item };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? chartRight} ${chartBottom} L ${points[0]?.x ?? chartLeft} ${chartBottom} Z`;
  const eventPoints = events.map((event, index) => {
    const targetIndex = getEventPointIndex(event, index, events.length, prices);
    const targetPoint = points[targetIndex] ?? points[0];

    return {
      event,
      label: String.fromCharCode(65 + index),
      x: targetPoint.x,
      y: targetPoint.y,
    };
  });

  return {
    hasChart: true,
    linePath,
    areaPath,
    gridLines,
    eventPoints,
    startLabel: formatShortDate(prices[0]?.timestamp),
    endPriceLabel: `${Math.round(prices.at(-1)?.close ?? 0).toLocaleString("ko-KR")}원`,
    changeRate: (((prices.at(-1)?.close ?? 0) - (prices[0]?.close ?? 0)) / (prices[0]?.close ?? 1)) * 100,
  };
}

function formatEventDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
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
