import type { TermsAgreementItem } from "@/shared/types/auth";
import type { PolicyKind } from "@/shared/types/policy";

export const REQUIRED_SIGNUP_TERMS: TermsAgreementItem[] = [
  { termsId: 1, title: "서비스 이용약관", required: true },
  { termsId: 2, title: "개인정보 처리방침", required: true },
  { termsId: 3, title: "투자 면책 고지", required: true },
];

const policyKindByTermsId: Record<number, PolicyKind> = {
  1: "terms",
  2: "privacy",
  3: "disclaimer",
};

export function getPolicyKindByTermsId(termsId: number): PolicyKind | null {
  return policyKindByTermsId[termsId] ?? null;
}
