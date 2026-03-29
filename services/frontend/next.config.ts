import type { NextConfig } from "next";

function getStockIconRemotePattern() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  const normalized = configured.endsWith("/api") ? configured.slice(0, -4) : configured;

  try {
    const url = new URL(normalized.endsWith("/") ? normalized : `${normalized}/`);
    url.pathname = "/**";
    return url;
  } catch {
    return new URL("https://j14d208.p.ssafy.io/**");
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [getStockIconRemotePattern()],
  },
};

export default nextConfig;
