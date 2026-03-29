import Link from "next/link";

type NotificationBellProps = {
  count: number;
  href?: string;
};

export default function NotificationBell({ count, href = "/notifications" }: NotificationBellProps) {
  const hasUnread = count > 0;
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <Link href={href} className="relative inline-flex h-10 w-10 items-center justify-center" aria-label="Notifications">
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 text-[color:var(--color-border-base)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M9.9 20a2.5 2.5 0 0 0 4.2 0" />
      </svg>

      {hasUnread ? (
        <span className="absolute right-0 top-0 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-bg-danger-bold)] px-1 text-[10px] font-bold leading-[10px] text-[color:var(--color-text-interactive-inverse)]">
          {displayCount}
        </span>
      ) : null}
    </Link>
  );
}
