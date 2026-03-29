"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DebateSection, { getDebateSpeeches, getDebateStatements, type DebateSpeech, type SpeakerId, type StagePhase } from "./DebateSection";
import type { AgentStatement, DebateReport } from "../types/debate";
import { cn } from "@/shared/utils/cn";

interface ReportDebateSectionProps {
  stockId: string;
  companyName: string;
  report: DebateReport | null;
}

type TimelineItem =
  | {
      id: string;
      type: "entry";
      message: string;
    }
  | {
      id: string;
      type: "round";
      roundLabel: string;
    }
  | {
      id: string;
      type: "speech";
      speech: DebateSpeech;
      details?: AgentStatement["details"];
    };

const speakerMeta: Record<
  SpeakerId,
  {
    name: string;
    imageSrc: string;
    avatarClassName: string;
    bubbleClassName: string;
    timeClassName: string;
    opinionClassName: string;
  }
> = {
  chart: {
    name: "차트 위원",
    imageSrc: "/images/reports/debate/chart_idle.png",
    avatarClassName:
      "bg-[color:rgba(43,127,255,0.12)] outline-[color:rgba(43,127,255,0.18)]",
    bubbleClassName:
      "bg-[color:rgba(43,127,255,0.1)] outline-[color:rgba(43,127,255,0.22)]",
    timeClassName: "text-[color:var(--color-text-info)]",
    opinionClassName: "text-[color:var(--color-text-info)]",
  },
  news: {
    name: "뉴스 위원",
    imageSrc: "/images/reports/debate/news_idle.png",
    avatarClassName:
      "bg-[color:rgba(152,16,250,0.1)] outline-[color:rgba(152,16,250,0.18)]",
    bubbleClassName:
      "bg-[color:rgba(152,16,250,0.08)] outline-[color:rgba(152,16,250,0.18)]",
    timeClassName: "text-[color:var(--color-text-tertiary)]",
    opinionClassName: "text-[color:var(--color-purple-600)]",
  },
  fund: {
    name: "펀더멘탈 위원",
    imageSrc: "/images/reports/debate/fund_idle.png",
    avatarClassName:
      "bg-[color:rgba(0,166,62,0.1)] outline-[color:rgba(0,166,62,0.18)]",
    bubbleClassName:
      "bg-[color:rgba(0,166,62,0.09)] outline-[color:rgba(0,166,62,0.18)]",
    timeClassName: "text-[color:var(--color-text-tertiary)]",
    opinionClassName: "text-[color:var(--color-text-success)]",
  },
};

function getRoundTitle(roundLabel: string) {
  const roundNo = Number(roundLabel.match(/\d+/)?.[0] ?? 0);

  if (roundNo === 1) {
    return "Round 1: 개별 분석 의견 제출";
  }
  if (roundNo === 2) {
    return "Round 2: 교차 반박 및 타협";
  }
  if (roundNo === 3) {
    return "Round 3: 최종 의견 정리";
  }

  return roundLabel;
}

