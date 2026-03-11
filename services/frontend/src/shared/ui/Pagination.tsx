import { cn } from "@/shared/utils/cn";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

type ArrowButtonProps = {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
};

function ArrowButton({ direction, disabled, onClick }: ArrowButtonProps) {
  const isPrevious = direction === "previous";

  return (
    <button
      type="button"
      aria-label={isPrevious ? "이전 페이지" : "다음 페이지"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-bg-secondary)] outline outline-1 outline-offset-[-1px] transition-colors",
        "outline-[color:var(--color-border-primary)]",
        disabled ? "cursor-not-allowed" : "hover:bg-[color:var(--color-bg-interactive-secondary-hovered)]",
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className={cn(
          "h-5 w-5",
          disabled ? "text-[color:var(--color-border-disabled)]" : "text-[color:var(--color-text-secondary)]",
        )}
      >
        <path
          d={isPrevious ? "M11.75 5.5 7.25 10l4.5 4.5" : "M8.25 5.5 12.75 10l-4.5 4.5"}
          stroke="currentColor"
          strokeWidth="1.67"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function Pagination({ currentPage, totalPages, onPageChange, className }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <nav aria-label="페이지네이션" className={cn("flex w-full items-center justify-center gap-2 py-2", className)}>
      <ArrowButton direction="previous" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} />

      {pages.map((page, index) => {
        const previousPage = pages[index - 1];
        const showGap = previousPage !== undefined && page - previousPage > 1;

        return (
          <div key={page} className="flex items-center gap-2">
            {showGap ? (
              <span className="flex h-10 w-10 items-center justify-center text-center text-base font-extrabold leading-6 text-[color:var(--color-text-tertiary)]">
                …
              </span>
            ) : null}

            <button
              type="button"
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => onPageChange(page)}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl text-center text-base font-extrabold leading-6 transition-colors",
                page === currentPage
                  ? "bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-primary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-primary)]"
                  : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {page}
            </button>
          </div>
        );
      })}

      <ArrowButton direction="next" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} />
    </nav>
  );
}
