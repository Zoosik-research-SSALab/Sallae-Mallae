"use client";

import { useTheme } from "@/shared/hooks/useTheme";
import type { DebateReport } from "../types/debate";

interface ChairmanAnalysisSectionProps {
  report: DebateReport | null;
}

const themeStyles = {
  light: {
    bg: "#171717",
    border: undefined,
    title: "#ffffff",
    subtitle: "#a1a1a1",
    quote: "#ffffff",
  },
  dark: {
    bg: "#1a1a1a",
    border: "#333",
    title: "#ffffff",
    subtitle: "#a1a1a1",
    quote: "#ffffff",
  },
} as const;

export default function ChairmanAnalysisSection({ report }: ChairmanAnalysisSectionProps) {
  const { resolvedTheme } = useTheme();
  const colors = themeStyles[resolvedTheme];
  const verdict = formatSignalLabel(report?.chairman.signal);
  const confidence = formatConfidence(report?.chairman.confidence);
  const verdictQuote = report ? `"${report.chairman.summary}"` : "실제 리포트 데이터가 없습니다.";
  const subtitle = getConsensusLabel(report);

  return (
    <section className="flex w-full flex-col items-center">
      <div
        className="relative flex min-h-[280px] w-full items-center justify-center overflow-hidden px-6 py-8 md:px-4 md:py-10"
        style={{
          backgroundColor: colors.bg,
          borderTop: colors.border ? `1px solid ${colors.border}` : undefined,
          borderBottom: colors.border ? `1px solid ${colors.border}` : undefined,
        }}
      >
        {/* Mobile only: 배경 이미지 (반투명, 우측 하단) */}
        <div className="absolute inset-0 overflow-hidden md:invisible md:pointer-events-none">
          <img
            src="/images/reports/debate/judge_result.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 bottom-0 h-[260px] w-auto object-contain opacity-50"
          />
        </div>

        <div className="relative z-10 flex w-full max-w-[1024px] flex-col gap-7 md:flex-row md:items-center md:gap-12">
          {/* Desktop: 이미지 */}
          <div className="hidden shrink-0 items-end justify-center md:flex md:h-[320px] md:w-[260px]">
            <img
              src="/images/reports/debate/judge_result.png"
              alt="의장 AI"
              className="h-[296px] w-[259px] object-contain"
            />
          </div>

          <div className="flex flex-1 flex-col gap-7">
            <div className="flex flex-col gap-0.5">
              <h2
                className="heading-reset typo-heading-md"
                style={{ color: colors.title }}
              >
                의장 AI 최종 분석
              </h2>
              <p className="typo-body-lg" style={{ color: colors.subtitle }}>{subtitle}</p>
            </div>

            <div className="flex items-end gap-4">
              <div className="typo-heading-3xl text-[color:var(--color-text-warning)]">{verdict}</div>
              <div className="mb-1.5 typo-body-md rounded-md bg-[color:var(--color-bg-warning-subtle)] px-2.5 py-1 text-[color:var(--color-text-warning)]">
                신뢰도 {confidence}
              </div>
            </div>
            <p className="typo-body-lg max-w-[660px]" style={{ color: colors.quote }}>{verdictQuote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatSignalLabel(signal?: string) {
  const normalized = signal?.trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "STRONG_BUY") {
    return "강력 매수";
  }
  if (normalized === "BUY") {
    return "매수";
  }
  if (normalized === "SELL") {
    return "매도";
  }
  if (normalized === "HOLD" || normalized === "STAY") {
    return "보류";
  }

  return signal ?? "판단 대기";
}

function formatConfidence(confidence?: number) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return "-";
  }

  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(percentage)}%`;
}

function getConsensusLabel(report: DebateReport | null) {
  if (!report || report.finalStances.length === 0) {
    return "위원 종합 결과";
  }

  const uniqueStances = new Set(report.finalStances.map((stance) => stance.stance));
  return uniqueStances.size === 1 ? "최종 전원 일치 결과" : "위원 종합 결과";
}
