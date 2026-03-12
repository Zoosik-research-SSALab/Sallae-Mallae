import Link from "next/link";
import { HiOutlineChevronLeft } from "react-icons/hi";
import StockActionButtons from "./StockActionButtons";

type Props = {
  stockId?: number;
  stockName: string;
};

export default function StockDetailTopBar({ stockId, stockName }: Props) {
  return (
    <section className="border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)]">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/stocks"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-bg-secondary)]"
            aria-label="전체 종목으로 이동"
          >
            <HiOutlineChevronLeft className="h-6 w-6" />
          </Link>

          <div className="min-w-0">
            <div className="typo-body-md truncate font-bold text-[color:var(--color-text-primary)]">{stockName}</div>
            <div className="typo-body-sm mt-0.5 text-[color:var(--color-text-tertiary)]">종목 상세 정보</div>
          </div>
        </div>

        <StockActionButtons stockId={stockId} stockName={stockName} />
      </div>
    </section>
  );
}
