import type { Round } from "@choose-your-path/contracts";
import { handler } from "../getCurrent";
import { getRoundRepo } from "../../repo";
import { createInitialRound } from "../../core/roundEngine";

jest.mock("../../repo", () => ({
  getRoundRepo: jest.fn(),
}));

jest.mock("../../core/roundEngine", () => ({
  createInitialRound: jest.fn(),
}));

const mockedGetRoundRepo = getRoundRepo as jest.MockedFunction<
  typeof getRoundRepo
>;
const mockedCreateInitialRound = createInitialRound as jest.MockedFunction<
  typeof createInitialRound
>;

type RepoMock = {
  getRound: jest.Mock;
  putRound: jest.Mock;
  atomicVote: jest.Mock;
};

function buildRound(overrides: Partial<Round> = {}): Round {
  return {
    nodeId: "round-1",
    sceneText: "scene",
    optionA: "A",
    optionB: "B",
    opensAt: new Date(Date.now() - 5_000).toISOString(),
    closesAt: new Date(Date.now() + 5_000).toISOString(),
    intermissionEndsAt: null,
    status: "OPEN",
    votesA: 1,
    votesB: 2,
    winnerKey: null,
    ...overrides,
  };
}

function getResponse(result: unknown): { statusCode: number; body: string } {
  if (
    !result ||
    typeof result !== "object" ||
    !("statusCode" in result) ||
    !("body" in result)
  ) {
    throw new Error("Expected HTTP response object");
  }
  return result as { statusCode: number; body: string };
}

describe("getCurrent handler", () => {
  let repo: RepoMock;

  beforeEach(() => {
    jest.resetAllMocks();
    repo = {
      getRound: jest.fn(),
      putRound: jest.fn(),
      atomicVote: jest.fn(),
    };
    mockedGetRoundRepo.mockReturnValue(
      repo as unknown as ReturnType<typeof getRoundRepo>,
    );
  });

  it("creates initial round when missing and returns lifecycle metadata", async () => {
    const createdRound = buildRound({
      nodeId: "created-round",
      status: "OPEN",
    });
    repo.getRound.mockResolvedValue(null);
    mockedCreateInitialRound.mockReturnValue(createdRound);

    const result = await handler({} as never, {} as never, () => undefined);
    const response = getResponse(result);
    const body = JSON.parse(response.body) as {
      round: Round;
      phase: string;
      serverNow: string;
      nextTransitionAt: string;
    };

    expect(response.statusCode).toBe(200);
    expect(repo.putRound).toHaveBeenCalledWith(createdRound);
    expect(body.round.nodeId).toBe("created-round");
    expect(body.phase).toBe("VOTING");
    expect(body.nextTransitionAt).toBe(createdRound.closesAt);
    expect(Number.isNaN(Date.parse(body.serverNow))).toBe(false);
  });

  it("returns intermission metadata for closed rounds", async () => {
    const closedRound = buildRound({
      status: "CLOSED",
      winnerKey: "A",
      intermissionEndsAt: new Date(Date.now() + 3_000).toISOString(),
    });
    repo.getRound.mockResolvedValue(closedRound);

    const result = await handler({} as never, {} as never, () => undefined);
    const response = getResponse(result);
    const body = JSON.parse(response.body) as {
      round: Round;
      phase: string;
      nextTransitionAt: string;
    };

    expect(response.statusCode).toBe(200);
    expect(body.phase).toBe("INTERMISSION");
    expect(body.nextTransitionAt).toBe(closedRound.intermissionEndsAt);
  });
});