function formatSpeechTime(index: number) {
  const elapsedSeconds = index * 3 + 3;
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function ReportDebateSection({ stockId, companyName, report }: ReportDebateSectionProps) {
  const [phase, setPhase] = useState<StagePhase>("ready");
  const [activeSpeechIndex, setActiveSpeechIndex] = useState(-1);
  const [roundIntroLabel, setRoundIntroLabel] = useState<string | null>(null);
  const [showTranscriptOnly, setShowTranscriptOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const speeches = useMemo(() => getDebateSpeeches(report), [report]);
  const statements = useMemo(() => getDebateStatements(report), [report]);
  const showTranscript = showTranscriptOnly || (phase !== "ready" && phase !== "video");
  const hasEnteredCommittee = showTranscript && speeches.length > 0;

  const timelineItems = useMemo(() => {
    if (!showTranscript) {
      return [];
    }

    const items: TimelineItem[] = [];

    if (hasEnteredCommittee) {
      items.push({
        id: "entry",
        type: "entry",
        message: "차트 위원, 뉴스 위원, 펀더멘탈 위원이 입장했습니다.",
      });
    }

    const visibleSpeechCount = showTranscriptOnly
      ? speeches.length
      : phase === "debate" || phase === "outro" || phase === "loading" || phase === "judge" || phase === "ended"
        ? Math.min(Math.max(activeSpeechIndex + 1, 0), speeches.length)
        : 0;

    let previousRoundLabel: string | null = null;

    speeches.slice(0, visibleSpeechCount).forEach((speech, index) => {
      if (speech.roundLabel !== previousRoundLabel) {
        items.push({
          id: `round-${speech.roundLabel}`,
          type: "round",
          roundLabel: speech.roundLabel,
        });
        previousRoundLabel = speech.roundLabel;
      }

      const roundNo = speech.roundLabel.match(/\d+/)?.[0] ?? "0";
      const statementKey = `${roundNo}-${speech.speakerId}`;
      const statement = statements.get(statementKey);

      items.push({
        id: `speech-${index}`,
        type: "speech",
        speech,
        details: statement?.details,
      });
    });

    return items;
  }, [activeSpeechIndex, hasEnteredCommittee, phase, showTranscript, showTranscriptOnly, speeches, statements]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [timelineItems, roundIntroLabel]);

  return (
    <section className="flex flex-col gap-6 [font-family:var(--font-family-base)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="heading-reset typo-heading-lg text-[color:var(--color-text-primary)]">위원회 심층 토론</h2>
          <p className="typo-body-md text-[color:var(--color-text-secondary)]">
            위원 소집 → 데이터 분석(영상) → 실시간 발언 → 의장 판결
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTranscriptOnly((prev) => !prev)}
          className="shrink-0 rounded-lg border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-3 py-2 typo-body-md font-semibold text-[color:var(--color-text-primary)] transition-opacity hover:opacity-80"
        >
          {showTranscriptOnly ? "토론 영상 보기" : "회의록 보기"}
        </button>
      </div>

      {!showTranscriptOnly ? (
        <div className="overflow-hidden rounded-2xl">
          <DebateSection
            stockId={stockId}
            companyName={companyName}
            report={report}
            onPhaseChange={setPhase}
            onSpeechIndexChange={setActiveSpeechIndex}
            onRoundIntroChange={setRoundIntroLabel}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-[color:var(--color-bg-primary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
        <div className="border-b border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-icon-brand)]" />
              <span className="typo-heading-sm text-[color:var(--color-text-primary)]">
                실시간 회의록
              </span>
            </div>
            <div className="typo-body-sm text-[color:var(--color-text-tertiary)]">
              {showTranscriptOnly ? "전체 보기" : phase === "ready" || phase === "video" ? "대기 중" : "재생 중"}
            </div>
          </div>
        </div>
        <div
          ref={scrollRef}
          className={cn("flex flex-col gap-6 overflow-y-auto bg-[color:var(--color-bg-primary)] px-6 py-6", showTranscriptOnly ? "max-h-[720px]" : "h-[420px]")}
        >
          {!showTranscript ? (
              <div className="flex min-h-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-6 text-center">
              <p className="typo-body-lg text-[color:var(--color-text-tertiary)]">
                영상을 재생하면 입장 알림, 라운드 시작선, 위원 발언이 채팅처럼 순서대로 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {timelineItems.map((item, index) => {
                if (item.type === "entry") {
                  return (
                    <div key={item.id} className="flex justify-center">
                      <div className="typo-body-lg rounded-full bg-[color:var(--color-bg-primary)] px-5 py-2 text-center text-[color:var(--color-text-primary)]">
                        {item.message}
                      </div>
                    </div>
                  );
                }

                if (item.type === "round") {
                  return (
                    <div key={item.id} className="flex items-center gap-4 py-2">
                      <div className="h-px flex-1 bg-[color:var(--color-border-primary)]" />
                      <div className="typo-heading-sm rounded-full bg-[color:var(--color-bg-info-subtle)] px-4 py-2 text-[color:var(--color-text-info)]">
                        {getRoundTitle(item.roundLabel)}
                      </div>
                      <div className="h-px flex-1 bg-[color:var(--color-border-primary)]" />
                    </div>
                  );
                }

                const speechIndex = timelineItems.slice(0, index + 1).filter((candidate) => candidate.type === "speech").length - 1;
                const meta = speakerMeta[item.speech.speakerId];
                const hasDetails = item.details && (item.details.basis.length > 0 || item.details.risk.length > 0 || item.details.action.length > 0);

                return (
                  <div key={item.id} className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full outline outline-1 outline-offset-[-1px] ${meta.avatarClassName}`}
                    >
                      <img src={meta.imageSrc} alt={meta.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="typo-body-lg pl-1 text-[color:var(--color-text-primary)]">
                            {meta.name}
                          </span>
                          <span className={cn("typo-body-sm", meta.timeClassName)}>
                            {formatSpeechTime(speechIndex)}
                          </span>
                        </div>
                        <div
                          className={`max-w-[min(740px,100%)] rounded-bl-3xl rounded-br-3xl rounded-tl-sm rounded-tr-3xl px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] ${meta.bubbleClassName}`}
                        >
                          <p className="typo-body-lg whitespace-pre-line text-[color:var(--color-text-primary)]">
                            {item.speech.message}
                          </p>
                        </div>
                      </div>
                      {hasDetails ? <StatementDetailCard details={item.details!} /> : null}
                    </div>
                  </div>
                );
              })}

              {roundIntroLabel ? (
                <div className="flex items-center gap-4 py-1 opacity-80">
                  <div className="h-px flex-1 bg-[color:var(--color-border-primary)]" />
                  <div className="typo-heading-sm rounded-full bg-[color:var(--color-bg-info-subtle)] px-4 py-2 text-[color:var(--color-text-info)]">
                    {getRoundTitle(roundIntroLabel)} 시작
                  </div>
                  <div className="h-px flex-1 bg-[color:var(--color-border-primary)]" />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const detailTagStyles = {
  basis: {
    label: "근거",
    badge: "bg-[color:var(--color-bg-info-subtle)] border-[color:var(--color-border-info)] text-[color:var(--color-text-info)]",
  },
  risk: {
    label: "리스크",
    badge: "bg-[color:var(--color-bg-danger-subtle)] border-[color:var(--color-border-danger)] text-[color:var(--color-text-danger)]",
  },
  action: {
    label: "실행",
    badge: "bg-[color:var(--color-bg-success-subtle)] border-[color:var(--color-border-success)] text-[color:var(--color-text-success)]",
  },
} as const;

function StatementDetailCard({ details }: { details: AgentStatement["details"] }) {
  const sections = (["basis", "risk", "action"] as const).filter((key) => details[key].length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="max-w-[500px] rounded-2xl border border-[color:var(--color-border-primary)] p-5">
      <div className="border-b border-[color:var(--color-border-primary)] pb-3">
        <span className="typo-body-sm font-extrabold text-[color:var(--color-text-primary)]">
          의견 제출서 요약
        </span>
      </div>
      <div className="flex flex-col gap-4 pt-4">
        {sections.map((key) => (
          <div key={key} className="flex gap-4 items-start">
            <div className="shrink-0">
              <span className={cn("inline-flex items-center justify-center whitespace-nowrap rounded px-2.5 py-1 typo-body-sm font-bold border", detailTagStyles[key].badge)}>
                {detailTagStyles[key].label}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {details[key].map((text, i) => (
                <p key={`${key}-${i}`} className="typo-body-sm text-[color:var(--color-text-secondary)]">
                  {text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
