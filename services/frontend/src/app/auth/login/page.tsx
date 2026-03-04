"use client";

import { useState } from "react";

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
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </label>

        <label className="field">
          <span>비밀번호</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="button" className="button button--primary" disabled>
          로그인 (API 연결 예정)
        </button>
      </section>
    </main>
  );
}
