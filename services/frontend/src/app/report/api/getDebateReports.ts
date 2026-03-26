import { apiFetch } from "@/shared/lib/apiClient";
import type { DebateChairman, DebateFinalStance, DebateReportsResponse, DebateRoundDto } from "../types/debate";

interface DebateReportsUpstreamResponse {
  success: boolean;
  data: DebateReportUpstream[];
  error: string | null;
}

interface DebateReportUpstream {
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

export async function getDebateReports(stockId: string): Promise<DebateReportsResponse> {
  const payload = await apiFetch<DebateReportsUpstreamResponse>(`/api/report/${encodeURIComponent(stockId.trim())}`, {
    cache: "no-store",
    withAuth: true,
  });

  return {
    reports: (payload.data ?? []).map((report) => {
      const chairmanWrapper = report.chairman;

      return {
        date: report.date,
        chairman: chairmanWrapper?.chairman ?? {
          signal: "",
          confidence: 0,
          summary: "",
        },
        finalStances: chairmanWrapper?.finalStances ?? report.finalStances ?? [],
        createdAt: chairmanWrapper?.createdAt ?? report.createdAt ?? "",
        debate: {
          rounds: report.debate?.rounds ?? [],
        },
      };
    }),
  };
}
