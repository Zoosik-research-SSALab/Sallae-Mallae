"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBadgeClassName } from "@/shared/ui/Badge";

type HealthPayload = {
  status?: string;
  service?: string;
};

export default function HomePage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const payload = (await response.json()) as HealthPayload;
        setHealth(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        setHealthError(message);
      }
    };

    run();
  }, []);

  return (
    <main className="stack">
      <section className="card stack">
        <h1>살래말래 위원회 FE 보일러플레이트</h1>
        <p className="muted">
          기능 명세 + ERD 기준으로 페이지 기반 구조를 먼저 고정했습니다. 지금 단계는 UI/라우팅/호출 뼈대 중심입니다.
        </p>
      </section>

      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi__label">백엔드 헬스</div>
          <div className="kpi__value">{health?.status ?? "-"}</div>
          {healthError ? <p className="muted">연결 실패: {healthError}</p> : null}
        </div>
        <div className="kpi">
          <div className="kpi__label">MVP 포함</div>
          <div className="kpi__value">Main / Stock / Report / Signal / News</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">보일러플레이트 범위</div>
          <div className="kpi__value">동작 구현 없이 라우팅/구조만 제공</div>
        </div>
      </section>

      <section className="card stack">
        <h2>핵심 페이지</h2>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link className={getBadgeClassName()} href="/search">
            검색창
          </Link>
          <Link className={getBadgeClassName()} href="/signals">
            AI 매매신호
          </Link>
          <Link className={getBadgeClassName()} href="/stocks">
            종목 목록
          </Link>
          <Link className={getBadgeClassName()} href="/stocks/005930">
            종목 상세
          </Link>
          <Link className={getBadgeClassName()} href="/reports">
            AI 리포트
          </Link>
          <Link className={getBadgeClassName()} href="/portfolio">
            의장 포트폴리오
          </Link>
          <Link className={getBadgeClassName()} href="/scraps">
            스크랩 목록
          </Link>
          <Link className={getBadgeClassName()} href="/notifications">
            알림함
          </Link>
          <Link className={getBadgeClassName()} href="/news">
            뉴스
          </Link>
          <Link className={getBadgeClassName()} href="/auth/login">
            로그인
          </Link>
          <Link className={getBadgeClassName()} href="/auth/signup">
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}
