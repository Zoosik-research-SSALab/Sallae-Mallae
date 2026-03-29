"use client";

import { useState } from "react";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";

type Props = {
  ticker: string;
};

export default function AlertSettingCard({ ticker }: Props) {
  const [isAlarmOn, setIsAlarmOn] = useState(true);

  return (
    <section className="card stack">
      <div className="row-between">
        <h3>개별 종목 알림 설정</h3>
        <Badge tone={isAlarmOn ? "ok" : "warn"}>
          {isAlarmOn ? "ON" : "OFF"}
        </Badge>
      </div>
      <p className="muted">
        {ticker} 관심종목 알림만 끄는 설정입니다. (ERD: user_watchlist.is_alarm_on)
      </p>
      <Button variant="soft" onClick={() => setIsAlarmOn((prev) => !prev)}>
        {isAlarmOn ? "이 종목 알림 끄기" : "이 종목 알림 켜기"}
      </Button>
      <p className="muted">TODO: 백엔드 watchlist API 연동</p>
    </section>
  );
}
