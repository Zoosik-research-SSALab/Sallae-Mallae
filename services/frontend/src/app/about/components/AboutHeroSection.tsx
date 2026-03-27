"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Reveal from "./Reveal";

export default function AboutHeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroTextTranslateY = useTransform(scrollYProgress, [0, 0.18], [0, prefersReducedMotion ? 0 : -28]);

  return (
    <section className="overflow-hidden bg-gradient-to-b from-white via-[#eef5ff] to-[#d9e9ff]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-start gap-6 px-6 pt-24 text-center md:px-10 md:pt-32 lg:px-6 lg:pt-40">
        <motion.div className="flex w-full flex-col items-center gap-3 text-center md:gap-6" style={{ y: heroTextTranslateY }}>
          <Reveal className="flex w-full flex-col items-center">
            <h1 className="max-w-[22rem] text-center text-[2.75rem] font-black leading-[1.15] tracking-[var(--letter-spacing-tighter)] text-[color:var(--color-text-primary)] [word-break:keep-all] md:max-w-[48rem] md:text-[3.5rem] md:leading-[1.12] lg:max-w-[56rem] lg:text-6xl lg:leading-[68px]">
              <span className="block">주식 투자,</span>
              <span className="block text-[color:var(--color-text-interactive-primary)]">더 이상 혼자 고민하지 마세요.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12} y={24} className="flex w-full justify-center">
            <p className="mx-auto mt-2 max-w-[21rem] text-center text-base font-extrabold leading-6 text-[color:var(--color-text-secondary)] [word-break:keep-all] md:mt-0 md:max-w-[42rem] md:text-lg lg:max-w-[48rem] lg:text-xl">
              살래말래위원회는 3인의 AI 보좌관과 1인의 의장 AI가 당신을 위해
              <br className="hidden md:block" />
              <span className="md:hidden"> </span>
              종목을 분석하고 객관적인 매매 신호를 제공하는 투자 비서입니다.
            </p>
          </Reveal>
        </motion.div>

        <div className="relative flex w-full justify-center">
          <div className="absolute inset-x-8 bottom-2 top-16 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_72%)] blur-3xl md:inset-x-16 lg:inset-x-28" />
          <Reveal delay={0.2} y={48} scale={0.96} className="flex w-full justify-center">
            <Image
              src="/images/about/about_members.png"
              alt="살래말래위원회 대표 이미지"
              width={877}
              height={545}
              priority
              className="relative mx-auto block h-auto w-full max-w-[320px] object-contain md:w-[50%] md:max-w-[720px]"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
