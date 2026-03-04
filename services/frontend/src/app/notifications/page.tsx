"use client";

import NotificationFilter from "./components/NotificationFilter";
import NotificationList from "./components/NotificationList";
import { useNotifications } from "./hooks/useNotifications";

export default function NotificationsPage() {
  const {
    items,
    isLoading,
    isFetchingMore,
    error,
    hasNext,
    loadMore,
    reload,
    typeFilter,
    setTypeFilter,
  } = useNotifications();

  return (
    <main className="stack">
      <section className="card stack">
        <h1>알림함</h1>
        <p className="muted">기본 페이지네이션 크기 6개, 타입 필터(BUY/SELL/급등락/공시) 반영 구조</p>
      </section>

      <section className="card stack">
        <NotificationFilter typeFilter={typeFilter} onChange={setTypeFilter} />
        {isLoading ? <p>알림 로딩 중...</p> : null}
        {error ? (
          <div className="stack">
            <p className="badge badge--danger">{error}</p>
            <button type="button" className="button" onClick={reload}>
              다시 시도
            </button>
          </div>
        ) : null}
        {!isLoading && !error ? <NotificationList items={items} /> : null}

        <div className="row">
          <button
            type="button"
            className="button button--soft"
            onClick={loadMore}
            disabled={!hasNext || isFetchingMore}
          >
            {isFetchingMore ? "불러오는 중..." : "더 보기"}
          </button>
          {!hasNext ? <span className="muted">마지막 페이지입니다.</span> : null}
        </div>
      </section>
    </main>
  );
}
