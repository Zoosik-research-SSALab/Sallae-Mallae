"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef } from "react";
import type { StockFinancialItem } from "@/app/stocks/types/stockDetail";
import { formatFinancialLabel } from "../utils/stockDetailFormatters";

type Props = {
  financials: StockFinancialItem[];
};

export default function StockFinancialChart({ financials }: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || financials.length === 0) {
      return;
    }

    let chart: EChartsType | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const draw = async () => {
      const echarts = await import("echarts");

      if (disposed || !chartRef.current) {
        return;
      }

      const styles = getComputedStyle(document.documentElement);
      const textPrimary = styles.getPropertyValue("--color-text-primary").trim();
      const textSecondary = styles.getPropertyValue("--color-text-secondary").trim();
      const borderPrimary = styles.getPropertyValue("--color-border-primary").trim();
      const mutedBar = styles.getPropertyValue("--color-icon-disabled").trim();
      const accentBar = styles.getPropertyValue("--color-icon-interactive-primary").trim();
      const bgPrimary = styles.getPropertyValue("--color-bg-primary").trim();

      chart = echarts.init(chartRef.current, undefined, {
        renderer: "canvas",
      });

      chart.setOption({
        animation: false,
        grid: {
          left: 12,
          right: 8,
          top: 24,
          bottom: 16,
          containLabel: true,
        },
        legend: {
          top: 0,
          right: 0,
          textStyle: {
            color: textSecondary,
            fontFamily: "var(--font-family-base)",
          },
          itemWidth: 12,
          itemHeight: 12,
          data: ["매출", "영업이익"],
        },
        tooltip: {
          trigger: "axis",
          borderWidth: 1,
          backgroundColor: bgPrimary,
          borderColor: borderPrimary,
          textStyle: {
            color: textPrimary,
            fontFamily: "var(--font-family-base)",
          },
        },
        xAxis: {
          type: "category",
          data: financials.map(formatFinancialLabel),
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          axisLabel: {
            color: textSecondary,
          },
        },
        yAxis: {
          type: "value",
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
          splitLine: {
            lineStyle: {
              color: borderPrimary,
            },
          },
        },
        series: [
          {
            name: "매출",
            type: "bar",
            data: financials.map((item) => item.revenue),
            barWidth: 18,
            itemStyle: {
              color: mutedBar,
              borderRadius: [4, 4, 0, 0],
            },
          },
          {
            name: "영업이익",
            type: "bar",
            data: financials.map((item) => item.operatingProfit),
            barWidth: 18,
            itemStyle: {
              color: accentBar,
              borderRadius: [4, 4, 0, 0],
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
  }, [financials]);

  return <div ref={chartRef} className="h-72 w-full" />;
}
