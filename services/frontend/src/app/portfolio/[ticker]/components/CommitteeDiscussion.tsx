import type { CommitteeMember } from "../types/portfolioStockDetail";

type Props = {
  finalDecision: string;
  confidence: number;
  briefingDate: string;
  members: CommitteeMember[];
};

function Avatar({ role }: { role: string }) {
  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden bg-[color:var(--color-bg-tertiary)] flex items-end justify-center"
      style={{ width: 100, height: 150 }}
    >
      <div className="w-full bg-black/50 px-2 py-1">
        <p className="text-[10px] text-white text-center font-semibold truncate leading-tight">
          {role}
        </p>
      </div>
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
    ? "bg-[color:var(--color-bg-inverse-bolder)]"
    : "bg-[color:var(--color-bg-tertiary)]";

  const textColor = isDark
    ? "text-white"
    : "text-[color:var(--color-text-secondary)]";

  return (
    <div className={`flex items-start gap-3 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
      <Avatar role={member.role} />
      <div className="flex flex-1 flex-col gap-1.5 self-stretch min-w-0">
        <p
          className={`text-sm font-semibold text-[color:var(--color-text-primary)] tracking-tight ${isLeft ? "" : "text-right"}`}
        >
          {member.role}
        </p>
        <div className={`${bubbleBg} ${bubbleRadius} px-4 py-3 w-full`}>
          <p className={`text-sm font-medium leading-5 tracking-tight ${textColor}`}>
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
      <div className="flex flex-col gap-1 border-b border-[color:var(--color-border-primary)] pb-4">
        <h2
          className="font-extrabold text-[color:var(--color-text-primary)] tracking-tight"
          style={{ fontSize: 20, lineHeight: "24px" }}
        >
          이 종목 최근 위원회 토론
        </h2>
        <p className="text-xs font-medium text-[color:var(--color-text-secondary)]">
          {briefingDate}
        </p>
      </div>

      {/* Final decision row */}
      <div className="flex items-center justify-between py-8">
        <span className="text-sm font-semibold text-[color:var(--color-text-secondary)] tracking-tight">
          당시 최종 의결
        </span>
        <div className="flex items-center gap-2">
          <span
            className="font-black text-[color:var(--color-text-danger)] tracking-tight"
            style={{ fontSize: 15 }}
          >
            {finalDecision}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded bg-[color:var(--color-bg-danger-subtle)] text-xs font-semibold text-[color:var(--color-text-danger-bold)]">
            신뢰도 {confidence}%
          </span>
        </div>
      </div>

      {/* Discussion cards */}
      <div className="flex flex-col gap-8 pb-4">
        {members.map((member) => (
          <ChatBubble key={member.role} member={member} />
        ))}
      </div>

      {/* Past records button */}
      <button
        type="button"
        className="w-full py-4 rounded-xl text-sm font-semibold text-center bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-secondary)] hover:opacity-80 transition-opacity"
      >
        과거 토론 기록 전체보기
      </button>
    </div>
  );
}
