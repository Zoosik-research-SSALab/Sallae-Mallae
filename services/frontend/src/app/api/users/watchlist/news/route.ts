import { NextResponse } from "next/server";
import { getMockWatchlistNews } from "@/shared/lib/mockWatchlistStore";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(snakelizeKeys(getMockWatchlistNews()));
}
