import type { StockAnnouncementItem } from "@/app/stocks/types/stockDetail";
import ProtectedLink from "@/shared/components/ProtectedLink";
import { formatAnnouncementDate } from "../utils/stockDetailFormatters";
import StockSectionLoadingOverlay from "./common/StockSectionLoadingOverlay";

type Props = {
  ticker: string;
  announcements: StockAnnouncementItem[];
  isLoading: boolean;
};

export default function StockAnnouncementsSection({ ticker, announcements, isLoading }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <StockSectionLoadingOverlay active={isLoading}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-extrabold leading-6 text-[color:var(--color-text-primary)] md:text-xl">최신 공시</h2>
          <span className="text-xs font-medium leading-4 text-[color:var(--color-text-tertiary)] md:text-sm md:leading-5">전체보기</span>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-6 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                  <div className="h-4 w-24 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                </div>
              ))
            : announcements.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="border-b border-[color:var(--color-border-secondary)] pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="text-sm font-medium leading-5 text-[color:var(--color-text-primary)] md:text-base md:leading-6">
                    {item.title}
                  </div>
                  <div className="text-[10px] font-semibold leading-4 text-[color:var(--color-text-tertiary)] md:text-xs">
                    {formatAnnouncementDate(item.announcedAt)}
                  </div>
                </div>
              ))}
        </div>

        <ProtectedLink
          href={`/reports/${ticker}`}
          className="ai-report-link-text mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-inverse-bolder)] px-4 py-4 text-sm font-semibold shadow-[0px_4px_8px_0px_rgba(0,0,0,0.16)] transition-opacity hover:opacity-90 md:text-base"
        >
          AI 분석 리포트 보기
        </ProtectedLink>
      </StockSectionLoadingOverlay>
    </section>
  );
}
