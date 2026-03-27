"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ReportItem } from "../types/api";
import type { CommitteeMember } from "../types/portfolioStockDetail";

type Props = {
  open: boolean;
  reports: ReportItem[];
  onClose: () => void;
};

const AVATAR_MAP: Record<string, string> = {
  차트: "/images/chart_talk.png",
  펀더멘탈: "/images/fund_talk.png",
  센티멘트: "/images/news_talk.png",
  뉴스: "/images/news_talk.png",
  의장: "/images/judge_talk.png",
};

function getAvatarSrc(role: string): string {
  for (const [keyword, src] of Object.entries(AVATAR_MAP)) {
    if (role.includes(keyword)) return src;
  }
  return "/images/profile-placeholder.svg";
}

function Avatar({ role }: { role: string }) {
  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden flex items-end justify-center relative"
      style={{ width: 80, height: 120 }}
    >
      <Image
        src={getAvatarSrc(role)}
        alt={role}
        fill
        className="object-cover"
      />
    </div>
  );
}

function ChatBubble({ member }: { member: CommitteeMember }) {
  const isLeft = member.alignment === "left";
  const isDark = member.isDark;

  const bubbleRadius = isDark
    ? "rounded-bl-2xl rounded-br-2xl rounded-tl-2xl"
    : isLeft
      ? "rounded-bl-2xl rounded-br-2xl rounded-tr-2xl"
      : "rounded-bl-2xl rounded-br-2xl rounded-tl-2xl";

  const bubbleBg = isDark ? "bg-bg-inverse-bolder" : "bg-bg-tertiary";
  const textColor = isDark ? "text-text-base" : "text-text-secondary";

  return (
    <div
      className={`flex items-start gap-3 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
    >
      <Avatar role={member.role} />
      <div className="flex flex-1 flex-col gap-1.5 self-stretch min-w-0">
        <p
          className={`typo-body-md font-semibold text-text-primary tracking-tight ${isLeft ? "" : "text-right"}`}
        >
          {member.role}
        </p>
        <div className={`${bubbleBg} ${bubbleRadius} px-4 py-3 w-full`}>
          <p className={`typo-body-md font-medium tracking-tight ${textColor}`}>
            {member.opinion}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}월 ${dd}일`;
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`;
}

function buildMembers(report: ReportItem): CommitteeMember[] {
  const members: CommitteeMember[] = report.debate.rounds.flatMap(
    (round, ri) =>
      round.agents.map((agent, ai) => ({
        role: agent.name,
        opinion: agent.summary || agent.opinion,
        alignment: ((ri + ai) % 2 === 0 ? "left" : "right") as "left" | "right",
        isDark: false,
      })),
  );
  members.push({
    role: "의장 최종 판결",
    opinion: report.chairman.summary,
    alignment: "right",
    isDark: true,
  });
  return members;
}

function getYears(reports: ReportItem[]): string[] {
  const years = new Set(
    reports.map((r) => {
      const d = new Date(r.date);
      return isNaN(d.getTime()) ? r.date.slice(0, 4) : String(d.getFullYear());
    }),
  );
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export default function PastDiscussionsModal({ open, reports, onClose }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const years = useMemo(() => getYears(reports), [reports]);

  // Reset when modal opens
  useEffect(() => {
    if (open && years.length > 0) {
      setSelectedYear(years[0]);
      setSelectedReport(null);
    }
  }, [open, years]);

  // ESC to close or go back
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedReport) {
          setSelectedReport(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, selectedReport]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || reports.length === 0) return null;

  const filteredReports = reports.filter((r) => {
    const d = new Date(r.date);
    const year = isNaN(d.getTime()) ? r.date.slice(0, 4) : String(d.getFullYear());
    return year === selectedYear;
  });

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/56 backdrop-blur-[2px]"
      onClick={() => {
        if (selectedReport) {
          setSelectedReport(null);
        } else {
          onClose();
        }
      }}
    >
      <div
        className="w-full md:max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl md:rounded-2xl bg-[color:var(--color-bg-primary)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary shrink-0">
          <div className="flex items-center gap-3">
            {selectedReport && (
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors text-text-secondary"
                aria-label="목록으로"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <h2 className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
              {selectedReport ? formatDate(selectedReport.date) + " 토론" : "과거 토론 기록"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors text-text-secondary"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {selectedReport ? (
          /* ── Detail view ── */
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
            {/* Signal + confidence */}
            <div className="flex items-center justify-between">
              <span className="typo-body-md font-semibold text-text-secondary">
                당시 최종 의결
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black text-text-danger tracking-tight">
                  {selectedReport.chairman.signal}
                </span>
                <span className="typo-body-sm inline-flex items-center px-3 py-1 rounded bg-bg-danger-subtle font-semibold text-text-danger-bold">
                  신뢰도 {formatConfidence(selectedReport.chairman.confidence)}
                </span>
              </div>
            </div>

            {/* Committee members */}
            <div className="flex flex-col gap-6">
              {buildMembers(selectedReport).map((member, index) => (
                <ChatBubble key={`${member.role}-${index}`} member={member} />
              ))}
            </div>
          </div>
        ) : (
          /* ── List view ── */
          <>
            {/* Year selector */}
            <div className="flex gap-2 px-5 py-3 overflow-x-auto shrink-0 border-b border-border-primary scrollbar-none">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`shrink-0 px-4 py-1.5 rounded-full typo-body-sm font-semibold transition-colors ${
                    selectedYear === year
                      ? "bg-bg-inverse text-text-inverse"
                      : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  {year}년
                </button>
              ))}
            </div>

            {/* Report list */}
            <div className="flex-1 overflow-y-auto">
              {filteredReports.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="typo-body-md text-text-tertiary">해당 연도의 토론 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredReports.map((report) => (
                    <button
                      key={report.date}
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center justify-between px-5 py-4 border-b border-border-primary hover:bg-bg-secondary transition-colors text-left"
                    >
                      <span className="typo-body-md font-semibold text-text-primary tracking-tight">
                        {formatDate(report.date)}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <span className="typo-body-sm font-medium text-text-info">
                          위원회 토론 다시보기
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="typo-body-sm font-bold text-text-danger">
                            {report.chairman.signal}
                          </span>
                          <span className="typo-body-sm text-text-tertiary">
                            신뢰도 {formatConfidence(report.chairman.confidence)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
