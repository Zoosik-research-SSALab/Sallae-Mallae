import { authApiFetch } from "@/shared/lib/authApiClient";
import { extractAuthUser } from "@/shared/lib/auth";
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

export async function updateUserProfile(body: UpdateUserProfileRequest) {
  const payload = await authApiFetch<AuthUser | UserProfileApiEnvelope<AuthUser>, UpdateUserProfileRequest>(
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

  if (!user) {
    throw new Error("Profile update response is invalid.");
  }

  return user;
}
