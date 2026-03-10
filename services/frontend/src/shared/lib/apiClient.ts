import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";

type ApiRequestOptions<TBody> = Omit<RequestInit, "body"> & {
  body?: TBody;
  useBaseUrl?: boolean;
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
  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();
  return raw === "disabled" ? "disabled" : "enabled";
}

function getResolvedBaseUrl() {
  if (getApiMockingMode() === "disabled") {
    return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  }

  return process.env.NEXT_PUBLIC_MOCK_BASE_URL?.trim() ?? "/api";
}

function resolveApiUrl(url: string, useBaseUrl = true) {
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

export async function apiFetch<TResponse, TBody = unknown>(url: string, options: ApiRequestOptions<TBody> = {}) {
  const { body, useBaseUrl = true, ...requestInit } = options;
  const headers = new Headers(options.headers);
  const requestBody = createRequestBody(body);

  if (requestBody && !(requestBody instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveApiUrl(url, useBaseUrl), {
    ...requestInit,
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
};

export function connectSse<TPayload>(url: string, options: ConnectSseOptions<TPayload>) {
  const source = new EventSource(resolveApiUrl(url));

  source.onopen = () => {
    options.onOpen?.();
  };

  source.onmessage = (event) => {
    if (!event.data) {
      return;
    }

    try {
      const payload = camelizeKeys<TPayload>(JSON.parse(event.data) as unknown);
      options.onMessage(payload);
    } catch {
      // Ignore malformed SSE payloads so the stream can continue.
    }
  };

  source.onerror = (error) => {
    options.onError?.(error);
  };

  return () => {
    source.close();
  };
}
