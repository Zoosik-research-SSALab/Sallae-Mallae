import type { ReportResponse, ReportItem } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };

// Backend nests chairman as chairman.chairman; flatten it
function flattenReportItem(r: Record<string, unknown>): ReportItem {
  const chairmanWrapper = r.chairman as Record<string, unknown> | undefined;
  const innerChairman = chairmanWrapper?.chairman ?? chairmanWrapper;
  return {
    date: (r.date as string) ?? "",
    chairman: innerChairman as ReportItem["chairman"],
    finalStances: (chairmanWrapper?.finalStances ?? r.finalStances ?? []) as ReportItem["finalStances"],
    createdAt: (chairmanWrapper?.createdAt ?? r.createdAt ?? "") as string,
    debate: (r.debate ?? { rounds: [] }) as ReportItem["debate"],
  };
}

function normalizeReportResponse(raw: unknown): ReportResponse {
  // Backend returns array directly
  if (Array.isArray(raw)) {
    return { reports: raw.map((r) => flattenReportItem(r as Record<string, unknown>)) };
  }

  // Single object
  if (typeof raw === "object" && raw !== null) {
    return { reports: [flattenReportItem(raw as Record<string, unknown>)] };
  }

  return { reports: [] };
}

export async function getStockReport(
  stockId: string,
  offset?: number,
  limit?: number,
): Promise<ReportResponse> {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${stockId}${query ? `?${query}` : ""}`;

  const response = await apiFetch<ApiEnvelope<unknown> | unknown>(url, {
    cache: "no-store",
    withAuth: true,
  });

  // Unwrap envelope
  const unwrapped =
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "success" in response
      ? (response as ApiEnvelope<unknown>).data
      : response;

  return normalizeReportResponse(unwrapped);
}
