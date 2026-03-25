"use client";

import Image from "next/image";
import { AGENTS } from "../utils/aboutContent";
import Reveal from "./Reveal";

export default function AboutAgentsSection() {
  return (
    <section className="px-6 py-24 md:px-10 lg:px-16 lg:py-36">
      <div className="mx-auto max-w-[1152px]">
        <Reveal className="stack mb-20 text-center" style={{ gap: "1rem" }}>
          <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">위원회 소개</p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            각기 다른 시선이 모여
            <br />
            더 단단한 결론을 만듭니다
          </h2>
        </Reveal>

        <div className="flex flex-col gap-20">
          {AGENTS.map((agent, index) => (
            <Reveal
              key={agent.name}
              delay={index * 0.08}
              className={`grid gap-10 lg:grid-cols-2 lg:items-center ${agent.reverse ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""}`}
            >
              <div className="flex justify-center">
                <Image src={agent.image} alt={agent.title} width={420} height={620} className="h-auto w-full max-w-[20rem] object-contain" />
              </div>

              <div className="stack" style={{ gap: "0.75rem" }}>
                <p className={`typo-heading-sm ${agent.accentClassName}`}>{agent.name}</p>
                <h3 className="typo-heading-2xl text-[color:var(--color-text-primary)]">{agent.title}</h3>
                <p className="typo-body-lg font-medium text-[color:var(--color-text-secondary)]">{agent.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
