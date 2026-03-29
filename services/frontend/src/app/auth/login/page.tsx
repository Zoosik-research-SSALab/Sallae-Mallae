"use client";

import { useState } from "react";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="stack">
      <section className="card stack">
        <h1>로그인</h1>
        <p className="muted">Redis refresh token / 블랙리스트 정책을 연결할 화면 뼈대입니다.</p>
      </section>

      <section className="card stack">
        <label className="field">
          <span>이메일</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </label>

        <label className="field">
          <span>비밀번호</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <Button variant="primary" disabled>
          로그인 (API 연결 예정)
        </Button>
      </section>
    </main>
  );
}
