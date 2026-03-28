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
  profileImageUrl?: string;
};

export type ChangeUserPasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

type CreateProfileImagePresignedUrlRequest = {
  fileName: string;
  contentType: string;
  fileSize: number;
};

type ProfileImagePresignedUrlPayload = {
  uploadUrl: string;
  fileUrl: string;
};

type ProfileUpdateSuccessPayload = AuthUser | { message: string };
type PasswordChangeSuccessPayload = {
  message?: string;
};

export const PROFILE_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export const PROFILE_IMAGE_MAX_SIZE = 5_242_880;
export const PROFILE_IMAGE_ACCEPT = PROFILE_IMAGE_ALLOWED_TYPES.join(",");

function isUserProfileApiEnvelope<T>(value: unknown): value is UserProfileApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}

function isSuccessfulProfileMessage(value: unknown): value is { message: string } {
  return typeof value === "object" && value !== null && typeof (value as { message?: unknown }).message === "string";
}

function isProfileImagePresignedUrlPayload(value: unknown): value is ProfileImagePresignedUrlPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { uploadUrl?: unknown }).uploadUrl === "string" &&
    typeof (value as { fileUrl?: unknown }).fileUrl === "string"
  );
}

export function validateProfileImageFile(file: File) {
  if (!PROFILE_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof PROFILE_IMAGE_ALLOWED_TYPES)[number])) {
    return "프로필 이미지는 JPG, PNG, GIF, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > PROFILE_IMAGE_MAX_SIZE) {
    return "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.";
  }

  return null;
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

async function createProfileImagePresignedUrl(file: File) {
  const payload = await authApiFetch<
    ProfileImagePresignedUrlPayload | UserProfileApiEnvelope<ProfileImagePresignedUrlPayload>,
    CreateProfileImagePresignedUrlRequest
  >("/api/storage/presigned-url", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
    body: {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    },
  });

  const candidate = isUserProfileApiEnvelope(payload) ? payload.data : payload;

  if (isProfileImagePresignedUrlPayload(candidate)) {
    return candidate;
  }

  throw new Error("프로필 이미지 업로드 준비에 실패했습니다.");
}

async function uploadFileToPresignedUrl(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("프로필 이미지 업로드에 실패했습니다.");
  }
}

export async function uploadProfileImage(file: File) {
  const validationError = validateProfileImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const { uploadUrl, fileUrl } = await createProfileImagePresignedUrl(file);
  await uploadFileToPresignedUrl(uploadUrl, file);
  return fileUrl;
}
