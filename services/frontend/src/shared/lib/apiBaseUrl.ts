const DEFAULT_API_BASE_URL = "https://j14d208.p.ssafy.io";

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getConfiguredApiBaseUrl(options?: { stripApiSuffix?: boolean }) {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.AUTH_API_BASE_URL?.trim() ||
    DEFAULT_API_BASE_URL;

  const normalized = normalizeBaseUrl(configured);

  if (options?.stripApiSuffix && normalized.endsWith("/api")) {
    return normalized.slice(0, -4);
  }

  return normalized;
}
