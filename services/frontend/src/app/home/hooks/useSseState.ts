"use client";

import { useEffect, useState } from "react";

type SubscribeToStream<TPayload> = (handlers: {
  onMessage: (payload: TPayload) => void;
  onError?: (error: Event) => void;
}) => () => void;

export function useSseState<TPayload>(subscribe: SubscribeToStream<TPayload>, initialData: TPayload) {
  const [data, setData] = useState<TPayload>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const close = subscribe({
      onMessage(payload) {
        setData(payload);
        setIsLoading(false);
        setError(null);
      },
      onError() {
        setError("stream_error");
        setIsLoading(false);
      },
    });

    return () => {
      close();
    };
  }, [subscribe]);

  return {
    data,
    isLoading,
    error,
  };
}
