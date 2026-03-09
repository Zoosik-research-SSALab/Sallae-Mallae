export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatSignedRate(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function calculatePriceChange(price: number, rate: number) {
  if (rate === 0) {
    return 0;
  }

  const basePrice = price / (1 + rate / 100);
  return Math.round(Math.abs(price - basePrice));
}

export function formatSignedPriceChange(price: number, rate: number) {
  if (rate === 0) {
    return "-";
  }

  const direction = rate > 0 ? "▲" : "▼";
  const changeAmount = calculatePriceChange(price, rate);
  return `${direction} ${new Intl.NumberFormat("ko-KR").format(changeAmount)}`;
}

export function formatBaseTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatSignalLabel(signal: string) {
  const normalized = signal.toLowerCase();

  if (normalized === "strong_buy") {
    return "강력 매수";
  }

  if (normalized === "buy") {
    return "매수";
  }

  if (normalized === "sell") {
    return "매도";
  }

  return "관심";
}

export function getSignalTone(signal: string) {
  const normalized = signal.toLowerCase();

  if (normalized === "strong_buy" || normalized === "buy") {
    return "buy" as const;
  }

  if (normalized === "sell") {
    return "sell" as const;
  }

  return "neutral" as const;
}

export function getRateTone(value: number) {
  if (value > 0) {
    return "positive" as const;
  }

  if (value < 0) {
    return "negative" as const;
  }

  return "neutral" as const;
}
