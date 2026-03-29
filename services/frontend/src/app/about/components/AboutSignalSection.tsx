"use client";

import AboutSignalPhoneMockup from "./AboutSignalPhoneMockup";
import Reveal from "./Reveal";

export default function AboutSignalSection() {
  return (
    <section className="overflow-hidden bg-[color:var(--color-bg-primary)] px-6 py-20 md:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto flex max-w-[1152px] flex-col items-center gap-12 md:flex-row md:items-center md:justify-between md:gap-10 lg:gap-16">
        <Reveal className="hidden w-full justify-center md:flex md:flex-1" y={48} scale={0.97}>
          <AboutSignalPhoneMockup />
        </Reveal>

        <Reveal className="flex w-full flex-col items-start gap-7 md:flex-1 lg:max-w-[544px]" delay={0.08}>
          <div className="flex w-full flex-col items-start">
            <div
              className="text-[color:var(--color-text-interactive-primary)]"
              style={{
                fontFamily: "var(--semantic-heading-md-font-family)",
                fontWeight: "var(--semantic-heading-md-font-weight)",
                fontSize: "var(--semantic-heading-md-font-size)",
                lineHeight: "var(--semantic-heading-md-line-height)",
              }}
            >
              종합매매신호
            </div>
          </div>

          <h2
            className="w-full text-[color:var(--color-text-primary)] [word-break:keep-all]"
            style={{
              fontFamily: "var(--semantic-heading-4xl-font-family)",
              fontWeight: "var(--semantic-heading-3xl-font-weight)",
              fontSize: "var(--semantic-heading-3xl-font-size)",
              lineHeight: "var(--semantic-heading-3xl-line-height)",
            }}
          >
            <span className="block md:text-[var(--font-size-1500)] md:leading-[var(--line-height-1400)]">감정을 배제한</span>
            <span className="block md:text-[var(--font-size-1500)] md:leading-[var(--line-height-1400)]">명확한 매매 시그널</span>
          </h2>

          <div className="flex w-full flex-col gap-7 pt-[3px] text-[color:var(--color-text-secondary)]">
            <p
              className="[word-break:keep-all]"
              style={{
                fontFamily: "var(--semantic-body-font-family)",
                fontWeight: "var(--semantic-body-lg-font-weight)",
                fontSize: "var(--semantic-body-lg-font-size)",
                lineHeight: "var(--semantic-body-lg-line-height)",
              }}
            >
              투자자의 가장 큰 적은 감정입니다.
              <br />
              살래말래위원회는 딥러닝과 머신러닝 알고리즘을 통해 철저하게 정량적 데이터
              <br className="hidden lg:block" />
              <span className="lg:hidden"> </span>
              기반의 매수/매도 시그널을 산출합니다.
            </p>

            <p
              style={{
                fontFamily: "var(--semantic-body-font-family)",
                fontWeight: "var(--semantic-body-lg-font-weight)",
                fontSize: "var(--semantic-body-lg-font-size)",
                lineHeight: "var(--semantic-body-lg-line-height)",
              }}
            >
              이제 언제 사고 언제 팔아야 할지, 타이밍을 확인하세요.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
