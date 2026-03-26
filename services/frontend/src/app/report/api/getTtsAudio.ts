import { getOrCreateAuthDeviceId } from "@/shared/lib/authDevice";
import { readAccessToken } from "@/shared/lib/authStore";

type TtsSpeakerId = "chart" | "news" | "fund" | "judge";

export async function getTtsAudio(text: string, speaker: TtsSpeakerId, signal?: AbortSignal) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  const accessToken = readAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (typeof document !== "undefined") {
    headers.set("X-Device-Id", getOrCreateAuthDeviceId());
  }

  const response = await fetch("/api/report/tts", {
    method: "POST",
    headers,
    body: JSON.stringify({ text, speaker }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch TTS audio.");
  }

  return response.blob();
}
