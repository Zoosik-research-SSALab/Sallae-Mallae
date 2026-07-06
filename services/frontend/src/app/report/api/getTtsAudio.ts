type TtsSpeakerId = "chart" | "news" | "fund" | "judge";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const OUTPUT_FORMAT = "mp3_44100_128";

const VOICE_IDS: Record<TtsSpeakerId, string> = {
  chart: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID_CHART ?? "",
  news: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID_NEWS ?? "",
  fund: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID_FUND ?? "",
  judge: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID_JUDGE ?? "",
};

function getVoiceSettings(speaker: TtsSpeakerId) {
  if (speaker === "judge") {
    return {
      stability: 0.55,
      similarity_boost: 0.8,
      style: 0.25,
      speed: 0.96,
      use_speaker_boost: true,
    };
  }

  return {
    stability: 0.45,
    similarity_boost: 0.78,
    style: 0.18,
    speed: 1,
    use_speaker_boost: true,
  };
}

export async function getTtsAudio(text: string, speaker: TtsSpeakerId, signal?: AbortSignal) {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "";
  const voiceId = VOICE_IDS[speaker];
  const modelId = process.env.NEXT_PUBLIC_ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";

  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs API key or voice ID is not configured.");
  }

  const response = await fetch(
    `${ELEVENLABS_API_URL}/${voiceId}?output_format=${OUTPUT_FORMAT}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        language_code: "ko",
        voice_settings: getVoiceSettings(speaker),
      }),
      signal,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `ElevenLabs TTS failed: ${response.status}`);
  }

  return response.blob();
}
