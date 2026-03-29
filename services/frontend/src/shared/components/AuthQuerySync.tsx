"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/authStore";

function getAuthIdentity(status: ReturnType<typeof useAuthStore.getState>["status"], userId: number | null) {
  if (status === "restoring") {
    return "restoring";
  }

  if (status === "authenticated" && userId !== null) {
    return `user:${userId}`;
  }

  return "guest";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeWatchlistFlagArray(items: unknown) {
  if (!Array.isArray(items)) {
    return items;
  }

  let hasChanged = false;
  const nextItems = items.map((item) => {
    if (!isObjectRecord(item) || typeof item.isWatchlisted !== "boolean") {
      return item;
    }

    if (!item.isWatchlisted) {
      return item;
    }

    hasChanged = true;
    return {
      ...item,
      isWatchlisted: false,
    };
  });

  return hasChanged ? nextItems : items;
}

function sanitizeQueryData(data: unknown) {
  if (!isObjectRecord(data)) {
    return data;
  }

  if (Array.isArray(data.pages)) {
    let hasChanged = false;
    const nextPages = data.pages.map((page) => {
      if (!isObjectRecord(page) || !Array.isArray(page.stocks)) {
        return page;
      }

      const nextStocks = sanitizeWatchlistFlagArray(page.stocks);
      if (nextStocks !== page.stocks) {
        hasChanged = true;
        return {
          ...page,
          stocks: nextStocks,
        };
      }

      return page;
    });

    return hasChanged
      ? {
          ...data,
          pages: nextPages,
        }
      : data;
  }

  if (Array.isArray(data.stocks)) {
    const nextStocks = sanitizeWatchlistFlagArray(data.stocks);
    return nextStocks === data.stocks
      ? data
      : {
          ...data,
          stocks: nextStocks,
        };
  }

  const nextBuy = sanitizeWatchlistFlagArray(data.buy);
  const nextSell = sanitizeWatchlistFlagArray(data.sell);

  if (nextBuy !== data.buy || nextSell !== data.sell) {
    return {
      ...data,
      buy: nextBuy,
      sell: nextSell,
    };
  }

  return data;
}

export default function AuthQuerySync() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const previousIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const currentIdentity = getAuthIdentity(status, userId);

    if (currentIdentity === "restoring") {
      return;
    }

    if (previousIdentityRef.current === null) {
      previousIdentityRef.current = currentIdentity;
      return;
    }

    if (previousIdentityRef.current !== currentIdentity) {
      void (async () => {
        await queryClient.cancelQueries();

        queryClient.setQueriesData({ queryKey: ["stocks"] }, sanitizeQueryData);
        queryClient.setQueriesData({ queryKey: ["main"] }, sanitizeQueryData);

        queryClient.removeQueries({ queryKey: ["watchlist"] });
        queryClient.removeQueries({ queryKey: ["notifications"] });
        queryClient.removeQueries({ queryKey: ["portfolio"] });
        queryClient.removeQueries({ queryKey: ["portfolio-stock"] });
        queryClient.removeQueries({ queryKey: ["report-detail"] });
        queryClient.removeQueries({ queryKey: ["signals"] });
        queryClient.removeQueries({ queryKey: ["search", "recent"] });
        queryClient.removeQueries({ queryKey: ["news", "watchlist"] });

        void queryClient.invalidateQueries({ queryKey: ["stocks"], refetchType: "active" });
        void queryClient.invalidateQueries({ queryKey: ["main"], refetchType: "active" });
      })();
    }

    previousIdentityRef.current = currentIdentity;
  }, [queryClient, status, userId]);

  return null;
}
