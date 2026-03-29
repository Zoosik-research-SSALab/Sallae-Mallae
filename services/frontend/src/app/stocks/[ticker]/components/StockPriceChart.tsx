"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef, useState } from "react";
import type { StockChartPeriod, StockPriceChartMode, StockPricePoint } from "@/app/stocks/types/stockDetail";
import { cn } from "@/shared/utils/cn";
import {
  formatChartTooltipLabel,
  formatVolume,
  formatWon,
  getChartPriceRange,
  getDisplayChartPrices,
  getInitialVisiblePointCount,
} from "../utils/stockDetailFormatters";

type Props = {
  prices: StockPricePoint[];
  period: StockChartPeriod;
  mode?: StockPriceChartMode;
  className?: string;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onRequestMore?: () => void;
};

type ZoomWindow = {
  startValue: number;
  endValue: number;
};

type SeoulDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type AxisLabelState = {
  labelsByValue: Map<string, string>;
  visibleValues: Set<string>;
};

type ChartTheme = {
  textPrimary: string;
  textSecondary: string;
  borderPrimary: string;
  danger: string;
  interactivePrimary: string;
  bgPrimary: string;
};

const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toFiniteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getZoomWindowFromOption(chart: EChartsType | null) {
  const dataZoomOptions = chart?.getOption()?.dataZoom;
  const firstDataZoom = Array.isArray(dataZoomOptions) ? dataZoomOptions[0] : undefined;
  const startValue = toFiniteNumber(firstDataZoom?.startValue);
  const endValue = toFiniteNumber(firstDataZoom?.endValue);

  if (startValue === null || endValue === null) {
    return null;
  }

  return {
    startValue,
    endValue,
  } satisfies ZoomWindow;
}

function getLoadMoreThreshold(period: StockChartPeriod) {
  switch (period) {
    case "1W":
      return 4;
    case "1M":
      return 2;
    case "1Y":
      return 1;
    default:
      return 10;
  }
}

function buildInitialZoomWindow(period: StockChartPeriod, total: number): ZoomWindow {
  const visibleCount = getInitialVisiblePointCount(period, total);

  if (visibleCount <= 0 || visibleCount >= total) {
    return {
      startValue: 0,
      endValue: Math.max(0, total - 1),
    };
  }

  return {
    startValue: Math.max(0, total - visibleCount),
    endValue: Math.max(0, total - 1),
  };
}

function getZoomWindowSpan(zoomWindow: ZoomWindow) {
  return Math.max(1, zoomWindow.endValue - zoomWindow.startValue + 1);
}

function clampZoomWindow(zoomWindow: ZoomWindow, total: number, minimumSpan = 1): ZoomWindow {
  const maxIndex = Math.max(0, total - 1);
  const minimumVisibleCount = Math.max(1, Math.min(minimumSpan, Math.max(1, total)));
  let startValue = Math.max(0, Math.min(zoomWindow.startValue, maxIndex));
  let endValue = Math.max(startValue, Math.min(zoomWindow.endValue, maxIndex));

  if (endValue - startValue + 1 < minimumVisibleCount) {
    endValue = Math.min(maxIndex, startValue + minimumVisibleCount - 1);

    if (endValue - startValue + 1 < minimumVisibleCount) {
      startValue = Math.max(0, endValue - minimumVisibleCount + 1);
    }
  }

  return {
    startValue,
    endValue,
  };
}

function getCachedSeoulDateParts(cache: Map<string, SeoulDateParts | null>, timestamp: string) {
  if (cache.has(timestamp)) {
    return cache.get(timestamp) ?? null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    cache.set(timestamp, null);
    return null;
  }

  const parts = seoulDateFormatter.formatToParts(date);
  const readPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  const value = {
    year: Number(readPart("year")),
    month: Number(readPart("month")),
    day: Number(readPart("day")),
    hour: Number(readPart("hour")),
    minute: Number(readPart("minute")),
  } satisfies SeoulDateParts;

  cache.set(timestamp, value);
  return value;
}

function formatAxisLabelText(parts: SeoulDateParts, period: StockChartPeriod, useYearOnly: boolean) {
  if (period === "1MIN") {
    return `${parts.hour.toString().padStart(2, "0")}:${parts.minute.toString().padStart(2, "0")}`;
  }

  if (useYearOnly) {
    return `${parts.year}년`;
  }

  if (period === "1D" || period === "1W") {
    return parts.month === 1 ? `${parts.year}년` : `${parts.month}월`;
  }

  if (period === "1M" || period === "1Y") {
    return `${parts.year}년`;
  }

  return "";
}

