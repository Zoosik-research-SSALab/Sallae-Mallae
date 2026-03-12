"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef } from "react";
import type { StockChartPeriod, StockPricePoint } from "@/app/stocks/types/stockDetail";
import { cn } from "@/shared/utils/cn";
import {
  formatChartAxisLabel,
  formatVolume,
  formatWon,
  getChartPriceRange,
  getDisplayChartPrices,
  shouldShowChartLabel,
} from "../utils/stockDetailFormatters";

type Props = {
  prices: StockPricePoint[];
  period: StockChartPeriod;
  className?: string;
};

export default function StockPriceChart({ prices, period, className }: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || prices.length === 0) {
      return;
    }

    let chart: EChartsType | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const visiblePrices = getDisplayChartPrices(prices, period);
    const labels = visiblePrices.map((item) => formatChartAxisLabel(item.timestamp, period));
    const closePrices = visiblePrices.map((item) => item.close);
    const volumes = visiblePrices.map((item) => item.volume);
    const priceRange = getChartPriceRange(visiblePrices);

    const draw = async () => {
      const echarts = await import("echarts");

      if (disposed || !chartRef.current) {
        return;
      }

      const styles = getComputedStyle(document.documentElement);
      const textPrimary = styles.getPropertyValue("--color-text-primary").trim();
      const textSecondary = styles.getPropertyValue("--color-text-secondary").trim();
      const borderPrimary = styles.getPropertyValue("--color-border-primary").trim();
      const danger = styles.getPropertyValue("--color-text-danger-bold").trim();
      const bgPrimary = styles.getPropertyValue("--color-bg-primary").trim();

      chart = echarts.init(chartRef.current, undefined, {
        renderer: "canvas",
      });

      chart.setOption({
        animation: false,
        grid: {
          left: 8,
          right: 72,
          top: 18,
          bottom: 30,
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
          formatter: (params: Array<{ axisValueLabel: string; data: number; dataIndex?: number }>) => {
            const point = params[0];
            const volume = volumes[point?.dataIndex ?? 0] ?? 0;
            return `${point.axisValueLabel}<br/>가격: ${formatWon(point.data)}<br/>거래량: ${formatVolume(volume)}`;
          },
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: labels,
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            color: textSecondary,
            margin: 16,
            hideOverlap: true,
            interval: (index: number) => !shouldShowChartLabel(index, labels.length, period),
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
        series: [
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
                new Intl.NumberFormat("ko-KR").format(typeof value === "number" ? value : Number(value.at(-1) ?? 0)),
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
      });

      resizeObserver = new ResizeObserver(() => {
        chart?.resize();
      });
      resizeObserver.observe(chartRef.current);
    };

    void draw();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.dispose();
    };
  }, [period, prices]);

  return <div ref={chartRef} className={cn("h-[320px] w-full md:h-[360px]", className)} />;
}
