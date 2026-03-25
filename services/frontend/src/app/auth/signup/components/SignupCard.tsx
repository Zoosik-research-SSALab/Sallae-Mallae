"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { checkEmailAvailability, sendEmailCode, signupWithEmail, verifyEmailCode } from "@/shared/lib/authApi";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

type Props = {
  showCloseButton?: boolean;
  onClose?: () => void;
  onAuthenticated?: () => void;
};

const formInputClassName =
  "typo-body-md !rounded-lg !border-[color:var(--color-border-secondary)] !bg-[color:var(--color-bg-secondary)] !px-4 !py-4 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:!border-[color:var(--color-border-interactive-primary)] focus-visible:!ring-[color:var(--color-bg-interactive-primary)]/10";
const disabledInputClassName =
  "disabled:cursor-not-allowed disabled:!border-[color:var(--color-border-secondary)] disabled:!bg-[color:var(--color-bg-secondary)] disabled:text-[color:var(--color-text-tertiary)] disabled:opacity-100";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

export default function SignupCard({ showCloseButton = false, onClose, onAuthenticated }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isCodeRequested, setIsCodeRequested] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [activeAction, setActiveAction] = useState<"sendCode" | "verifyCode" | "signup" | null>(null);

  const isSendingCode = activeAction === "sendCode";
  const isVerifyingCode = activeAction === "verifyCode";
  const isSubmitting = activeAction === "signup";
  const isEmailReady = isValidEmail(email.trim().toLowerCase());
  const isVerificationCodeReady = verificationCode.trim().length === 6;
  const isRequestButtonReady = isEmailReady;
  const isVerifyButtonReady = isCodeRequested && isVerificationCodeReady;
  const inactiveCodeButtonClassName =
    "absolute right-2 top-1/2 min-h-0 -translate-y-1/2 rounded-lg border border-transparent bg-[color:var(--color-bg-interactive-secondary-pressed)] px-3 py-2 text-xs font-bold text-[color:var(--color-text-interactive-secondary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-pressed)] disabled:cursor-not-allowed disabled:opacity-60";
  const activeCodeButtonClassName =
    "absolute right-2 top-1/2 min-h-0 -translate-y-1/2 rounded-lg border border-transparent bg-[color:var(--color-text-interactive-primary)] px-3 py-2 text-xs font-bold text-[color:var(--color-text-interactive-inverse)] transition-colors hover:bg-[color:var(--color-text-interactive-primary)] disabled:cursor-not-allowed disabled:opacity-100";

  const resetVerificationState = () => {
    setIsCodeRequested(false);
    setVerificationCode("");
    setVerificationToken(null);
    setIsCodeVerified(false);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);

    if (isCodeRequested || verificationCode) {
      resetVerificationState();
    }
  };

  const handleVerificationCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6));

    if (isCodeVerified || verificationToken) {
      setVerificationToken(null);
      setIsCodeVerified(false);
    }
  };

  const handleRequestCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      window.alert("이메일을 입력해 주세요.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      window.alert("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    if (activeAction) {
      return;
    }

    setActiveAction("sendCode");

    try {
      const availability = await checkEmailAvailability(trimmedEmail);

      if (!availability.available) {
        window.alert("이미 가입된 이메일입니다.");
        return;
      }

      await sendEmailCode({
        email: trimmedEmail,
        purpose: "SIGNUP",
      });

      setEmail(trimmedEmail);
      setIsCodeRequested(true);
      setVerificationCode("");
      setVerificationToken(null);
      setIsCodeVerified(false);
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "인증코드 요청에 실패했습니다."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = verificationCode.trim();

    if (!isCodeRequested) {
      window.alert("이메일 인증요청을 먼저 진행해 주세요.");
      return;
    }

    if (trimmedCode.length !== 6) {
      window.alert("6자리 인증코드를 입력해 주세요.");
      return;
    }

    if (activeAction) {
      return;
    }

    setActiveAction("verifyCode");

    try {
      const verification = await verifyEmailCode({
        email: trimmedEmail,
        code: trimmedCode,
        purpose: "SIGNUP",
      });

      setVerificationToken(verification.verificationToken);
      setIsCodeVerified(true);
      window.alert("이메일 인증이 완료되었습니다.");
    } catch (error) {
      setVerificationToken(null);
      setIsCodeVerified(false);
      window.alert(getAuthErrorMessage(error, "이메일 인증에 실패했습니다."));
    } finally {
      setActiveAction(null);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedNickname = nickname.trim();

    if (!trimmedEmail || !trimmedNickname || !password || !passwordConfirm) {
      window.alert("모든 항목을 입력해 주세요.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      window.alert("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    if (!isCodeRequested) {
      window.alert("이메일 인증요청을 먼저 진행해 주세요.");
      return;
    }

    if (!verificationToken || !isCodeVerified) {
      window.alert("인증코드 확인을 먼저 완료해 주세요.");
      return;
    }

    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      window.alert("닉네임은 2자 이상 20자 이하여야 합니다.");
      return;
    }

    if (!isValidPassword(password)) {
      window.alert("비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.");
      return;
    }

    if (password !== passwordConfirm) {
      window.alert("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (activeAction) {
      return;
    }

    setActiveAction("signup");

    try {
      const response = await signupWithEmail({
        verificationToken,
        email: trimmedEmail,
        password,
        nickname: trimmedNickname,
        emailOptIn: false,
        agreements: [
          { termsId: 1, agreed: true },
          { termsId: 2, agreed: true },
          { termsId: 3, agreed: true },
        ],
      });

      writeAuthPersistenceMode(true);
      useAuthStore.getState().applyAuthSession(response);

      if (onAuthenticated) {
        onAuthenticated();
        return;
      }

      router.replace("/");
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "회원가입에 실패했습니다."));
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-96 flex-col overflow-hidden rounded-2xl bg-[color:var(--color-bg-primary)] py-3 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.12)]">
      {showCloseButton ? (
        <div className="pointer-events-none absolute right-2 top-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]"
            aria-label="회원가입 모달 닫기"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
              <path d="M6 6 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col items-center gap-6">
        <div className="flex w-full max-w-80 flex-col items-center">
          <h1 className="typo-heading-md text-center text-[color:var(--color-text-primary)]">이메일로 회원가입</h1>
        </div>

        <div className="relative -mx-6 flex w-[calc(100%+3rem)] justify-center overflow-hidden">
          <Image
            src="/images/signupImg.png"
            alt="회원가입 안내 이미지"
            width={448}
            height={247}
            priority
            className="h-auto w-[116%] max-w-none object-cover"
          />
        </div>

        <div className="flex w-full max-w-80 flex-col items-center gap-2">
          <p className="typo-body-md text-center text-[color:var(--color-text-tertiary)]">
            AI 위원회와 함께 투자의 궁금증을 해결해보세요.
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex w-full max-w-80 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">이메일</span>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="example@email.com"
                  autoComplete="email"
                  className={`${formInputClassName} pr-24`}
                />
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={!isRequestButtonReady || Boolean(activeAction)}
                  className={isRequestButtonReady ? activeCodeButtonClassName : inactiveCodeButtonClassName}
                >
                  {isSendingCode ? "요청 중" : "인증요청"}
                </button>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  placeholder="인증코드 입력"
                  disabled={!isCodeRequested}
                  className={`${formInputClassName} ${disabledInputClassName} pr-20`}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={!isVerifyButtonReady || isCodeVerified || Boolean(activeAction)}
                  className={isVerifyButtonReady ? activeCodeButtonClassName : inactiveCodeButtonClassName}
                >
                  {isVerifyingCode ? "확인 중" : isCodeVerified ? "확인완료" : "확인"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">닉네임</span>
            <Input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="사용하실 닉네임을 입력해주세요"
              maxLength={20}
              className={formInputClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">비밀번호</span>
            <div className="flex flex-col gap-3">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                autoComplete="new-password"
                className={formInputClassName}
              />
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="비밀번호를 다시 한 번 입력해주세요"
                autoComplete="new-password"
                className={formInputClassName}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={Boolean(activeAction)}
            className="typo-body-lg min-h-14 rounded-xl border-transparent bg-[color:var(--color-text-interactive-primary)] px-4 py-4 text-center font-semibold text-[color:var(--color-text-interactive-inverse)]"
          >
            {isSubmitting ? "가입 처리 중..." : "동의하고 가입 완료하기"}
          </Button>

          <p className="typo-body-xs text-center text-[color:var(--color-text-tertiary)]">
            가입 시 <span className="underline underline-offset-2">이용약관</span> 및{" "}
            <span className="underline underline-offset-2">개인정보 처리방침</span>에 동의하게 됩니다.
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}
