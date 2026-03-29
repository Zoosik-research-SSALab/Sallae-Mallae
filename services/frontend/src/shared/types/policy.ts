export type PolicyKind = "terms" | "privacy" | "disclaimer";

export type PolicyDetail = {
  id: number;
  termType: string;
  version: string;
  title: string;
  content: string;
  isRequired: boolean;
  enforcedAt: string;
};
