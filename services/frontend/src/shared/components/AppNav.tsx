"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BiBarChartAlt2 } from "react-icons/bi";
import { GoBook, GoBriefcase, GoListUnordered, GoSearch } from "react-icons/go";
import { HiOutlineBell } from "react-icons/hi";
import { IoCloseOutline } from "react-icons/io5";
import { LuNewspaper } from "react-icons/lu";
import { MdOutlineFavorite } from "react-icons/md";
import type { IconType } from "react-icons";
import ProtectedLink from "@/shared/components/ProtectedLink";
import ProfileEditModal from "@/shared/components/nav/ProfileEditModal";
import ProfileMenu from "@/shared/components/nav/ProfileMenu";
import { useNotificationCountQuery } from "@/shared/hooks/useNotificationCountQuery";
import { useRequireAuthAction } from "@/shared/hooks/useRequireAuthAction";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { useTheme } from "@/shared/hooks/useTheme";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { logoutFromApp } from "@/shared/lib/authApi";
import { useAuthModalStore } from "@/shared/lib/authModalStore";
import { clearAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { clearSessionUser } from "@/shared/lib/authSession";
import { useAuthStore } from "@/shared/lib/authStore";
import { clearPendingSocialSignup } from "@/shared/lib/socialAuth";
import { updateUserProfile } from "@/shared/lib/userProfileApi";
import SearchModal from "@/shared/ui/SearchModal";

type NavItem = {
  href: string;
  label: string;
  icon: IconType | null;
  highlightOnMatch?: boolean;
  requiresAuth?: boolean;
};

const navItems: NavItem[] = [
  { href: "/about", label: "ABOUT", icon: GoBook },
  { href: "/portfolio", label: "포트폴리오", icon: GoBriefcase, requiresAuth: true },
  { href: "/signals", label: "매매신호종합", icon: BiBarChartAlt2, requiresAuth: true },
  { href: "/stocks", label: "전체 종목", icon: GoListUnordered },
  { href: "/scraps", label: "관심 종목", icon: MdOutlineFavorite, requiresAuth: true },
  { href: "/news", label: "뉴스", icon: null },
];

const loginButtonClassName =
  "typo-body-md inline-flex cursor-pointer items-start justify-center overflow-hidden rounded bg-[color:var(--color-bg-inverse-bolder)] px-3 py-2 font-semibold text-[color:var(--color-text-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const headerHoverTextClassName = "hover:text-[color:var(--color-text-secondary)]";
const headerHoverTextStrongClassName = "hover:!text-[color:var(--color-text-secondary)]";
const mobileMyPageButtonClassName =
  "typo-body-md w-full cursor-pointer rounded-lg px-3 py-3 text-left font-semibold text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]";

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
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, isHydrated } = useTheme();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const showLoginModal = useAuthModalStore((state) => state.openLoginModal);
  const requireAuthAction = useRequireAuthAction();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [profileMenuAnchorRect, setProfileMenuAnchorRect] = useState<DOMRect | null>(null);

  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const logoSrc = isHydrated && resolvedTheme === "dark" ? "/images/logoDark.png" : "/images/logoLight.png";
  const isAuthReady = authStatus !== "restoring";
  const isLoggedIn = Boolean(currentUser);
  const profileImageUrl = currentUser?.profileImageUrl ?? "/images/profile-placeholder.svg";
  const isLocalProfileImage = profileImageUrl.startsWith("/");
  const displayNickname = currentUser?.nickname ?? "성공하는투자자";

  const { data: notificationCount } = useNotificationCountQuery(isAuthReady && isLoggedIn);
  const unreadCount = isLoggedIn && typeof notificationCount === "number" ? notificationCount : 0;
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);
  const {
    isSearchModalOpen,
    searchKeyword,
    recentSearches,
    searchResults,
    isSearchLoading,
    trendingStocks,
    trendingStocksUpdatedAt,
    isTrendingStocksLoading,
    setSearchKeyword,
    openSearchModal,
    closeSearchModal,
    submitSearch,
    handleStockSelect,
    handleNewsSelect,
    handleTrendingStockSelect,
    handleRecentSearchClick,
    handleRecentSearchRemove,
    handleRecentSearchesClear,
  } = useSearchModal({ isLoggedIn });

  const isActivePath = (item: NavItem) => {
    if (item.highlightOnMatch === false) {
      return false;
    }

    if (item.href === "/") {
      return pathname === "/";
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const updateProfileMenuPosition = useCallback(() => {
    setProfileMenuAnchorRect(profileButtonRef.current?.getBoundingClientRect() ?? null);
  }, []);

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

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handleViewportChange = () => {
      updateProfileMenuPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isProfileMenuOpen, updateProfileMenuPosition]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (profileButtonRef.current?.contains(target) || profileMenuRef.current?.contains(target)) {
        return;
      }

      setIsProfileMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const goToPath = (path: string) => {
    router.push(path);
    setIsDrawerOpen(false);
    setIsProfileMenuOpen(false);
  };

  const handleOpenSearchModal = (trigger: "focus" | "click" = "click") => {
    setIsDrawerOpen(false);
    openSearchModal(trigger);
  };

  const handleOpenLoginModal = () => {
    setIsDrawerOpen(false);
    setIsProfileMenuOpen(false);
    showLoginModal();
  };

  const handleToggleProfileMenu = () => {
    if (isProfileMenuOpen) {
      setIsProfileMenuOpen(false);
      return;
    }

    updateProfileMenuPosition();
    setIsProfileMenuOpen(true);
  };

  const handleOpenProfileEdit = () => {
    setIsDrawerOpen(false);
    setIsProfileMenuOpen(false);
    setIsProfileEditModalOpen(true);
  };

  const handleSaveProfile = async (nickname: string) => {
    try {
      const user = await updateUserProfile({
        nickname,
      });

      setUser(user);
      setIsProfileEditModalOpen(false);
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "내 정보 수정에 실패했습니다."));
    }
  };

  const handleOpenWatchlist = () => {
    goToPath("/scraps");
  };

  const handleChangePassword = () => {
    setIsDrawerOpen(false);
    setIsProfileMenuOpen(false);
    window.alert("비밀번호 변경 기능은 준비 중입니다.");
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
    clearSessionUser();
    clearPendingSocialSignup();
    setIsDrawerOpen(false);
    setIsProfileMenuOpen(false);
    setIsProfileEditModalOpen(false);
    router.push("/");
  };

  const getNavItemTextClassName = (item: NavItem) => {
    return isActivePath(item) ? "!text-[color:var(--color-text-primary)]" : "!text-[color:var(--color-text-tertiary)]";
  };

  const renderProfileImage = () => {
    if (isLocalProfileImage) {
      return (
        <Image
          src={profileImageUrl}
          alt={currentUser?.nickname ?? "프로필"}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
        />
      );
    }

    return (
      // Using a native img here avoids Next/Image remote host allowlist maintenance for arbitrary profile URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profileImageUrl} alt={currentUser?.nickname ?? "프로필"} className="h-9 w-9 rounded-full object-cover" />
    );
  };

  return (
    <>
      <header className="flex w-full flex-col items-center border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] backdrop-blur-[6px]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-4 py-3 md:px-6 md:py-4 lg:px-8 xl:px-12">
          <div className="flex items-center gap-8 xl:gap-10">
            <Link href="/" className="inline-flex w-[136px] items-center md:w-[160px] lg:w-[192px]">
              <Image src={logoSrc} alt="살래말래 위원회" width={392} height={78} priority className="h-auto w-full max-w-none" />
            </Link>

            <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
              {navItems.map((item) => {
                const isActive = isActivePath(item);
                const className = `typo-heading-sm whitespace-nowrap transition-colors ${headerHoverTextStrongClassName} ${getNavItemTextClassName(item)}`;

                if (item.requiresAuth) {
                  return (
                    <ProtectedLink
                      key={item.href}
                      href={item.href}
                      ariaCurrent={isActive ? "page" : undefined}
                      className={className}
                    >
                      {item.label}
                    </ProtectedLink>
                  );
                }

                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={className}>
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
                onFocus={() => handleOpenSearchModal("focus")}
                onClick={() => handleOpenSearchModal("click")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitSearch(searchKeyword);
                  }
                }}
                placeholder="종목명 또는 코드 검색"
                readOnly
                className="typo-body-sm w-full cursor-pointer rounded-xl bg-[color:var(--color-bg-secondary)] py-2.5 pl-9 pr-4 text-[color:var(--color-text-tertiary)] outline outline-1 outline-[color:var(--color-border-secondary)] placeholder:text-[color:var(--color-text-tertiary)] transition-colors focus:text-[color:var(--color-text-primary)]"
              />
              <button
                type="button"
                onClick={() => handleOpenSearchModal("click")}
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

                  <button
                    ref={profileButtonRef}
                    type="button"
                    onClick={handleToggleProfileMenu}
                    className="inline-flex h-9 w-9 overflow-hidden rounded-full bg-[color:var(--color-bg-tertiary)] outline-none transition-opacity hover:opacity-90"
                    aria-label="프로필 메뉴"
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                  >
                    {renderProfileImage()}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={handleOpenLoginModal} className={loginButtonClassName}>
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
                <Image src={logoSrc} alt="살래말래 위원회" width={196} height={39} className="h-auto w-[136px] md:w-[160px]" />
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
                    onClick={() => {
                      requireAuthAction(() => goToPath("/notifications"));
                    }}
                    className={`typo-body-md flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 font-bold text-[color:var(--color-text-secondary)] transition-colors ${headerHoverTextClassName}`}
                  >
                    <HiOutlineBell className="h-5 w-5 text-[color:var(--color-border-interactive-secondary)]" />
                    <span className="whitespace-nowrap">알림함</span>
                  </button>
                  <div className="h-5 w-px bg-[color:var(--color-border-primary)]" />
                  <button
                    type="button"
                    onClick={() => handleOpenSearchModal("click")}
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
                      const content = (
                        <>
                          <CategoryIcon Icon={item.icon} active={isActive} />
                          <span
                            className={`typo-body-lg align-middle whitespace-nowrap transition-colors ${headerHoverTextStrongClassName} ${getNavItemTextClassName(item)}`}
                          >
                            {item.label}
                          </span>
                        </>
                      );

                      if (item.requiresAuth) {
                        return (
                          <ProtectedLink
                            key={`drawer-${item.href}`}
                            href={item.href}
                            onClick={() => setIsDrawerOpen(false)}
                            ariaCurrent={isActive ? "page" : undefined}
                            className="inline-flex w-full items-center gap-2"
                          >
                            {content}
                          </ProtectedLink>
                        );
                      }

                      return (
                        <Link
                          key={`drawer-${item.href}`}
                          href={item.href}
                          onClick={() => setIsDrawerOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className="inline-flex w-full items-center gap-2"
                        >
                          {content}
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
                    <div className="flex w-full flex-col gap-2">
                      <button type="button" onClick={handleOpenProfileEdit} className={mobileMyPageButtonClassName}>
                        내 정보 수정
                      </button>
                      <button type="button" onClick={handleOpenWatchlist} className={mobileMyPageButtonClassName}>
                        관심종목
                      </button>
                      <button type="button" onClick={handleChangePassword} className={mobileMyPageButtonClassName}>
                        비밀번호 변경
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className={`${mobileMyPageButtonClassName} !font-extrabold text-[color:var(--color-text-danger)]`}
                      >
                        로그아웃
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleOpenLoginModal} className={`${loginButtonClassName} w-full justify-center`}>
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

      <SearchModal
        key={isSearchModalOpen ? "search-modal-open" : "search-modal-closed"}
        open={isSearchModalOpen}
        value={searchKeyword}
        recentSearches={recentSearches}
        searchResults={searchResults}
        isSearching={isSearchLoading}
        trendingStocks={trendingStocks}
        trendingStocksUpdatedAt={trendingStocksUpdatedAt}
        isTrendingStocksLoading={isTrendingStocksLoading}
        onClose={closeSearchModal}
        onValueChange={setSearchKeyword}
        onSubmit={submitSearch}
        onRecentSearchClick={handleRecentSearchClick}
        onRecentSearchRemove={handleRecentSearchRemove}
        onRecentSearchesClear={handleRecentSearchesClear}
        onStockSelect={handleStockSelect}
        onNewsSelect={handleNewsSelect}
        onTrendingStockSelect={handleTrendingStockSelect}
      />

      {isLoggedIn && isProfileMenuOpen ? (
        <ProfileMenu
          anchorRect={profileMenuAnchorRect}
          nickname={displayNickname}
          menuRef={profileMenuRef}
          onEditProfile={handleOpenProfileEdit}
          onOpenWatchlist={handleOpenWatchlist}
          onChangePassword={handleChangePassword}
          onLogout={() => void handleLogout()}
        />
      ) : null}

      {isLoggedIn ? (
        <ProfileEditModal
          open={isProfileEditModalOpen}
          nickname={displayNickname}
          profileImageUrl={currentUser?.profileImageUrl ?? null}
          onClose={() => setIsProfileEditModalOpen(false)}
          onSave={handleSaveProfile}
        />
      ) : null}
    </>
  );
}
