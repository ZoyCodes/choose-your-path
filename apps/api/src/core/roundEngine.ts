import { v4 as uuidv4 } from 'uuid';
import type { Round, OptionKey } from '@choose-your-path/contracts';

// TODO: Make configurable via environment variable when scheduler is added
const ROUND_DURATION_MS = 20 * 60 * 1000; // 20 minutes

export function createInitialRound(): Round {
  const now = new Date();
  const closesAt = new Date(now.getTime() + ROUND_DURATION_MS);
  return {
    nodeId: uuidv4(),
    sceneText: "You stand at a crossroads. Two paths diverge before you.",
    optionA: "Take the left path into the dark forest.",
    optionB: "Take the right path toward the glowing city.",
    opensAt: now.toISOString(),
    closesAt: closesAt.toISOString(),
    status: "OPEN",
    votesA: 0,
    votesB: 0,
    winnerKey: null,
  };
}

export function acceptVote(
  round: Round,
  _voterId: string,
  optionKey: OptionKey
): Round {
  if (round.status === "CLOSED") {
    throw new Error("Round is already closed");
  }
  if (optionKey !== "A" && optionKey !== "B") {
    throw new Error("Invalid option key. Must be A or B");
  }
  return {
    ...round,
    votesA: optionKey === "A" ? round.votesA + 1 : round.votesA,
    votesB: optionKey === "B" ? round.votesB + 1 : round.votesB,
  };
}

export function closeRound(round: Round, _now: Date): Round {
  if (round.status === "CLOSED") {
    // Idempotent: already closed
    return round;
  }
  // A wins ties
  const winnerKey: OptionKey = round.votesB > round.votesA ? "B" : "A";
  return {
    ...round,
    status: "CLOSED",
    winnerKey,
  };
}
