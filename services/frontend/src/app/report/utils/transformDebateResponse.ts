import type {
  DebateChairman,
  DebateFinalStance,
  DebateReport,
  DebateRoundDto,
} from "../types/debate";

/**
 * Backend wraps chairman inside `chairman.chairman`.
 * This select transform flattens the nested structure into the frontend's DebateReport shape.
 */

interface UpstreamReport {
  date: string;
  chairman?: {
    chairman?: DebateChairman;
    finalStances?: DebateFinalStance[];
    createdAt?: string | null;
  };
  finalStances?: DebateFinalStance[];
  createdAt?: string | null;
  debate?: {
    rounds?: DebateRoundDto[];
  };
}

export function transformDebateResponse(raw: unknown): DebateReport[] {
  if (typeof raw !== "object" || raw === null) return [];

  const record = raw as Record<string, unknown>;
  const reports = Array.isArray(record.reports)
    ? record.reports
    : Array.isArray(raw)
      ? raw
      : [];

  return (reports as UpstreamReport[]).map((report) => {
    const wrapper = report.chairman;

    return {
      date: report.date,
      chairman: wrapper?.chairman ?? {
        signal: "",
        confidence: 0,
        summary: "",
      },
      finalStances: wrapper?.finalStances ?? report.finalStances ?? [],
      createdAt: wrapper?.createdAt ?? report.createdAt ?? "",
      debate: {
        rounds: report.debate?.rounds ?? [],
      },
    };
  });
}
