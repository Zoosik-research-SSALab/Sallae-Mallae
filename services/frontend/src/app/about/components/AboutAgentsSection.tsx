"use client";

import Image from "next/image";
import { AGENTS } from "../utils/aboutContent";
import Reveal from "./Reveal";

export default function AboutAgentsSection() {
  return (
    <section className="overflow-hidden px-10 py-40 md:px-10 lg:px-16 lg:py-36">
      <div className="mx-auto max-w-[1152px]">
        <Reveal className="stack mb-28 text-center lg:mb-32" style={{ gap: "1rem" }}>
          <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">위원회 소개</p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            각기 다른 시선이 모여
            <br />
            더 단단한 결론을 만듭니다
          </h2>
        </Reveal>

        <div className="flex flex-col gap-20">
          {AGENTS.map((agent, index) => (
            <Reveal key={agent.name} delay={index * 0.08} className="flex flex-col gap-3">
              <div className="hidden gap-4 max-[450px]:flex max-[450px]:flex-col">
                <p className={`text-lg leading-6 font-extrabold ${agent.accentClassName}`}>{agent.name}</p>
                <h3 className="text-2xl leading-8 font-extrabold break-keep text-[color:var(--color-text-primary)]">{agent.title}</h3>
              </div>

              <div className={`hidden items-end ${agent.reverse ? "justify-end" : "justify-start"} max-[450px]:flex`}>
                {!agent.reverse ? (
                  <>
                    <div className="flex w-28 shrink-0 justify-center">
                      <Image
                        src={agent.image}
                        alt={agent.title}
                        width={116}
                        height={175}
                        className="h-44 w-28 object-contain"
                      />
                    </div>
                    <div className="flex flex-1 justify-end">
                      <p className="break-keep text-right text-xl leading-7 font-medium whitespace-pre-line text-[color:var(--color-text-secondary)]">
                        {agent.mobileDescriptionLines.join("\n")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-1 justify-end">
                      <p className="break-keep text-right text-xl leading-7 font-medium whitespace-pre-line text-[color:var(--color-text-secondary)]">
                        {agent.mobileDescriptionLines.join("\n")}
                      </p>
                    </div>
                    <div className="flex w-28 shrink-0 justify-center">
                      <Image src={agent.image} alt={agent.title} width={116} height={174} className="h-44 w-28 object-contain" />
                    </div>
                  </>
                )}
              </div>

              <div
                className={`hidden gap-10 min-[451px]:grid min-[451px]:grid-cols-2 min-[451px]:items-center ${agent.reverse ? "min-[451px]:[&>*:first-child]:order-2 min-[451px]:[&>*:last-child]:order-1" : ""}`}
              >
                <div className="flex justify-center">
                  <Image src={agent.image} alt={agent.title} width={420} height={620} className="h-auto w-full max-w-[20rem] object-contain" />
                </div>

                <div className="stack max-[450px]:hidden" style={{ gap: "0.75rem" }}>
                  <p className={`typo-heading-sm ${agent.accentClassName}`}>{agent.name}</p>
                  <h3 className="typo-heading-2xl break-keep text-[color:var(--color-text-primary)]">{agent.title}</h3>
                  <p className="typo-body-lg break-keep font-medium text-[color:var(--color-text-secondary)]">{agent.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
