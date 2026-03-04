"use client";

import { useEffect, useMemo, useState } from "react";
import { getNotifications, type NotificationItem } from "../_api/getNotifications";

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const loadFirst = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await getNotifications(null, 6);
      setItems(page.data);
      setCursor(page.meta.nextCursor);
      setHasNext(page.meta.hasNext);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFirst();
  }, []);

  const loadMore = async () => {
    if (!hasNext || !cursor) return;

    setIsFetchingMore(true);
    setError(null);
    try {
      const page = await getNotifications(cursor, 6);
      setItems((prev) => [...prev, ...page.data]);
      setCursor(page.meta.nextCursor);
      setHasNext(page.meta.hasNext);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (typeFilter === "ALL") {
      return items;
    }
    return items.filter((item) => item.notifyType === typeFilter);
  }, [items, typeFilter]);

  return {
    items: filteredItems,
    isLoading,
    isFetchingMore,
    error,
    hasNext,
    loadMore,
    reload: loadFirst,
    typeFilter,
    setTypeFilter,
  };
}
