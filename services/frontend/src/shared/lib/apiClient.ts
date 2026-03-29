import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";
import { readAccessToken } from "@/shared/lib/authStore";

export type ApiRequestOptions<TBody> = Omit<RequestInit, "body"> & {
  body?: TBody;
  useBaseUrl?: boolean;
  withAuth?: boolean;
};

type ApiMockingMode = "enabled" | "disabled";

function isJsonContentType(contentType: string | null) {
  return typeof contentType === "string" && contentType.includes("application/json");
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeApiPath(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

function joinApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = normalizeApiPath(path);

  if (normalizedBaseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${normalizedBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function getApiMockingMode(): ApiMockingMode {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK?.trim().toLowerCase();
  if (explicit === "true") {
    return "enabled";
  }

  if (explicit === "false") {
    return "disabled";
  }

  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();

  if (raw === "false" || raw === "disabled") {
    return "disabled";
  }

  if (raw === "true" || raw === "enabled") {
    return "enabled";
  }

  return "enabled";
}

export function shouldUseMockApiRouting() {
  return getApiMockingMode() === "enabled";
}

function getResolvedBaseUrl() {
  if (getApiMockingMode() === "disabled") {
    return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  }

  return process.env.NEXT_PUBLIC_MOCK_BASE_URL?.trim() ?? "/api";
}

export function resolveApiUrl(url: string, useBaseUrl = true) {
  if (!useBaseUrl || isAbsoluteUrl(url)) {
    return url;
  }

  const baseUrl = getResolvedBaseUrl();
  if (!baseUrl) {
    return url;
  }

  return joinApiUrl(baseUrl, url);
}

function createRequestBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData || body instanceof URLSearchParams || typeof body === "string") {
    return body;
  }

  return JSON.stringify(snakelizeKeys(body));
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type");

  if (isJsonContentType(contentType)) {
    const payload = (await response.json()) as unknown;
    return camelizeKeys(payload);
  }

  const text = await response.text();
  return text || null;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<TResponse, TBody = unknown>(url: string, options: ApiRequestOptions<TBody> = {}) {
  const { body, useBaseUrl = true, withAuth = false, ...requestInit } = options;
  const headers = new Headers(options.headers);
  const requestBody = createRequestBody(body);

  if (withAuth) {
    const accessToken = readAccessToken();
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  if (requestBody && !(requestBody instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveApiUrl(url, useBaseUrl), {
    ...requestInit,
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `API request failed: ${response.status} ${response.statusText}`;

    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type");

  if (!isJsonContentType(contentType)) {
    return undefined as TResponse;
  }

  const payload = (await response.json()) as unknown;
  return camelizeKeys<TResponse>(payload);
}

type ConnectSseOptions<TPayload> = {
  onMessage: (payload: TPayload) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  useBaseUrl?: boolean;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  reconnect?: boolean;
  reconnectDelayMs?: number;
  reconnectMaxDelayMs?: number;
};

function handleSseEvent<TPayload>(eventBlock: string, onMessage: (payload: TPayload) => void) {
  const lines = eventBlock.split("\n");
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const data = dataLines.join("\n");
  if (!data) {
    return;
  }

  try {
    const payload = camelizeKeys<TPayload>(JSON.parse(data) as unknown);
    onMessage(payload);
  } catch {
    // Ignore malformed SSE payloads so the stream can continue.
  }
}

export function connectSse<TPayload>(url: string, options: ConnectSseOptions<TPayload>) {
  const controller = new AbortController();
  const headers = new Headers(options.headers);
  const shouldReconnect = options.reconnect ?? true;
  const reconnectDelayMs = options.reconnectDelayMs ?? 6_000;
  const reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;

  if (!headers.has("Accept")) {
    headers.set("Accept", "text/event-stream");
  }

  const waitForReconnect = (delayMs: number) =>
    new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        resolve();
      }, delayMs);

      const cleanup = () => {
        controller.signal.removeEventListener("abort", handleAbort);
        window.clearTimeout(timer);
      };

      const handleAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };

      controller.signal.addEventListener("abort", handleAbort, { once: true });
    });

  void (async () => {
    let reconnectAttempt = 0;

    while (!controller.signal.aborted) {
      try {
        const response = await fetch(resolveApiUrl(url, options.useBaseUrl), {
          method: "GET",
          headers,
          cache: "no-store",
          credentials: options.credentials ?? "same-origin",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE request failed: ${response.status}`);
        }

        options.onOpen?.();
        reconnectAttempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            throw new Error("SSE stream closed");
          }

          buffer = `${buffer}${decoder.decode(value, { stream: true })}`.replace(/\r\n/g, "\n");
          const eventBlocks = buffer.split("\n\n");
          buffer = eventBlocks.pop() ?? "";

          eventBlocks.forEach((eventBlock) => handleSseEvent(eventBlock, options.onMessage));
        }
      } catch {
        if (controller.signal.aborted) {
          break;
        }

        options.onError?.(new Event("error"));

        if (!shouldReconnect) {
          break;
        }

        const delay = Math.min(reconnectDelayMs * (reconnectAttempt + 1), reconnectMaxDelayMs);
        reconnectAttempt += 1;

        try {
          await waitForReconnect(delay);
        } catch {
          break;
        }
      }
    }
  })();

  return () => {
    controller.abort();
  };
}
