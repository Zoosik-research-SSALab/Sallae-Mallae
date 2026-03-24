import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SpeakerId = "chart" | "news" | "fund" | "judge";

type TtsRequestBody = {
  text?: string;
  speaker?: SpeakerId;
};

function readEnvValue(key: string) {
  return process.env[key]?.trim();
}

function getVoiceSettings(speaker: SpeakerId) {
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

export async function POST(request: Request) {
  const apiKey = readEnvValue("ELEVENLABS_API_KEY");

  if (!apiKey) {
    return NextResponse.json({ message: "ELEVENLABS_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as TtsRequestBody;
  const text = body.text?.trim();
  const speaker = body.speaker;

  if (!text || !speaker) {
    return NextResponse.json({ message: "text and speaker are required." }, { status: 400 });
  }

  const voiceId =
    speaker === "chart"
      ? readEnvValue("ELEVENLABS_VOICE_ID_CHART")
      : speaker === "news"
        ? readEnvValue("ELEVENLABS_VOICE_ID_NEWS")
        : speaker === "fund"
          ? readEnvValue("ELEVENLABS_VOICE_ID_FUND")
          : readEnvValue("ELEVENLABS_VOICE_ID_JUDGE");

  if (!voiceId) {
    return NextResponse.json({ message: `Voice ID for speaker "${speaker}" is not configured.` }, { status: 500 });
  }

  const elevenlabsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: readEnvValue("ELEVENLABS_MODEL_ID") ?? "eleven_multilingual_v2",
        language_code: "ko",
        voice_settings: getVoiceSettings(speaker),
      }),
      cache: "no-store",
    },
  );

  if (!elevenlabsResponse.ok) {
    const errorText = await elevenlabsResponse.text();

    return NextResponse.json(
      {
        message: "ElevenLabs TTS request failed.",
        status: elevenlabsResponse.status,
        details: errorText,
      },
      { status: elevenlabsResponse.status },
    );
  }

  const audioBuffer = await elevenlabsResponse.arrayBuffer();

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
