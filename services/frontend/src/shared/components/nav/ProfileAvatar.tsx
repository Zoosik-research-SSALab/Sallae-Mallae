import Image from "next/image";
import { DEFAULT_PROFILE_IMAGE_URL } from "@/shared/lib/profileImage";

type ProfileAvatarProps = {
  src?: string;
  alt?: string;
};

export default function ProfileAvatar({
  src = DEFAULT_PROFILE_IMAGE_URL,
  alt = "Profile image",
}: ProfileAvatarProps) {
  return (
    <button
      type="button"
      className="relative inline-flex h-9 w-9 overflow-hidden rounded-full bg-[color:var(--color-bg-tertiary)]"
      aria-label="Profile"
    >
      <Image src={src} alt={alt} fill sizes="36px" className="object-cover" />
    </button>
  );
}
