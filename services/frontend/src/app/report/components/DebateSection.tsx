"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaQuoteLeft } from "react-icons/fa6";
import { cn } from "@/shared/utils/cn";
import { getTtsAudio } from "../api/getTtsAudio";
import type { AgentStatement, DebateReport } from "../types/debate";
import { getPersistedTtsBlob, setPersistedTtsBlob } from "../utils/ttsCache";

export interface DebateSectionProps {
  stockId: string;
  companyName?: string;
  report?: DebateReport | null;
  onPhaseChange?: (phase: StagePhase) => void;
  onSpeechIndexChange?: (index: number) => void;
  onRoundIntroChange?: (roundLabel: string | null) => void;
}

export type StagePhase = "ready" | "video" | "debate" | "outro" | "loading" | "judge" | "ended";
export type SpeakerId = "chart" | "news" | "fund";

interface SpeakerConfig {
  id: SpeakerId;
  committeeName: string;
  roleName: string;
  imageSrc: string;
  talkingImageSrc: string;
  accentTextClassName: string;
  chipClassName: string;
  opinionClassName: string;
}

export interface DebateSpeech {
  speakerId: SpeakerId;
  roundLabel: string;
  segmentLabel: string;
  message: string;
}

interface JudgmentSummaryItem {
  id: SpeakerId;
  leadText: string;
  highlightText: string;
  highlightClassName: string;
}

type TtsSpeakerId = SpeakerId | "judge";

const introVideoSrc = "/videos/reports/debate/intro.mp4";
const debateBgmSrc = "/audio/reports/debate/bgm.mp3";
const BGM_BASE_VOLUME = 0.15;
const BGM_HIGHLIGHT_VOLUME = 0.3;
const BGM_DUCK_RATIO = 0.4;
const DEFAULT_TTS_PLAYBACK_RATE = 1;
const FUND_TTS_PLAYBACK_RATE = 1.08;
const JUDGE_TTS_PLAYBACK_RATE = 1.08;

const speakers: SpeakerConfig[] = [
  {
    id: "chart",
    committeeName: "차트 위원",
    roleName: "차트 분석가",
    imageSrc: "/images/reports/debate/chart_idle.png",
    talkingImageSrc: "/images/reports/debate/chart_talking.gif",
    accentTextClassName: "text-[color:var(--color-text-info)]",
    chipClassName:
      "border-[color:rgba(43,127,255,0.18)] bg-[color:rgba(43,127,255,0.14)] text-[color:var(--color-text-info)]",
    opinionClassName: "text-[color:var(--color-blue-700)]",
  },
  {
    id: "news",
    committeeName: "뉴스 위원",
    roleName: "뉴스 전문가",
    imageSrc: "/images/reports/debate/news_idle.png",
    talkingImageSrc: "/images/reports/debate/news_talking.gif",
    accentTextClassName: "text-[color:var(--color-purple-600)]",
    chipClassName:
      "border-[color:rgba(152,16,250,0.18)] bg-[color:rgba(152,16,250,0.14)] text-[color:var(--color-purple-400)]",
    opinionClassName: "text-[color:var(--color-neutral-700)]",
  },
  {
    id: "fund",
    committeeName: "펀더멘탈 위원",
    roleName: "펀더멘탈 위원",
    imageSrc: "/images/reports/debate/fund_idle.png",
    talkingImageSrc: "/images/reports/debate/fund_talking.gif",
    accentTextClassName: "text-[color:var(--color-green-700)]",
    chipClassName:
      "border-[color:rgba(0,166,62,0.18)] bg-[color:rgba(0,166,62,0.14)] text-[color:var(--color-green-300)]",
    opinionClassName: "text-[color:var(--color-green-700)]",
  },
];

const judgeTalkingImageSrc = "/images/reports/debate/judge_talking.gif";
const judgeFallbackImageSrc = "/images/reports/debate/judge_result.png";

const speakerIdByAgentName: Record<string, SpeakerId> = {
  "차트 분석가": "chart",
  "차트 위원": "chart",
  "뉴스 전문가": "news",
  "뉴스 위원": "news",
  "펀더멘탈 위원": "fund",
};

function formatRoundLabel(roundNo: number) {
  return `Round ${roundNo}: 위원 의견 발표`;
}

const detailLabels = ["근거", "리스크", "실행"] as const;
const detailLabelToKey: Record<string, keyof AgentStatement["details"]> = {
  "근거": "basis",
  "리스크": "risk",
  "실행": "action",
};

export function parseAgentStatement(content: string): AgentStatement {
  const normalized = content.trim();
  if (!normalized) {
    return { opinion: "", details: { basis: [], risk: [], action: [] } };
  }

  const escapedLabels = detailLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const segmentRegex = new RegExp(`(${escapedLabels.join("|")})\\s*:`, "g");
  const matches = Array.from(normalized.matchAll(segmentRegex));

  const firstDetailStart = matches.length > 0 ? (matches[0].index ?? normalized.length) : normalized.length;
  const opinion = normalized.slice(0, firstDetailStart).replace(/^\s*의견\s*:\s*/, "").trim();

  const details: AgentStatement["details"] = { basis: [], risk: [], action: [] };

  matches.forEach((match, index) => {
    const label = match[1];
    const key = detailLabelToKey[label];
    if (!key) return;

    const contentStart = (match.index ?? 0) + match[0].length;
    const nextStart = index < matches.length - 1 ? (matches[index + 1].index ?? normalized.length) : normalized.length;
    const rawText = normalized.slice(contentStart, nextStart).trim();

    if (rawText) {
      const items = rawText.split("/").map((part) => part.trim()).filter(Boolean);
      details[key].push(...items);
    }
  });

  return { opinion, details };
}

