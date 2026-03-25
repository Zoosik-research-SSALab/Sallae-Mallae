"use client";

import Image from "next/image";
import { useEffect, useState, type ComponentType, type FormEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { SiNaver } from "react-icons/si";
import SignupCard from "@/app/auth/signup/components/SignupCard";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { loginWithEmail } from "@/shared/lib/authApi";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { startSocialLogin } from "@/shared/lib/socialAuth";
import { useAuthStore } from "@/shared/lib/authStore";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { cn } from "@/shared/utils/cn";
import type { AuthProvider } from "@/shared/types/auth";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

type LoginCardProps = {
  showCloseButton?: boolean;
  onClose?: () => void;
  onAuthenticated?: () => void;
  onOpenSignup?: () => void;
};

type ProviderButtonConfig = {
  provider: AuthProvider;
  label: string;
  className: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
};

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 4.8c-4.6 0-8.3 2.95-8.3 6.6 0 2.33 1.53 4.37 3.82 5.54l-.96 3.94 4.34-2.89c.36.03.72.05 1.1.05 4.58 0 8.3-2.95 8.3-6.6 0-3.7-3.72-6.64-8.3-6.64Z"
        fill="currentColor"
      />
    </svg>
  );
}

const providerButtons: ProviderButtonConfig[] = [
  {
    provider: "kakao",
    label: "카카오",
    className: "bg-[#FEE500] text-[#181600]",
    icon: KakaoIcon,
    iconClassName: "h-6 w-6",
  },
  {
    provider: "google",
    label: "Google",
    className:
      "border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-primary)]",
    icon: FcGoogle,
    iconClassName: "h-6 w-6",
  },
  {
    provider: "naver",
    label: "네이버",
    className: "bg-[#03C75A] text-white",
    icon: SiNaver,
    iconClassName: "h-[18px] w-[18px]",
  },
];

const authInputClassName =
  "typo-body-md !rounded-lg !border-[color:var(--color-border-secondary)] !bg-[color:var(--color-bg-secondary)] !px-4 !py-4 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:!border-[color:var(--color-border-interactive-primary)] focus-visible:!ring-[color:var(--color-bg-interactive-primary)]/10";

export function LoginCard({ showCloseButton = false, onClose, onAuthenticated, onOpenSignup }: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [activeAction, setActiveAction] = useState<"email" | AuthProvider | null>(null);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (activeAction) {
      return;
    }

    setActiveAction("email");

    try {
      const response = await loginWithEmail({
        email: email.trim(),
        password,
      });

      writeAuthPersistenceMode(keepSignedIn);
      useAuthStore.getState().applyAuthSession(response);
      setPassword("");
      onAuthenticated?.();
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "이메일 로그인에 실패했습니다."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleProviderLogin = async (provider: AuthProvider) => {
    if (activeAction) {
      return;
    }

    setActiveAction(provider);

    try {
      await startSocialLogin(provider);
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "소셜 로그인에 실패했습니다."));
      setActiveAction(null);
    }
  };

  const isEmailSubmitting = activeAction === "email";

  return (
    <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[25rem] flex-col overflow-hidden rounded-[28px] bg-[color:var(--color-bg-primary)]">
      {showCloseButton ? (
        <div className="pointer-events-none absolute right-3 top-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]"
            aria-label="닫기"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
              <path d="M6 6 18 18" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" />
              <path d="M18 6 6 18" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full max-w-80 flex-col items-center gap-2">
            <h1 className="typo-heading-md text-center text-[color:var(--color-text-primary)] sm:text-[28px] sm:leading-9">
              살래말래위원회에
              <br />
              오신 것을 환영합니다
            </h1>
          </div>

          <div className="relative -mx-5 flex w-[calc(100%+2.5rem)] justify-center overflow-hidden sm:-mx-8 sm:w-[calc(100%+4rem)]">
            <Image
              src="/images/loginImg.png"
              alt="살래말래위원회 로그인 안내 이미지"
              width={486}
              height={305}
              priority
              className="h-auto w-[118%] max-w-none object-cover sm:w-[120%]"
            />
          </div>

          <div className="flex w-full max-w-80 flex-col items-center gap-2">
            <p className="typo-body-md text-center text-[color:var(--color-text-secondary)]">
              AI 위원회가 안내하는 투자 인사이트를 확인해보세요.
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="flex w-full max-w-80 flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">이메일</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                className={authInputClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">비밀번호</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력해주세요"
                autoComplete="current-password"
                className={authInputClassName}
              />
            </label>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                    keepSignedIn
                      ? "border-[color:var(--color-border-interactive-primary)] bg-[color:var(--color-bg-interactive-primary)] text-[color:var(--color-text-interactive-inverse)]"
                      : "border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] text-transparent",
                  )}
                >
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" aria-hidden>
                    <path
                      d="m4.5 10 3.2 3.2L15.5 5.4"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(event) => setKeepSignedIn(event.target.checked)}
                  className="sr-only"
                />
                <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">로그인 유지</span>
              </label>

              <button
                type="button"
                onClick={() => window.alert("비밀번호 찾기 기능은 아직 준비 중입니다.")}
                className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)]"
              >
                비밀번호 찾기
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!email.trim() || !password || Boolean(activeAction)}
              className="typo-body-md min-h-[52px] rounded-2xl border-transparent bg-[color:var(--color-bg-interactive-primary)] font-semibold text-[color:var(--color-text-interactive-inverse)] hover:bg-[color:var(--color-border-interactive-primary-pressed)]"
            >
              {isEmailSubmitting ? "로그인 중..." : "이메일로 로그인하기"}
            </Button>
          </form>

          <div className="flex w-full max-w-80 items-center">
            <div className="h-px flex-1 bg-[color:var(--color-border-primary)]" />
            <span className="typo-body-sm px-3 font-medium text-[color:var(--color-text-tertiary)]">OR</span>
            <div className="h-px flex-1 bg-[color:var(--color-border-primary)]" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-start justify-center gap-4">
              {providerButtons.map(({ provider, label, className, icon: Icon, iconClassName }) => {
                const isSubmitting = activeAction === provider;

                return (
                  <div key={provider} className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(activeAction)}
                      onClick={() => handleProviderLogin(provider)}
                      className={cn(
                        "inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60",
                        className,
                      )}
                      aria-label={`${label}로 로그인하기`}
                    >
                      {isSubmitting ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Icon className={iconClassName} />
                      )}
                    </button>
                    <span className="typo-body-xs font-semibold text-[color:var(--color-text-secondary)]">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1 text-center">
            <span className="typo-body-sm text-[color:var(--color-text-secondary)]">아직 계정이 없으신가요?</span>
            <button
              type="button"
              onClick={onOpenSignup}
              className="typo-body-sm font-semibold text-[color:var(--color-text-interactive-primary)]"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [modalView, setModalView] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button
        type="button"
        aria-label="로그인 모달 닫기"
        onClick={onClose}
        className="fixed inset-0 bg-black/56 backdrop-blur-[2px]"
      />
      <div className="relative flex w-full items-center justify-center">
        <div className="relative z-[1] w-full max-w-[25rem]">
          {modalView === "login" ? (
            <LoginCard
              showCloseButton
              onClose={onClose}
              onAuthenticated={onClose}
              onOpenSignup={() => setModalView("signup")}
            />
          ) : (
            <SignupCard showCloseButton onClose={onClose} onAuthenticated={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
