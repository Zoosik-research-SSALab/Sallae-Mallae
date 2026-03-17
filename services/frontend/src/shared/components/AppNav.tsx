"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiBarChartAlt2 } from "react-icons/bi";
import { GoBook, GoBriefcase, GoListUnordered, GoSearch } from "react-icons/go";
import { HiOutlineBell } from "react-icons/hi";
import { IoCloseOutline } from "react-icons/io5";
import type { IconType } from "react-icons";
import { LuNewspaper } from "react-icons/lu";
import { MdOutlineFavorite } from "react-icons/md";
import { useNotificationCountQuery } from "@/shared/hooks/useNotificationCountQuery";
import { useTheme } from "@/shared/hooks/useTheme";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { logoutFromApp } from "@/shared/lib/authApi";
import { clearAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";

type NavItem = {
  href: string;
  label: string;
  icon: IconType | null;
  highlightOnMatch?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "ABOUT", icon: GoBook, highlightOnMatch: false },
  { href: "/portfolio", label: "포트폴리오", icon: GoBriefcase },
  { href: "/signals", label: "매매신호종합", icon: BiBarChartAlt2 },
  { href: "/stocks", label: "전체 종목", icon: GoListUnordered },
  { href: "/scraps", label: "관심 종목", icon: MdOutlineFavorite },
  { href: "/news", label: "뉴스", icon: null },
];

const loginButtonClassName =
  "typo-body-md inline-flex cursor-pointer items-start justify-center overflow-hidden rounded bg-[color:var(--color-bg-inverse-bolder)] px-3 py-2 font-semibold text-[color:var(--color-text-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const headerHoverTextClassName = "hover:text-[color:var(--color-text-secondary)]";
const headerHoverTextStrongClassName = "hover:!text-[color:var(--color-text-secondary)]";
const LoginModal = dynamic(() => import("@/app/auth/login/components/LoginCard").then((module) => module.LoginModal), {
  ssr: false,
});

