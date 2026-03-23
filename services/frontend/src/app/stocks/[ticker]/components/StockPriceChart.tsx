"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef, useState } from "react";
import type { StockChartPeriod, StockPriceChartMode, StockPricePoint } from "@/app/stocks/types/stockDetail";
import { cn } from "@/shared/utils/cn";
import {
  formatChartAxisLabel,
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
        const startValue = Number(detail.startValue ?? 0);
        const endValue = Number(detail.endValue ?? 0);

        zoomWindowRef.current = {
          startValue,
          endValue,
        };

        if (
          hasMoreRef.current &&
          !isFetchingMoreRef.current &&
          typeof requestMoreRef.current === "function" &&
          startValue <= getLoadMoreThreshold(periodRef.current)
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
    const labels = visiblePrices.map((item) => formatChartAxisLabel(item.timestamp, period));
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

            if (mode === "candlestick" && pricePoint) {
              return [
                point.axisValueLabel,
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

            return `${point.axisValueLabel}<br/>가격 ${formatWon(currentPrice)}<br/>거래량 ${formatVolume(volume)}`;
          },
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
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
            filterMode: "none",
            startValue: zoomWindow.startValue,
            endValue: zoomWindow.endValue,
          },
        ],
        xAxis: {
          type: "category",
          boundaryGap: mode === "candlestick",
          data: labels,
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
            formatter: (value: string) => value,
            interval: (index: number) => shouldShowChartLabel(index, labels.length, period),
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
              ]
            : [
                {
                  type: "line",
                  data: closePrices,
                  clip: false,
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
