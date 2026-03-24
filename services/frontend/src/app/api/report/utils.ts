/**
 * Shared utilities for /api/report/* route handlers.
 *
 * NOTE: shouldUseMock() defaults to mock-enabled (opt-out).
 * Consider switching to opt-in (`=== "true"` only) for safer production defaults.
 */

export function shouldUseMock() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();
  return raw !== "false" && raw !== "disabled";
}

export function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}
