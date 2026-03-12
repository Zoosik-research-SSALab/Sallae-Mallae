import { NextResponse } from "next/server";
import { getMockAnnouncementDetail } from "@/app/stocks/utils/mockStockDetailData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    stockId: string;
    announcementId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { stockId, announcementId } = await context.params;
  const parsedAnnouncementId = Number(announcementId);

  if (!stockId || !Number.isFinite(parsedAnnouncementId)) {
    return NextResponse.json(
      {
        message: "Invalid announcement request",
      },
      { status: 400 },
    );
  }

  const announcement = getMockAnnouncementDetail(stockId, parsedAnnouncementId);

  if (!announcement) {
    return NextResponse.json(
      {
        message: "Announcement not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(snakelizeKeys(announcement));
}
