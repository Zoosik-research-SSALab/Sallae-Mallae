"use client";

import { useMemo, useState } from "react";
import { TermsSignupModal } from "@/app/auth/signup/terms/components/TermsSignupCard";
import CategoryStocksSection from "./components/CategoryStocksSection";
import SidebarPanel from "./components/SidebarPanel";
import SignalPointsSection from "./components/SignalPointsSection";
import TopStocksSection from "./components/TopStocksSection";
import { useCategories } from "./hooks/useCategories";
import { useMainNewSignalsQuery } from "./hooks/useMainNewSignalsQuery";
import { useMarketIndex } from "./hooks/useMarketIndex";
import { useTopStocks } from "./hooks/useTopStocks";
import { readPendingSocialSignup } from "@/shared/lib/socialAuth";

export default function HomePageClient() {
  const { data: topStocksData, isLoading: topStocksLoading } = useTopStocks();
  const { data: marketIndexData, isLoading: marketIndexLoading } = useMarketIndex();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: newSignalsData, isLoading: newSignalsLoading } = useMainNewSignalsQuery();
  const [isTermsSignupModalOpen, setIsTermsSignupModalOpen] = useState(() =>
    typeof window !== "undefined" ? Boolean(readPendingSocialSignup()) : false,
  );

  const topStocks = topStocksData?.stocks;

  const popularSearches = useMemo(
    () =>
      (topStocks ?? []).slice(0, 5).map((item) => ({
        rank: item.rank,
        keyword: item.name,
      })),
    [topStocks],
  );

  return (
    <>
      <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] py-8">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 md:px-6 lg:px-8 xl:flex-row xl:items-start xl:justify-center xl:px-0">
          <div className="flex min-w-0 flex-1 flex-col gap-0 xl:w-[896px] xl:max-w-[896px] xl:flex-none">
            <TopStocksSection stocks={topStocks ?? []} isLoading={topStocksLoading} />
            <SignalPointsSection data={newSignalsData} isLoading={newSignalsLoading} />
            <CategoryStocksSection categories={categoriesData.categories} isLoading={categoriesLoading} />
          </div>

          <div className="w-full xl:w-80 xl:shrink-0">
            <SidebarPanel
              marketIndex={marketIndexData}
              marketLoading={marketIndexLoading}
              searches={popularSearches}
              searchLoading={topStocksLoading}
            />
          </div>
        </div>
      </main>
      <TermsSignupModal open={isTermsSignupModalOpen} onClose={() => setIsTermsSignupModalOpen(false)} />
    </>
  );
}
