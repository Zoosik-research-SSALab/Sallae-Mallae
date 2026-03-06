"use client";

import { useSearch } from "../hooks/useSearch";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

export default function SearchPanel() {
  const { keyword, setKeyword, items, isLoading, error, search } = useSearch();

  return (
    <section className="card stack">
      <div className="row">
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="종목명/티커 검색"
        />
        <Button variant="primary" onClick={search}>
          검색
        </Button>
      </div>

      {isLoading ? <p>검색 중...</p> : null}
      {error ? <Badge tone="danger">{error}</Badge> : null}
      {!isLoading && !error && items.length === 0 ? <p className="muted">검색 결과가 없습니다.</p> : null}
      <div className="list">
        {items.map((item, idx) => (
          <article key={`${item.ticker}-${idx}`} className="list-item row-between">
            <strong>{item.keyword}</strong>
            <Badge>{item.ticker}</Badge>
          </article>
        ))}
      </div>
    </section>
  );
}
