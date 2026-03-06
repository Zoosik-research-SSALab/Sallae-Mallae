import { NextRequest, NextResponse } from "next/server";
import { extractSessionUser, type SessionUser } from "@/shared/lib/authSession";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

const DEFAULT_MOCK_USER: SessionUser = {
  id: 1,
  email: "demo@sallaemallae.ai",
  nickname: "데모 유저",
  profile_image_url: "/images/profile-placeholder.svg",
};

function shouldUseMock() {
  const raw = process.env.AUTH_USE_MOCK;
  if (!raw) {
    return true;
  }
  return raw === "true";
}

function normalizeBaseUrl(raw: string) {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function readRequestBody(request: NextRequest): Promise<LoginRequestBody> {
  try {
    const payload = (await request.json()) as LoginRequestBody;
    return payload ?? {};
  } catch {
    return {};
  }
}

async function readJsonSafe(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await readRequestBody(request);

  if (shouldUseMock()) {
    return NextResponse.json({
      success: true,
      source: "mock",
      user: DEFAULT_MOCK_USER,
      request: body,
      message: "Mock login success",
    });
  }

  const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
  if (!authApiBaseUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "AUTH_API_BASE_URL is not configured. Set AUTH_USE_MOCK=true or provide AUTH_API_BASE_URL.",
      },
      { status: 500 },
    );
  }

  const targetUrl = `${normalizeBaseUrl(authApiBaseUrl)}/api/auth/login`;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const upstreamPayload = await readJsonSafe(upstreamResponse);
    const user = extractSessionUser(upstreamPayload);

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Login request failed",
          upstreamStatus: upstreamResponse.status,
          upstreamPayload,
        },
        { status: upstreamResponse.status },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Login response does not include a valid user object",
          upstreamPayload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      source: "api",
      user,
      upstreamPayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      {
        success: false,
        message: `Login request error: ${message}`,
      },
      { status: 500 },
    );
  }
}
