import Image from "next/image";
import type { PortfolioHero as PortfolioHeroType } from "../types/portfolio";
import { cn } from "@/shared/utils/cn";
import { formatInteger, formatSignedValue } from "../utils/portfolioFormatters";

type Props = {
  hero: PortfolioHeroType;
};

export default function PortfolioHero({ hero }: Props) {
  const titleWords = hero.title.split(" ");

  return (
    <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-6 lg:gap-10">
      <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
        <div className="grid items-start gap-4 [grid-template-columns:minmax(0,1fr)_112px] md:block">
          <div className="flex min-w-0 flex-col gap-2 md:max-w-[18rem] md:gap-2.5 lg:max-w-none lg:gap-4">
            <p className="typo-body-xs text-[color:var(--color-text-tertiary)] md:typo-body-sm">{hero.updatedAtLabel}</p>
            <h1 className="typo-heading-lg text-[color:var(--color-text-primary)] md:typo-heading-2xl xl:typo-heading-3xl">
              {titleWords.map((word, index) => (
                <span key={`${word}-${index}`} className="inline-block whitespace-nowrap">
                  {word}
                  {index < titleWords.length - 1 ? "\u00A0" : null}
                </span>
              ))}
            </h1>
            <p className="typo-body-sm max-w-[34rem] text-[color:var(--color-text-secondary)] md:max-w-[19rem] md:typo-body-md lg:max-w-[34rem]">
              {hero.description}
            </p>
          </div>

          <div className="overflow-hidden md:hidden">
            <Image
              src="/images/horse.png"
              alt="의장 포트폴리오 대표 일러스트"
              width={496}
              height={744}
              priority
              className="relative z-10 ml-auto h-[134px] w-auto max-w-none object-contain [clip-path:inset(0_8px_0_0)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:max-w-[480px] md:gap-4">
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
      </div>

      <div className="hidden overflow-hidden md:block md:w-[280px] md:shrink-0 lg:w-[332px]">
        <Image
          src="/images/horse.png"
          alt="의장 포트폴리오 대표 일러스트"
          width={496}
          height={744}
          priority
          className="relative z-10 mx-auto h-[292px] w-auto max-w-none object-contain [clip-path:inset(0_12px_0_0)] lg:h-[364px] lg:[clip-path:inset(0_16px_0_0)]"
        />
      </div>
    </section>
  );
}
