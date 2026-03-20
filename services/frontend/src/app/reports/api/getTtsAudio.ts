type TtsSpeakerId = "chart" | "news" | "fund" | "judge";

export async function getTtsAudio(text: string, speaker: TtsSpeakerId, signal?: AbortSignal) {
  const response = await fetch("/api/reports/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, speaker }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch TTS audio.");
  }

  return response.blob();
}
