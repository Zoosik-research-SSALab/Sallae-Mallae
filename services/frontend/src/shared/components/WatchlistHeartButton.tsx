"use client";

import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { useWatchlist } from "@/shared/hooks/useWatchlist";
import { cn } from "@/shared/utils/cn";

type Props = {
  stockId: number;
  stockName: string;
  initialWatched?: boolean;
  size?: "sm" | "md" | "lg";
  surface?: "default" | "muted";
  inactiveIconStyle?: "filled" | "outline";
  className?: string;
  onToggleSuccess?: (nextIsWatched: boolean) => void;
};

const sizeClassNames = {
  sm: {
    button: "h-10 w-10",
    icon: "h-5 w-6",
  },
  md: {
    button: "h-11 w-11",
    icon: "h-5 w-6",
  },
  lg: {
    button: "h-12 w-12",
    icon: "h-6 w-7",
  },
} as const;

export default function WatchlistHeartButton({
  stockId,
  stockName,
  initialWatched,
  size = "sm",
  surface = "default",
  inactiveIconStyle = "filled",
  className,
  onToggleSuccess,
}: Props) {
  const { isWatched, isPending, toggle } = useWatchlist(stockId, initialWatched);
  const Icon = isWatched ? IoHeart : inactiveIconStyle === "outline" ? IoHeartOutline : IoHeart;

  const handleClick = async () => {
    try {
      const nextIsWatched = await toggle();
      onToggleSuccess?.(nextIsWatched);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Watchlist request failed.";
      window.alert(message);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isWatched}
      aria-label={`${stockName} watchlist toggle`}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-2xl bg-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        sizeClassNames[size].button,
        surface === "muted" ? "hover:bg-[color:var(--color-border-primary)]" : "hover:bg-[color:var(--color-bg-tertiary)]",
        isWatched ? "text-[color:var(--color-text-danger)]" : "text-[color:var(--color-icon-disabled)]",
        className,
      )}
    >
      <Icon className={sizeClassNames[size].icon} />
    </button>
  );
}
