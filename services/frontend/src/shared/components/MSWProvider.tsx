"use client";

import { useEffect } from "react";

export function MSWComponent() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_API_MOCKING === "true"
    ) {
      if (typeof window !== "undefined") {
        (async () => {
          const { worker } = await import("@/mocks/browser");
          worker.start({ onUnhandledRequest: "bypass" });
        })();
      }
    }
  }, []);

  return null;
}
