"use client";

import { useState } from "react";

export default function InvestmentCalculator() {
  const [amount, setAmount] = useState("1000");

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--color-bg-tertiary)] px-6 py-4">
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-base font-extrabold text-[color:var(--color-text-primary)] leading-6">
          내 투자금으로 계산해보기
        </p>
        <p className="text-xs font-medium text-[color:var(--color-text-secondary)] leading-4">
          원금을 입력하면 수익금과 보유 수량이 자동 계산됩니다.
        </p>
      </div>

      <div className="flex flex-1 items-center gap-1 rounded-lg border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-3.5 py-3 overflow-hidden">
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="flex-1 min-w-0 text-right text-base font-semibold text-[color:var(--color-text-primary)] leading-6 bg-transparent outline-none"
        />
        <span className="shrink-0 text-base font-semibold text-[color:var(--color-text-secondary)] leading-6">
          만원
        </span>
      </div>
    </div>
  );
}
