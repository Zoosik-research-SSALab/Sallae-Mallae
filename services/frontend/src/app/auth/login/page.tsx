import LoginPageClient from "./LoginPageClient";

type Props = {
  searchParams: Promise<{
    redirect?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams;

  return <LoginPageClient redirect={redirect || "/"} />;
}
