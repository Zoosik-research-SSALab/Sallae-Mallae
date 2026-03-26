"use client";

import { forwardRef, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import { FaRegCalendarAlt } from "react-icons/fa";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import Button from "@/shared/ui/Button";
import type { NewsDateRange, NewsPeriodOption } from "../types/news";
import {
  createPresetNewsDateRange,
  formatNewsDateInputValue,
  getTodayDate,
  parseNewsDateInputValue,
} from "../utils/newsDateUtils";

type Props = {
  draftRange: NewsDateRange;
  onRangeChange: (value: NewsDateRange) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

const periodOptions: Array<{ value: NewsPeriodOption; label: string }> = [
  { value: "WEEK", label: "1주일" },
  { value: "MONTH", label: "1개월" },
  { value: "QUARTER", label: "3개월" },
];

const monthLabels = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

type DateFieldInputProps = {
  value?: string;
  onClick?: () => void;
};

const DateFieldInput = forwardRef<HTMLButtonElement, DateFieldInputProps>(function DateFieldInput({ value, onClick }, ref) {
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className="inline-flex h-12 w-full items-center gap-3 rounded-xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] px-4 text-left text-sm font-medium leading-5 text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)]"
    >
      <FaRegCalendarAlt className="h-4 w-4 shrink-0 text-[color:var(--color-icon-secondary)]" />
      <span className={value ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-tertiary)]"}>
        {value || "0000-00-00"}
      </span>
    </button>
  );
});

function FilterPanel({ draftRange, onRangeChange, onApply, onReset, onClose }: Props) {
  const selectedStartDate = parseNewsDateInputValue(draftRange.startDate);
  const selectedEndDate = parseNewsDateInputValue(draftRange.endDate);
  const today = getTodayDate();
  const currentYear = today.getFullYear();
  const selectableYears = Array.from({ length: 12 }, (_, index) => currentYear - 10 + index);

  const handlePresetClick = (preset: NewsPeriodOption) => {
    onRangeChange(
      draftRange.preset === preset
        ? {
            preset: null,
            startDate: null,
            endDate: null,
          }
        : createPresetNewsDateRange(preset),
    );
  };

  const handleStartDateChange = (value: Date | null) => {
    const nextStartDate = formatNewsDateInputValue(value);
    const normalizedEndDate = selectedEndDate && value && selectedEndDate < value ? value : selectedEndDate;

    onRangeChange({
      preset: null,
      startDate: nextStartDate,
      endDate: formatNewsDateInputValue(normalizedEndDate),
    });
  };

  const handleEndDateChange = (value: Date | null) => {
    const nextEndDate = formatNewsDateInputValue(value);
    const normalizedStartDate = selectedStartDate && value && selectedStartDate > value ? value : selectedStartDate;

    onRangeChange({
      preset: null,
      startDate: formatNewsDateInputValue(normalizedStartDate),
      endDate: nextEndDate,
    });
  };

  const renderCalendarHeader = ({
    date,
    changeYear,
    changeMonth,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }: {
    date: Date;
    changeYear: (year: number) => void;
    changeMonth: (month: number) => void;
    decreaseMonth: () => void;
    increaseMonth: () => void;
    prevMonthButtonDisabled: boolean;
    nextMonthButtonDisabled: boolean;
  }) => (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <button
        type="button"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <select
          value={date.getFullYear()}
          onChange={(event) => changeYear(Number(event.target.value))}
          className="h-9 rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] px-3 text-sm font-semibold text-[color:var(--color-text-primary)] outline-none"
        >
          {selectableYears.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>

        <select
          value={date.getMonth()}
          onChange={(event) => changeMonth(Number(event.target.value))}
          className="h-9 rounded-lg border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] px-3 text-sm font-semibold text-[color:var(--color-text-primary)] outline-none"
        >
          {monthLabels.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="inline-flex w-full max-w-full flex-col items-start rounded-2xl bg-[color:var(--color-bg-primary)] shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.12)] lg:w-[420px]">
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
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">기간</h3>
            <button
              type="button"
              onClick={onReset}
              className="text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-secondary)]"
            >
              초기화
            </button>
          </div>

          <div className="inline-flex w-full items-start justify-center gap-3">
            {periodOptions.map((option) => {
              const isActive = draftRange.preset === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePresetClick(option.value)}
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

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="grid gap-2">
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">시작일</span>
            <DatePicker
              selected={selectedStartDate}
              onChange={(value: Date | null) => handleStartDateChange(value)}
              customInput={<DateFieldInput />}
              dateFormat="yyyy-MM-dd"
              placeholderText="0000-00-00"
              showPopperArrow={false}
              maxDate={selectedEndDate ?? today}
              calendarClassName="news-datepicker"
              popperClassName="news-datepicker-popper"
              renderCustomHeader={renderCalendarHeader}
            />
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">종료일</span>
            <DatePicker
              selected={selectedEndDate}
              onChange={(value: Date | null) => handleEndDateChange(value)}
              customInput={<DateFieldInput />}
              dateFormat="yyyy-MM-dd"
              placeholderText="0000-00-00"
              showPopperArrow={false}
              minDate={selectedStartDate ?? undefined}
              maxDate={today}
              calendarClassName="news-datepicker"
              popperClassName="news-datepicker-popper"
              renderCustomHeader={renderCalendarHeader}
            />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 p-6 pt-0">
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
  const { onClose } = props;
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (desktopPanelRef.current && !desktopPanelRef.current.contains(target)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [onClose]);

  return (
    <>
      <div ref={desktopPanelRef} className="absolute right-0 top-full z-50 mt-3 hidden w-[420px] lg:block">
        <FilterPanel {...props} />
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-3 py-6 lg:hidden"
              onClick={onClose}
            >
              <div className="w-full max-w-[420px] animate-[stock-detail-sheet-up_220ms_ease-out]" onClick={(event) => event.stopPropagation()}>
                <FilterPanel {...props} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
