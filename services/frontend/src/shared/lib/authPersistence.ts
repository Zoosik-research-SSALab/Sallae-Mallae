const AUTH_PERSISTENCE_KEY = "sallaemallae-auth-persistence";

type AuthPersistenceMode = "persistent" | "session";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readAuthPersistenceMode(): AuthPersistenceMode {
  if (!canUseStorage()) {
    return "persistent";
  }

  const stored = window.localStorage.getItem(AUTH_PERSISTENCE_KEY);
  return stored === "session" ? "session" : "persistent";
}

export function writeAuthPersistenceMode(keepSignedIn: boolean) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_PERSISTENCE_KEY, keepSignedIn ? "persistent" : "session");
}

export function clearAuthPersistenceMode() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_PERSISTENCE_KEY);
}

export function shouldRestoreAuthSession() {
  return readAuthPersistenceMode() === "persistent";
}
