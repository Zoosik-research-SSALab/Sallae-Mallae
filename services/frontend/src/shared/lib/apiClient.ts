import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";

type ApiRequestOptions<TBody> = Omit<RequestInit, "body"> & {
  body?: TBody;
};

function isJsonContentType(contentType: string | null) {
  return typeof contentType === "string" && contentType.includes("application/json");
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
  const headers = new Headers(options.headers);
  const requestBody = createRequestBody(options.body);

  if (requestBody && !(requestBody instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
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
  const source = new EventSource(url);

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
