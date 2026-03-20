import { cn } from "@/shared/utils/cn";
import { STOCK_SECTOR_OPTIONS, getStockSectorOptionLabel } from "../utils/stocksFilters";

type Props = {
  selectedSectors: string[];
  onToggleSector: (value: string) => void;
};

function SectorChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "typo-body-xs rounded-lg px-3 py-1 font-semibold transition-colors",
        selected
          ? "bg-[color:var(--color-bg-interactive-primary)] text-[color:var(--color-text-base)]"
          : "bg-[color:var(--color-bg-interactive-secondary-hovered)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
      )}
    >
      {label}
    </button>
  );
}

export default function StocksSidebar({ selectedSectors, onToggleSector }: Props) {
  return (
    <aside className="hidden w-56 shrink-0 lg:flex lg:flex-col lg:gap-10">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="typo-heading-2xl text-[color:var(--color-text-primary)]">실시간 발견</h1>
          <p className="typo-body-sm font-medium text-[color:var(--color-text-secondary)]">
            코스피 200 전 종목의
            <br />
            시장 흐름을 파악하세요.
          </p>
        </div>

        <div className="flex flex-col gap-10 pt-4">
          <div className="flex flex-col gap-4">
            <h2 className="typo-heading-sm text-[color:var(--color-text-primary)]">주요 섹터</h2>
            <div className="flex flex-wrap gap-2 overflow-hidden">
              {STOCK_SECTOR_OPTIONS.map((sector) => (
                <SectorChip
                  key={sector}
                  label={getStockSectorOptionLabel(sector)}
                  selected={selectedSectors.includes(sector)}
                  onClick={() => onToggleSector(sector)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-[color:var(--color-border-primary)]" />

          <div className="rounded-lg bg-[color:var(--color-bg-secondary)] px-6 py-4">
            <p className="typo-body-xs font-medium text-[color:var(--color-text-secondary)]">
              실시간 데이터는 거래소 정보와 20분
              <br />
              지연 차이가 발생할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
