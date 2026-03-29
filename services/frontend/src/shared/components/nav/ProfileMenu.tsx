"use client";

import { useMemo, type RefObject } from "react";

type Props = {
  anchorRect: DOMRect | null;
  nickname: string;
  menuRef?: RefObject<HTMLDivElement | null>;
  onEditProfile: () => void;
  onOpenWatchlist: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
};

const menuItemClassName =
  "flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]";

function getMenuPosition(anchorRect: DOMRect | null) {
  if (!anchorRect || typeof window === "undefined") {
    return {
      top: 0,
      left: 0,
    };
  }

  const menuWidth = 240;
  const viewportPadding = 12;
  const left = Math.min(
    Math.max(anchorRect.right - menuWidth, viewportPadding),
    window.innerWidth - menuWidth - viewportPadding,
  );

  return {
    top: Math.round(anchorRect.bottom + 12),
    left: Math.round(left),
  };
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M6 3.5 10 8l-4 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProfileMenu({
  anchorRect,
  nickname,
  menuRef,
  onEditProfile,
  onOpenWatchlist,
  onChangePassword,
  onLogout,
}: Props) {
  const position = useMemo(() => getMenuPosition(anchorRect), [anchorRect]);

  if (!anchorRect) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[85] inline-flex w-60 flex-col items-center gap-1 rounded-xl bg-[color:var(--color-bg-primary)] py-1 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.16)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
      style={position}
      role="menu"
      aria-label="프로필 메뉴"
    >
      <div className="flex w-full flex-col items-start gap-0.5 border-b border-[color:var(--color-border-secondary)] p-4">
        <p className="w-full text-left text-base leading-6 font-semibold text-[color:var(--color-text-secondary)]">
          {nickname} 님
        </p>
      </div>

      <button type="button" className={menuItemClassName} onClick={onEditProfile} role="menuitem">
        <span className="text-base leading-6 font-semibold text-[color:var(--color-text-primary)]">내 정보 수정</span>
        <span className="text-[color:var(--color-border-disabled)]">
          <ArrowIcon />
        </span>
      </button>

      <button type="button" className={menuItemClassName} onClick={onOpenWatchlist} role="menuitem">
        <span className="text-base leading-6 font-semibold text-[color:var(--color-text-primary)]">관심종목</span>
      </button>

      <button type="button" className={menuItemClassName} onClick={onChangePassword} role="menuitem">
        <span className="text-base leading-6 font-semibold text-[color:var(--color-text-primary)]">비밀번호 변경</span>
      </button>

      <div className="h-px w-48 bg-[color:var(--color-icon-disabled)]" />

      <button type="button" className={menuItemClassName} onClick={onLogout} role="menuitem">
        <span className="w-full text-center text-base leading-6 font-extrabold text-[color:var(--color-text-danger)]">
          로그아웃
        </span>
      </button>
    </div>
  );
}
