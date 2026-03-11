import { getPaginationPages } from "../utils/watchlistDisplay";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
};

export default function WatchlistPagination({ currentPage, totalPages, onPageChange, compact = false }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <div className="flex w-full items-center justify-center gap-2 py-2">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`inline-flex items-center justify-center rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "h-9 min-w-9 px-2 typo-body-xs" : "h-10 min-w-10 px-3 typo-body-sm"
        }`}
      >
        이전
      </button>

      {pages.map((page, index) => {
        const previousPage = pages[index - 1];
        const showGap = previousPage !== undefined && page - previousPage > 1;

        return (
          <div key={page} className="flex items-center gap-2">
            {showGap ? <span className="typo-body-sm text-[color:var(--color-text-tertiary)]">…</span> : null}
            <button
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={`inline-flex items-center justify-center rounded-lg border font-semibold transition-colors ${
                compact ? "h-9 min-w-9 px-2 typo-body-xs" : "h-10 min-w-10 px-3 typo-body-sm"
              } ${
                page === currentPage
                  ? "border-[color:var(--color-border-base)] bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-primary)]"
                  : "border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-tertiary)] hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]"
              }`}
            >
              {page}
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`inline-flex items-center justify-center rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "h-9 min-w-9 px-2 typo-body-xs" : "h-10 min-w-10 px-3 typo-body-sm"
        }`}
      >
        다음
      </button>
    </div>
  );
}
