import { apiFetch } from "@/shared/lib/apiClient";

export type Suggestion = {
  keyword: string;
  ticker: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getSuggestions(keyword: string): Promise<Suggestion[]> {
  if (!keyword.trim()) {
    return [];
  }

  const payload = await apiFetch<ApiResponse<Suggestion[]>>(`/api/v1/search/suggestions?keyword=${encodeURIComponent(keyword)}`, {
    cache: "no-store",
  });

  return payload.data ?? [];
}
