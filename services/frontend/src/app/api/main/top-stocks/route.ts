import { getTopStocksMock } from "@/shared/lib/mockMainData";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const payload = snakelizeKeys(getTopStocksMock());
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/event-stream")) {
    return createSseResponse(() => payload);
  }

  return Response.json(payload);
}
