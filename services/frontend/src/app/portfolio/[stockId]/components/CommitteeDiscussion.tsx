"use client";

import { useState } from "react";
import type { CommitteeMember } from "../types/portfolioStockDetail";
import type { ReportItem } from "../types/api";
import { ChatBubble } from "./CommitteeChat";
import PastDiscussionsModal from "./PastDiscussionsModal";

type Props = {
  finalDecision: string;
  confidence: number;
  briefingDate: string;
  members: CommitteeMember[];
  reports?: ReportItem[];
};

export default function CommitteeDiscussion({
  finalDecision,
  confidence,
  briefingDate,
  members,
  reports = [],
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col pb-10">
      <PastDiscussionsModal
        open={modalOpen}
        reports={reports}
        onClose={() => setModalOpen(false)}
      />
      {/* Header with border-bottom */}
      <div className="flex flex-col gap-1 border-b border-border-primary pb-4">
        <h2 className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
          이 종목 최근 위원회 토론
        </h2>
        <p className="typo-body-sm font-medium text-text-secondary">
          {briefingDate}
        </p>
      </div>

      {/* Final decision row */}
      <div className="flex items-center justify-between py-8">
        <span className="typo-body-md font-semibold text-text-secondary tracking-tight">
          당시 최종 의결
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-black text-text-danger tracking-tight">
            {finalDecision}
          </span>
          <span className="typo-body-sm inline-flex items-center px-3 py-1 rounded bg-bg-danger-subtle font-semibold text-text-danger-bold ">
            신뢰도 {Math.round(confidence <= 1 ? confidence * 100 : confidence)}%
          </span>
        </div>
      </div>

      {/* Discussion cards */}
      <div className="flex flex-col gap-8 pb-8">
        {members.map((member, index) => (
          <ChatBubble key={`${member.role}-${index}`} member={member} />
        ))}
      </div>

      {/* Past records button */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={reports.length === 0}
        className="w-full py-4 rounded-xl typo-body-md font-semibold text-center bg-bg-secondary text-text-secondary hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        과거 토론 기록 전체보기
      </button>
    </div>
  );
}
