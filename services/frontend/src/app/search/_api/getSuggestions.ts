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

  const response = await fetch(`/api/v1/search/suggestions?keyword=${encodeURIComponent(keyword)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`검색 제안 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<Suggestion[]>;
  return payload.data ?? [];
}
