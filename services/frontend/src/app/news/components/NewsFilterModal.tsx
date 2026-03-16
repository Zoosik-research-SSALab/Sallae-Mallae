import { LuX } from "react-icons/lu";
import Button from "@/shared/ui/Button";
import type { NewsPeriodOption, NewsSortOption } from "../types/news";

type Props = {
  draftSort: NewsSortOption;
  draftPeriod: NewsPeriodOption;
  onSortChange: (value: NewsSortOption) => void;
  onPeriodChange: (value: NewsPeriodOption) => void;
  onApply: () => void;
  onClose: () => void;
};

const sortOptions: Array<{ value: NewsSortOption; label: string }> = [
  { value: "LATEST", label: "최신순" },
  { value: "RELEVANCE", label: "정확도순" },
  { value: "POPULAR", label: "많이 본 순" },
];

const periodOptions: Array<{ value: NewsPeriodOption; label: string }> = [
  { value: "WEEK", label: "1주일" },
  { value: "MONTH", label: "1개월" },
  { value: "QUARTER", label: "3개월" },
];

function RadioIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full p-[0.67px] outline outline-1 outline-offset-[-1px] ${
        active
          ? "bg-[color:var(--color-bg-inverse-bolder)] outline-[color:var(--color-bg-inverse-bolder)]"
          : "outline-[color:var(--color-border-primary)]"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[color:var(--color-bg-primary)]" : ""}`} />
    </span>
  );
}

function FilterPanel({
  draftSort,
  draftPeriod,
  onSortChange,
  onPeriodChange,
  onApply,
  onClose,
}: Props) {
  return (
    <div className="inline-flex w-full max-w-full flex-col items-start rounded-2xl bg-[color:var(--color-bg-primary)] shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.12)] lg:w-96">
      <div className="inline-flex w-full items-center justify-between border-b border-[color:var(--color-border-primary)] px-6 pb-3 pt-4">
        <h2 className="text-xl font-extrabold leading-6 text-[color:var(--color-text-primary)]">상세 필터</h2>
        <button
          type="button"
          aria-label="상세 필터 닫기"
          onClick={onClose}
          className="inline-flex p-2 text-[color:var(--color-text-secondary)] transition-colors hover:opacity-80"
        >
          <LuX className="h-6 w-6" />
        </button>
      </div>

      <div className="flex w-full flex-col gap-8 overflow-hidden p-6">
        <div className="flex w-full flex-col gap-3">
          <h3 className="text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">정렬 기준</h3>
          <div className="flex w-full flex-col gap-2">
            {sortOptions.map((option) => {
              const isActive = draftSort === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSortChange(option.value)}
                  className="inline-flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                >
                  <span className="text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">{option.label}</span>
                  <RadioIndicator active={isActive} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <h3 className="text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">기간</h3>
          <div className="inline-flex w-full items-start justify-center gap-3">
            {periodOptions.map((option) => {
              const isActive = draftPeriod === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPeriodChange(option.value)}
                  className={`inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium leading-5 outline outline-1 outline-offset-[-1px] transition-colors ${
                    isActive
                      ? "bg-[color:var(--color-bg-inverse-bolder)] text-[color:var(--color-text-base)] outline-[color:var(--color-border-base)]"
                      : "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-primary)] outline-[color:var(--color-border-secondary)] hover:bg-[color:var(--color-bg-secondary)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col p-6">
        <Button
          variant="primary"
          onClick={onApply}
          className="w-full rounded-xl border-0 bg-[color:var(--color-text-interactive-primary)] py-4 text-base font-semibold leading-6 text-[color:var(--color-text-interactive-inverse)]"
        >
          필터 적용하기
        </Button>
      </div>
    </div>
  );
}

export default function NewsFilterModal(props: Props) {
  return (
    <>
      <div className="absolute right-0 top-full z-50 mt-3 hidden w-96 lg:block" onClick={(event) => event.stopPropagation()}>
        <FilterPanel {...props} />
      </div>

      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-3 py-6 lg:hidden" onClick={props.onClose}>
        <div className="w-full max-w-96 animate-[stock-detail-sheet-up_220ms_ease-out]" onClick={(event) => event.stopPropagation()}>
          <FilterPanel {...props} />
        </div>
      </div>
    </>
  );
}
