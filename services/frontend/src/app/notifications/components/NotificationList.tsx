import type { NotificationItem } from "../types/notifications";
import { groupNotificationsByDate } from "../utils/notificationFormatters";
import NotificationListItem from "./NotificationListItem";

type Props = {
  items: NotificationItem[];
  isLoading: boolean;
  onItemClick: (item: NotificationItem) => void;
  onDelete: (item: NotificationItem) => void;
};

function NotificationListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-[color:var(--color-border-primary)] py-4 lg:gap-5 lg:py-6">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[color:var(--color-bg-secondary)]" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationList({ items, isLoading, onItemClick, onDelete }: Props) {
  if (isLoading) {
    return <NotificationListSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-56 w-full items-center justify-center rounded-3xl bg-[color:var(--color-bg-secondary)] px-6 text-center text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">
        알림이 없습니다.
      </div>
    );
  }

  const groupedItems = groupNotificationsByDate(items);

  return (
    <div className="flex w-full flex-col">
      {groupedItems.map((group) => (
        <section key={group.label} className="flex flex-col">
          <div className="py-3 text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)] lg:text-sm lg:leading-5">
            {group.label}
          </div>

          {group.items.map((item, index) => (
            <div key={item.id} className="flex flex-col">
              <NotificationListItem item={item} onClick={onItemClick} onDelete={onDelete} />
              {index < group.items.length - 1 ? (
                <div
                  className="mx-2 my-1 h-px bg-[color:var(--color-border-primary)] lg:mx-2.5 lg:my-1.5"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