export function getDebateSpeeches(report?: DebateReport | null): DebateSpeech[] {
  if (!report) {
    return [];
  }

  return report.debate.rounds.flatMap((round) =>
    round.agents
      .map((agent) => {
        const statement = parseAgentStatement(agent.opinion);
        if (!statement.opinion) return null;
        return {
          speakerId: speakerIdByAgentName[agent.name] ?? ("chart" as SpeakerId),
          roundLabel: formatRoundLabel(round.roundNo),
          segmentLabel: "의견",
          message: statement.opinion,
        };
      })
      .filter((speech): speech is DebateSpeech => speech !== null),
  );
}

export function getDebateStatements(report?: DebateReport | null): Map<string, AgentStatement> {
  const map = new Map<string, AgentStatement>();
  if (!report) return map;

  for (const round of report.debate.rounds) {
    for (const agent of round.agents) {
      const speakerId = speakerIdByAgentName[agent.name] ?? "chart";
      const key = `${round.roundNo}-${speakerId}`;
      map.set(key, parseAgentStatement(agent.opinion));
    }
  }

  return map;
}

function getJudgmentLeadText(speakerId: SpeakerId) {
  if (speakerId === "chart") {
    return "차트위원의 추세 전환 분석을 보았을 때";
  }
  if (speakerId === "news") {
    return "뉴스위원의 불안 심리 확산 지표를 고려해";
  }

  return "펀더멘탈 위원의 저평가 가치 분석을 통해";
}

function getJudgmentHighlightText(stance: string) {
  const upper = stance.trim().toUpperCase().replace(/\s+/g, "_");

  if (upper === "BUY" || upper === "STRONG_BUY" || stance.includes("매수")) {
    return "매수 의견 반영";
  }
  if (upper === "HOLD" || upper === "STAY" || stance.includes("보류") || stance.includes("관망")) {
    return "보류 의견 일부 반영";
  }
  if (upper === "SELL" || stance.includes("매도")) {
    return "매도 의견 반영";
  }
  if (stance.includes("보유")) {
    return "보유 의견 일부 반영";
  }

  return `${stance} 의견 반영`;
}

function getJudgmentHighlightClassName(stance: string) {
  const upper = stance.trim().toUpperCase().replace(/\s+/g, "_");
  const isBuy = upper === "BUY" || upper === "STRONG_BUY" || stance.includes("매수");
  return isBuy
    ? "text-[color:var(--color-red-400)] [text-shadow:0px_2px_4px_rgba(0,0,0,0.16)]"
    : "text-[color:var(--color-neutral-500)] [text-shadow:0px_2px_4px_rgba(0,0,0,0.16)]";
}

function getSpeakerSpeechTitle(speaker: SpeakerConfig) {
  return speaker.committeeName;
}

function getJudgmentSummaryItems(report?: DebateReport | null): JudgmentSummaryItem[] {
  if (!report) {
    return [];
  }

  return report.finalStances
    .map((stance) => {
      const speakerId = speakerIdByAgentName[stance.agentName];

      if (!speakerId) {
        return null;
      }

      return {
        id: speakerId,
        leadText: getJudgmentLeadText(speakerId),
        highlightText: getJudgmentHighlightText(stance.stance),
        highlightClassName: getJudgmentHighlightClassName(stance.stance),
      };
    })
    .filter((item): item is JudgmentSummaryItem => item !== null);
}

function formatSignalLabel(signal?: string) {
  const normalized = signal?.trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "STRONG_BUY") {
    return "강력 매수";
  }
  if (normalized === "BUY") {
    return "매수";
  }
  if (normalized === "SELL") {
    return "매도";
  }
  if (normalized === "HOLD" || normalized === "STAY") {
    return "보류";
  }

  return signal ?? "판단 대기";
}

function buildSpeechTtsText(speech: DebateSpeech) {
  return speech.message;
}

function formatSignalForTts(signal?: string) {
  const normalized = signal?.trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "STRONG_BUY") return "강력 매수";
  if (normalized === "BUY") return "매수";
  if (normalized === "SELL") return "매도";
  if (normalized === "HOLD" || normalized === "STAY") return "보류";

  return formatSignalLabel(signal);
}

function replaceEnglishSignalsForTts(text: string) {
  return text
    .replace(/\bSTRONG[\s_]?BUY\b/gi, "강력 매수")
    .replace(/\bBUY\b/gi, "매수")
    .replace(/\bSELL\b/gi, "매도")
    .replace(/\bHOLD\b/gi, "보류")
    .replace(/\bSTAY\b/gi, "보류");
}

function buildJudgeFinalTtsText(report?: DebateReport | null) {
  const verdict = formatSignalForTts(report?.chairman.signal);
  const summary = report?.chairman.summary?.trim();

  if (!summary) {
    return `의장 최종 결론입니다. 결론은 ${verdict}입니다.`;
  }

  return `의장 최종 결론입니다. 결론은 ${verdict}입니다. ${replaceEnglishSignalsForTts(summary)}`;
}

function getRoundIntroTitle(roundLabel: string) {
  const roundNo = roundLabel.match(/\d+/)?.[0];
  return roundNo ? `ROUND ${roundNo}` : roundLabel.toUpperCase();
}

const SPEECH_GAP_MS = 1000;
const SPEECH_START_SYNC_DELAY_MS = 100;
const ROUND_INTRO_DURATION_MS = 2000;
type DebateJumpTarget = "r1" | "r2" | "r3" | "judge";

