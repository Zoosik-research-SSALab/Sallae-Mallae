import type {
  PortfolioHallOfFameTone,
  PortfolioSignalAction,
  PortfolioTradeAction,
} from "../types/portfolio";

const integerFormatter = new Intl.NumberFormat("ko-KR");

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatCurrency(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return `${integerFormatter.format(value)}원`;
}

export function formatInteger(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return integerFormatter.format(value);
}

export function formatSignedValue(value: number | null | undefined, decimals: number, suffix: string) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  const formatted = value.toFixed(decimals);

  if (value > 0) {
    return `+${formatted}${suffix}`;
  }

  return `${formatted}${suffix}`;
}

export function getDeltaTextClassName(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "text-[color:var(--color-text-secondary)]";
  }

  if (value > 0) {
    return "text-[color:var(--color-text-danger-bold)]";
  }

  if (value < 0) {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-secondary)]";
}

export function getDeltaSurfaceClassName(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "bg-[color:var(--color-bg-tertiary)]";
  }

  if (value > 0) {
    return "bg-[color:var(--color-bg-danger-subtle)]";
  }

  if (value < 0) {
    return "bg-[color:var(--color-bg-info-subtle)]";
  }

  return "bg-[color:var(--color-bg-tertiary)]";
}

export function getDeltaChartBarClassName(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "bg-[linear-gradient(90deg,var(--color-icon-disabled)_0%,var(--color-bg-tertiary)_100%)]";
  }

  if (value > 0) {
    return "bg-[linear-gradient(90deg,var(--color-text-danger-bold)_0%,var(--color-bg-danger-subtle)_100%)]";
  }

  if (value < 0) {
    return "bg-[linear-gradient(90deg,var(--color-text-info)_0%,var(--color-bg-info-subtle)_100%)]";
  }

  return "bg-[linear-gradient(90deg,var(--color-icon-disabled)_0%,var(--color-bg-tertiary)_100%)]";
}

export function getTradeActionLabel(action: PortfolioTradeAction) {
  return action === "BUY" ? "매수" : "매도 청산";
}

export function getSignalActionLabel(action: PortfolioSignalAction) {
  switch (action) {
    case "BUY":
      return "매수";
    case "SELL":
      return "매도";
    case "HOLD":
      return "보유 유지";
    case "WATCH":
      return "관망 보류";
  }
}

export function getSignalActionClassName(action: PortfolioSignalAction) {
  switch (action) {
    case "BUY":
      return "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]";
    case "SELL":
      return "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]";
    case "HOLD":
      return "bg-[color:var(--color-bg-success-sublte)] text-[color:var(--color-text-success)]";
    case "WATCH":
      return "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)]";
  }
}

export function getHallOfFameToneClassName(tone: PortfolioHallOfFameTone) {
  switch (tone) {
    case "info":
      return {
        marker: "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]",
        rank: "text-[color:var(--color-text-info)]",
      };
    case "danger":
      return {
        marker: "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]",
        rank: "text-[color:var(--color-text-danger-bold)]",
      };
    case "warning":
      return {
        marker: "bg-[color:var(--color-bg-warning-subtle)] text-[color:var(--color-text-warning)]",
        rank: "text-[color:var(--color-text-warning)]",
      };
    case "success":
      return {
        marker: "bg-[color:var(--color-bg-success-sublte)] text-[color:var(--color-text-success)]",
        rank: "text-[color:var(--color-text-success)]",
      };
  }
}
