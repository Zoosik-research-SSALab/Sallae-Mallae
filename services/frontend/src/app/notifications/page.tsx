"use client";

import NotificationFilter from "./components/NotificationFilter";
import NotificationList from "./components/NotificationList";
import { useNotifications } from "./hooks/useNotifications";
import ProtectedPage from "@/shared/components/ProtectedPage";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";

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
    <ProtectedPage>
      <main className="stack">
        <section className="card stack">
          <h1 className="heading-reset">알림함</h1>
          <p className="muted">기본 페이지네이션 크기 6개, 타입 필터(BUY/SELL/급등락/공시) 반영 구조</p>
        </section>

        <section className="card stack">
          <NotificationFilter typeFilter={typeFilter} onChange={setTypeFilter} />
          {isLoading ? <p>알림 로딩 중...</p> : null}
          {error ? (
            <div className="stack">
              <Badge tone="danger">{error}</Badge>
              <Button onClick={reload}>
                다시 시도
              </Button>
            </div>
          ) : null}
          {!isLoading && !error ? <NotificationList items={items} /> : null}

          <div className="row">
            <Button variant="soft" onClick={loadMore} disabled={!hasNext || isFetchingMore}>
              {isFetchingMore ? "불러오는 중..." : "더 보기"}
            </Button>
            {!hasNext ? <span className="muted">마지막 페이지입니다.</span> : null}
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}
