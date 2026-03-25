"use client";

import type { DebateReport } from "../types/debate";

interface ChairmanAnalysisSectionProps {
  report: DebateReport | null;
}

export default function ChairmanAnalysisSection({ report }: ChairmanAnalysisSectionProps) {
  const verdict = formatSignalLabel(report?.chairman.signal);
  const confidence = formatConfidence(report?.chairman.confidence);
  const verdictQuote = report ? `"${report.chairman.summary}"` : "실제 리포트 데이터가 없습니다.";
  const subtitle = getConsensusLabel(report);

  return (
    <section className="flex w-full flex-col items-center">
      <div className="flex h-80 w-full items-center justify-center bg-[color:var(--color-bg-inverse-bolder)] px-4 py-10">
        <div className="flex w-full max-w-[1024px] items-center gap-12">
          <div className="flex h-[320px] w-[260px] items-end justify-center">
            <img
              src="/images/reports/debate/judge_result.png"
              alt="의장 AI"
              className="h-[296px] w-[259px] object-contain"
            />
          </div>

            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="heading-reset typo-heading-md text-[color:var(--color-text-base)]">
                  의장 AI 최종 분석
                </h2>
                <p className="typo-body-lg text-[color:var(--color-text-tertiary)]">{subtitle}</p>
              </div>

            <div className="flex items-end gap-4">
              <div className="typo-heading-3xl text-[color:var(--color-text-warning)]">{verdict}</div>
              <div className="typo-body-md rounded-md bg-[color:var(--color-bg-warning-subtle)] px-2.5 py-1 text-[color:var(--color-text-secondary)]">
                신뢰도 {confidence}
              </div>
            </div>
            <p className="typo-body-lg max-w-[660px] text-[color:var(--color-text-base)]">{verdictQuote}</p>
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
