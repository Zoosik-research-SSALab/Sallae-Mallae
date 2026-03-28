import { NextRequest, NextResponse } from "next/server";
import { readMockAuthUser } from "@/app/api/auth/mock";
import {
  createUnauthorizedResponse,
  proxyUsersApiRequest,
  shouldUseMockUsersApi,
} from "@/app/api/users/utils";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_FILE_SIZE = 5_242_880;

function getMockFileExtension(fileName: string, contentType: string) {
  const trimmedFileName = fileName.trim();
  const matchedExtension = /\.[a-z0-9]+$/i.exec(trimmedFileName)?.[0];

  if (matchedExtension) {
    return matchedExtension.toLowerCase();
  }

  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

export async function POST(request: NextRequest) {
  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: "/api/storage/presigned-url",
      method: "POST",
    });
  }

  const currentUser = readMockAuthUser(request);

  if (!currentUser) {
    return createUnauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as
    | {
        fileName?: unknown;
        contentType?: unknown;
        fileSize?: unknown;
      }
    | null;

  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType.trim() : "";
  const fileSize = typeof body?.fileSize === "number" ? body.fileSize : NaN;

  if (!fileName || !contentType || Number.isNaN(fileSize)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "STORAGE_001",
          message: "프로필 이미지 업로드 준비에 실패했습니다.",
        },
      },
      { status: 400 },
    );
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "STORAGE_002",
          message: "허용되지 않는 파일 형식입니다.",
        },
      },
      { status: 400 },
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "STORAGE_003",
          message: "파일 크기는 5MB 이하여야 합니다.",
        },
      },
      { status: 400 },
    );
  }

  const objectKey = `profiles/${currentUser.userId}/${crypto.randomUUID()}${getMockFileExtension(fileName, contentType)}`;
  const uploadUrl = new URL(`/api/storage/mock-upload?key=${encodeURIComponent(objectKey)}`, request.nextUrl.origin).toString();
  const fileUrl = new URL(`/api/storage/mock-file?key=${encodeURIComponent(objectKey)}`, request.nextUrl.origin).toString();

  return NextResponse.json({
    success: true,
    data: {
      uploadUrl,
      fileUrl,
    },
    error: null,
  });
}
