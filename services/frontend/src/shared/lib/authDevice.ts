const AUTH_DEVICE_COOKIE_NAME = "sallaemallae-device-id";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const prefix = `${name}=`;
  const matched = cookies.find((cookie) => cookie.startsWith(prefix));

  if (!matched) {
    return null;
  }

  return decodeURIComponent(matched.slice(prefix.length));
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax${secure}`;
}

export function getOrCreateAuthDeviceId() {
  const existing = readCookie(AUTH_DEVICE_COOKIE_NAME);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  writeCookie(AUTH_DEVICE_COOKIE_NAME, created);
  return created;
}
