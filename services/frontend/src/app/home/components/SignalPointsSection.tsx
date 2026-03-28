"use client";

import { useRouter } from "next/navigation";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import { useRequireAuthAction } from "@/shared/hooks/useRequireAuthAction";
import type { NewSignalsPayload, SignalPointItem } from "../types/main";
import { formatPrice, formatSignedRate, getRateTone } from "../utils/formatters";

function getRateClassName(value: number) {
  const tone = getRateTone(value);

  if (tone === "positive") {
    return "text-[color:var(--color-text-danger)]";
  }

  if (tone === "negative") {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-tertiary)]";
}

type SignalListCardProps = {
  title: string;
  description: string;
  items?: SignalPointItem[];
  tone: "buy" | "sell";
  onSelect: (stockId: number) => void;
};

function SignalListCard({ title, description, items, tone, onSelect }: SignalListCardProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const iconToneClassName =
    tone === "buy"
      ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-border-base)]"
      : "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-border-base)]";

  const Icon = tone === "buy" ? FaArrowTrendUp : FaArrowTrendDown;

  return (
    <div className="rounded-2xl px-6 py-8 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3 border-b border-[color:var(--color-border-primary)] pb-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${iconToneClassName}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="typo-heading-sm text-[color:var(--color-text-primary)]">{title}</h3>
          <p className="typo-body-sm text-[color:var(--color-text-secondary)]">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {safeItems.map((item, index) => (
          <div
            key={`${tone}-${item.stockId}`}
            role="link"
            tabIndex={0}
            onClick={() => onSelect(item.stockId)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();
              onSelect(item.stockId);
            }}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-1 py-3 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none ${
              index === 1 ? "bg-[color:var(--color-bg-tertiary)]" : "bg-[color:var(--color-bg-primary)]"
            }`}
          >
            <div className="flex flex-1 items-center gap-3">
              <span className="typo-heading-sm w-6 text-center text-[color:var(--color-text-tertiary)]">{index + 1}</span>
              <div className="flex-1">
                <div className="typo-heading-sm text-[color:var(--color-text-primary)]">{item.name}</div>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="typo-body-md text-[color:var(--color-text-primary)]">{formatPrice(item.price)}</span>
                  <span className={`typo-body-sm ${getRateClassName(item.fluctuationRate)}`}>{formatSignedRate(item.fluctuationRate)}</span>
                </div>
              </div>
            </div>
            <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <WatchlistHeartButton
                stockId={item.stockId}
                stockName={item.name}
                initialWatched={item.isWatchlisted}
                size="sm"
                surface={index === 1 ? "muted" : "default"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  data: NewSignalsPayload | undefined;
  isLoading: boolean;
};

export default function SignalPointsSection({ data, isLoading }: Props) {
  const router = useRouter();
  const requireAuthAction = useRequireAuthAction();
  const buyItems = Array.isArray(data?.buy) ? data.buy : [];
  const sellItems = Array.isArray(data?.sell) ? data.sell : [];

  const handleSelectSignalStock = (stockId: number) => {
    requireAuthAction(() => {
      router.push(`/report/${stockId}`);
    });
  };

  return (
    <section className="border-t border-[color:var(--color-border-secondary)] py-10">
      <div>
        <h2 className="typo-heading-md text-[color:var(--color-text-primary)] md:[font-size:var(--typo-heading-lg-font-size)] md:[line-height:var(--typo-heading-lg-line-height)]">
          새롭게 포착된 매수/매도 포인트
        </h2>
        <p className="typo-body-md mt-1 text-[color:var(--color-text-secondary)]">최근 위원회가 매수/매도 신호를 확인한 종목</p>
      </div>

      {isLoading && !data ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="h-72 rounded-2xl bg-[color:var(--color-bg-tertiary)]" />
          <div className="h-72 rounded-2xl bg-[color:var(--color-bg-tertiary)]" />
        </div>
      ) : null}

      {data ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <SignalListCard
            title="매수 신호 포착"
            description="지금 주목할 종목"
            items={buyItems}
            tone="buy"
            onSelect={handleSelectSignalStock}
          />
          <SignalListCard
            title="매도 신호 포착"
            description="조정 가능성 높은 종목"
            items={sellItems}
            tone="sell"
            onSelect={handleSelectSignalStock}
          />
        </div>
      ) : null}
    </section>
  );
}
