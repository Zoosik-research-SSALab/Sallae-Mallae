"use client";

import AboutAgentsSection from "./AboutAgentsSection";
import AboutChairmanSection from "./AboutChairmanSection";
import AboutDiscussionSection from "./AboutDiscussionSection";
import AboutHeroSection from "./AboutHeroSection";
import AboutPortfolioSection from "./AboutPortfolioSection";
import AboutProblemSection from "./AboutProblemSection";
import AboutSignalSection from "./AboutSignalSection";

export default function AboutPageClient() {
  return (
    <main className="w-full bg-[color:var(--color-bg-primary)]">
      <AboutHeroSection />
      <AboutProblemSection />
      <AboutSignalSection />
      <AboutAgentsSection />
      <AboutChairmanSection />
      <AboutPortfolioSection />
      <AboutDiscussionSection />
    </main>
  );
}
