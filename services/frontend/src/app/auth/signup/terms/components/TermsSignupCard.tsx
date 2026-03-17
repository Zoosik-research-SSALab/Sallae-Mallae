"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { completeSocialSignup } from "@/shared/lib/authApi";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";
import {
  clearPendingSocialSignup,
  type PendingSocialSignup,
  readPendingSocialSignup,
} from "@/shared/lib/socialAuth";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

type AgreementState = Record<number, boolean>;

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

export default function TermsSignupCard() {
  const router = useRouter();
  const [pendingSignup, setPendingSignup] = useState<PendingSocialSignup | null>(null);
  const [nickname, setNickname] = useState("");
  const [agreements, setAgreements] = useState<AgreementState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const payload = readPendingSocialSignup();

    if (!payload) {
      router.replace("/auth/login");
      return;
    }

    setPendingSignup(payload);
    setAgreements(createAgreementState(payload));
  }, [router]);

  const requiredTerms = pendingSignup?.requiredTerms ?? [];
  const optionalTerms = pendingSignup?.optionalTerms ?? [];
  const allRequiredChecked = requiredTerms.every((item) => agreements[item.termsId]);

  const toggleAgreement = (termsId: number) => {
    setAgreements((current) => ({
      ...current,
      [termsId]: !current[termsId],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingSignup || isSubmitting) {
      return;
    }

    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      window.alert("닉네임은 2자 이상 20자 이하로 입력해주세요.");
      return;
    }

    if (!allRequiredChecked) {
      window.alert("필수 약관에 모두 동의해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await completeSocialSignup(
        {
          nickname: trimmedNickname,
          agreements: [...requiredTerms, ...optionalTerms].map((item) => ({
            termsId: item.termsId,
            agreed: Boolean(agreements[item.termsId]),
          })),
        },
        pendingSignup.tempToken,
      );

      clearPendingSocialSignup();
      writeAuthPersistenceMode(true);
      useAuthStore.getState().applyAuthSession(response);
      router.replace("/");
    } catch (error) {
      window.alert(getAuthErrorMessage(error, "약관 동의 처리에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex w-full max-w-[30rem] flex-col gap-6 rounded-[28px] bg-[color:var(--color-bg-primary)] px-6 py-7 shadow-[0px_18px_40px_rgba(0,0,0,0.12)] sm:px-8">
      <div className="flex flex-col gap-2">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">신규 회원 가입</span>
        <h1 className="typo-heading-md text-[color:var(--color-text-primary)]">약관 동의 후 가입을 완료해주세요.</h1>
        <p className="typo-body-md text-[color:var(--color-text-secondary)]">
          소셜 로그인 정보가 확인되었습니다. 필수 약관 동의와 닉네임 입력만 마치면 바로 시작할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl bg-[color:var(--color-bg-secondary)] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">이메일</span>
          <span className="typo-body-sm text-[color:var(--color-text-primary)]">{pendingSignup?.email ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">소셜 계정</span>
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">필수 약관</span>
            <span className="typo-body-xs text-[color:var(--color-text-tertiary)]">모두 동의해야 가입이 완료됩니다.</span>
          </div>
          <div className="flex flex-col gap-2">
            {requiredTerms.map((item) => (
              <label
                key={item.termsId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-border-primary)] px-4 py-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{item.title}</span>
                  <span className="typo-body-xs text-[color:var(--color-text-tertiary)]">필수</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(agreements[item.termsId])}
                  onChange={() => toggleAgreement(item.termsId)}
                  className="h-5 w-5 rounded border-[color:var(--color-border-primary)] accent-[color:var(--color-bg-interactive-primary)]"
                />
              </label>
            ))}
          </div>
        </div>

        {optionalTerms.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">선택 약관</span>
            <div className="flex flex-col gap-2">
              {optionalTerms.map((item) => (
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
                    onChange={() => toggleAgreement(item.termsId)}
                    className="h-5 w-5 rounded border-[color:var(--color-border-primary)] accent-[color:var(--color-bg-interactive-primary)]"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="soft"
            className="min-h-12 flex-1 rounded-2xl"
            onClick={() => {
              clearPendingSocialSignup();
              router.replace("/auth/login");
            }}
          >
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
  );
}
