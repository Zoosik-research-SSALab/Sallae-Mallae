import type { PortfolioHallOfFameSection } from "../types/portfolio";
import { cn } from "@/shared/utils/cn";
import { formatSignedValue, getHallOfFameToneClassName } from "../utils/portfolioFormatters";

type Props = {
  sections: PortfolioHallOfFameSection[];
};

export default function PortfolioHallOfFame({ sections }: Props) {
  return (
    <section className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="typo-heading-md text-[color:var(--color-text-primary)]">모의투자 명예의 전당</h2>
        <p className="typo-body-sm text-[color:var(--color-text-secondary)] md:typo-body-md">
          과거 3년간의 모의투자 데이터를 기반으로 한 분야별 TOP 10 종목입니다
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => {
          const tone = getHallOfFameToneClassName(section.tone);

          return (
            <article
              key={section.id}
              className="rounded-3xl bg-[color:var(--color-bg-secondary)] p-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
            >
              <div className="flex items-center gap-3 border-b border-[color:var(--color-border-primary)] pb-3">
                <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold", tone.marker)}>
                  {section.items[0]?.rank ?? 1}
                </span>
                <h3 className="text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{section.title}</h3>
              </div>

              <div className="mt-3 flex flex-col gap-1">
                {section.items.map((item) => (
                  <div key={`${section.id}-${item.rank}`} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn("w-4 text-center text-sm font-semibold", item.rank <= 3 ? tone.rank : "text-[color:var(--color-text-secondary)]")}>
                        {item.rank}
                      </span>
                      <span
                        className={cn(
                          "truncate text-sm leading-5 md:text-base md:leading-6",
                          item.rank <= 3 ? "font-extrabold text-[color:var(--color-text-primary)]" : "font-semibold text-[color:var(--color-text-secondary)]",
                        )}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span className={cn("shrink-0 text-sm md:text-base", item.rank <= 3 ? "font-extrabold" : "font-semibold", tone.rank)}>
                      {formatSignedValue(item.value, 1, item.suffix)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
