import { NextRequest, NextResponse } from "next/server";
import { isMockAuthorized, shouldUseMockAuth } from "@/app/api/auth/mock";
import { AUTH_REFRESH_COOKIE_NAME } from "@/app/api/auth/utils";

export const dynamic = "force-dynamic";

type SpeakerId = "chart" | "news" | "fund" | "judge";

type TtsRequestBody = {
  text?: string;
  speaker?: SpeakerId;
};

const MAX_TTS_TEXT_LENGTH = 1000;
const VALID_SPEAKERS: readonly SpeakerId[] = ["chart", "news", "fund", "judge"];
const VOICE_ID_BY_SPEAKER: Record<SpeakerId, string> = {
  chart: "ELEVENLABS_VOICE_ID_CHART",
  news: "ELEVENLABS_VOICE_ID_NEWS",
  fund: "ELEVENLABS_VOICE_ID_FUND",
  judge: "ELEVENLABS_VOICE_ID_JUDGE",
};

function readEnvValue(key: string) {
  return process.env[key]?.trim();
}

function isSpeakerId(value: unknown): value is SpeakerId {
  return typeof value === "string" && VALID_SPEAKERS.includes(value as SpeakerId);
}

function isAuthorized(request: NextRequest) {
  if (shouldUseMockAuth()) {
    return isMockAuthorized(request);
  }

  return Boolean(request.headers.get("authorization")?.trim() || request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value);
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

export async function POST(request: NextRequest) {
  const apiKey = readEnvValue("ELEVENLABS_API_KEY");

  if (!apiKey) {
    return NextResponse.json({ message: "ELEVENLABS_API_KEY is not configured." }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ code: "AUTH_001", message: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as TtsRequestBody;
  const text = body.text?.trim();
  const speaker = body.speaker;

  if (!text || !speaker) {
    return NextResponse.json({ message: "text and speaker are required." }, { status: 400 });
  }

  if (!isSpeakerId(speaker)) {
    return NextResponse.json(
      { message: `speaker must be one of: ${VALID_SPEAKERS.join(", ")}.` },
      { status: 400 },
    );
  }

  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return NextResponse.json(
      { message: `text must be at most ${MAX_TTS_TEXT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const voiceId = readEnvValue(VOICE_ID_BY_SPEAKER[speaker]);

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

    console.error("[report-tts] ElevenLabs TTS request failed", {
      status: elevenlabsResponse.status,
      speaker,
      textLength: text.length,
      errorText,
    });

    return NextResponse.json(
      {
        message: "ElevenLabs TTS request failed.",
        status: elevenlabsResponse.status,
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
