import { resolveProfileImageUrl } from "@/shared/lib/profileImage";

export const AUTH_SESSION_KEY = "sallaemallae-user";

export type SessionUser = {
  id: number;
  email: string;
  nickname: string;
  profile_image_url: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toSessionUser(value: unknown): SessionUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, email, nickname, profile_image_url: profileImage } = value;
  if (typeof id !== "number" || typeof email !== "string" || typeof nickname !== "string") {
    return null;
  }

  if (profileImage !== null && profileImage !== undefined && typeof profileImage !== "string") {
    return null;
  }

  return {
    id,
    email,
    nickname,
    profile_image_url: resolveProfileImageUrl(typeof profileImage === "string" ? profileImage : null),
  };
}

export function extractSessionUser(payload: unknown): SessionUser | null {
  const direct = toSessionUser(payload);
  if (direct) {
    return direct;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const userFromUserField = toSessionUser(payload.user);
  if (userFromUserField) {
    return userFromUserField;
  }

  if (!isRecord(payload.data)) {
    return null;
  }

  const userFromData = toSessionUser(payload.data);
  if (userFromData) {
    return userFromData;
  }

  return toSessionUser(payload.data.user);
}

export function readSessionUser(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return toSessionUser(parsed);
  } catch {
    return null;
  }
}

export function writeSessionUser(user: SessionUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}
