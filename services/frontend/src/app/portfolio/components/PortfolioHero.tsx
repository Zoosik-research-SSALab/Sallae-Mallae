import Image from "next/image";
import type { PortfolioHero as PortfolioHeroType } from "../types/portfolio";
import { cn } from "@/shared/utils/cn";
import { formatInteger, formatSignedValue } from "../utils/portfolioFormatters";

type Props = {
  hero: PortfolioHeroType;
};

export default function PortfolioHero({ hero }: Props) {
  return (
    <section className="flex flex-col gap-6 md:gap-8">
      <div className="grid items-end gap-4 md:gap-6 [grid-template-columns:minmax(0,1fr)_112px] md:[grid-template-columns:minmax(0,1fr)_220px] xl:[grid-template-columns:minmax(0,1fr)_332px]">
        <div className="flex flex-col gap-3 md:gap-4">
          <p className="typo-body-xs text-[color:var(--color-text-tertiary)] md:typo-body-sm">{hero.updatedAtLabel}</p>
          <h1 className="typo-heading-lg max-w-[10ch] text-[color:var(--color-text-primary)] md:max-w-none md:typo-heading-2xl xl:typo-heading-3xl">
            {hero.title}
          </h1>
          <p className="typo-body-sm max-w-[34rem] text-[color:var(--color-text-secondary)] md:typo-body-md">{hero.description}</p>
        </div>

        <div className="relative min-h-[134px] overflow-hidden rounded-[24px] bg-[color:var(--color-bg-secondary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)] md:min-h-[220px] xl:min-h-[364px]">
          <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-[color:var(--color-bg-danger-subtle)] blur-3xl md:h-40 md:w-40" />
          <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[color:var(--color-bg-info-subtle)] blur-3xl md:h-36 md:w-36" />
          <Image
            src="/images/horse.png"
            alt="의장 포트폴리오 대표 일러스트"
            width={496}
            height={744}
            priority
            className="relative z-10 mx-auto h-[134px] w-auto object-contain md:h-[220px] xl:h-[364px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {hero.metrics.map((metric) => {
          const value =
            metric.decimals === 0
              ? `${formatInteger(metric.value)}${metric.unit}`
              : formatSignedValue(metric.value, metric.decimals, metric.unit);

          return (
            <article
              key={metric.id}
              className="flex min-h-[88px] flex-col justify-center gap-1 rounded-2xl bg-[color:var(--color-bg-secondary)] px-3 py-3 text-center outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)] md:min-h-[96px]"
            >
              <p className="typo-body-xs font-semibold text-[color:var(--color-text-tertiary)] md:typo-body-sm">{metric.label}</p>
              <p
                className={cn(
                  "text-[24px] leading-7 font-extrabold md:text-[32px] md:leading-9",
                  metric.tone === "danger"
                    ? "text-[color:var(--color-text-danger)]"
                    : "text-[color:var(--color-text-primary)]",
                )}
              >
                {value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