export default function DebateSection({
  stockId,
  report,
  onPhaseChange,
  onSpeechIndexChange,
  onRoundIntroChange,
}: DebateSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsCacheRef = useRef<Map<string, Blob | Promise<Blob>>>(new Map());
  const preloadRunIdRef = useRef(0);
  const preloadPromiseRef = useRef<Promise<boolean> | null>(null);
  const readyTtsKeysRef = useRef<Set<string>>(new Set());
  const speechRunIdRef = useRef(0);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);
  const pauseListenersRef = useRef(new Set<(paused: boolean) => void>());
  const isPausedRef = useRef(false);
  const [phase, setPhase] = useState<StagePhase>("ready");
  const [activeSpeechIndex, setActiveSpeechIndex] = useState(-1);
  const [judgementStep, setJudgementStep] = useState(0);
  const [judgeMode, setJudgeMode] = useState<"summary" | "final">("summary");
  const [judgeImageSrc, setJudgeImageSrc] = useState(judgeTalkingImageSrc);
  const [roundIntroTitle, setRoundIntroTitle] = useState<string | null>(null);
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(false);
  const [isSpeakerTalking, setIsSpeakerTalking] = useState(false);
  const [isPreparingStart, setIsPreparingStart] = useState(false);
  const [ttsReadyCount, setTtsReadyCount] = useState(0);
  const [ttsTotalCount, setTtsTotalCount] = useState(0);
  const [isTtsReady, setIsTtsReady] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [debateStartIndex, setDebateStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const speeches = useMemo(() => getDebateSpeeches(report), [report]);
  const judgmentSummaryItems = useMemo(() => getJudgmentSummaryItems(report), [report]);
  const allTtsItems = useMemo(() => {
    const items: Array<{ text: string; speakerId: TtsSpeakerId }> = [
      ...speeches.map((speech) => ({
        text: buildSpeechTtsText(speech),
        speakerId: speech.speakerId,
      })),
      ...judgmentSummaryItems.map((item) => ({
        text: `${item.leadText}. ${item.highlightText}.`,
        speakerId: "judge" as const,
      })),
      {
        text: buildJudgeFinalTtsText(report),
        speakerId: "judge" as const,
      },
    ];

    const uniqueItems = new Map<string, { text: string; speakerId: TtsSpeakerId }>();

    items.forEach((item) => {
      if (!item.text.trim()) {
        return;
      }

      uniqueItems.set(`${item.speakerId}::${item.text}`, item);
    });

    return Array.from(uniqueItems.values());
  }, [judgmentSummaryItems, report, speeches]);
  const reportCacheScope = useMemo(() => {
    const reportVersion = report?.createdAt?.trim() || report?.date?.trim() || "unknown";
    return `${stockId}::${reportVersion}`;
  }, [report?.createdAt, report?.date, stockId]);
  const roundStartIndexes = useMemo(() => {
    const indexes = new Map<number, number>();

    speeches.forEach((speech, index) => {
      const roundNo = Number(speech.roundLabel.match(/\d+/)?.[0] ?? 0);
      if (roundNo > 0 && !indexes.has(roundNo)) {
        indexes.set(roundNo, index);
      }
    });

    return indexes;
  }, [speeches]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    onSpeechIndexChange?.(activeSpeechIndex);
  }, [activeSpeechIndex, onSpeechIndexChange]);

  useEffect(() => {
    onRoundIntroChange?.(roundIntroTitle);
  }, [onRoundIntroChange, roundIntroTitle]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    pauseListenersRef.current.forEach((listener) => listener(isPaused));
  }, [isPaused]);

  useEffect(() => {
    audioRef.current = new Audio();
    bgmAudioRef.current = new Audio(debateBgmSrc);
    bgmAudioRef.current.loop = true;
    bgmAudioRef.current.preload = "auto";
    bgmAudioRef.current.volume = BGM_BASE_VOLUME;

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      ttsAbortControllerRef.current?.abort();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = "";
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const bgmAudio = bgmAudioRef.current;
    if (!bgmAudio) {
      return;
    }

    const shouldPlayBgm =
      !isPaused && (phase === "debate" || phase === "outro" || phase === "loading" || phase === "judge" || phase === "ended");

    if (!shouldPlayBgm) {
      bgmAudio.pause();
      if (!isPaused) {
        bgmAudio.currentTime = 0;
        bgmAudio.volume = BGM_BASE_VOLUME;
      }
      return;
    }

    bgmAudio.volume = getCurrentBgmVolume();
    void bgmAudio.play().catch(() => {
      // Ignore autoplay/playback failures and continue without BGM.
    });
  }, [isPaused, phase, roundIntroTitle]);

  useEffect(() => {
    const runId = ++preloadRunIdRef.current;
    let cancelled = false;
    const readyCount = allTtsItems.reduce((count, item) => {
      const key = getTtsCacheKey(item.text, item.speakerId);
      return ttsCacheRef.current.get(key) instanceof Blob ? count + 1 : count;
    }, 0);

    readyTtsKeysRef.current = new Set(
      allTtsItems
        .filter((item) => ttsCacheRef.current.get(getTtsCacheKey(item.text, item.speakerId)) instanceof Blob)
        .map((item) => getTtsCacheKey(item.text, item.speakerId)),
    );
    setTtsTotalCount(allTtsItems.length);
    setTtsReadyCount(readyCount);
    setIsTtsReady(allTtsItems.length > 0 && readyCount === allTtsItems.length);

    preloadPromiseRef.current = (async () => {
      for (const item of allTtsItems) {
        if (cancelled || preloadRunIdRef.current !== runId) {
          return false;
        }

        try {
          await primeTtsCache(item.text, item.speakerId);
        } catch {
          return false;
        }
      }

      if (!cancelled && preloadRunIdRef.current === runId) {
        setIsTtsReady(true);
        return true;
      }

      return false;
    })();

    return () => {
      cancelled = true;
    };
  }, [allTtsItems]);

  useEffect(() => {
    if (phase !== "debate") {
      return;
    }

    if (speeches.length === 0) {
      setPhase("judge");
      return;
    }

    const runId = ++speechRunIdRef.current;
    ttsAbortControllerRef.current?.abort();

    const controller = new AbortController();
    ttsAbortControllerRef.current = controller;
    setTtsError(null);
    setSpeechBubbleVisible(false);
    setIsSpeakerTalking(false);

    const run = async () => {
      try {
        for (let index = debateStartIndex; index < speeches.length; index += 1) {
          const speech = speeches[index];
          if (speechRunIdRef.current !== runId) {
            return;
          }

          const previousSpeech = speeches[index - 1];
          const isNewRound = !previousSpeech || previousSpeech.roundLabel !== speech.roundLabel;

          await waitForResume(controller.signal);

          if (isNewRound) {
            setRoundIntroTitle(getRoundIntroTitle(speech.roundLabel));
            await waitForMs(ROUND_INTRO_DURATION_MS, controller.signal);

            if (speechRunIdRef.current !== runId) {
              return;
            }

            setRoundIntroTitle(null);
          } else if (index > 0) {
            await waitForMs(SPEECH_GAP_MS, controller.signal);
          }

          if (speechRunIdRef.current !== runId) {
            return;
          }

          await waitForResume(controller.signal);

          setActiveSpeechIndex(index);
          setSpeechBubbleVisible(true);
          setIsSpeakerTalking(true);
          await waitForMs(SPEECH_START_SYNC_DELAY_MS, controller.signal);

          await playTtsAudio(buildSpeechTtsText(speech), speech.speakerId, controller.signal);
          setSpeechBubbleVisible(false);
          setIsSpeakerTalking(false);

          if (speechRunIdRef.current !== runId) {
            return;
          }
        }

        if (speechRunIdRef.current === runId) {
          setSpeechBubbleVisible(false);
          setIsSpeakerTalking(false);
          setRoundIntroTitle(null);
          setPhase("outro");
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [debateStartIndex, phase, speeches]);

  useEffect(() => {
    if (phase !== "outro") {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        await waitForMs(900, controller.signal);
        setPhase("loading");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [phase]);

  useEffect(() => {
    if (phase !== "loading") {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        await waitForMs(1600, controller.signal);
        setPhase("judge");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [phase]);

  useEffect(() => {
    if (phase !== "judge") {
      return;
    }

    const runId = ++speechRunIdRef.current;
    ttsAbortControllerRef.current?.abort();

    const controller = new AbortController();
    ttsAbortControllerRef.current = controller;

    setJudgementStep(0);
    setJudgeMode("summary");
    setJudgeImageSrc(judgeTalkingImageSrc);
    setRoundIntroTitle(null);
    setSpeechBubbleVisible(false);
    setIsSpeakerTalking(false);
    setTtsError(null);

    const run = async () => {
      try {
        const summarySequence = judgmentSummaryItems.map((item) => ({
          speakerId: "judge" as const,
          text: `${item.leadText}. ${item.highlightText}.`,
        }));

        for (const [index, item] of summarySequence.entries()) {
          if (speechRunIdRef.current !== runId) {
            return;
          }

          await waitForResume(controller.signal);
          setJudgementStep(index + 1);

          await playTtsAudio(item.text, item.speakerId, controller.signal);

          if (speechRunIdRef.current !== runId) {
            return;
          }
        }

        if (speechRunIdRef.current !== runId) {
          return;
        }

        setJudgeMode("final");

        await playTtsAudio(buildJudgeFinalTtsText(report), "judge", controller.signal);

        if (speechRunIdRef.current !== runId) {
          return;
        }

        setJudgeImageSrc(judgeFallbackImageSrc);
        setPhase("ended");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [phase, judgmentSummaryItems, report]);

  const handleStart = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    resetPlaybackState();

    if (!isTtsReady) {
      setIsPreparingStart(true);
      const prepared = await preloadPromiseRef.current;
      setIsPreparingStart(false);

      if (!prepared) {
        setTtsError("TTS 음성 준비가 아직 완료되지 않았습니다.");
        return;
      }
    }

    setPhase("video");
    video.currentTime = 0;
    video.muted = false;

    try {
      await video.play();
    } catch {
      setPhase("ready");
    }
  };

  const handleReplay = async () => {
    if (!allTtsItems.length || !isTtsReady) {
      setTtsError("재생 가능한 음성이 아직 준비되지 않았습니다.");
      return;
    }

    await handleStart();
  };

  const jumpToDebateIndex = (startIndex: number) => {
    interruptPlayback();
    setDebateStartIndex(startIndex);
    setActiveSpeechIndex(Math.max(startIndex - 1, -1));
    setPhase("debate");
  };

  const jumpToFinalVerdict = () => {
    interruptPlayback();
    setDebateStartIndex(0);
    setActiveSpeechIndex(Math.max(speeches.length - 1, -1));
    setJudgementStep(judgmentSummaryItems.length);
    setJudgeMode("final");
    setJudgeImageSrc(judgeFallbackImageSrc);
    setPhase("ended");
  };

  const jumpToJudgeStage = () => {
    interruptPlayback();
    setDebateStartIndex(0);
    setActiveSpeechIndex(Math.max(speeches.length - 1, -1));
    setJudgementStep(0);
    setJudgeMode("summary");
    setJudgeImageSrc(judgeTalkingImageSrc);
    setPhase("judge");
  };

  const handleJump = (target: DebateJumpTarget) => {
    if (target === "judge") {
      jumpToJudgeStage();
      return;
    }

    const roundNo = Number(target.slice(1));
    const startIndex = roundStartIndexes.get(roundNo);

    if (startIndex === undefined) {
      return;
    }

    if (phase === "video" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = videoRef.current.duration || 0;
    }

    jumpToDebateIndex(startIndex);
  };

  const handleSkip = () => {
    jumpToFinalVerdict();
  };

  const handlePauseToggle = async () => {
    if (phase === "ready" || phase === "ended" || isPreparingStart) {
      return;
    }

    if (isPaused) {
      setIsPaused(false);

      if (phase === "video" && videoRef.current) {
        try {
          await videoRef.current.play();
        } catch {
          setIsPaused(true);
        }
        return;
      }

      if (audioRef.current?.src && audioRef.current.paused) {
        void audioRef.current.play().catch(() => {
          setTtsError("일시정지 해제 후 음성 재생에 실패했습니다.");
        });
      }

      return;
    }

    setIsPaused(true);
    videoRef.current?.pause();
    audioRef.current?.pause();
    bgmAudioRef.current?.pause();
  };

  const isControlVisible = phase !== "ready" && phase !== "ended";

  const activeSpeech = speeches[Math.max(activeSpeechIndex, 0)];
  const activeSpeaker = speakers.find((speaker) => speaker.id === activeSpeech?.speakerId) ?? speakers[0];
  const showCommitteeStage = phase === "debate" || phase === "outro";
  const showLoadingStage = phase === "loading";
  const showJudgeStage = phase === "judge";
  const showEndedStage = phase === "ended";
  const finalVerdict = formatSignalLabel(report?.chairman.signal);
  const isRoundIntroVisible = roundIntroTitle !== null;
  const activeSpeechTitle = getSpeakerSpeechTitle(activeSpeaker);

  function clearActiveAudioUrl() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function interruptPlayback() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    speechRunIdRef.current += 1;
    ttsAbortControllerRef.current?.abort();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.currentTime = 0;
      bgmAudioRef.current.volume = BGM_BASE_VOLUME;
    }

    if (videoRef.current) {
      videoRef.current.pause();
    }

    clearActiveAudioUrl();
    setRoundIntroTitle(null);
    setSpeechBubbleVisible(false);
    setIsSpeakerTalking(false);
    setTtsError(null);
    setIsPreparingStart(false);
    setIsPaused(false);
  }

  function resetPlaybackState() {
    interruptPlayback();
    setActiveSpeechIndex(-1);
    setJudgementStep(0);
    setJudgeMode("summary");
    setJudgeImageSrc(judgeTalkingImageSrc);
    setDebateStartIndex(0);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }

  function getTtsCacheKey(text: string, speakerId: TtsSpeakerId) {
    return `${reportCacheScope}::${speakerId}::${text}`;
  }

  function markTtsReady(cacheKey: string) {
    if (!readyTtsKeysRef.current.has(cacheKey)) {
      readyTtsKeysRef.current.add(cacheKey);
      setTtsReadyCount(readyTtsKeysRef.current.size);
    }
  }

  async function primeTtsCache(text: string, speakerId: TtsSpeakerId) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error("TTS text is empty.");
    }

    const cacheKey = getTtsCacheKey(normalizedText, speakerId);
    const cached = ttsCacheRef.current.get(cacheKey);

    if (cached instanceof Blob) {
      return cached;
    }

    if (cached) {
      return cached;
    }

    const request = (async () => {
      const persistedBlob = await getPersistedTtsBlob(cacheKey);
      if (persistedBlob) {
        ttsCacheRef.current.set(cacheKey, persistedBlob);
        markTtsReady(cacheKey);
        return persistedBlob;
      }

      const blob = await getTtsAudio(normalizedText, speakerId);
      ttsCacheRef.current.set(cacheKey, blob);
      markTtsReady(cacheKey);
      void setPersistedTtsBlob(cacheKey, blob);
      return blob;
    })().catch((error) => {
      ttsCacheRef.current.delete(cacheKey);
      throw error;
    });

    ttsCacheRef.current.set(cacheKey, request);
    return request;
  }

  async function playTtsAudio(text: string, speakerId: TtsSpeakerId, signal: AbortSignal) {
    if (!audioRef.current || !text.trim()) {
      return false;
    }

    try {
      setBgmDucked(true);
      clearActiveAudioUrl();

      const blob = await primeTtsCache(text, speakerId);
      if (signal.aborted) {
        return false;
      }

      const objectUrl = URL.createObjectURL(blob);
      audioUrlRef.current = objectUrl;
      audioRef.current.src = objectUrl;
      audioRef.current.load();
      audioRef.current.playbackRate = getTtsPlaybackRate(speakerId);

      await waitForResume(signal);
      await audioRef.current.play();
      await waitForAudioEnd(audioRef.current, signal);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }

      const message = error instanceof Error ? error.message : "TTS playback failed.";
      console.error("TTS playback failed:", message);
      setTtsError(message);
      return false;
    } finally {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setBgmDucked(false);
      clearActiveAudioUrl();
    }
  }

  function setBgmDucked(isDucked: boolean) {
    if (!bgmAudioRef.current) {
      return;
    }

    const baseVolume = getCurrentBgmVolume();
    bgmAudioRef.current.volume = isDucked ? baseVolume * BGM_DUCK_RATIO : baseVolume;
  }

  function getCurrentBgmVolume() {
    return roundIntroTitle !== null || phase === "loading" ? BGM_HIGHLIGHT_VOLUME : BGM_BASE_VOLUME;
  }

  function subscribePauseStateChange(listener: (paused: boolean) => void) {
    pauseListenersRef.current.add(listener);
    return () => {
      pauseListenersRef.current.delete(listener);
    };
  }

  function waitForResume(signal: AbortSignal) {
    if (!isPausedRef.current) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const unsubscribe = subscribePauseStateChange((paused) => {
        if (!paused) {
          cleanup();
          resolve();
        }
      });

      const handleAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };

      const cleanup = () => {
        unsubscribe();
        signal.removeEventListener("abort", handleAbort);
      };

      signal.addEventListener("abort", handleAbort, { once: true });
    });
  }

  function getTtsPlaybackRate(speakerId: TtsSpeakerId) {
    if (speakerId === "fund") {
      return FUND_TTS_PLAYBACK_RATE;
    }

    if (speakerId === "judge") {
      return JUDGE_TTS_PLAYBACK_RATE;
    }

    return DEFAULT_TTS_PLAYBACK_RATE;
  }

  function waitForAudioEnd(audio: HTMLAudioElement, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const handleEnded = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Audio playback failed."));
      };

      const handleAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };

      const cleanup = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        signal.removeEventListener("abort", handleAbort);
      };

      audio.addEventListener("ended", handleEnded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
      signal.addEventListener("abort", handleAbort, { once: true });
    });
  }

  function waitForMs(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      let remaining = ms;
      let timer: number | null = null;
      let startedAt = 0;

      const clearTimer = () => {
        if (timer !== null) {
          window.clearTimeout(timer);
          timersRef.current = timersRef.current.filter((activeTimer) => activeTimer !== timer);
          timer = null;
        }
      };

      const startTimer = () => {
        startedAt = Date.now();
        timer = window.setTimeout(() => {
          cleanup();
          resolve();
        }, remaining);
        timersRef.current.push(timer);
      };

      const handlePauseChange = (paused: boolean) => {
        if (paused) {
          if (timer !== null) {
            remaining = Math.max(0, remaining - (Date.now() - startedAt));
            clearTimer();
          }
          return;
        }

        if (timer === null) {
          startTimer();
        }
      };

      const handleAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };

      const cleanup = () => {
        clearTimer();
        unsubscribe();
        signal.removeEventListener("abort", handleAbort);
      };

      const unsubscribe = subscribePauseStateChange(handlePauseChange);
      signal.addEventListener("abort", handleAbort, { once: true });

      if (!isPausedRef.current) {
        startTimer();
      }
    });
  }

  return (
    <div className="relative flex min-h-[640px] w-full overflow-hidden rounded-2xl bg-[color:var(--color-black)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] [font-family:var(--font-family-base)]">
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          phase === "video" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        src={introVideoSrc}
        playsInline
        preload="metadata"
        onEnded={() => setPhase("debate")}
        aria-hidden="true"
      />

      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          phase === "video"
            ? "bg-[color:rgba(0,0,0,0.08)] opacity-100"
            : "bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.52)_100%)] opacity-100",
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />

      {isControlVisible ? (
        <div className="absolute right-4 top-4 z-[90] flex max-w-[calc(100%-2rem)] flex-wrap justify-end gap-2 sm:right-6 sm:top-6">
          {phase === "video" ? (
            <button
              type="button"
              onClick={() => handleJump("r1")}
              className="typo-body-lg rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.56)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
            >
              동영상 건너뛰기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => handleJump("r1")}
            className="typo-body-lg rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.56)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
          >
            R1
          </button>
          <button
            type="button"
            onClick={() => handleJump("r2")}
            className="typo-body-lg rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.56)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
          >
            R2
          </button>
          <button
            type="button"
            onClick={() => handleJump("r3")}
            className="typo-body-lg rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.56)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
          >
            R3
          </button>
          <button
            type="button"
            onClick={() => handleJump("judge")}
            className="typo-body-lg rounded-lg border border-[color:rgba(255,223,32,0.24)] bg-[color:rgba(255,223,32,0.16)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
          >
            최종판결
          </button>
          <button
            type="button"
            onClick={handlePauseToggle}
            className="typo-body-lg rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(255,255,255,0.12)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
          >
            {isPaused ? "재개" : "일시정지"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="typo-body-lg rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(255,255,255,0.12)] px-3 py-2 text-[color:var(--color-text-base)] backdrop-blur-[8px]"
          >
            스킵
          </button>
        </div>
      ) : null}

      {phase === "ready" ? (
        <div className="relative z-20 flex w-full flex-col items-center justify-center px-6 py-12 text-center">
          <button
            type="button"
            onClick={handleStart}
            className="group relative mb-6 flex flex-col items-center justify-center transition-transform hover:scale-105 focus:outline-none"
            aria-label="위원회 소집하기"
          >
            <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[color:rgba(255,255,255,0.12)] bg-[color:var(--color-neutral-800)] shadow-[0_0_80px_rgba(255,255,255,0.15)] sm:h-32 sm:w-32">
              <span className="h-12 w-12 rounded-full bg-[color:var(--color-bg-danger-bold)] shadow-[inset_0_10px_18px_rgba(0,0,0,0.14)] transition-colors group-hover:bg-[color:var(--color-red-400)] sm:h-16 sm:w-16" />
            </span>
          </button>

          <div className="relative z-20 text-center">
            <h3 className="heading-reset typo-heading-lg text-[color:var(--color-white)]">
              위원회 소집하기
            </h3>
            <p className="typo-body-lg mt-3 text-[color:var(--color-neutral-300)]">
              소집 버튼을 눌러 심층 토론을 진행하세요.
            </p>
          </div>
        </div>
      ) : null}

      {showEndedStage ? (
        <div className="relative z-20 flex w-full flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-full max-w-[720px] rounded-[28px] border border-[color:rgba(255,255,255,0.12)] bg-[color:rgba(0,0,0,0.62)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-[10px] sm:px-10 sm:py-10">
            <p className="typo-heading-sm uppercase tracking-[0.28em] text-[color:rgba(255,255,255,0.6)]">
              Debate Finished
            </p>
            <h3 className="mt-4 typo-heading-xl text-[color:var(--color-text-base)] md:typo-heading-2xl">
              의장 최종 결론은 {finalVerdict}입니다.
            </h3>
            <p className="mt-4 typo-body-md text-[color:rgba(255,255,255,0.78)] md:typo-body-lg">
              {report?.chairman.summary ?? "위원회 종합 판단 결과를 정리하고 있습니다."}
            </p>
            <button
              type="button"
              onClick={handleReplay}
              className="mt-8 typo-heading-sm inline-flex items-center justify-center rounded-full bg-[color:var(--color-yellow-400)] px-6 py-3 text-[color:var(--color-text-primary)] transition-transform hover:scale-[1.02] focus:outline-none"
            >
              다시 재생하기
            </button>
          </div>
        </div>
      ) : null}

      {ttsError ? (
        <div className="typo-body-lg absolute left-4 top-4 z-50 rounded-md bg-[color:rgba(127,29,29,0.92)] px-3 py-2 text-[color:var(--color-text-base)] shadow-lg">
          TTS 재생 실패: {ttsError}
        </div>
      ) : null}

      {isPreparingStart ? (
        <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-[color:rgba(0,0,0,0.92)] px-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[color:var(--color-text-base)] border-t-transparent" />
          <p className="typo-heading-sm text-[color:var(--color-text-base)] md:typo-heading-md">의견 생성 중</p>
          <p className="typo-body-md text-[color:rgba(255,255,255,0.72)]">
            위원회 의견을 준비하고 있습니다. 준비가 끝나면 바로 시작합니다.
          </p>
          <p className="typo-body-sm text-[color:rgba(255,255,255,0.52)]">
            {ttsReadyCount}/{ttsTotalCount}
          </p>
        </div>
      ) : null}

      {roundIntroTitle ? (
        <div className="absolute inset-0 z-[60] flex flex-col justify-between bg-[color:rgba(0,0,0,0.8)] px-10 py-6">
          <div />
          <div className="typo-heading-3xl mx-auto w-full max-w-[540px] text-center text-[color:var(--color-text-base)] sm:typo-heading-4xl">
            {roundIntroTitle}
          </div>
          <div />
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-0 z-30 transition-opacity duration-700",
          showCommitteeStage || showLoadingStage || showJudgeStage
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <div className="absolute inset-0 bg-[color:var(--color-black)]" />

        {showCommitteeStage ? (
          <>
            <div className="absolute inset-0 z-30 px-4 py-6 sm:px-8 sm:py-8">
              <div className="flex h-full flex-col items-center gap-6">
                <div className="flex w-full justify-center">
                  <div className="relative z-[90] rounded-lg bg-[color:var(--color-bg-info-subtle)] px-4 py-2">
                    <span className="typo-body-lg whitespace-nowrap text-[color:var(--color-text-primary)]">
                      {activeSpeech?.roundLabel ?? "토론 준비 중"}
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex w-full min-h-0 flex-1 items-end justify-between gap-3 overflow-visible px-1 sm:gap-5 sm:px-6 lg:px-12",
                    phase === "outro" ? "opacity-0" : "opacity-100",
                  )}
                >
                  {speakers.map((speaker) => {
                    const isActive =
                      phase === "debate" && !isRoundIntroVisible && isSpeakerTalking && activeSpeaker.id === speaker.id;
                    return (
                      <div
                        key={speaker.id}
                        className={cn(
                          "relative flex h-full min-h-0 flex-1 origin-bottom flex-col items-center justify-end transition-all duration-500",
                          phase === "outro" ? "scale-100 opacity-100" : "",
                          isActive ? "z-20 scale-[1.06]" : "z-10 scale-100",
                          "opacity-100",
                        )}
                      >
                        <div className="flex h-full w-full translate-y-4 flex-col items-center justify-end overflow-visible sm:translate-y-5">
                          <img
                            src={isActive ? speaker.talkingImageSrc : speaker.imageSrc}
                            alt={speaker.committeeName}
                            className={cn(
                              "w-full object-contain transition-all duration-500",
                              isActive ? "max-h-[88%]" : "max-h-[78%]",
                            )}
                          />
                          <div
                            className={cn(
                              "typo-body-md mt-3 whitespace-nowrap rounded-full border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] px-4 py-1.5 text-[color:var(--color-black)]",
                              isActive ? "mb-8" : "mb-6",
                            )}
                          >
                            {speaker.committeeName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {phase === "debate" && !isRoundIntroVisible ? (
                  <div
                    className={cn(
                      "flex w-full max-w-[879px] flex-col items-start px-1 pb-2 transition-all duration-300 sm:px-4",
                      speechBubbleVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                    )}
                  >
                    <div className="rounded-t-2xl bg-[color:var(--color-bg-danger-bold)] px-4 py-3">
                      <p className="typo-heading-sm whitespace-nowrap text-[color:var(--color-text-interactive-inverse)]">
                        {`${activeSpeechTitle} | ${activeSpeech?.segmentLabel ?? "발언"}`}
                      </p>
                    </div>
                    <div className="w-full rounded-b-2xl rounded-tr-2xl border border-[color:var(--color-border-base)] bg-[color:var(--color-bg-primary)] px-5 py-4 sm:px-6 sm:py-5">
                      <p className="typo-heading-md whitespace-pre-line [word-break:keep-all] text-center text-[color:var(--color-text-primary)] sm:typo-heading-lg">
                        {`"${activeSpeech?.message?.trim() ?? "위원회 데이터를 불러오는 중입니다."}"`}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {showLoadingStage ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-[color:rgba(255,255,255,0.12)] bg-[color:rgba(255,255,255,0.08)] px-8 py-7 backdrop-blur-[6px]">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[color:var(--color-text-base)] border-t-transparent" />
              <p className="typo-heading-sm text-[color:var(--color-text-base)]">의장 판결 정리 중</p>
              <p className="typo-body-md text-[color:rgba(255,255,255,0.72)]">
                위원회 발언을 종합해 최종 결론을 도출하고 있습니다.
              </p>
            </div>
          </div>
        ) : null}

        {showJudgeStage ? (
          <div className="absolute inset-0 z-40 bg-[color:var(--color-black)] px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 lg:px-10 lg:pt-10">
            <div className="flex h-full min-h-0 flex-col gap-6 md:gap-8 lg:flex-row lg:items-stretch lg:gap-10">
              <div className="flex min-h-0 flex-[1.05] flex-col justify-between gap-5 pb-6 pl-4 sm:pb-8 sm:pl-6 lg:items-end lg:pb-10 lg:pl-12 lg:pt-6">
                {judgeMode === "summary" ? (
                  <div className="flex w-full flex-1 flex-col justify-center gap-4 py-8 lg:items-end lg:py-16">
                    {judgmentSummaryItems.map((item, index) => {
                      const isVisible = judgementStep > index;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex w-full max-w-[720px] items-stretch gap-3 p-2.5 transition-all duration-700",
                            isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0",
                          )}
                        >
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-[linear-gradient(180deg,var(--color-bg-interactive-secondary-pressed)_0%,var(--color-bg-interactive-primary)_100%)]">
                            <p className="typo-heading-xl text-center text-[color:var(--color-text-interactive-inverse)] md:typo-heading-2xl">
                              {String(index + 1).padStart(2, "0")}
                            </p>
                          </div>
                          <div className="flex h-24 flex-1 flex-col justify-between bg-[color:var(--color-bg-primary)] px-4 py-3 text-right">
                            <div className="flex items-center justify-end">
                              <p className="typo-body-lg text-[color:var(--color-text-primary)]">
                                {item.leadText}
                              </p>
                            </div>
                            <div className="flex flex-1 items-end justify-end">
                              <p className={cn("typo-heading-lg text-right", item.highlightClassName)}>
                                {item.highlightText}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {!judgmentSummaryItems.length ? (
                      <div className="flex w-full max-w-[720px] items-stretch gap-3 p-2.5">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-[linear-gradient(180deg,var(--color-bg-interactive-secondary-pressed)_0%,var(--color-bg-interactive-primary)_100%)]">
                          <p className="typo-heading-xl text-center text-[color:var(--color-text-interactive-inverse)] md:typo-heading-2xl">
                            00
                          </p>
                        </div>
                        <div className="flex h-24 flex-1 items-center justify-end bg-[color:var(--color-bg-primary)] px-4 py-3 text-right">
                          <p className="typo-body-lg text-[color:var(--color-text-primary)]">
                            의장 AI가 위원회 의견을 종합 중입니다
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex w-full flex-1 items-center lg:ml-auto lg:max-w-[clamp(360px,50vw,720px)]">
                    <div className="flex w-full scale-100 flex-col opacity-100 transition-all duration-700">
                      <div className="flex w-full flex-col items-start">
                        <div className="inline-flex justify-start items-start">
                          <div className="inline-flex flex-col items-center gap-6 bg-[linear-gradient(180deg,var(--color-bg-primary)_0%,var(--color-yellow-400)_100%)] px-6 py-3">
                            <div className="flex items-end justify-center gap-3">
                              <p className="typo-heading-md whitespace-nowrap text-center text-[color:var(--color-text-primary)]">
                                의장 최종 결론
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex w-full items-start justify-center gap-6 overflow-hidden bg-[color:var(--color-bg-primary)] px-6 py-8">
                          <div className="flex shrink-0 items-start justify-center pt-1">
                            <FaQuoteLeft
                              className="h-9 w-9 text-[color:var(--color-text-primary)]"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="flex flex-1 flex-col items-start gap-3 py-3">
                            <div className="flex w-full items-end justify-start gap-3">
                              <p className="typo-heading-xl text-[color:var(--color-text-primary)] md:typo-heading-2xl">
                                결론은
                              </p>
                              <p className="typo-heading-xl text-[color:var(--color-red-400)] md:typo-heading-2xl">
                                {finalVerdict}
                              </p>
                            </div>
                            <div className="flex w-full items-center justify-center">
                              <p className="typo-body-lg [word-break:keep-all] text-[color:var(--color-text-primary)]">
                                {(report?.chairman.summary ?? "위원회 종합 판단 결과를 정리하고 있습니다.")
                                  .split(". ")
                                  .filter(Boolean)
                                  .map((sentence, index, array) => (
                                    <span key={`${sentence}-${index}`}>
                                      {sentence.trim()}
                                      {sentence.trim().endsWith(".") ? "" : index < array.length - 1 ? "." : ""}
                                      {index < array.length - 1 ? <br /> : null}
                                    </span>
                                  ))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex min-h-[260px] flex-[0.95] items-end justify-end overflow-hidden self-stretch sm:min-h-[320px] lg:min-h-0">
                <div className="relative flex h-full w-full items-end justify-center lg:justify-end">
                  <div className="absolute bottom-0 right-1/2 h-[220px] w-[220px] translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,223,32,0.18)_0%,rgba(255,223,32,0.02)_62%,transparent_78%)] blur-2xl sm:h-[280px] sm:w-[280px] lg:right-0 lg:h-[320px] lg:w-[320px] lg:translate-x-0" />
                  <img
                    src={judgeImageSrc}
                    alt="의장 AI"
                    className="relative z-10 h-auto w-[78%] min-w-[220px] max-w-[340px] object-contain object-right-bottom drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)] sm:w-[72%] sm:max-w-[380px] md:w-[64%] md:max-w-[420px] lg:w-auto lg:min-w-0 lg:max-h-full lg:max-w-[clamp(320px,34vw,520px)]"
                    onError={() => setJudgeImageSrc(judgeFallbackImageSrc)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
