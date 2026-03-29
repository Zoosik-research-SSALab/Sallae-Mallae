import { getNewSignalsMock } from "@/shared/lib/mockMainData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    snakelizeKeys({
      success: true,
      data: getNewSignalsMock(),
      error: null,
    }),
  );
}
