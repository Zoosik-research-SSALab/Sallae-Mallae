"use client";

type Props = {
  valid: boolean;
};

export default function PasswordValidationStatusIcon({ valid }: Props) {
  if (valid) {
    return (
      <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center text-[color:var(--color-text-success-bold)]">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
          <path d="M3.5 8 6.5 11 12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center text-[color:var(--color-text-danger)]">
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
        <path d="M5 5 11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11 5 5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}
