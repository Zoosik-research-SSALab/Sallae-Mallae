import { cn } from "@/shared/utils/cn";
import { formatWatchlistSignalLabel, getWatchlistSignalBadgeClassName } from "../utils/watchlistDisplay";
import type { WatchlistSignal } from "../types/scraps";

type Props = {
  signal: WatchlistSignal;
  compact?: boolean;
  className?: string;
};

export default function WatchlistSignalBadge({ signal, compact = false, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold",
        compact ? "typo-body-xs px-2 py-0.5" : "typo-body-sm px-3 py-1",
        getWatchlistSignalBadgeClassName(signal),
        className,
      )}
    >
      {formatWatchlistSignalLabel(signal)}
    </span>
  );
}
