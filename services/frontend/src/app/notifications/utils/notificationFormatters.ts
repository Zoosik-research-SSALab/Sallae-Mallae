import type {
  NotificationGroup,
  NotificationItem,
  NotificationTab,
  NotificationType,
} from "../types/notifications";

const koDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const koDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function normalizeNotificationType(rawValue: string | null | undefined): NotificationType {
  const normalized = rawValue?.trim().toUpperCase().replace(/[\s-]+/g, "_") ?? "";

  switch (normalized) {
    case "BUY":
    case "매수":
      return "BUY";
    case "SELL":
    case "매도":
      return "SELL";
    case "SURGE_DOWN":
    case "PLUNGE":
    case "DROP":
    case "DOWN":
    case "급락":
      return "SURGE_DOWN";
    case "ANNOUNCEMENT":
    case "DISCLOSURE":
    case "NEW_DISCLOSURE":
    case "신규공시":
    case "공시":
      return "ANNOUNCEMENT";
    case "SURGE_UP":
    case "SURGE":
    case "RISE":
    case "UP":
    case "급등":
    default:
      return "SURGE_UP";
  }
}

export function getNotificationBadgeLabel(type: NotificationType) {
  switch (type) {
    case "BUY":
      return "매수";
    case "SELL":
      return "매도";
    case "SURGE_DOWN":
      return "급락";
    case "ANNOUNCEMENT":
      return "신규공시";
    case "SURGE_UP":
    default:
      return "급등";
  }
}

export function getNotificationBadgeClassName(type: NotificationType, isRead: boolean) {
  if (isRead) {
    return "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]";
  }

  switch (type) {
    case "BUY":
      return "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)] outline outline-1 outline-offset-[-1px] outline-[color:rgba(251,44,54,0.16)]";
    case "SELL":
      return "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)] outline outline-1 outline-offset-[-1px] outline-[color:rgba(43,127,255,0.18)]";
    case "SURGE_DOWN":
      return "bg-[color:var(--color-bg-success-subtle)] text-[color:var(--color-text-success-bold)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-success)]";
    case "ANNOUNCEMENT":
      return "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-disabled)]";
    case "SURGE_UP":
    default:
      return "bg-[color:var(--color-bg-warning-subtle)] text-[color:var(--color-text-warning)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-warning)]";
  }
}

export function formatNotificationTimestamp(createdAt: string | null) {
  if (!createdAt) {
    return "-";
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return "-";
  }

  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - createdDate.getTime()) / 60_000);

  if (diffMinutes < 1) {
    return "방금 전";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const sameDay = startOfDay(now).getTime() === startOfDay(createdDate).getTime();

  if (sameDay && diffHours < 6) {
    return `${diffHours}시간 전`;
  }

  if (sameDay) {
    return koDateTimeFormatter.format(createdDate);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (startOfDay(yesterday).getTime() === startOfDay(createdDate).getTime()) {
    return "어제";
  }

  return koDateFormatter.format(createdDate);
}

export function groupNotificationsByDate(items: NotificationItem[]): NotificationGroup[] {
  const groups = new Map<string, NotificationItem[]>();
  const now = new Date();
  const todayKey = startOfDay(now).toISOString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = startOfDay(yesterday).toISOString();

  items.forEach((item) => {
    const createdDate = item.createdAt ? new Date(item.createdAt) : null;
    const key = createdDate && !Number.isNaN(createdDate.getTime()) ? startOfDay(createdDate).toISOString() : "unknown";
    const bucket = groups.get(key);

    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  });

  return Array.from(groups.entries())
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([key, itemsInGroup]) => {
      if (key === todayKey) {
        return { label: "오늘", items: itemsInGroup };
      }

      if (key === yesterdayKey) {
        return { label: "어제", items: itemsInGroup };
      }

      if (key === "unknown") {
        return { label: "이전", items: itemsInGroup };
      }

      return {
        label: koDateFormatter.format(new Date(key)),
        items: itemsInGroup,
      };
    });
}

export function getNotificationTabForType(type: NotificationType): Exclude<NotificationTab, "ALL"> {
  switch (type) {
    case "BUY":
    case "SELL":
      return "SIGNAL";
    case "ANNOUNCEMENT":
      return "ANNOUNCEMENT";
    case "SURGE_DOWN":
    case "SURGE_UP":
    default:
      return "SURGE";
  }
}

export function getNotificationActionHref(item: NotificationItem) {
  switch (item.notiType) {
    case "BUY":
    case "SELL":
      return `/reports/${item.stockId}`;
    case "SURGE_DOWN":
    case "SURGE_UP":
      return `/stocks/${item.stockId}`;
    case "ANNOUNCEMENT":
    default:
      return null;
  }
}

export function getNotificationAvatarLabel(stockName: string) {
  const trimmed = stockName.trim();
  if (!trimmed) {
    return "로고";
  }

  return trimmed.slice(0, 2);
}
