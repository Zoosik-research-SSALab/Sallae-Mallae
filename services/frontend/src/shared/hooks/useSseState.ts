"use client";

import { useEffect, useReducer } from "react";

type SubscribeToStream<TPayload> = (handlers: {
  onMessage: (payload: TPayload) => void;
  onError?: (error: Event) => void;
}) => () => void;

type UseSseStateOptions = {
  resetOnSubscribeChange?: boolean;
  subscriptionKey?: string;
};

type SseState<TPayload> = {
  subscriptionKey: string | null;
  data: TPayload;
  isLoading: boolean;
  error: string | null;
};

type SseAction<TPayload> =
  | { type: "message"; subscriptionKey: string | null; payload: TPayload }
  | { type: "error"; subscriptionKey: string | null };

function createInitialState<TPayload>(initialData: TPayload, subscriptionKey: string | null): SseState<TPayload> {
  return {
    subscriptionKey,
    data: initialData,
    isLoading: true,
    error: null,
  };
}

function sseStateReducer<TPayload>(state: SseState<TPayload>, action: SseAction<TPayload>): SseState<TPayload> {
  switch (action.type) {
    case "message":
      return {
        subscriptionKey: action.subscriptionKey,
        data: action.payload,
        isLoading: false,
        error: null,
      };
    case "error":
      return {
        subscriptionKey: action.subscriptionKey,
        data: state.data,
        isLoading: false,
        error: "stream_error",
      };
  }
}

export function useSseState<TPayload>(
  subscribe: SubscribeToStream<TPayload>,
  initialData: TPayload,
  options: UseSseStateOptions = {},
) {
  const subscriptionKey = options.subscriptionKey ?? null;
  const [state, dispatch] = useReducer(
    sseStateReducer<TPayload>,
    {
      initialData,
      subscriptionKey,
    },
    ({ initialData: reducerInitialData, subscriptionKey: reducerSubscriptionKey }) =>
      createInitialState(reducerInitialData, reducerSubscriptionKey),
  );

  useEffect(() => {
    const close = subscribe({
      onMessage(payload) {
        dispatch({
          type: "message",
          subscriptionKey,
          payload,
        });
      },
      onError() {
        dispatch({
          type: "error",
          subscriptionKey,
        });
      },
    });

    return () => {
      close();
    };
  }, [subscribe, subscriptionKey]);

  if (options.resetOnSubscribeChange && state.subscriptionKey !== subscriptionKey) {
    return {
      data: initialData,
      isLoading: true,
      error: null,
    };
  }

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
  };
}
