import type { NotificationItem } from "../_api/getNotifications";

type Props = {
  items: NotificationItem[];
};

export default function NotificationList({ items }: Props) {
  if (items.length === 0) {
    return <p className="muted">알림이 없습니다. (최신 30일 보관 정책)</p>;
  }

  return (
    <div className="list">
      {items.map((item) => (
        <article key={item.id} className="list-item stack">
          <div className="row-between">
            <span className="badge">{item.notifyType}</span>
            <span className="muted">{item.createdAt}</span>
          </div>
          <strong>{item.title}</strong>
          <p className="muted">{item.message}</p>
          {item.linkUrl ? (
            <a className="link" href={item.linkUrl}>
              관련 페이지 이동
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
