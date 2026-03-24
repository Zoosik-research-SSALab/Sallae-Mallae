import { getOrCreateAuthDeviceId } from "@/shared/lib/authDevice";
import { apiFetch, connectSse, type ApiRequestOptions } from "@/shared/lib/apiClient";
import { readAccessToken } from "@/shared/lib/authStore";

type AuthApiRequestOptions<TBody> = Omit<ApiRequestOptions<TBody>, "withAuth">;
type AuthSseOptions<TPayload> = {
  onMessage: (payload: TPayload) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  useBaseUrl?: boolean;
  reconnect?: boolean;
  reconnectDelayMs?: number;
  reconnectMaxDelayMs?: number;
};

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

export function connectAuthSse<TPayload>(url: string, options: AuthSseOptions<TPayload>) {
  const headers = new Headers();
  const accessToken = readAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (typeof document !== "undefined" && !headers.has("X-Device-Id")) {
    headers.set("X-Device-Id", getOrCreateAuthDeviceId());
  }

  return connectSse<TPayload>(url, {
    ...options,
    headers,
    credentials: "include",
  });
}
