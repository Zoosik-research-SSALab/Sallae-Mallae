"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Reveal from "./Reveal";

export default function AboutHeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroTextTranslateY = useTransform(scrollYProgress, [0, 0.18], [0, prefersReducedMotion ? 0 : -28]);

  return (
    <section className="overflow-hidden bg-gradient-to-b from-white via-[#eef5ff] to-[#d6e7ff]">
      <div className="mx-auto flex min-h-[760px] max-w-[1440px] flex-col items-center justify-between px-6 pt-24 text-center md:min-h-[860px] md:px-10 lg:min-h-[937px] lg:px-16 lg:pt-48">
        <motion.div className="flex w-full flex-col items-center text-center" style={{ y: heroTextTranslateY }}>
          <Reveal className="flex w-full flex-col items-center">
            <h1 className="typo-heading-4xl max-w-[20rem] text-center tracking-[var(--letter-spacing-tighter)] md:max-w-[42rem] lg:max-w-[56rem]">
              <span className="block text-[color:var(--color-text-primary)]">주식 투자,</span>
              <span className="block text-[color:var(--color-text-interactive-primary)]">더 이상 혼자 고민하지 마세요.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12} y={24} className="flex w-full justify-center">
            <p className="typo-body-lg mx-auto mt-6 max-w-[18rem] text-center font-extrabold text-[color:var(--color-text-secondary)] md:mt-8 md:max-w-[30rem] lg:max-w-[34rem]">
              살래말래위원회는 3인의 AI 보좌관과 1인의 의장 AI가 당신을 위해 종목을 분석하고 객관적인 매매 신호를 제공하는 투자 비서입니다.
            </p>
          </Reveal>
        </motion.div>

        <div className="relative flex w-full flex-1 items-end justify-center pt-8">
          <div className="absolute inset-x-10 bottom-0 top-12 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_70%)] blur-3xl" />
          <Reveal delay={0.2} y={48} scale={0.96} className="flex h-full items-end">
            <Image
              src="/images/about/about_members.png"
              alt="살래말래위원회 대표 이미지"
              width={980}
              height={660}
              priority
              className="relative mx-auto block h-auto w-full max-w-[774px] self-end object-contain"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
