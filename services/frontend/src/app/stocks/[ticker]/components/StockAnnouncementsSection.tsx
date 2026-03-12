import Link from "next/link";
import type { StockAnnouncementItem } from "@/app/stocks/types/stockDetail";
import { formatAnnouncementDate } from "../utils/stockDetailFormatters";

type Props = {
  ticker: string;
  announcements: StockAnnouncementItem[];
  isLoading: boolean;
};

export default function StockAnnouncementsSection({ ticker, announcements, isLoading }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="typo-heading-sm text-[color:var(--color-text-primary)]">최신 공시</h2>
        <span className="typo-body-sm text-[color:var(--color-text-tertiary)]">전체보기</span>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-6 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
              </div>
            ))
          : announcements.slice(0, 3).map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="typo-body-md font-medium text-[color:var(--color-text-primary)]">{item.title}</div>
                <div className="typo-body-xs font-semibold text-[color:var(--color-text-tertiary)]">
                  {formatAnnouncementDate(item.announcedAt)}
                </div>
              </div>
            ))}
      </div>

      <Link
        href={`/reports/${ticker}`}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-inverse-bolder)] px-4 py-4 text-sm font-semibold text-[color:var(--color-text-base)] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.16)] transition-opacity hover:opacity-90 md:text-base"
      >
        AI 분석 리포트 보기
      </Link>
    </section>
  );
}
