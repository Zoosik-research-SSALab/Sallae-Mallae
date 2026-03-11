import { notFound } from "next/navigation";
import AuthCallbackClient from "./components/AuthCallbackClient";
import { isAuthProvider } from "@/shared/lib/auth";

type Props = {
  params: Promise<{
    provider: string;
  }>;
};

export default async function AuthCallbackPage({ params }: Props) {
  const { provider } = await params;

  if (!isAuthProvider(provider)) {
    notFound();
  }

  return <AuthCallbackClient provider={provider} />;
}
