export function formatSignalCategory(category: string | null | undefined, ticker: string) {
  if (typeof category === "string" && category.trim().length > 0) {
    return `${ticker} · ${category}`;
  }

  return ticker;
}

export function formatSignalCreatedAt(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
