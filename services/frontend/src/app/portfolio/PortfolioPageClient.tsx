"use client";

import PortfolioHallOfFame from "./components/PortfolioHallOfFame";
import PortfolioHero from "./components/PortfolioHero";
import PortfolioSidebar from "./components/PortfolioSidebar";
import PortfolioTabsSection from "./components/PortfolioTabsSection";
import { usePortfolioQuery } from "./hooks/usePortfolioQuery";
import Button from "@/shared/ui/Button";

function PortfolioLoadingState() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
          <div className="grid items-start gap-4 [grid-template-columns:minmax(0,1fr)_112px] md:gap-6 md:[grid-template-columns:minmax(0,1fr)_220px] lg:block">
            <div className="flex flex-col gap-3">
              <div className="h-4 w-32 rounded bg-[color:var(--color-bg-secondary)]" />
              <div className="h-10 w-64 rounded bg-[color:var(--color-bg-secondary)] md:h-14" />
              <div className="h-5 w-full max-w-[28rem] rounded bg-[color:var(--color-bg-secondary)]" />
            </div>
            <div className="h-[134px] rounded-[24px] bg-[color:var(--color-bg-secondary)] md:h-[220px] lg:hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:max-w-[480px]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-[color:var(--color-bg-secondary)]" />
            ))}
          </div>
        </div>

        <div className="hidden h-[364px] rounded-[24px] bg-[color:var(--color-bg-secondary)] lg:block lg:w-[332px] lg:shrink-0" />
      </div>
      <div className="mt-8 h-96 rounded-3xl bg-[color:var(--color-bg-secondary)]" />
    </div>
  );
}

export default function PortfolioPageClient() {
  const { data, isLoading, error, refetch, isFetching } = usePortfolioQuery();

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] py-8 md:py-10 lg:py-12">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-8 px-3 md:px-6 lg:flex-row lg:items-start lg:justify-center lg:gap-16 lg:px-0">
        <div className="flex min-w-0 flex-1 flex-col gap-8 px-1 md:gap-10 md:px-2 lg:max-w-[768px] lg:px-3">
          {isLoading ? <PortfolioLoadingState /> : null}

          {!isLoading && error ? (
            <section className="rounded-3xl bg-[color:var(--color-bg-secondary)] p-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
              <h1 className="typo-heading-md text-[color:var(--color-text-primary)]">포트폴리오를 불러오지 못했습니다</h1>
              <p className="mt-2 typo-body-sm text-[color:var(--color-text-secondary)]">
                {error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}
              </p>
              <Button variant="soft" className="mt-4" onClick={() => void refetch()} disabled={isFetching}>
                다시 시도
              </Button>
            </section>
          ) : null}

          {data ? (
            <>
              <PortfolioHero hero={data.hero} />
              <PortfolioTabsSection holdings={data.holdings} todayTrades={data.todayTrades} monthlyReturns={data.monthlyReturns} />
              <div className="lg:hidden">
                <PortfolioSidebar signalSummary={data.signalSummary} popularSignals={data.popularSignals} />
              </div>
              <PortfolioHallOfFame sections={data.hallOfFame} />
            </>
          ) : null}
        </div>

        {data ? (
          <aside className="hidden w-full lg:block lg:w-80 lg:shrink-0">
            <PortfolioSidebar signalSummary={data.signalSummary} popularSignals={data.popularSignals} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
