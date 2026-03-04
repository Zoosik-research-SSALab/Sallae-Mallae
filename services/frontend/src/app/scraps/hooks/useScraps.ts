"use client";

import { useEffect, useState } from "react";
import { getScraps, type ScrapItem } from "../_api/getScraps";

export function useScraps() {
  const [items, setItems] = useState<ScrapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const data = await getScraps();
      setItems(data);
      setIsLoading(false);
    };

    run();
  }, []);

  return { items, isLoading };
}
