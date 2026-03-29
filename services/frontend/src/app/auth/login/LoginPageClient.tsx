"use client";

import { useRouter } from "next/navigation";
import { LoginCard } from "./components/LoginCard";

type Props = {
  redirect: string;
};

export default function LoginPageClient({ redirect }: Props) {
  const router = useRouter();

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[color:var(--color-bg-secondary)] px-4 py-10">
      <LoginCard
        showCloseButton
        onClose={() => router.push("/")}
        onAuthenticated={() => router.replace(redirect)}
        onOpenSignup={() => router.push("/auth/signup")}
      />
    </main>
  );
}
