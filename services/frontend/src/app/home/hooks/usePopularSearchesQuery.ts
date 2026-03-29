"use client";

import { subscribePopularSearches } from "../api/main";
import type { PopularSearchesPayload } from "../types/main";
import { useSseState } from "@/shared/hooks/useSseState";

const initialData: PopularSearchesPayload = {
  keywords: [],
};

export function usePopularSearchesQuery() {
  return useSseState(subscribePopularSearches, initialData);
}
