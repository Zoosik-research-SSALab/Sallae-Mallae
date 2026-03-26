const DEFAULT_STOCK_ICON_BASE_URL = "https://j14d208.p.ssafy.io";

function getStockIconBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_STOCK_ICON_BASE_URL;
  const normalized = configured.endsWith("/") ? configured.slice(0, -1) : configured;

  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

export function resolveStockIconUrl(iconUrl: string | null | undefined) {
  if (typeof iconUrl !== "string") {
    return null;
  }

  const trimmed = iconUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

  try {
    return new URL(normalizedPath, `${getStockIconBaseUrl()}/`).toString();
  } catch {
    return null;
  }
}