function buildAxisLabelState(
  timestamps: string[],
  partsByIndex: Array<SeoulDateParts | null>,
  period: StockChartPeriod,
  zoomWindow: ZoomWindow,
): AxisLabelState {
  const total = partsByIndex.length;
  const { startValue: visibleStart, endValue: visibleEnd } = clampZoomWindow(zoomWindow, total);
  const distinctYears = new Set<number>();

  for (let index = visibleStart; index <= visibleEnd; index += 1) {
    const parts = partsByIndex[index];
    if (parts) {
      distinctYears.add(parts.year);
    }
  }

  const useYearOnly = period !== "1MIN" && period !== "1Y" && distinctYears.size >= 4;
  const labelsByValue = new Map<string, string>();
  partsByIndex.forEach((parts, index) => {
    labelsByValue.set(timestamps[index] ?? "", parts ? formatAxisLabelText(parts, period, useYearOnly) : "");
  });
  const visibleValues = new Set<string>();

  if ((useYearOnly || period === "1M") && total > 0) {
    let previousYear: number | null = null;

    for (let index = visibleStart; index <= visibleEnd; index += 1) {
      const parts = partsByIndex[index];
      if (!parts) {
        continue;
      }

      if (index === visibleStart || parts.year !== previousYear) {
        visibleValues.add(timestamps[index] ?? "");
      }

      previousYear = parts.year;
    }

    return {
      labelsByValue,
      visibleValues,
    };
  }

  const maxLabelCounts: Record<StockChartPeriod, number> = {
    "1MIN": 6,
    "1D": 7,
    "1W": 8,
    "1M": 7,
    "1Y": 7,
  };
  const labelCount = Math.max(2, maxLabelCounts[period]);
  const visibleTotal = visibleEnd - visibleStart + 1;

  if (visibleTotal <= labelCount) {
    for (let index = visibleStart; index <= visibleEnd; index += 1) {
      visibleValues.add(timestamps[index] ?? "");
    }

    return {
      labelsByValue,
      visibleValues,
    };
  }

  for (let step = 0; step < labelCount; step += 1) {
    const distributedIndex = visibleStart + Math.round((step * (visibleTotal - 1)) / (labelCount - 1));
    visibleValues.add(timestamps[distributedIndex] ?? "");
  }

  return {
    labelsByValue,
    visibleValues,
  };
}

function readChartTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);

  return {
    textPrimary: styles.getPropertyValue("--color-text-primary").trim(),
    textSecondary: styles.getPropertyValue("--color-text-secondary").trim(),
    borderPrimary: styles.getPropertyValue("--color-border-primary").trim(),
    danger: styles.getPropertyValue("--color-text-danger-bold").trim(),
    interactivePrimary: styles.getPropertyValue("--color-text-interactive-primary").trim(),
    bgPrimary: styles.getPropertyValue("--color-bg-primary").trim(),
  };
}

