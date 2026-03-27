import Image from "next/image";
import type { CommitteeMember } from "../types/portfolioStockDetail";

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

export function Avatar({ role, size = "md" }: { role: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? { width: 80, height: 120 } : { width: 100, height: 150 };

  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden flex items-end justify-center relative"
      style={dimensions}
    >
      <Image src={getAvatarSrc(role)} alt={role} fill className="object-cover" />
    </div>
  );
}

export function ChatBubble({ member, avatarSize = "md" }: { member: CommitteeMember; avatarSize?: "sm" | "md" }) {
  const isLeft = member.alignment === "left";
  const isDark = member.isDark;
  const bubbleRadius = isLeft && !isDark
    ? "rounded-bl-2xl rounded-br-2xl rounded-tr-2xl"
    : "rounded-bl-2xl rounded-br-2xl rounded-tl-2xl";
  const bubbleBg = isDark ? "bg-bg-inverse-bolder" : "bg-bg-tertiary";
  const textColor = isDark ? "text-text-base" : "text-text-secondary";

  return (
    <div className={`flex items-start gap-3 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
      <Avatar role={member.role} size={avatarSize} />
      <div className="flex flex-1 flex-col gap-1.5 self-stretch min-w-0">
        <p className={`typo-body-md font-semibold text-text-primary tracking-tight ${isLeft ? "" : "text-right"}`}>
          {member.role}
        </p>
        <div className={`${bubbleBg} ${bubbleRadius} px-4 py-3 w-full`}>
          <p className={`typo-body-md font-medium tracking-tight ${textColor}`}>{member.opinion}</p>
        </div>
      </div>
    </div>
  );
}
