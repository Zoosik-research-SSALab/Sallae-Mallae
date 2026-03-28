"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { validatePasswordConfirmation, validatePasswordPolicy } from "@/shared/lib/passwordValidation";
import Input from "@/shared/ui/Input";
import CloseIcon from "@/shared/ui/CloseIcon";
import PasswordValidationStatusIcon from "@/shared/ui/PasswordValidationStatusIcon";

type PasswordChangePayload = {
  currentPassword: string;
  newPassword: string;
};

type Props = {
  open: boolean;
  email: string | null;
  onClose: () => void;
  onSave: (payload: PasswordChangePayload) => void | Promise<void>;
};

const formInputClassName =
  "typo-body-md !rounded-lg !border-[color:var(--color-border-secondary)] !bg-[color:var(--color-bg-secondary)] !px-4 !py-4 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:!border-[color:var(--color-border-interactive-primary)] focus-visible:!ring-[color:var(--color-bg-interactive-primary)]/10";
const requiredNewPasswordMessage = "새 비밀번호를 입력해 주세요.";
const requiredNewPasswordConfirmMessage = "새 비밀번호 확인을 입력해 주세요.";
const newPasswordMismatchMessage = "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.";

export default function PasswordChangeModal({ open, email, onClose, onSave }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setSubmitAttempted(false);
    setIsSaving(false);
    setSubmissionError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const newPasswordError = useMemo(
    () =>
      submitAttempted || newPassword.length > 0
        ? validatePasswordPolicy(newPassword, email, {
            requiredMessage: requiredNewPasswordMessage,
          })
        : null,
    [email, newPassword, submitAttempted],
  );

  const newPasswordConfirmError = useMemo(
    () =>
      submitAttempted || newPasswordConfirm.length > 0
        ? validatePasswordConfirmation(newPassword, newPasswordConfirm, {
            requiredMessage: requiredNewPasswordConfirmMessage,
            mismatchMessage: newPasswordMismatchMessage,
          })
        : null,
    [newPassword, newPasswordConfirm, submitAttempted],
  );

  if (!open) {
    return null;
  }

  const canSubmit = !isSaving && currentPassword.length > 0 && !newPasswordError && !newPasswordConfirmError;
  const helperTextClassName = "mt-2 text-xs leading-4 font-medium";
  const showNewPasswordStatus = submitAttempted || newPassword.length > 0;
  const showNewPasswordConfirmStatus = submitAttempted || newPasswordConfirm.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmissionError(null);

    const hasError = currentPassword.length === 0 || Boolean(newPasswordError) || Boolean(newPasswordConfirmError);

    if (hasError || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        currentPassword,
        newPassword,
      });
    } catch (error) {
      setSubmissionError(getAuthErrorMessage(error, "비밀번호 변경에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button
        type="button"
        aria-label="비밀번호 변경 모달 닫기"
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

        <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
          <div className="flex justify-center">
            <h2 className="text-center text-2xl leading-7 font-extrabold text-[color:var(--color-text-primary)]">
              비밀번호 변경
            </h2>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="current-password" className="w-full text-sm leading-5 font-semibold text-[color:var(--color-text-secondary)]">
                현재 비밀번호
              </label>
              <div className="relative">
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="현재 비밀번호를 입력해 주세요."
                  autoComplete="current-password"
                  className={formInputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="w-full text-sm leading-5 font-semibold text-[color:var(--color-text-secondary)]">
                새 비밀번호
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="새 비밀번호를 입력해 주세요."
                  autoComplete="new-password"
                  className={`${formInputClassName} pr-12`}
                />
                {showNewPasswordStatus ? (
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <PasswordValidationStatusIcon valid={!newPasswordError} />
                  </div>
                ) : null}
              </div>
              {newPasswordError ? (
                <p className={`${helperTextClassName} text-[color:var(--color-text-danger)]`}>{newPasswordError}</p>
              ) : !showNewPasswordStatus ? (
                <p className={`${helperTextClassName} text-[color:var(--color-text-tertiary)]`}>
                  8~20자, 영문/숫자/특수문자를 포함해야 합니다.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="new-password-confirm" className="w-full text-sm leading-5 font-semibold text-[color:var(--color-text-secondary)]">
                새 비밀번호 확인
              </label>
              <div className="relative">
                <Input
                  id="new-password-confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  placeholder="새 비밀번호를 다시 입력해 주세요."
                  autoComplete="new-password"
                  className={`${formInputClassName} pr-12`}
                />
                {showNewPasswordConfirmStatus ? (
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <PasswordValidationStatusIcon valid={!newPasswordConfirmError} />
                  </div>
                ) : null}
              </div>
              {newPasswordConfirmError ? (
                <p className={`${helperTextClassName} text-[color:var(--color-text-danger)]`}>{newPasswordConfirmError}</p>
              ) : null}
            </div>

            {submissionError ? (
              <div className="rounded-lg bg-[color:var(--color-bg-danger-subtle)] px-4 py-3 text-sm leading-5 font-semibold text-[color:var(--color-text-danger)]">
                {submissionError}
              </div>
            ) : null}
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
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-lg bg-[color:var(--color-bg-inverse-bolder)] px-4 py-4 text-base leading-6 font-semibold text-[color:var(--color-text-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "변경 중..." : "변경하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
