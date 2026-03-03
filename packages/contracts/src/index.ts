export type RoundStatus = "OPEN" | "CLOSED";
export type OptionKey = "A" | "B";

export interface Round {
  nodeId: string;
  sceneText: string;
  optionA: string;
  optionB: string;
  opensAt: string;   // ISO 8601
  closesAt: string;  // ISO 8601
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
}

export interface CloseRoundResponse {
  round: Round;
}
