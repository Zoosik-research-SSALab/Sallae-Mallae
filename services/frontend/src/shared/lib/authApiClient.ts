import { getOrCreateAuthDeviceId } from "@/shared/lib/authDevice";
import { apiFetch, resolveApiUrl, type ApiRequestOptions } from "@/shared/lib/apiClient";
import { readAccessToken } from "@/shared/lib/authStore";
import { camelizeKeys } from "@/shared/utils/case";

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

type ConnectAuthSseOptions<TPayload> = {
  onMessage: (payload: TPayload) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  useBaseUrl?: boolean;
  credentials?: RequestCredentials;
};

export function connectAuthSse<TPayload>(url: string, options: ConnectAuthSseOptions<TPayload>) {
  const controller = new AbortController();
  const headers = new Headers({
    Accept: "text/event-stream",
    "X-Device-Id": getOrCreateAuthDeviceId(),
  });
  const accessToken = readAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  void (async () => {
    try {
      const response = await fetch(resolveApiUrl(url, options.useBaseUrl), {
        method: "GET",
        headers,
        cache: "no-store",
        credentials: options.credentials ?? "include",
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        options.onError?.(new Event("error"));
        return;
      }

      options.onOpen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const dataLines = event
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart());

          if (dataLines.length === 0) {
            continue;
          }

          try {
            const payload = camelizeKeys<TPayload>(JSON.parse(dataLines.join("\n")) as unknown);
            options.onMessage(payload);
          } catch {
            // Ignore malformed SSE payloads so the stream can continue.
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      options.onError?.(new Event("error"));
    }
  })();

  return () => {
    controller.abort();
  };
}
