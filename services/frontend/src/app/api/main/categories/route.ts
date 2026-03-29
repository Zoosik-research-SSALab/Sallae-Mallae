import { getCategoriesMock } from "@/shared/lib/mockMainData";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET() {
  return createSseResponse(() => snakelizeKeys(getCategoriesMock()));
}