function CategoryIcon({ Icon, active }: { Icon: IconType | null; active: boolean }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-icon-interactive-primary)]"
      aria-hidden
    >
      {Icon ? (
        <Icon className={active ? "h-4 w-4 text-[color:var(--color-icon-interactive-primary)]" : "h-4 w-4"} />
      ) : (
        <LuNewspaper className={active ? "h-4 w-4 text-[color:var(--color-icon-interactive-primary)]" : "h-4 w-4"} />
      )}
    </span>
  );
}

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, isHydrated } = useTheme();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const logoSrc = isHydrated && resolvedTheme === "dark" ? "/images/logoDark.png" : "/images/logoLight.png";
  const isAuthReady = authStatus !== "restoring";
  const isLoggedIn = Boolean(currentUser);
  const profileImageUrl = currentUser?.profileImageUrl ?? "/images/profile-placeholder.svg";
  const isLocalProfileImage = profileImageUrl.startsWith("/");

  const { data: notificationCount } = useNotificationCountQuery(isAuthReady && isLoggedIn);
  const unreadCount = isLoggedIn && typeof notificationCount === "number" ? notificationCount : 0;
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  const isActivePath = (item: NavItem) => {
    if (item.highlightOnMatch === false) {
      return false;
    }

    if (item.href === "/") {
      return pathname === "/";
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsDrawerOpen(false);
      }
    };

    mediaQuery.addEventListener("change", closeDrawerOnDesktop);
    return () => mediaQuery.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  const goToPath = (path: string) => {
    router.push(path);
    setIsDrawerOpen(false);
  };

  const goToSearch = () => {
    const keyword = searchKeyword.trim();
    if (keyword) {
      router.push(`/search?keyword=${encodeURIComponent(keyword)}`);
    } else {
      router.push("/search");
    }
    setIsDrawerOpen(false);
  };

  const openLoginModal = () => {
    setIsDrawerOpen(false);
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutFromApp();
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "로그아웃에 실패했습니다."));
      return;
    }

    clearAuth();
    clearAuthPersistenceMode();
    setIsDrawerOpen(false);
  };

  const getNavItemTextClassName = (item: NavItem) => {
    return isActivePath(item) ? "!text-[color:var(--color-text-primary)]" : "!text-[color:var(--color-text-tertiary)]";
  };

  return (
    <>
      <header className="flex w-full flex-col items-center border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] backdrop-blur-[6px]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-4 py-3 md:px-6 md:py-4 lg:px-8 xl:px-12">
          <div className="flex items-center gap-8 xl:gap-10">
            <Link href="/" className="inline-flex w-[136px] items-center md:w-[160px] lg:w-[192px]">
              <Image src={logoSrc} alt="살래말래위원회" width={392} height={78} priority className="h-auto w-full max-w-none" />
            </Link>

            <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
              {navItems.map((item) => {
                const isActive = isActivePath(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`typo-heading-sm whitespace-nowrap transition-colors ${headerHoverTextStrongClassName} ${getNavItemTextClassName(item)}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden flex-1 items-center justify-end gap-3 lg:flex xl:gap-4">
            <div className="relative w-full max-w-64">
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    goToSearch();
                  }
                }}
                placeholder="종목명 또는 코드 검색"
                className="typo-body-sm w-full rounded-xl bg-[color:var(--color-bg-secondary)] py-2.5 pl-9 pr-4 text-[color:var(--color-text-tertiary)] outline outline-1 outline-[color:var(--color-border-secondary)] placeholder:text-[color:var(--color-text-tertiary)] transition-colors focus:text-[color:var(--color-text-primary)]"
              />
              <button
                type="button"
                onClick={goToSearch}
                className={`absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer text-[color:var(--color-text-tertiary)] transition-colors ${headerHoverTextClassName}`}
                aria-label="검색"
              >
                <GoSearch className="h-4 w-4" />
              </button>
            </div>

            {isAuthReady ? (
              isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/notifications"
                    className={`relative inline-flex h-9 w-9 items-center justify-center text-[color:var(--color-text-tertiary)] transition-colors ${headerHoverTextClassName}`}
                    aria-label="알림"
                  >
                    <HiOutlineBell className="h-6 w-6" />
                    {unreadCount > 0 ? (
                      <span className="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-bg-danger-bold)] px-1 text-[10px] leading-none text-[color:var(--color-text-interactive-inverse)]">
                        {displayCount}
                      </span>
                    ) : null}
                  </Link>

                  <span className="inline-flex" aria-label="프로필">
                    {isLocalProfileImage ? (
                      <Image
                        src={profileImageUrl}
                        alt={currentUser?.nickname ?? "프로필"}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      // Using a native img here avoids Next/Image remote host allowlist maintenance for arbitrary profile URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profileImageUrl} alt={currentUser?.nickname ?? "프로필"} className="h-9 w-9 rounded-full object-cover" />
                    )}
                  </span>
                </div>
              ) : (
                <button type="button" onClick={openLoginModal} className={loginButtonClassName}>
                  로그인
                </button>
              )
            ) : (
              <div className="h-10 w-[84px]" />
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center text-[color:var(--color-text-tertiary)] transition-colors ${headerHoverTextClassName} lg:hidden`}
            aria-label="메뉴 열기"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/45"
            aria-label="메뉴 닫기"
          />

          <aside className="absolute right-0 top-0 inline-flex h-full w-[min(23.5rem,calc(100vw-12px))] max-w-full flex-col items-center justify-start overflow-hidden bg-[color:var(--color-bg-primary)] sm:w-[min(24rem,calc(100vw-16px))] md:w-[min(24.5rem,calc(100vw-20px))]">
            <div className="flex w-full flex-col items-start border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-6 py-4 backdrop-blur-[6px]">
              <div className="inline-flex w-full items-center justify-between">
                <Image src={logoSrc} alt="살래말래위원회" width={196} height={39} className="h-auto w-[136px] md:w-[160px]" />
                <div className="h-6 flex-1 px-6" />
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-[color:var(--color-text-primary)] transition-colors hover:text-[color:var(--color-text-secondary)]"
                  aria-label="닫기"
                >
                  <IoCloseOutline className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex w-full flex-1 flex-col items-start overflow-y-auto pt-4">
              <div className="flex w-full justify-start px-6">
                <div className="flex w-full max-w-[22rem] items-center rounded-lg bg-[color:var(--color-bg-tertiary)]">
                  <button
                    type="button"
                    onClick={() => goToPath("/notifications")}
                    className={`typo-body-md flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 font-bold text-[color:var(--color-text-secondary)] transition-colors ${headerHoverTextClassName}`}
                  >
                    <HiOutlineBell className="h-5 w-5 text-[color:var(--color-border-interactive-secondary)]" />
                    <span className="whitespace-nowrap">알림함</span>
                  </button>
                  <div className="h-5 w-px bg-[color:var(--color-border-primary)]" />
                  <button
                    type="button"
                    onClick={goToSearch}
                    className={`typo-body-md flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 font-bold text-[color:var(--color-text-secondary)] transition-colors ${headerHoverTextClassName}`}
                  >
                    <GoSearch className="h-4 w-4 text-[color:var(--color-border-interactive-secondary)]" style={{ strokeWidth: 2 }} />
                    <span className="whitespace-nowrap">검색하기</span>
                  </button>
                </div>
              </div>

              <div className="w-full p-6">
                <div className="flex flex-col gap-6">
                  <nav className="flex flex-col gap-4">
                    {navItems.map((item) => {
                      const isActive = isActivePath(item);

                      return (
                        <Link
                          key={`drawer-${item.href}`}
                          href={item.href}
                          onClick={() => setIsDrawerOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className="inline-flex w-full items-center gap-2"
                        >
                          <CategoryIcon Icon={item.icon} active={isActive} />
                          <span
                            className={`typo-body-lg align-middle whitespace-nowrap transition-colors ${headerHoverTextStrongClassName} ${getNavItemTextClassName(item)}`}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="w-full border-t border-[color:var(--color-border-secondary)]" />
                </div>
              </div>

              <div className="flex w-full flex-col gap-4 px-6 pb-6">
                <div className="inline-flex w-full items-start gap-2.5 overflow-hidden">
                  <div className="typo-body-sm flex-1 font-semibold text-[color:var(--color-text-tertiary)]">마이페이지</div>
                </div>

                {isAuthReady ? (
                  isLoggedIn ? (
                    <div className="flex w-full flex-col gap-4">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`typo-body-md w-full cursor-pointer whitespace-nowrap text-left font-semibold text-[color:var(--color-text-primary)] transition-colors ${headerHoverTextClassName}`}
                      >
                        로그아웃
                      </button>
                      <button
                        type="button"
                        className={`typo-body-md w-full cursor-pointer whitespace-nowrap text-left font-semibold text-[color:var(--color-text-primary)] transition-colors ${headerHoverTextClassName}`}
                      >
                        비밀번호 변경
                      </button>
                      <button
                        type="button"
                        className={`typo-body-md w-full cursor-pointer whitespace-nowrap text-left font-semibold text-[color:var(--color-text-primary)] transition-colors ${headerHoverTextClassName}`}
                      >
                        회원정보 수정
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={openLoginModal} className={`${loginButtonClassName} w-full justify-center`}>
                      로그인
                    </button>
                  )
                ) : (
                  <div className="h-10 w-full" />
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {isLoginModalOpen ? <LoginModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} /> : null}
    </>
  );
}
