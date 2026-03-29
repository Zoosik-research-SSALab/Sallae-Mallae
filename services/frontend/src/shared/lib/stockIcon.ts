import { getConfiguredApiBaseUrl } from "@/shared/lib/apiBaseUrl";

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
    return new URL(normalizedPath, `${getConfiguredApiBaseUrl({ stripApiSuffix: true })}/`).toString();
  } catch {
    return null;
  }
}
