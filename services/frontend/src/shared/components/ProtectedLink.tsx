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

export default function ProtectedLink({ children, onClick, ...props }: Props) {
  const requireAuthAction = useRequireAuthAction();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const isModifiedClick =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

    if (isModifiedClick) {
      event.preventDefault();
      requireAuthAction();
      return;
    }

    const canNavigate = requireAuthAction();
    if (!canNavigate) {
      event.preventDefault();
    }
  };

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
