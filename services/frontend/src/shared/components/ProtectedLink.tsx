"use client";

import Link, { type LinkProps } from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useRequireAuthAction } from "@/shared/hooks/useRequireAuthAction";

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
  ariaCurrent?: "page";
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function ProtectedLink({ children, onClick, ariaCurrent, ...props }: Props) {
  const requireAuthAction = useRequireAuthAction();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const isModifiedClick =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

    if (isModifiedClick) {
      if (!requireAuthAction()) {
        event.preventDefault();
      }
      return;
    }

    const canNavigate = requireAuthAction();
    if (!canNavigate) {
      event.preventDefault();
    }
  };

  return (
    <Link {...props} aria-current={ariaCurrent} onClick={handleClick}>
      {children}
    </Link>
  );
}
