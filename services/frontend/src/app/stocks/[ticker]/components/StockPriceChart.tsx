"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef, useState } from "react";
import type { StockChartPeriod, StockPriceChartMode, StockPricePoint } from "@/app/stocks/types/stockDetail";
import { cn } from "@/shared/utils/cn";
import {
  formatChartAxisLabel,
  formatChartTooltipLabel,
  formatVolume,
  formatWon,
  getChartPriceRange,
  getDisplayChartPrices,
  getInitialVisiblePointCount,
  shouldShowChartLabel,
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

function clampZoomWindow(zoomWindow: ZoomWindow, total: number): ZoomWindow {
  const maxIndex = Math.max(0, total - 1);
  const startValue = Math.max(0, Math.min(zoomWindow.startValue, maxIndex));
  const endValue = Math.max(startValue, Math.min(zoomWindow.endValue, maxIndex));

  return {
    startValue,
    endValue,
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
  const dataLengthRef = useRef(0);
  const isApplyingZoomRef = useRef(false);
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

  requestMoreRef.current = onRequestMore;
  hasMoreRef.current = hasMore;
  isFetchingMoreRef.current = isFetchingMore;
  periodRef.current = period;

  useEffect(() => {
    zoomWindowRef.current = null;
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

      chart.on("datazoom", (...args: unknown[]) => {
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

        const previousZoomWindow =
          zoomWindowRef.current ?? {
            startValue: 0,
            endValue: Math.max(0, dataLengthRef.current - 1),
          };
        const previousSpan = previousZoomWindow.endValue - previousZoomWindow.startValue;
        const nextSpan = nextZoomWindow.endValue - nextZoomWindow.startValue;

        if (isApplyingZoomRef.current) {
          isApplyingZoomRef.current = false;
          zoomWindowRef.current = nextZoomWindow;
          return;
        }

        if (dataLengthRef.current > 0 && nextSpan !== previousSpan) {
          const anchoredZoomWindow = clampZoomWindow(
            {
              startValue: dataLengthRef.current - (nextSpan + 1),
              endValue: dataLengthRef.current - 1,
            },
            dataLengthRef.current,
          );

          if (
            anchoredZoomWindow.startValue !== nextZoomWindow.startValue ||
            anchoredZoomWindow.endValue !== nextZoomWindow.endValue
          ) {
            isApplyingZoomRef.current = true;
            zoomWindowRef.current = anchoredZoomWindow;
            chart.setOption(
              {
                dataZoom: [
                  {
                    startValue: anchoredZoomWindow.startValue,
                    endValue: anchoredZoomWindow.endValue,
                  },
                  {
                    startValue: anchoredZoomWindow.startValue,
                    endValue: anchoredZoomWindow.endValue,
                  },
                ],
              },
              false,
            );
            return;
          }
        }

        zoomWindowRef.current = nextZoomWindow;

        if (
          hasMoreRef.current &&
          !isFetchingMoreRef.current &&
          typeof requestMoreRef.current === "function" &&
          nextZoomWindow.startValue <= getLoadMoreThreshold(periodRef.current)
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
    const closePrices = visiblePrices.map((item) => item.close);
    const candlePrices = visiblePrices.map((item) => [item.open, item.close, item.low, item.high]);
    const volumes = visiblePrices.map((item) => item.volume);
    const priceRange = getChartPriceRange(visiblePrices, mode);
    const latestClose = visiblePrices.at(-1)?.close ?? 0;

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

    let zoomWindow = zoomWindowRef.current ?? buildInitialZoomWindow(period, visiblePrices.length);

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

    zoomWindow = clampZoomWindow(zoomWindow, visiblePrices.length);
    zoomWindowRef.current = zoomWindow;
    previousMetaRef.current = {
      length: visiblePrices.length,
      firstTimestamp,
      lastTimestamp,
    };

    const styles = getComputedStyle(document.documentElement);
    const textPrimary = styles.getPropertyValue("--color-text-primary").trim();
    const textSecondary = styles.getPropertyValue("--color-text-secondary").trim();
    const borderPrimary = styles.getPropertyValue("--color-border-primary").trim();
    const danger = styles.getPropertyValue("--color-text-danger-bold").trim();
    const interactivePrimary = styles.getPropertyValue("--color-text-interactive-primary").trim();
    const bgPrimary = styles.getPropertyValue("--color-bg-primary").trim();

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
            formatter: (value: string) => formatChartAxisLabel(value, period),
            interval: (index: number) =>
              shouldShowChartLabel(index, timestamps.length, period, timestamps, zoomWindowRef.current),
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
                  markLine: {
                    symbol: ["none", "none"],
                    silent: true,
                    animation: false,
                    lineStyle: {
                      opacity: 0,
                    },
                    label: {
                      show: true,
                      position: "end",
                      formatter: () => new Intl.NumberFormat("ko-KR").format(latestClose),
                      color: "#ffffff",
                      backgroundColor: danger,
                      borderRadius: 8,
                      padding: [5, 8],
                      distance: 12,
                    },
                    data: [
                      {
                        yAxis: latestClose,
                      },
                    ],
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
