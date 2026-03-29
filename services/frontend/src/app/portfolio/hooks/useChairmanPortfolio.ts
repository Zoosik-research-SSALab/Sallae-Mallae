"use client";

import { useEffect, useState } from "react";
import {
  getChairmanPortfolio,
  type ChairmanPortfolio,
} from "../api/getChairmanPortfolio";

export function useChairmanPortfolio() {
  const [item, setItem] = useState<ChairmanPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      const data = await getChairmanPortfolio();
      setItem(data);
      setIsLoading(false);
    };

    run();
  }, []);

  return { item, isLoading };
}
