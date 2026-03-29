export const DEFAULT_PROFILE_IMAGE_URL = "/icons/SSAL_LAB_ICON.png";

const LEGACY_DEFAULT_PROFILE_IMAGE_URLS = new Set([
  "/images/default-profile.png",
  "/images/profile-placeholder.svg",
]);

export function resolveProfileImageUrl(value: string | null | undefined) {
  if (typeof value !== "string") {
    return DEFAULT_PROFILE_IMAGE_URL;
  }

  const trimmed = value.trim();

  if (!trimmed || LEGACY_DEFAULT_PROFILE_IMAGE_URLS.has(trimmed)) {
    return DEFAULT_PROFILE_IMAGE_URL;
  }

  return trimmed;
}
