"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthModalStore } from "@/shared/lib/authModalStore";

const LoginModal = dynamic(() => import("@/app/auth/login/components/LoginCard").then((module) => module.LoginModal), {
  ssr: false,
});

export default function GlobalAuthModal() {
  const pathname = usePathname();
  const isLoginModalOpen = useAuthModalStore((state) => state.isLoginModalOpen);
  const closeLoginModal = useAuthModalStore((state) => state.closeLoginModal);
  const shouldHideLoginModal = pathname === "/auth/login";

  useEffect(() => {
    if (shouldHideLoginModal && isLoginModalOpen) {
      closeLoginModal();
    }
  }, [closeLoginModal, isLoginModalOpen, shouldHideLoginModal]);

  if (!isLoginModalOpen || shouldHideLoginModal) {
    return null;
  }

  return <LoginModal open={isLoginModalOpen} onClose={closeLoginModal} />;
}
