import Image from "next/image";
import type { CommitteeMember } from "../types/portfolioStockDetail";

type Props = {
  finalDecision: string;
  confidence: number;
  briefingDate: string;
  members: CommitteeMember[];
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
      style={{ width: 100, height: 150 }}
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

  // Corner radius patterns from Figma
  const bubbleRadius = isDark
    ? "rounded-bl-2xl rounded-br-2xl rounded-tl-2xl"
    : isLeft
      ? "rounded-bl-2xl rounded-br-2xl rounded-tr-2xl"
      : "rounded-bl-2xl rounded-br-2xl rounded-tl-2xl";

  const bubbleBg = isDark
    ? "bg-bg-inverse-bolder"
    : "bg-bg-tertiary";

  const textColor = isDark
    ? "text-text-base"
    : "text-text-secondary";

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

export default function CommitteeDiscussion({
  finalDecision,
  confidence,
  briefingDate,
  members,
}: Props) {
  return (
    <div className="flex flex-col pb-10">
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
        className="w-full py-4 rounded-xl typo-body-md font-semibold text-center bg-bg-secondary text-text-secondary hover:opacity-80 transition-opacity"
      >
        과거 토론 기록 전체보기
      </button>
    </div>
  );
}
