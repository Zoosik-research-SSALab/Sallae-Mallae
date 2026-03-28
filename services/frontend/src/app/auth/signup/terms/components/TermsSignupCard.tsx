"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import PolicyDetailModal from "@/app/auth/signup/components/PolicyDetailModal";
import { getPolicyKindForTermsItem } from "@/app/auth/signup/components/policyTerms";
import RequiredTermsSection from "@/app/auth/signup/components/RequiredTermsSection";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { completeSocialSignup } from "@/shared/lib/authApi";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";
import {
  clearPendingSocialSignup,
  type PendingSocialSignup,
  readPendingSocialSignup,
} from "@/shared/lib/socialAuth";
import type { TermsAgreementItem } from "@/shared/types/auth";
import type { PolicyKind } from "@/shared/types/policy";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

type AgreementState = Record<number, boolean>;

type TermsSignupCardProps = {
  showCloseButton?: boolean;
  onClose?: () => void;
  onCompleted?: () => void;
};

type TermsSignupModalProps = {
  open: boolean;
  onClose: () => void;
};

const inputClassName =
  "typo-body-md !rounded-lg !border-[color:var(--color-border-secondary)] !bg-[color:var(--color-bg-secondary)] !px-4 !py-4 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:!border-[color:var(--color-border-interactive-primary)] focus-visible:!ring-[color:var(--color-bg-interactive-primary)]/10";

function getProviderLabel(provider: string) {
  switch (provider.toUpperCase()) {
    case "KAKAO":
      return "카카오";
    case "GOOGLE":
      return "Google";
    case "NAVER":
      return "네이버";
    default:
      return provider;
  }
}

function createAgreementState(payload: PendingSocialSignup): AgreementState {
  return [...payload.requiredTerms, ...payload.optionalTerms].reduce<AgreementState>((state, item) => {
    state[item.termsId] = false;
    return state;
  }, {});
}

function clearPendingSignupAndRun(callback?: () => void) {
  clearPendingSocialSignup();
  callback?.();
}

