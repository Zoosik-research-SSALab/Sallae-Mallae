"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import PolicyDetailModal from "@/app/auth/signup/components/PolicyDetailModal";
import { getPolicyKindByTermsId, REQUIRED_SIGNUP_TERMS } from "@/app/auth/signup/components/policyTerms";
import RequiredTermsSection from "@/app/auth/signup/components/RequiredTermsSection";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { checkEmailAvailability, sendEmailCode, signupWithEmail, verifyEmailCode } from "@/shared/lib/authApi";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";
import { validatePasswordConfirmation, validatePasswordPolicy } from "@/shared/lib/passwordValidation";
import type { PolicyKind } from "@/shared/types/policy";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PasswordValidationStatusIcon from "@/shared/ui/PasswordValidationStatusIcon";

type Props = {
  showCloseButton?: boolean;
  onClose?: () => void;
  onAuthenticated?: () => void;
};

type AgreementState = Record<number, boolean>;

const EMAIL_CODE_DURATION_SECONDS = 5 * 60;

const formInputClassName =
  "typo-body-md !rounded-lg !border-[color:var(--color-border-secondary)] !bg-[color:var(--color-bg-secondary)] !px-4 !py-4 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:!border-[color:var(--color-border-interactive-primary)] focus-visible:!ring-[color:var(--color-bg-interactive-primary)]/10";
const disabledInputClassName =
  "disabled:cursor-not-allowed disabled:!border-[color:var(--color-border-secondary)] disabled:!bg-[color:var(--color-bg-secondary)] disabled:text-[color:var(--color-text-tertiary)] disabled:opacity-100";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createInitialAgreements() {
  return REQUIRED_SIGNUP_TERMS.reduce<AgreementState>((state, item) => {
    state[item.termsId] = false;
    return state;
  }, {});
}

