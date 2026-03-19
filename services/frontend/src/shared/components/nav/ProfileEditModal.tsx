"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Input from "@/shared/ui/Input";

type Props = {
  open: boolean;
  nickname: string;
  profileImageUrl: string | null;
  onClose: () => void;
  onSave: (nickname: string) => void | Promise<void>;
};

function CameraIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M3.33 5.33h1.4l.94-1.33h4.66l.94 1.33h1.4c.73 0 1.33.6 1.33 1.34v4.66c0 .74-.6 1.34-1.33 1.34H3.33c-.73 0-1.33-.6-1.33-1.34V6.67c0-.74.6-1.34 1.33-1.34Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <path d="M7 7 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfileEditModal({ open, nickname, profileImageUrl, onClose, onSave }: Props) {
  const [draftNickname, setDraftNickname] = useState(nickname);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftNickname(nickname);
  }, [nickname, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const profileSrc = profileImageUrl ?? "/images/profile-placeholder.svg";
  const isLocalProfileImage = profileSrc.startsWith("/");
  const trimmedNickname = draftNickname.trim();

  const handleSave = async () => {
    if (!trimmedNickname || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave(trimmedNickname);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button
        type="button"
        aria-label="내 정보 수정 모달 닫기"
        onClick={onClose}
        className="fixed inset-0 bg-black/56 backdrop-blur-[2px]"
      />

      <div className="relative z-[1] w-full max-w-96 rounded-xl bg-[color:var(--color-bg-primary)] p-6 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.16)] sm:p-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--color-border-disabled)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
          aria-label="닫기"
        >
          <CloseIcon />
        </button>

        <div className="flex flex-col gap-8">
          <div className="flex justify-center">
            <h2 className="text-center text-2xl leading-7 font-extrabold text-[color:var(--color-text-primary)]">내 정보 수정</h2>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex justify-center">
              <div className="relative h-24 w-24">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-tertiary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-bg-tertiary)]">
                  {isLocalProfileImage ? (
                    <Image
                      src={profileSrc}
                      alt={`${nickname} 프로필 이미지`}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileSrc} alt={`${nickname} 프로필 이미지`} className="h-full w-full object-cover" />
                  )}
                </div>

                <button
                  type="button"
                  className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-text-base)] text-[color:var(--color-border-interactive-secondary)] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-interactive-secondary)]"
                  aria-label="프로필 이미지 변경 준비 중"
                  title="프로필 이미지 변경은 준비 중입니다."
                >
                  <CameraIcon />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <label htmlFor="profile-nickname" className="w-full text-sm leading-5 font-semibold text-[color:var(--color-text-secondary)]">
                닉네임
              </label>
              <Input
                id="profile-nickname"
                value={draftNickname}
                onChange={(event) => setDraftNickname(event.target.value)}
                placeholder="서비스에서 사용할 닉네임을 입력해주세요"
                className="!rounded-lg !border-[color:var(--color-bg-tertiary)] !bg-[color:var(--color-bg-tertiary)] !px-4 !py-3 text-base !font-extrabold !leading-6 text-[color:var(--color-text-primary)] placeholder:!font-semibold placeholder:text-[color:var(--color-text-tertiary)] focus-visible:!border-[color:var(--color-border-interactive-primary)] focus-visible:!ring-[color:var(--color-bg-interactive-primary)]/10"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-lg bg-[color:var(--color-bg-tertiary)] px-4 py-4 text-base leading-6 font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!trimmedNickname || isSaving}
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-lg bg-[color:var(--color-bg-inverse-bolder)] px-4 py-4 text-base leading-6 font-semibold text-[color:var(--color-text-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
