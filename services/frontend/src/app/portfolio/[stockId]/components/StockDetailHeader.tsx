"use client";

import Link from "next/link";
import { HiOutlineBell } from "react-icons/hi";
import { IoMdNotifications } from "react-icons/io";
import { IoChevronBack, IoHeart, IoHeartOutline } from "react-icons/io5";
import { useStockWatchlistControls } from "@/app/stocks/[ticker]/hooks/useStockWatchlistControls";
import { useRequireAuthAction } from "@/shared/hooks/useRequireAuthAction";
import { cn } from "@/shared/utils/cn";

type Props = {
  stockName: string;
  portfolioLabel: string;
  stockDbId: number;
};

export default function StockDetailHeader({
  stockName,
  portfolioLabel,
  stockDbId,
}: Props) {
  const requireAuthAction = useRequireAuthAction();
  const {
    isLoading,
    isWatched,
    isNotifiedEnabled,
    isWatchlistPending,
    isNotificationPending,
    toggleWatchlist,
    toggleNotification,
  } = useStockWatchlistControls(stockDbId);

  const handleWatchlistClick = async () => {
    if (!requireAuthAction()) return;

    try {
      await toggleWatchlist();
    } catch (error) {
      const message = error instanceof Error ? error.message : "관심종목 처리에 실패했습니다.";
      window.alert(message);
    }
  };

  const handleNotificationClick = async () => {
    if (!requireAuthAction()) return;

    if (!isWatched) {
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
    <div className="flex flex-col justify-between gap-6 px-3 py-6 md:flex-row md:items-center md:max-w-6xl md:mx-auto">
      {/* Left: back arrow + breadcrumb */}
      <div className="flex items-center gap-6">
        <Link
          href="/portfolio"
          className="flex items-center text-text-primary hover:opacity-70 transition-opacity"
        >
          <IoChevronBack size={24} />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-text-primary tracking-tight">
            {stockName}
          </span>
          <span className="px-2 text-[15px] font-bold text-text-tertiary tracking-tight">
            |
          </span>
          <span className="text-[15px] font-bold text-text-primary tracking-tight">
            {portfolioLabel}
          </span>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 md:mt-0">
        {isLoading ? (
          <>
            <div className="h-10 w-28 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleWatchlistClick}
              disabled={isWatchlistPending}
              aria-label={`${stockName} 관심종목 토글`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                isWatched
                  ? "bg-bg-info-subtle text-text-info"
                  : "bg-bg-tertiary text-text-secondary",
              )}
            >
              {isWatched ? <IoHeart size={16} /> : <IoHeartOutline size={16} />}
              관심종목
            </button>

            <button
              type="button"
              onClick={handleNotificationClick}
              disabled={isNotificationPending || !isWatched}
              aria-label={`${stockName} 알림 설정`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                isNotifiedEnabled
                  ? "bg-bg-info-subtle text-text-info"
                  : "bg-bg-tertiary text-text-secondary",
                !isWatched && "opacity-60",
              )}
            >
              {isNotifiedEnabled ? <IoMdNotifications size={16} /> : <HiOutlineBell size={16} />}
              {isNotifiedEnabled ? "알림 켜짐" : "알림 설정"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
