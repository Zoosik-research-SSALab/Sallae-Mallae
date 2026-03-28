import type { TermsAgreementItem } from "@/shared/types/auth";
import type { PolicyKind } from "@/shared/types/policy";

export const REQUIRED_SIGNUP_TERMS: TermsAgreementItem[] = [
  { termsId: 1, title: "서비스 이용약관", required: true },
  { termsId: 2, title: "개인정보 처리방침", required: true },
  { termsId: 3, title: "투자 면책 고지", required: true },
];

function normalizeTermTitle(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function getPolicyKindForTermsItem(term: Pick<TermsAgreementItem, "title"> | null | undefined): PolicyKind | null {
  if (!term) {
    return null;
  }

  const normalizedTitle = normalizeTermTitle(term.title);

  if (normalizedTitle.includes("서비스이용약관")) {
    return "terms";
  }

  if (normalizedTitle.includes("개인정보처리방침")) {
    return "privacy";
  }

  if (normalizedTitle.includes("투자면책고지")) {
    return "disclaimer";
  }

  return null;
}
