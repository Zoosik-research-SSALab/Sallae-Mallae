import Link from "next/link";
import {
  IoChevronBack,
  IoHeart,
  IoNotificationsOutline,
} from "react-icons/io5";

type Props = {
  stockName: string;
  portfolioLabel: string;
};

export default function StockDetailHeader({
  stockName,
  portfolioLabel,
}: Props) {
  return (
    <div className="flex flex-col justify-between gap-6 px-3 py-6 md:flex-row md:items-center md:border-b md:border-(--color-border-primary)">
      {/* Left: back arrow + breadcrumb */}
      <div className="flex items-center gap-6">
        <Link
          href="/portfolio"
          className="flex items-center text-(--color-text-primary) hover:opacity-70 transition-opacity"
        >
          <IoChevronBack size={24} />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-(--color-text-primary) tracking-tight">
            {stockName}
          </span>
          <span className="px-2 text-[15px] font-bold text-(--color-text-tertiary) tracking-tight">
            |
          </span>
          <span className="text-[15px] font-bold text-(--color-text-primary) tracking-tight">
            {portfolioLabel}
          </span>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 md:mt-0">
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-(--color-bg-info-subtle) text-(--color-text-info) transition-opacity hover:opacity-80"
        >
          <IoHeart size={16} />
          관심종목
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-(--color-bg-tertiary) text-(--color-text-secondary) transition-opacity hover:opacity-80"
        >
          <IoNotificationsOutline size={16} />
          알림 설정
        </button>
      </div>
    </div>
  );
}
