"use client";

import { useState } from "react";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

export default function SignupPage() {
  const [agreedRequired, setAgreedRequired] = useState(false);
  const [agreedEmailOptIn, setAgreedEmailOptIn] = useState(false);

  return (
    <main className="stack">
      <section className="card stack">
        <h1>회원가입</h1>
        <p className="muted">users + terms + user_agreements ERD 기준 입력/동의 구조 보일러플레이트</p>
      </section>

      <section className="card stack">
        <label className="field">
          <span>이메일</span>
          <Input type="email" placeholder="user@example.com" />
        </label>
        <label className="field">
          <span>닉네임</span>
          <Input type="text" placeholder="닉네임" maxLength={20} />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <Input type="password" placeholder="8자 이상" />
        </label>

        <label className="row">
          <input
            type="checkbox"
            checked={agreedRequired}
            onChange={(e) => setAgreedRequired(e.target.checked)}
          />
          <span>[필수] 서비스/개인정보 약관 동의</span>
        </label>

        <label className="row">
          <input
            type="checkbox"
            checked={agreedEmailOptIn}
            onChange={(e) => setAgreedEmailOptIn(e.target.checked)}
          />
          <span>[선택] 이메일 수신 동의</span>
        </label>

        <Button variant="primary" disabled={!agreedRequired}>
          가입하기 (API 연결 예정)
        </Button>
      </section>
    </main>
  );
}
