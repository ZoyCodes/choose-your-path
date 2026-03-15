import { v4 as uuidv4 } from "uuid";
import type {
  Round,
  OptionKey,
  LifecycleEventType,
} from "@choose-your-path/contracts";

function readStringEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const DEFAULT_SCENE_TEXT =
  "You stand at a crossroads. Two paths diverge before you.";
const DEFAULT_OPTION_A = "Take the left path into the dark forest.";
const DEFAULT_OPTION_B = "Take the right path toward the glowing city.";
const DEFAULT_ROUND_DURATION_MS = 20 * 1000;
const DEFAULT_INTERMISSION_DURATION_MS = 5 * 1000;

const INITIAL_SCENE_TEXT = readStringEnv(
  "STORY_INITIAL_SCENE_TEXT",
  DEFAULT_SCENE_TEXT,
);
const INITIAL_OPTION_A = readStringEnv(
  "STORY_INITIAL_OPTION_A",
  DEFAULT_OPTION_A,
);
const INITIAL_OPTION_B = readStringEnv(
  "STORY_INITIAL_OPTION_B",
  DEFAULT_OPTION_B,
);
const ROUND_DURATION_MS = readPositiveIntEnv(
  "ROUND_DURATION_MS",
  DEFAULT_ROUND_DURATION_MS,
);
const INTERMISSION_DURATION_MS = readPositiveIntEnv(
  "INTERMISSION_DURATION_MS",
  DEFAULT_INTERMISSION_DURATION_MS,
);

function createRoundAt(now: Date): Round {
  const closesAt = new Date(now.getTime() + ROUND_DURATION_MS);
  return {
    nodeId: uuidv4(),
    sceneText: INITIAL_SCENE_TEXT,
    optionA: INITIAL_OPTION_A,
    optionB: INITIAL_OPTION_B,
    opensAt: now.toISOString(),
    closesAt: closesAt.toISOString(),
    intermissionEndsAt: null,
    status: "OPEN",
    votesA: 0,
    votesB: 0,
    winnerKey: null,
  };
}

export function createInitialRound(): Round {
  return createRoundAt(new Date());
}

export function acceptVote(
  round: Round,
  _voterId: string,
  optionKey: OptionKey,
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

export function closeRound(round: Round, now: Date): Round {
  if (round.status === "CLOSED") {
    // Idempotent: already closed
    return round;
  }
  // A wins ties
  const winnerKey: OptionKey = round.votesB > round.votesA ? "B" : "A";
  const intermissionEndsAt = new Date(
    now.getTime() + INTERMISSION_DURATION_MS,
  ).toISOString();

  return {
    ...round,
    status: "CLOSED",
    winnerKey,
    intermissionEndsAt,
  };
}

export interface TickResult {
  round: Round;
  transitioned: boolean;
  eventType?: LifecycleEventType;
}

export function tickRound(round: Round, now: Date): TickResult {
  if (round.status === "OPEN") {
    const closesAtMs = new Date(round.closesAt).getTime();
    if (now.getTime() < closesAtMs) {
      return { round, transitioned: false };
    }

    return {
      round: closeRound(round, now),
      transitioned: true,
      eventType: "round.closed",
    };
  }

  const intermissionEndsAtMs = round.intermissionEndsAt
    ? new Date(round.intermissionEndsAt).getTime()
    : new Date(round.closesAt).getTime() + INTERMISSION_DURATION_MS;

  if (now.getTime() < intermissionEndsAtMs) {
    if (round.intermissionEndsAt) {
      return { round, transitioned: false };
    }

    return {
      round: {
        ...round,
        intermissionEndsAt: new Date(intermissionEndsAtMs).toISOString(),
      },
      transitioned: true,
    };
  }

  return {
    round: createRoundAt(now),
    transitioned: true,
    eventType: "round.opened",
  };
}
