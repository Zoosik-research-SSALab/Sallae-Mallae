import { NextRequest, NextResponse } from "next/server";
import { getMockStorageObject } from "@/shared/lib/mockStorageStore";

function readObjectKey(request: NextRequest) {
  return request.nextUrl.searchParams.get("key")?.trim() ?? "";
}

export async function GET(request: NextRequest) {
  const objectKey = readObjectKey(request);

  if (!objectKey) {
    return new NextResponse(null, { status: 404 });
  }

  const storedObject = getMockStorageObject(objectKey);

  if (!storedObject) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(Buffer.from(storedObject.body), {
    status: 200,
    headers: {
      "Content-Type": storedObject.contentType,
      "Cache-Control": "no-store",
    },
  });
}
