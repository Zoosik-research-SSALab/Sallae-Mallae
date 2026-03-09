"use client";

import { subscribeCategories } from "../api/main";
import { useSseState } from "./useSseState";
import type { CategoriesPayload } from "../types/main";

const initialData: CategoriesPayload = { categories: [] };

export function useCategories() {
  return useSseState(subscribeCategories, initialData);
}
