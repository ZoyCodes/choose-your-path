export type RoundStatus = "OPEN" | "CLOSED";
export type OptionKey = "A" | "B";
export type RoundPhase = "VOTING" | "INTERMISSION";
export type LifecycleEventType = "round.opened" | "round.closed";

export interface Round {
  nodeId: string;
  sceneText: string;
  optionA: string;
  optionB: string;
  opensAt: string; // ISO 8601
  closesAt: string; // ISO 8601
  intermissionEndsAt?: string | null; // ISO 8601, set when round is CLOSED
  status: RoundStatus;
  votesA: number;
  votesB: number;
  winnerKey: OptionKey | null;
}

export interface VoteRequest {
  voterId: string;
  optionKey: OptionKey;
}

export interface VoteResponse {
  votesA: number;
  votesB: number;
}

export interface CurrentRoundResponse {
  round: Round;
  phase?: RoundPhase;
  serverNow?: string;
  nextTransitionAt?: string;
}

export interface CloseRoundResponse {
  round: Round;
}

export interface RoundLifecycleEvent {
  eventId: string;
  eventType: LifecycleEventType;
  eventVersion: "v1";
  occurredAt: string;
  round: Round;
}
