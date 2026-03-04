"use client";

import { useState } from "react";
import { getSuggestions, type Suggestion } from "../_api/getSuggestions";

export function useSearch() {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSuggestions(keyword);
      setItems(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { keyword, setKeyword, items, isLoading, error, search };
}
