import { getPopularSearchesMock } from "@/shared/lib/mockMainData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(snakelizeKeys(getPopularSearchesMock()));
}
