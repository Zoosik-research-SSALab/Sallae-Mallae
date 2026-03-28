import { authApiFetch } from "@/shared/lib/authApiClient";
import { extractAuthUser } from "@/shared/lib/auth";
import { getMe } from "@/shared/lib/authApi";
import type { AuthUser } from "@/shared/types/auth";

type UserProfileApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

export type UpdateUserProfileRequest = {
  nickname: string;
};

export type ChangeUserPasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

type ProfileUpdateSuccessPayload = AuthUser | { message: string };
type PasswordChangeSuccessPayload = {
  message?: string;
};

function isUserProfileApiEnvelope<T>(value: unknown): value is UserProfileApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}

function isSuccessfulProfileMessage(value: unknown): value is { message: string } {
  return typeof value === "object" && value !== null && typeof (value as { message?: unknown }).message === "string";
}

export async function updateUserProfile(body: UpdateUserProfileRequest) {
  const payload = await authApiFetch<ProfileUpdateSuccessPayload | UserProfileApiEnvelope<ProfileUpdateSuccessPayload>, UpdateUserProfileRequest>(
    "/api/users/profile",
    {
      method: "PATCH",
      useBaseUrl: false,
      credentials: "include",
      body,
    },
  );

  const candidate =
    typeof payload === "object" && payload !== null && "success" in payload ? payload.data : payload;
  const user = extractAuthUser(candidate);

  if (user) {
    return user;
  }

  if (isSuccessfulProfileMessage(candidate)) {
    return getMe();
  }

  throw new Error("Profile update response is invalid.");
}

export async function changeUserPassword(body: ChangeUserPasswordRequest) {
  const payload = await authApiFetch<
    PasswordChangeSuccessPayload | UserProfileApiEnvelope<PasswordChangeSuccessPayload>,
    ChangeUserPasswordRequest
  >(
    "/api/users/profile/password",
    {
      method: "PUT",
      useBaseUrl: false,
      credentials: "include",
      body,
    },
  );

  if (isUserProfileApiEnvelope(payload)) {
    if (payload.success) {
      return payload.data;
    }

    throw new Error(payload.error?.message ?? "Password change response is invalid.");
  }

  return payload;
}
