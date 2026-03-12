import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa6";
import StockActionButtons from "./StockActionButtons";

type Props = {
  stockId?: number;
  stockName: string;
};

export default function StockDetailTopBar({ stockId, stockName }: Props) {
  return (
    <section className="flex w-full justify-center border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)]">
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-5 md:gap-6 md:px-6 md:py-5 xl:w-[92%] xl:max-w-[1280px] xl:gap-8 xl:px-0">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <Link
            href="/stocks"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--color-border-primary)] transition-colors hover:bg-[color:var(--color-bg-secondary)]"
            aria-label="전체 종목으로 이동"
          >
            <FaArrowLeft className="h-5 w-5 text-[color:var(--color-border-primary)]" />
          </Link>

          <div className="hidden min-w-0 xl:flex xl:items-center xl:gap-2">
            <div className="truncate text-[20px] font-bold leading-[30px] tracking-[-0.32px] text-[color:var(--color-text-primary)]">
              {stockName}
            </div>
            <div className="text-[20px] font-bold leading-[30px] tracking-[-0.32px] text-[color:var(--color-text-primary)]">|</div>
            <div className="whitespace-nowrap text-[20px] font-bold leading-[30px] tracking-[-0.32px] text-[color:var(--color-text-primary)]">
              종목 상세 정보
            </div>
          </div>
        </div>

        <StockActionButtons stockId={stockId} stockName={stockName} />
      </div>
    </section>
  );
}
