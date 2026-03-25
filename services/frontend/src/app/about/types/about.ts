export type ProblemAccentTone = "dark" | "light" | "card";

export type ProblemSection = {
  eyebrow: string;
  title: string;
  description: string;
  accentTone: ProblemAccentTone;
};

export type AboutAgent = {
  name: string;
  title: string;
  description: string;
  image: string;
  accentClassName: string;
  reverse: boolean;
};

export type PortfolioStat = {
  label: string;
  value: string;
  tone: string;
};
