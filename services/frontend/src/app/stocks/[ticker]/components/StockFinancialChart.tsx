"use client";

import type { EChartsType } from "echarts";
import { useEffect, useRef } from "react";
import type { StockFinancialItem, StockFinancialType } from "@/app/stocks/types/stockDetail";
import {
  formatFinancialLabel,
  formatFinancialQuarterLabel,
  formatFinancialYearMarker,
  getVisibleFinancials,
} from "../utils/stockDetailFormatters";

type Props = {
  financials: StockFinancialItem[];
  type: StockFinancialType;
};

export default function StockFinancialChart({ financials, type }: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || financials.length === 0) {
      return;
    }

    let chart: EChartsType | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const visibleFinancials = getVisibleFinancials(financials, type);
    const isQuarterly = type === "QUARTERLY";

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
          top: 12,
          bottom: isQuarterly ? 44 : 16,
          containLabel: true,
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
          data: visibleFinancials.map((item) =>
            isQuarterly ? formatFinancialQuarterLabel(item) : formatFinancialLabel(item),
          ),
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          axisLabel: {
            color: textSecondary,
            margin: isQuarterly ? 20 : 12,
            formatter: (value: string, index: number) => {
              if (!isQuarterly) {
                return value;
              }

              const item = visibleFinancials[index];
              const previousItem = visibleFinancials[index - 1];
              const showYear = index === 0 || previousItem?.year !== item?.year;
              const yearLabel = item && showYear ? formatFinancialYearMarker(item) : " ";

              return `{value|${value}}\n{year|${yearLabel}}`;
            },
            rich: isQuarterly
              ? {
                  value: {
                    color: textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 20,
                  },
                  year: {
                    color: textSecondary,
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 16,
                  },
                }
              : undefined,
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
            data: visibleFinancials.map((item) => item.revenue),
            barWidth: isQuarterly ? 22 : 18,
            itemStyle: {
              color: mutedBar,
              borderRadius: [4, 4, 0, 0],
            },
          },
          {
            name: "영업이익",
            type: "bar",
            data: visibleFinancials.map((item) => item.operatingProfit),
            barWidth: isQuarterly ? 22 : 18,
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
  }, [financials, type]);

  return <div ref={chartRef} className="h-72 w-full" />;
}
