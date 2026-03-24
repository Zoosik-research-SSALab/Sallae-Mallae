"use client";

import type { TradeHistoryItem } from "../types/report";
import { buildTradeSignalEvents } from "../utils/tradeSignals";

interface TradeHistoryModalProps {
  open: boolean;
  companyName: string;
  trades: TradeHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function TradeHistoryModal({
  open,
  companyName,
  trades,
  isLoading,
  error,
  onClose,
}: TradeHistoryModalProps) {
  if (!open) {
    return null;
  }

  const rows = buildTradeSignalEvents(trades);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button type="button" aria-label="전체 매매 신호 모달 닫기" onClick={onClose} className="fixed inset-0 bg-black/56 backdrop-blur-[2px]" />

      <div className="relative z-[1] inline-flex w-full max-w-[576px] flex-col items-start rounded-2xl bg-[color:var(--color-bg-primary)] shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.16)]">
        <div className="inline-flex w-full items-center justify-between self-stretch border-b border-[color:var(--color-border-primary)] px-6 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <h3 className="typo-heading-md text-[color:var(--color-text-primary)]">전체 매매 신호</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full p-2 text-[color:var(--color-border-disabled)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex w-full flex-col items-start gap-6 overflow-hidden p-8">
          <div className="flex w-full flex-col items-start">
            <div className="typo-heading-md text-[color:var(--color-text-primary)]">{companyName} 전체 매매 신호</div>
          </div>

          <div className="flex w-full flex-col items-center gap-2 pt-2 pb-[0.01px]">
            <div className="inline-flex w-full items-start gap-2 pr-3">
              <ModalHeaderCell label="날짜" />
              <ModalHeaderCell label="구분" />
              <ModalHeaderCell label="가격" />
              <ModalHeaderCell label="수익률" />
            </div>

            <div className="-mr-3 flex max-h-[460px] w-[calc(100%+12px)] flex-col items-start overflow-y-auto pr-3">
              {isLoading ? (
                <div className="flex min-h-40 w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-secondary)] typo-body-lg text-[color:var(--color-text-secondary)]">
                  매매 내역을 불러오는 중입니다.
                </div>
              ) : error ? (
                <div className="flex min-h-40 w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-danger-subtle)] px-4 text-center typo-body-lg text-[color:var(--color-text-danger-bold)]">
                  {error}
                </div>
              ) : rows.length === 0 ? (
                <div className="flex min-h-40 w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-secondary)] typo-body-lg text-[color:var(--color-text-secondary)]">
                  표시할 매매 내역이 없습니다.
                </div>
              ) : (
                rows.map((row, index) => (
                  <div key={row.id} className="inline-flex w-full items-start justify-center">
                    <ModalBodyCell value={formatTradeDate(row.date)} roundedSide="left" tone={index % 2 === 0 ? "tertiary" : "primary"} />
                    <ModalBodyCell
                      value={row.signal}
                      tone={index % 2 === 0 ? "tertiary" : "primary"}
                      valueClassName={row.signal === "매수" ? "text-[color:var(--color-text-danger)]" : "text-[color:var(--color-text-info)]"}
                    />
                    <ModalBodyCell value={formatTradePrice(row.price)} tone={index % 2 === 0 ? "tertiary" : "primary"} />
                    <ModalBodyCell
                      value={formatReturnRate(row.returnRate)}
                      roundedSide="right"
                      tone={index % 2 === 0 ? "tertiary" : "primary"}
                      valueClassName={getReturnRateClassName(row.returnRate)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-start p-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-inverse-bolder)] py-3 typo-body-lg text-[color:var(--color-text-base)] transition-opacity hover:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalHeaderCell({ label }: { label: string }) {
  return (
    <div className="inline-flex h-6 flex-1 flex-col items-center justify-start">
      <div className="typo-body-lg text-[color:var(--color-text-primary)]">{label}</div>
    </div>
  );
}

function ModalBodyCell({
  value,
  tone,
  roundedSide,
  valueClassName,
}: {
  value: string;
  tone: "primary" | "tertiary";
  roundedSide?: "left" | "right";
  valueClassName?: string;
}) {
  const backgroundClassName = tone === "tertiary" ? "bg-[color:var(--color-bg-tertiary)]" : "bg-[color:var(--color-bg-primary)]";
  const roundedClassName =
    roundedSide === "left"
      ? "rounded-bl-lg rounded-tl-lg"
      : roundedSide === "right"
        ? "rounded-br-lg rounded-tr-lg"
        : "";
  const resolvedValueClassName = valueClassName ?? "text-[color:var(--color-text-secondary)]";

  return (
    <div className={`flex-1 ${backgroundClassName} ${roundedClassName}`}>
      <div className="inline-flex min-h-12 w-full items-center justify-center px-2 py-3">
        <div className={`typo-body-lg text-center ${resolvedValueClassName}`}>{value}</div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 15L15 5M5 5L15 15" stroke="currentColor" strokeWidth="2.08333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTradeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatTradePrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("ko-KR");
}

function formatReturnRate(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getReturnRateClassName(value?: number) {
  if (typeof value !== "number" || value === 0) {
    return "text-[color:var(--color-text-secondary)]";
  }

  return value > 0 ? "text-[color:var(--color-text-danger)]" : "text-[color:var(--color-text-info)]";
}