export default function SignupCard({ showCloseButton = false, onClose, onAuthenticated }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreements, setAgreements] = useState<AgreementState>(() => createInitialAgreements());
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [isCodeRequested, setIsCodeRequested] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [remainingVerificationSeconds, setRemainingVerificationSeconds] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeAction, setActiveAction] = useState<"sendCode" | "verifyCode" | "signup" | null>(null);
  const [activePolicyKind, setActivePolicyKind] = useState<PolicyKind | null>(null);
  const [activeTermsId, setActiveTermsId] = useState<number | null>(null);

  const isSendingCode = activeAction === "sendCode";
  const isVerifyingCode = activeAction === "verifyCode";
  const isSubmitting = activeAction === "signup";
  const isEmailReady = isValidEmail(email.trim().toLowerCase());
  const isVerificationCodeReady = verificationCode.trim().length === 6;
  const isRequestButtonReady = isEmailReady;
  const isVerifyButtonReady = isCodeRequested && isVerificationCodeReady && remainingVerificationSeconds > 0;
  const allRequiredChecked = REQUIRED_SIGNUP_TERMS.every((item) => agreements[item.termsId]);
  const passwordError = useMemo(
    () =>
      submitAttempted || password.length > 0
        ? validatePasswordPolicy(password, email, {
            requiredMessage: "비밀번호를 입력해 주세요.",
          })
        : null,
    [email, password, submitAttempted],
  );
  const passwordConfirmError = useMemo(
    () =>
      submitAttempted || passwordConfirm.length > 0
        ? validatePasswordConfirmation(password, passwordConfirm, {
            requiredMessage: "비밀번호 확인을 입력해 주세요.",
            mismatchMessage: "비밀번호가 서로 일치하지 않습니다.",
          })
        : null,
    [password, passwordConfirm, submitAttempted],
  );
  const inactiveCodeButtonClassName =
    "absolute right-2 top-1/2 min-h-0 -translate-y-1/2 rounded-lg border border-transparent bg-[color:var(--color-bg-interactive-secondary-pressed)] px-3 py-2 text-xs font-bold text-[color:var(--color-text-interactive-secondary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-pressed)] disabled:cursor-not-allowed disabled:opacity-60";
  const activeCodeButtonClassName =
    "absolute right-2 top-1/2 min-h-0 -translate-y-1/2 rounded-lg border border-transparent bg-[color:var(--color-text-interactive-primary)] px-3 py-2 text-xs font-bold text-[color:var(--color-text-interactive-inverse)] transition-colors hover:bg-[color:var(--color-text-interactive-primary)] disabled:cursor-not-allowed disabled:opacity-100";
  const helperTextClassName = "mt-2 text-xs leading-4 font-medium";
  const showPasswordStatus = submitAttempted || password.length > 0;
  const showPasswordConfirmStatus = submitAttempted || passwordConfirm.length > 0;

  const resetVerificationState = () => {
    setIsCodeRequested(false);
    setVerificationCode("");
    setVerificationToken(null);
    setIsCodeVerified(false);
    setRemainingVerificationSeconds(0);
  };

  useEffect(() => {
    if (!isCodeRequested || isCodeVerified || remainingVerificationSeconds <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRemainingVerificationSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isCodeRequested, isCodeVerified, remainingVerificationSeconds]);

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

  const handleOpenRequiredTerm = (termsId: number) => {
    const policyKind = getPolicyKindByTermsId(termsId);
    if (!policyKind) {
      return;
    }

    setActiveTermsId(termsId);
    setActivePolicyKind(policyKind);
  };

  const handleAgreePolicy = () => {
    if (activeTermsId === null) {
      return;
    }

    setAgreements((current) => ({
      ...current,
      [activeTermsId]: true,
    }));
    setActiveTermsId(null);
    setActivePolicyKind(null);
  };

  const handleClosePolicyModal = () => {
    setActiveTermsId(null);
    setActivePolicyKind(null);
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
        window.alert("이미 가입한 이메일입니다.");
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
      setRemainingVerificationSeconds(EMAIL_CODE_DURATION_SECONDS);
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

    if (remainingVerificationSeconds <= 0) {
      window.alert("인증코드 유효시간이 만료되었습니다. 다시 요청해 주세요.");
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
      setRemainingVerificationSeconds(0);
      window.alert("이메일 인증이 완료되었습니다.");
    } catch (error) {
      setVerificationToken(null);
      setIsCodeVerified(false);
      window.alert(getAuthErrorMessage(error, "이메일 인증에 실패했습니다."));
    } finally {
      setActiveAction(null);
    }
  };

  const verificationMinutes = Math.floor(remainingVerificationSeconds / 60);
  const verificationSeconds = remainingVerificationSeconds % 60;
  const verificationCountdownLabel = `${verificationMinutes}:${verificationSeconds.toString().padStart(2, "0")}`;
  const requestCodeButtonLabel = isSendingCode
    ? "요청 중"
    : isCodeVerified
      ? "인증완료"
      : isCodeRequested
        ? "재요청"
        : "인증요청";

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);

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
      window.alert("닉네임은 2자 이상 20자 이하로 입력해 주세요.");
      return;
    }

    if (
      validatePasswordPolicy(password, email, {
        requiredMessage: "비밀번호를 입력해 주세요.",
      })
    ) {
      window.alert("비밀번호 입력값을 다시 확인해 주세요.");
      return;
    }

    if (
      validatePasswordConfirmation(password, passwordConfirm, {
        requiredMessage: "비밀번호 확인을 입력해 주세요.",
        mismatchMessage: "비밀번호가 서로 일치하지 않습니다.",
      })
    ) {
      window.alert("비밀번호 확인 값을 다시 확인해 주세요.");
      return;
    }

    if (!allRequiredChecked) {
      window.alert("필수 약관에 모두 동의해 주세요.");
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
        emailOptIn,
        agreements: REQUIRED_SIGNUP_TERMS.map((item) => ({
          termsId: item.termsId,
          agreed: Boolean(agreements[item.termsId]),
        })),
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
    <>
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
                AI 위원회가 알려주는 투자 정보를 빠르게 받아보세요.
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
                      disabled={!isRequestButtonReady || Boolean(activeAction) || isCodeVerified}
                      className={isRequestButtonReady ? activeCodeButtonClassName : inactiveCodeButtonClassName}
                    >
                      {requestCodeButtonLabel}
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
                      className={`${formInputClassName} ${disabledInputClassName} pr-32`}
                    />
                    {isCodeRequested && !isCodeVerified ? (
                      <div className="pointer-events-none absolute right-[4.75rem] top-1/2 -translate-y-1/2 text-xs font-semibold text-[color:var(--color-text-tertiary)]">
                        {verificationCountdownLabel}
                      </div>
                    ) : null}
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
                  placeholder="서비스에서 사용할 닉네임을 입력해주세요"
                  maxLength={20}
                  className={formInputClassName}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">비밀번호</span>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="relative">
                      <Input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="비밀번호를 입력해 주세요"
                        autoComplete="new-password"
                        className={`${formInputClassName} pr-12`}
                      />
                      {showPasswordStatus ? (
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                          <PasswordValidationStatusIcon valid={!passwordError} />
                        </div>
                      ) : null}
                    </div>
                    {passwordError ? (
                      <p className={`${helperTextClassName} text-[color:var(--color-text-danger)]`}>{passwordError}</p>
                    ) : !showPasswordStatus ? (
                      <p className={`${helperTextClassName} text-[color:var(--color-text-tertiary)]`}>
                        8~20자, 영문/숫자/특수문자를 포함해야 합니다.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <div className="relative">
                      <Input
                        type="password"
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                        placeholder="비밀번호를 다시 한 번 입력해주세요"
                        autoComplete="new-password"
                        className={`${formInputClassName} pr-12`}
                      />
                      {showPasswordConfirmStatus ? (
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                          <PasswordValidationStatusIcon valid={!passwordConfirmError} />
                        </div>
                      ) : null}
                    </div>
                    {passwordConfirmError ? (
                      <p className={`${helperTextClassName} text-[color:var(--color-text-danger)]`}>{passwordConfirmError}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <RequiredTermsSection
                items={REQUIRED_SIGNUP_TERMS}
                agreements={agreements}
                onOpenTerm={(term) => handleOpenRequiredTerm(term.termsId)}
              />

              <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-border-primary)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(event) => setEmailOptIn(event.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-[color:var(--color-border-primary)] accent-[color:var(--color-bg-interactive-primary)]"
                />
                <div className="flex flex-col gap-1">
                  <span className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">이벤트 및 혜택 안내 이메일 수신</span>
                  <span className="typo-body-xs text-[color:var(--color-text-tertiary)]">
                    선택 항목이며 동의하지 않아도 회원가입은 진행됩니다.
                  </span>
                </div>
              </label>

              <Button
                type="submit"
                variant="primary"
                disabled={Boolean(activeAction)}
                className="typo-body-lg min-h-14 rounded-xl border-transparent bg-[color:var(--color-text-interactive-primary)] px-4 py-4 text-center font-semibold text-[color:var(--color-text-interactive-inverse)]"
              >
                {isSubmitting ? "가입 처리 중..." : "동의하고 가입 완료하기"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <PolicyDetailModal
        open={Boolean(activePolicyKind)}
        policyKind={activePolicyKind}
        onClose={handleClosePolicyModal}
        onAgree={handleAgreePolicy}
      />
    </>
  );
}
