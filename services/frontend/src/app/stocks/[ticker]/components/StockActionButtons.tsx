"use client";

import { HiOutlineBell } from "react-icons/hi";
import { IoMdNotifications } from "react-icons/io";
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { useRequireAuthAction } from "@/shared/hooks/useRequireAuthAction";
import { useWatchlist } from "@/shared/hooks/useWatchlist";
import { useWatchlistNotification } from "@/shared/hooks/useWatchlistNotification";
import { cn } from "@/shared/utils/cn";

type Props = {
  stockId?: number;
  stockName: string;
};

function ActionButtonSkeleton() {
  return <div className="h-10 w-28 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />;
}

function StockActionButtonsReady({ stockId, stockName }: { stockId: number; stockName: string }) {
  const requireAuthAction = useRequireAuthAction();
  const { isWatched, isPending: isWatchlistPending, toggle: toggleWatchlist } = useWatchlist(stockId);
  const {
    isWatched: isWatchlistReady,
    isNotifiedEnabled,
    isPending: isNotificationPending,
    toggle: toggleNotification,
  } = useWatchlistNotification(stockId);

  const handleWatchlistClick = async () => {
    if (!requireAuthAction()) {
      return;
    }

    try {
      await toggleWatchlist();
    } catch (error) {
      const message = error instanceof Error ? error.message : "관심종목 처리에 실패했습니다.";
      window.alert(message);
    }
  };

  const handleNotificationClick = async () => {
    if (!requireAuthAction()) {
      return;
    }

    if (!isWatchlistReady) {
      window.alert("관심종목에 추가한 뒤 알림을 설정할 수 있습니다.");
      return;
    }

    try {
      await toggleNotification();
    } catch (error) {
      const message = error instanceof Error ? error.message : "알림 설정에 실패했습니다.";
      window.alert(message);
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-end gap-3">
      <button
        type="button"
        onClick={handleWatchlistClick}
        disabled={isWatchlistPending}
        aria-label={`${stockName} 관심종목 토글`}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          isWatched
            ? "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]"
            : "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)]",
        )}
      >
        {isWatched ? <IoHeart className="h-4 w-4" /> : <IoHeartOutline className="h-4 w-4" />}
        <span>관심종목</span>
      </button>

      <button
        type="button"
        onClick={handleNotificationClick}
        disabled={isNotificationPending || !isWatched}
        aria-label={`${stockName} 알림 설정`}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          isNotifiedEnabled
            ? "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]"
            : "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)]",
          !isWatched && "opacity-60",
        )}
      >
        {isNotifiedEnabled ? <IoMdNotifications className="h-4 w-4" /> : <HiOutlineBell className="h-4 w-4" />}
        <span>{isNotifiedEnabled ? "알림 켜짐" : "알림 설정"}</span>
      </button>
    </div>
  );
}

export default function StockActionButtons({ stockId, stockName }: Props) {
  if (stockId == null) {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <ActionButtonSkeleton />
        <ActionButtonSkeleton />
      </div>
    );
  }

  return <StockActionButtonsReady stockId={stockId} stockName={stockName} />;
}