export default function TermsSignupCard({
  showCloseButton = false,
  onClose,
  onCompleted,
}: TermsSignupCardProps) {
  const router = useRouter();
  const [pendingSignup, setPendingSignup] = useState<PendingSocialSignup | null>(null);
  const [nickname, setNickname] = useState("");
  const [agreements, setAgreements] = useState<AgreementState>({});
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePolicyKind, setActivePolicyKind] = useState<PolicyKind | null>(null);
  const [activeTermsId, setActiveTermsId] = useState<number | null>(null);

  useEffect(() => {
    const payload = readPendingSocialSignup();

    if (!payload) {
      if (onClose) {
        onClose();
        return;
      }

      router.replace("/auth/login");
      return;
    }

    setPendingSignup(payload);
    setAgreements(createAgreementState(payload));
  }, [onClose, router]);

  const requiredTerms = pendingSignup?.requiredTerms ?? [];
  const optionalTerms = pendingSignup?.optionalTerms ?? [];
  const allTerms = [...requiredTerms, ...optionalTerms];
  const allRequiredChecked = requiredTerms.every((item) => agreements[item.termsId]);

  const optionalTermsWithNoPolicy = optionalTerms.filter((item) => !getPolicyKindForTermsItem(item));

  const handleOpenRequiredTerm = (term: TermsAgreementItem) => {
    const policyKind = getPolicyKindForTermsItem(term);

    if (!policyKind) {
      setAgreements((current) => ({
        ...current,
        [term.termsId]: !current[term.termsId],
      }));
      return;
    }

    setActiveTermsId(term.termsId);
    setActivePolicyKind(policyKind);
  };

  const handleAgreePolicy = useCallback(() => {
    if (activeTermsId === null) {
      return;
    }

    setAgreements((current) => ({
      ...current,
      [activeTermsId]: true,
    }));
    setActivePolicyKind(null);
    setActiveTermsId(null);
  }, [activeTermsId]);

  const handleClosePolicyModal = useCallback(() => {
    setActivePolicyKind(null);
    setActiveTermsId(null);
  }, []);

  const handleCancel = () => {
    if (onClose) {
      clearPendingSignupAndRun(onClose);
      return;
    }

    clearPendingSocialSignup();
    router.replace("/auth/login");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingSignup || isSubmitting) {
      return;
    }

    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      window.alert("닉네임은 2자 이상 20자 이하로 입력해 주세요.");
      return;
    }

    if (!allRequiredChecked) {
      window.alert("필수 약관에 모두 동의해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await completeSocialSignup({
        tempToken: pendingSignup.tempToken,
        nickname: trimmedNickname,
        emailOptIn,
        agreements: allTerms.map((item) => ({
          termsId: item.termsId,
          agreed: Boolean(agreements[item.termsId]),
        })),
      });

      clearPendingSocialSignup();
      writeAuthPersistenceMode(true);
      useAuthStore.getState().applyAuthSession(response);

      if (onCompleted) {
        onCompleted();
        return;
      }

      router.replace("/");
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "소셜 회원가입 처리에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="relative flex w-full max-w-[30rem] flex-col gap-6 rounded-[28px] bg-[color:var(--color-bg-primary)] px-6 py-7 shadow-[0px_18px_40px_rgba(0,0,0,0.12)] sm:px-8">
        {showCloseButton ? (
          <div className="pointer-events-none absolute right-3 top-4 z-10">
            <button
              type="button"
              onClick={handleCancel}
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

        <div className="flex flex-col gap-2">
          <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">소셜 회원가입</span>
          <h1 className="typo-heading-md text-[color:var(--color-text-primary)]">약관 동의를 완료해주세요.</h1>
          <p className="typo-body-md text-[color:var(--color-text-secondary)]">
            소셜 계정 정보를 확인했습니다. 필수 약관 동의와 닉네임 입력을 완료하면 바로 서비스를 사용할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl bg-[color:var(--color-bg-secondary)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">이메일</span>
            <span className="typo-body-sm text-[color:var(--color-text-primary)]">{pendingSignup?.email ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">연결 계정</span>
            <span className="typo-body-sm text-[color:var(--color-text-primary)]">
              {pendingSignup ? getProviderLabel(pendingSignup.provider) : "-"}
            </span>
          </div>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">닉네임</span>
            <Input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="서비스에서 사용할 닉네임을 입력해주세요"
              maxLength={20}
              className={inputClassName}
            />
          </label>

          <RequiredTermsSection items={requiredTerms} agreements={agreements} onOpenTerm={handleOpenRequiredTerm} />

          {optionalTermsWithNoPolicy.length > 0 ? (
            <div className="flex flex-col gap-3">
              <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">선택 약관</span>
              <div className="flex flex-col gap-2">
                {optionalTermsWithNoPolicy.map((item) => (
                  <label
                    key={item.termsId}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-border-primary)] px-4 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{item.title}</span>
                      <span className="typo-body-xs text-[color:var(--color-text-tertiary)]">선택</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(agreements[item.termsId])}
                      onChange={() =>
                        setAgreements((current) => ({
                          ...current,
                          [item.termsId]: !current[item.termsId],
                        }))
                      }
                      className="h-5 w-5 rounded border-[color:var(--color-border-primary)] accent-[color:var(--color-bg-interactive-primary)]"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

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

          <div className="flex gap-3">
            <Button type="button" variant="soft" className="min-h-12 flex-1 rounded-2xl" onClick={handleCancel}>
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="min-h-12 flex-1 rounded-2xl border-transparent bg-[color:var(--color-bg-interactive-primary)] text-[color:var(--color-text-interactive-inverse)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "가입 처리 중..." : "가입 완료"}
            </Button>
          </div>
        </form>
      </section>

      <PolicyDetailModal
        open={Boolean(activePolicyKind)}
        policyKind={activePolicyKind}
        onClose={handleClosePolicyModal}
        onAgree={handleAgreePolicy}
      />
    </>
  );
}

export function TermsSignupModal({ open, onClose }: TermsSignupModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleClose = () => {
      clearPendingSignupAndRun(onClose);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
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

  const handleClose = () => {
    clearPendingSignupAndRun(onClose);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button
        type="button"
        aria-label="약관 동의 모달 닫기"
        onClick={handleClose}
        className="fixed inset-0 bg-black/56 backdrop-blur-[2px]"
      />
      <div className="relative z-[1] flex w-full items-center justify-center">
        <div className="relative w-full max-w-[30rem]">
          <TermsSignupCard showCloseButton onClose={handleClose} onCompleted={onClose} />
        </div>
      </div>
    </div>
  );
}
