"use client";

import dynamic from "next/dynamic";
import { useAuthModalStore } from "@/shared/lib/authModalStore";

const LoginModal = dynamic(() => import("@/app/auth/login/components/LoginCard").then((module) => module.LoginModal), {
  ssr: false,
});

export default function GlobalAuthModal() {
  const isLoginModalOpen = useAuthModalStore((state) => state.isLoginModalOpen);
  const closeLoginModal = useAuthModalStore((state) => state.closeLoginModal);

  if (!isLoginModalOpen) {
    return null;
  }

  return <LoginModal open={isLoginModalOpen} onClose={closeLoginModal} />;
}
