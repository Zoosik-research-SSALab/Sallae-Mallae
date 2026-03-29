export interface DebateReportsResponse {
  reports: DebateReport[];
}

export interface DebateReport {
  date: string;
  chairman: DebateChairman;
  finalStances: DebateFinalStance[];
  createdAt: string;
  debate: {
    rounds: DebateRoundDto[];
  };
}

export interface DebateReportsQuery {
  offset?: number;
  limit?: number;
}

export interface DebateChairman {
  signal: string;
  confidence: number;
  summary: string;
}

export interface DebateFinalStance {
  agentId: string;
  agentName: string;
  stance: string;
}

export interface DebateRoundDto {
  roundNo: number;
  agents: DebateAgentOpinion[];
}

export interface DebateAgentOpinion {
  name: string;
  opinion: string;
  summary: string;
}

export interface AgentStatement {
  opinion: string;
  details: {
    basis: string[];
    risk: string[];
    action: string[];
  };
}

export type DebateRole = "chart" | "news" | "fund" | "judge";
export type DebateSignal = "STRONG_BUY" | "BUY" | "HOLD" | "SELL";
export type DebatePhase = "idle" | "loading" | "video" | "debate" | "judgement" | "ended";
