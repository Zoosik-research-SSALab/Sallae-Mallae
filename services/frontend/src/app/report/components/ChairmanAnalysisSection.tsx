"use client";

interface ChairmanAnalysisSectionProps {
  verdict: string;
  confidence: string;
  verdictQuote: string;
}

export default function ChairmanAnalysisSection({
  verdict,
  confidence,
  verdictQuote,
}: ChairmanAnalysisSectionProps) {
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
              <p className="typo-body-lg text-[color:var(--color-text-tertiary)]">라운드 3 전원 일치결과</p>
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
