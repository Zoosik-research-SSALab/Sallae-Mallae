type AuthPersistenceMode = "persistent" | "session";

export function readAuthPersistenceMode(): AuthPersistenceMode {
  return "persistent";
}

export function writeAuthPersistenceMode(keepSignedIn: boolean) {
  void keepSignedIn;
}

export function clearAuthPersistenceMode() {
  return;
}

export function shouldRestoreAuthSession() {
  return true;
}
