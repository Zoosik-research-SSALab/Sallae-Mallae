import SignalsPageClient from "./SignalsPageClient";
import ProtectedPage from "@/shared/components/ProtectedPage";

export default function SignalsPage() {
  return (
    <ProtectedPage>
      <SignalsPageClient />
    </ProtectedPage>
  );
}
