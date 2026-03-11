import { create } from "zustand";
import { toAuthSessionUser } from "@/shared/lib/auth";
import type { AuthTokens, AuthUser } from "@/shared/types/auth";

export type AuthStatus = "restoring" | "authenticated" | "unauthenticated";

type AuthStoreState = {
  accessToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  user: ReturnType<typeof toAuthSessionUser> | null;
  status: AuthStatus;
  setRestoring: () => void;
  applyAuthSession: (payload: AuthTokens & { user: AuthUser }) => void;
  updateAccessToken: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  accessToken: null,
  tokenType: null,
  expiresIn: null,
  user: null,
  status: "restoring",
  setRestoring: () =>
    set((state) => ({
      ...state,
      status: "restoring",
    })),
  applyAuthSession: ({ accessToken, tokenType, expiresIn, user }) =>
    set({
      accessToken,
      tokenType,
      expiresIn,
      user: toAuthSessionUser(user),
      status: "authenticated",
    }),
  updateAccessToken: ({ accessToken, tokenType, expiresIn }) =>
    set((state) => ({
      ...state,
      accessToken,
      tokenType,
      expiresIn,
    })),
  setUser: (user) =>
    set((state) => ({
      ...state,
      user: toAuthSessionUser(user),
      status: "authenticated",
    })),
  clearAuth: () =>
    set({
      accessToken: null,
      tokenType: null,
      expiresIn: null,
      user: null,
      status: "unauthenticated",
    }),
}));

export function readAccessToken() {
  return useAuthStore.getState().accessToken;
}
