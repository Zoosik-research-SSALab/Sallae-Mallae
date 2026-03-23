"use client";

import { memo, useState } from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import { cn } from "@/shared/utils/cn";
import type { NotificationItem } from "../types/notifications";
import {
  formatNotificationTimestamp,
  getNotificationAvatarLabel,
  getNotificationBadgeClassName,
  getNotificationBadgeLabel,
} from "../utils/notificationFormatters";

type Props = {
  item: NotificationItem;
  onClick: (item: NotificationItem) => void;
  onDelete: (item: NotificationItem) => void;
};

function NotificationListItem({ item, onClick, onDelete }: Props) {
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const badgeLabel = getNotificationBadgeLabel(item.notiType);
  const timeLabel = formatNotificationTimestamp(item.createdAt);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(item);
        }
      }}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)] lg:gap-5 lg:py-4 lg:pl-2",
        !isDeleteHovered && "hover:bg-[color:var(--color-bg-secondary)]",
      )}
    >
      <div className="flex w-1.5 justify-center">
        {!item.isRead ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-icon-interactive-primary)]" aria-hidden />
        ) : null}
      </div>

      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold leading-4 text-[color:var(--color-text-base)]",
          item.isRead
            ? "bg-[color:var(--color-bg-interactive-secondary-pressed)]"
            : "bg-[color:var(--color-bg-interactive-primary)]",
        )}
      >
        {getNotificationAvatarLabel(item.stockName)}
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-sm font-extrabold leading-5 lg:text-base lg:leading-6",
                item.isRead
                  ? "text-[color:var(--color-text-disabled)]"
                  : "text-[color:var(--color-text-primary)]",
              )}
            >
              {item.stockName}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold leading-4 lg:text-xs",
                getNotificationBadgeClassName(item.notiType, item.isRead),
              )}
            >
              {badgeLabel}
            </span>
          </div>

          <p
            className={cn(
              "text-xs font-semibold leading-4 lg:text-sm lg:leading-5",
              item.isRead
                ? "text-[color:var(--color-text-tertiary)]"
                : "text-[color:var(--color-text-secondary)]",
            )}
          >
            {item.message}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <span
            className={cn(
              "text-[10px] font-medium leading-4 lg:text-xs",
              item.isRead
                ? "text-[color:var(--color-text-tertiary)]"
                : "font-semibold text-[color:var(--color-text-info)]",
            )}
          >
            {timeLabel}
          </span>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item);
            }}
            onMouseEnter={() => setIsDeleteHovered(true)}
            onMouseLeave={() => setIsDeleteHovered(false)}
            onFocus={() => setIsDeleteHovered(true)}
            onBlur={() => setIsDeleteHovered(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] hover:text-[color:var(--color-text-secondary)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
            aria-label={`${item.stockName} 알림 삭제`}
          >
            <FaRegTrashAlt className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(NotificationListItem);
