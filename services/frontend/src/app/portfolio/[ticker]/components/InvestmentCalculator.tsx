"use client";

import { useState } from "react";

export default function InvestmentCalculator() {
  const [amount, setAmount] = useState("1000");

  return (
    <div className="flex items-center justify-between rounded-xl bg-bg-tertiary px-6 py-4">
      <div className="flex flex-1 flex-col gap-1">
        <p className="typo-body-lg font-extrabold text-text-primary">
          내 투자금으로 계산해보기
        </p>
        <p className="typo-body-sm font-medium text-text-secondary">
          원금을 입력하면 수익금과 보유 수량이 자동 계산됩니다.
        </p>
      </div>

      <div className="flex flex-1 items-center gap-1 rounded-lg border border-border-primary bg-bg-primary p-3 overflow-hidden">
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="flex-1 min-w-0 text-right typo-body-lg font-semibold text-text-primary bg-transparent outline-none"
        />
        <span className="shrink-0 typo-body-lg font-semibold text-text-secondary">
          만원
        </span>
      </div>
    </div>
  );
}
