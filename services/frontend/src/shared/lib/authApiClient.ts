import { apiFetch, type ApiRequestOptions } from "@/shared/lib/apiClient";

type AuthApiRequestOptions<TBody> = Omit<ApiRequestOptions<TBody>, "withAuth">;

export function authApiFetch<TResponse, TBody = unknown>(
  url: string,
  options: AuthApiRequestOptions<TBody> = {},
) {
  return apiFetch<TResponse, TBody>(url, {
    ...options,
    withAuth: true,
  });
}
