export function normalizeNewsKeyword(value: string) {
  return value.trim().toLowerCase();
}

export function parseNewsNumberParam(value: string | null, fallback: number, min = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}
