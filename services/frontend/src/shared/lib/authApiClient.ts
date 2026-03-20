import { getOrCreateAuthDeviceId } from "@/shared/lib/authDevice";
import { apiFetch, type ApiRequestOptions } from "@/shared/lib/apiClient";

type AuthApiRequestOptions<TBody> = Omit<ApiRequestOptions<TBody>, "withAuth">;

export function authApiFetch<TResponse, TBody = unknown>(
  url: string,
  options: AuthApiRequestOptions<TBody> = {},
) {
  const headers = new Headers(options.headers);

  if (typeof document !== "undefined" && !headers.has("X-Device-Id")) {
    headers.set("X-Device-Id", getOrCreateAuthDeviceId());
  }

  return apiFetch<TResponse, TBody>(url, {
    ...options,
    headers,
    withAuth: true,
  });
}
