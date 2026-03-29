import { NextRequest, NextResponse } from "next/server";
import { saveMockStorageObject } from "@/shared/lib/mockStorageStore";

function readObjectKey(request: NextRequest) {
  return request.nextUrl.searchParams.get("key")?.trim() ?? "";
}

export async function PUT(request: NextRequest) {
  const objectKey = readObjectKey(request);

  if (!objectKey) {
    return new NextResponse(null, { status: 400 });
  }

  const body = new Uint8Array(await request.arrayBuffer());
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";

  saveMockStorageObject(objectKey, {
    body,
    contentType,
  });

  return new NextResponse(null, { status: 200 });
}