export default function StockPriceChart({
  prices,
  period,
  mode = "line",
  className,
  hasMore = false,
  isFetchingMore = false,
  onRequestMore,
}: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const chartInstanceRef = useRef<EChartsType | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const zoomWindowRef = useRef<ZoomWindow | null>(null);
  const syncingLatestZoomRef = useRef(false);
  const minimumZoomSpanRef = useRef(1);
  const dataLengthRef = useRef(0);
  const previousMetaRef = useRef<{
    length: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
  }>({
    length: 0,
    firstTimestamp: null,
    lastTimestamp: null,
  });
  const requestMoreRef = useRef(onRequestMore);
  const hasMoreRef = useRef(hasMore);
  const isFetchingMoreRef = useRef(isFetchingMore);
  const periodRef = useRef(period);
  const axisDatePartsRef = useRef<Array<SeoulDateParts | null>>([]);
  const axisLabelStateRef = useRef<AxisLabelState>({
    labelsByValue: new Map<string, string>(),
    visibleValues: new Set<string>(),
  });
  const datePartsCacheRef = useRef<Map<string, SeoulDateParts | null>>(new Map());
  const chartThemeRef = useRef<ChartTheme | null>(null);
  const timestampsRef = useRef<string[]>([]);

  requestMoreRef.current = onRequestMore;
  hasMoreRef.current = hasMore;
  isFetchingMoreRef.current = isFetchingMore;
  periodRef.current = period;

  useEffect(() => {
    zoomWindowRef.current = null;
    minimumZoomSpanRef.current = 1;
    axisDatePartsRef.current = [];
    axisLabelStateRef.current = {
      labelsByValue: new Map<string, string>(),
      visibleValues: new Set<string>(),
    };
    previousMetaRef.current = {
      length: 0,
      firstTimestamp: null,
      lastTimestamp: null,
    };
  }, [period]);

  useEffect(() => {
    let disposed = false;

    const initializeChart = async () => {
      if (!chartRef.current) {
        return;
      }

      const echarts = await import("echarts");
      if (disposed || !chartRef.current) {
        return;
      }

      const chart = echarts.init(chartRef.current, undefined, {
        renderer: "canvas",
      });
      chartThemeRef.current = readChartTheme();

      chart.on("datazoom", (...args: unknown[]) => {
        if (syncingLatestZoomRef.current) {
          syncingLatestZoomRef.current = false;
          return;
        }

        const event = (args[0] ?? {}) as {
          batch?: Array<Record<string, unknown>>;
          startValue?: number;
          endValue?: number;
        };
        const detail = event.batch?.[0] ?? event;
        const startValue = toFiniteNumber(detail.startValue);
        const endValue = toFiniteNumber(detail.endValue);
        const nextZoomWindow =
          startValue !== null && endValue !== null
            ? {
                startValue,
                endValue,
              }
            : getZoomWindowFromOption(chart) ?? zoomWindowRef.current;

        if (!nextZoomWindow) {
          return;
        }

        const clampedZoomWindow = clampZoomWindow(
          nextZoomWindow,
          dataLengthRef.current,
          minimumZoomSpanRef.current,
        );
        const currentZoomWindow = zoomWindowRef.current;
        const nextSpan = getZoomWindowSpan(clampedZoomWindow);
        const previousSpan = currentZoomWindow ? getZoomWindowSpan(currentZoomWindow) : nextSpan;
        const maxIndex = Math.max(0, dataLengthRef.current - 1);

        if (nextSpan > previousSpan && clampedZoomWindow.endValue < maxIndex) {
          const anchoredZoomWindow = clampZoomWindow(
            {
              startValue: maxIndex - nextSpan + 1,
              endValue: maxIndex,
            },
            dataLengthRef.current,
            minimumZoomSpanRef.current,
          );

          zoomWindowRef.current = anchoredZoomWindow;
          axisLabelStateRef.current = buildAxisLabelState(
            timestampsRef.current,
            axisDatePartsRef.current,
            periodRef.current,
            anchoredZoomWindow,
          );

          syncingLatestZoomRef.current = true;
          chart.dispatchAction({
            type: "dataZoom",
            batch: [
              {
                dataZoomIndex: 0,
                startValue: anchoredZoomWindow.startValue,
                endValue: anchoredZoomWindow.endValue,
              },
              {
                dataZoomIndex: 1,
                startValue: anchoredZoomWindow.startValue,
                endValue: anchoredZoomWindow.endValue,
              },
            ],
          });
          return;
        }

        zoomWindowRef.current = clampedZoomWindow;
        axisLabelStateRef.current = buildAxisLabelState(
          timestampsRef.current,
          axisDatePartsRef.current,
          periodRef.current,
          clampedZoomWindow,
        );

        if (
          hasMoreRef.current &&
          !isFetchingMoreRef.current &&
          typeof requestMoreRef.current === "function" &&
          clampedZoomWindow.startValue <= getLoadMoreThreshold(periodRef.current)
        ) {
          requestMoreRef.current();
        }
      });

      resizeObserverRef.current = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserverRef.current.observe(chartRef.current);
      chartInstanceRef.current = chart;
      setChartReady(true);
    };

    void initializeChart();

    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
      setChartReady(false);
    };
  }, []);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chartReady || !chart || prices.length === 0) {
      return;
    }

    const visiblePrices = getDisplayChartPrices(prices);
    dataLengthRef.current = visiblePrices.length;
    const timestamps = visiblePrices.map((item) => item.timestamp);
    timestampsRef.current = timestamps;
    const axisDateParts = timestamps.map((timestamp) => getCachedSeoulDateParts(datePartsCacheRef.current, timestamp));
    const closePrices = visiblePrices.map((item) => item.close);
    const candlePrices = visiblePrices.map((item) => [item.open, item.close, item.low, item.high]);
    const volumes = visiblePrices.map((item) => item.volume);
    const priceRange = getChartPriceRange(visiblePrices, mode);
    const previousMeta = previousMetaRef.current;
    const firstTimestamp = visiblePrices[0]?.timestamp ?? null;
    const lastTimestamp = visiblePrices.at(-1)?.timestamp ?? null;
    const addedCount = visiblePrices.length - previousMeta.length;
    const prependedOlderPrices =
      previousMeta.length > 0 &&
      visiblePrices.length > previousMeta.length &&
      previousMeta.firstTimestamp !== null &&
      firstTimestamp !== previousMeta.firstTimestamp;
    const appendedNewPrices =
      previousMeta.length > 0 &&
      visiblePrices.length > previousMeta.length &&
      previousMeta.lastTimestamp !== null &&
      lastTimestamp !== previousMeta.lastTimestamp &&
      previousMeta.firstTimestamp === firstTimestamp;

    const initialZoomWindow = buildInitialZoomWindow(period, visiblePrices.length);
    if (zoomWindowRef.current === null) {
      minimumZoomSpanRef.current = getZoomWindowSpan(initialZoomWindow);
    }

    let zoomWindow = zoomWindowRef.current ?? initialZoomWindow;

    if (prependedOlderPrices && addedCount > 0) {
      zoomWindow = {
        startValue: zoomWindow.startValue + addedCount,
        endValue: zoomWindow.endValue + addedCount,
      };
    } else if (
      appendedNewPrices &&
      addedCount > 0 &&
      zoomWindow.endValue >= Math.max(0, previousMeta.length - 1)
    ) {
      zoomWindow = {
        startValue: zoomWindow.startValue + addedCount,
        endValue: zoomWindow.endValue + addedCount,
      };
    }

    zoomWindow = clampZoomWindow(zoomWindow, visiblePrices.length, minimumZoomSpanRef.current);
    zoomWindowRef.current = zoomWindow;
    axisDatePartsRef.current = axisDateParts;
    axisLabelStateRef.current = buildAxisLabelState(timestamps, axisDateParts, period, zoomWindow);
    previousMetaRef.current = {
      length: visiblePrices.length,
      firstTimestamp,
      lastTimestamp,
    };

    const chartTheme = chartThemeRef.current ?? readChartTheme();
    const { textPrimary, textSecondary, borderPrimary, danger, interactivePrimary, bgPrimary } = chartTheme;

    try {
      chart.dispatchAction({ type: "hideTip" });
    } catch {
      // Ignore when tooltip component is not initialized yet.
    }

    chart.setOption(
      {
        animation: false,
        grid: {
          left: mode === "line" ? 8 : 12,
          right: 72,
          top: 18,
          bottom: 40,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "line",
            snap: true,
            lineStyle: {
              color: borderPrimary,
              type: "dashed",
            },
          },
          borderWidth: 1,
          backgroundColor: bgPrimary,
          borderColor: borderPrimary,
          textStyle: {
            color: textPrimary,
            fontFamily: "var(--font-family-base)",
          },
          formatter: (
            params: Array<{
              axisValueLabel: string;
              data: number | number[];
              dataIndex?: number;
            }>,
          ) => {
            const point = params[0];
            const pointIndex = point?.dataIndex ?? 0;
            const volume = volumes[pointIndex] ?? 0;
            const pricePoint = visiblePrices[pointIndex];
            const timeLabel = pricePoint
              ? formatChartTooltipLabel(pricePoint.timestamp, period)
              : point.axisValueLabel;

            if (mode === "candlestick" && pricePoint) {
              return [
                timeLabel,
                `시가 ${formatWon(pricePoint.open)}`,
                `고가 ${formatWon(pricePoint.high)}`,
                `저가 ${formatWon(pricePoint.low)}`,
                `종가 ${formatWon(pricePoint.close)}`,
                `거래량 ${formatVolume(volume)}`,
              ].join("<br/>");
            }

            const currentPrice =
              typeof point?.data === "number"
                ? point.data
                : Array.isArray(point?.data)
                  ? Number(point.data.at(1) ?? 0)
                  : 0;

            return [
              timeLabel,
              `가격 ${formatWon(currentPrice)}`,
              pricePoint ? `최고가 ${formatWon(pricePoint.high)}` : null,
              pricePoint ? `최저가 ${formatWon(pricePoint.low)}` : null,
              `거래량 ${formatVolume(volume)}`,
            ]
              .filter(Boolean)
              .join("<br/>");
          },
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "filter",
            minValueSpan: minimumZoomSpanRef.current,
            zoomOnMouseWheel: true,
            moveOnMouseWheel: true,
            moveOnMouseMove: true,
            preventDefaultMouseMove: false,
            startValue: zoomWindow.startValue,
            endValue: zoomWindow.endValue,
          },
          {
            type: "slider",
            show: false,
            xAxisIndex: 0,
            filterMode: "filter",
            minValueSpan: minimumZoomSpanRef.current,
            startValue: zoomWindow.startValue,
            endValue: zoomWindow.endValue,
          },
        ],
        xAxis: {
          type: "category",
          boundaryGap: mode === "candlestick",
          data: timestamps,
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            show: true,
            color: textSecondary,
            hideOverlap: true,
            formatter: (value: string) => axisLabelStateRef.current.labelsByValue.get(value) ?? "",
            interval: (_index: number, value: string) => axisLabelStateRef.current.visibleValues.has(value),
          },
          splitLine: {
            show: false,
          },
        },
        yAxis: {
          type: "value",
          position: "right",
          scale: true,
          min: priceRange.min,
          max: priceRange.max,
          interval: priceRange.interval,
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: textSecondary,
            formatter: (value: number) => new Intl.NumberFormat("ko-KR").format(value),
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: borderPrimary,
              type: "dashed",
            },
          },
        },
        graphic: isFetchingMore
          ? [
              {
                type: "group",
                right: 16,
                top: 16,
                children: [
                  {
                    type: "rect",
                    shape: {
                      x: 0,
                      y: 0,
                      width: 126,
                      height: 28,
                      r: 14,
                    },
                    style: {
                      fill: bgPrimary,
                      shadowBlur: 16,
                      shadowColor: "rgba(0, 0, 0, 0.14)",
                    },
                  },
                  {
                    type: "text",
                    style: {
                      x: 14,
                      y: 19,
                      text: "이전 데이터를 불러오는 중",
                      fill: textPrimary,
                      font: "600 12px var(--font-family-base)",
                    },
                  },
                ],
              },
            ]
          : [],
        series:
          mode === "candlestick"
            ? [
                {
                  type: "candlestick",
                  data: candlePrices,
                  itemStyle: {
                    color: danger,
                    color0: interactivePrimary,
                    borderColor: danger,
                    borderColor0: interactivePrimary,
                  },
                  emphasis: {
                    itemStyle: {
                      color: danger,
                      color0: interactivePrimary,
                      borderColor: danger,
                      borderColor0: interactivePrimary,
                    },
                  },
                },
                {
                  type: "line",
                  data: closePrices,
                  silent: true,
                  showSymbol: false,
                  tooltip: {
                    show: false,
                  },
                  lineStyle: {
                    opacity: 0,
                    width: 0,
                  },
                  itemStyle: {
                    opacity: 0,
                  },
                  emphasis: {
                    disabled: true,
                  },
                  endLabel: {
                    show: true,
                    formatter: ({ value }: { value: number | number[] }) =>
                      new Intl.NumberFormat("ko-KR").format(
                        typeof value === "number" ? value : Number(value.at(-1) ?? 0),
                      ),
                    color: "#ffffff",
                    backgroundColor: danger,
                    borderRadius: 8,
                    padding: [5, 8],
                    distance: 12,
                  },
                  labelLayout: {
                    moveOverlap: "shiftY",
                  },
                },
              ]
            : [
                {
                  type: "line",
                  data: closePrices,
                  symbol: "circle",
                  showSymbol: false,
                  symbolSize: 12,
                  smooth: false,
                  lineStyle: {
                    color: danger,
                    width: 3,
                    cap: "round",
                    join: "round",
                  },
                  itemStyle: {
                    color: danger,
                    borderColor: bgPrimary,
                    borderWidth: 2,
                  },
                  emphasis: {
                    scale: false,
                    itemStyle: {
                      color: danger,
                      borderColor: bgPrimary,
                      borderWidth: 2,
                    },
                  },
                  areaStyle: {
                    opacity: 0,
                  },
                  endLabel: {
                    show: true,
                    formatter: ({ value }: { value: number | number[] }) =>
                      new Intl.NumberFormat("ko-KR").format(
                        typeof value === "number" ? value : Number(value.at(-1) ?? 0),
                      ),
                    color: "#ffffff",
                    backgroundColor: danger,
                    borderRadius: 8,
                    padding: [5, 8],
                    distance: 12,
                  },
                  labelLayout: {
                    moveOverlap: "shiftY",
                  },
                },
              ],
      },
      true,
    );
  }, [chartReady, hasMore, isFetchingMore, mode, onRequestMore, period, prices]);

  return <div ref={chartRef} className={cn("h-[320px] w-full md:h-[360px]", className)} />;
}
