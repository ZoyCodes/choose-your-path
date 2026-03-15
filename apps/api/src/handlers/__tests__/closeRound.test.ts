import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { Round } from "@choose-your-path/contracts";
import { handler } from "../closeRound";
import { getRoundRepo } from "../../repo";
import { createInitialRound, tickRound } from "../../core/roundEngine";
import { publishLifecycleEvent } from "../../events/publishLifecycleEvent";

jest.mock("../../repo", () => ({
  getRoundRepo: jest.fn(),
}));

jest.mock("../../core/roundEngine", () => ({
  createInitialRound: jest.fn(),
  tickRound: jest.fn(),
}));

jest.mock("../../events/publishLifecycleEvent", () => ({
  publishLifecycleEvent: jest.fn(),
}));

const mockedGetRoundRepo = getRoundRepo as jest.MockedFunction<
  typeof getRoundRepo
>;
const mockedCreateInitialRound = createInitialRound as jest.MockedFunction<
  typeof createInitialRound
>;
const mockedTickRound = tickRound as jest.MockedFunction<typeof tickRound>;
const mockedPublishLifecycleEvent =
  publishLifecycleEvent as jest.MockedFunction<typeof publishLifecycleEvent>;

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
    votesA: 0,
    votesB: 0,
    winnerKey: null,
    ...overrides,
  };
}

function buildEvent(): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /close",
    rawPath: "/close",
    rawQueryString: "",
    headers: {},
    requestContext: {
      http: {
        method: "POST",
        path: "/close",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
    },
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;
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

describe("closeRound handler", () => {
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

  it("initializes first round when no round exists", async () => {
    const initialRound = buildRound({ nodeId: "initial-round" });
    repo.getRound.mockResolvedValue(null);
    mockedCreateInitialRound.mockReturnValue(initialRound);

    const result = await handler(buildEvent(), {} as never, () => undefined);
    const response = getResponse(result);

    expect(response.statusCode).toBe(200);
    expect(repo.putRound).toHaveBeenCalledWith(initialRound);
    expect(mockedPublishLifecycleEvent).not.toHaveBeenCalled();
  });

  it("publishes lifecycle event when tick transitions with eventType", async () => {
    const currentRound = buildRound();
    const closedRound = buildRound({ status: "CLOSED", winnerKey: "A" });
    repo.getRound.mockResolvedValue(currentRound);
    mockedTickRound.mockReturnValue({
      round: closedRound,
      transitioned: true,
      eventType: "round.closed",
    });

    const result = await handler(buildEvent(), {} as never, () => undefined);
    const response = getResponse(result);

    expect(response.statusCode).toBe(200);
    expect(repo.putRound).toHaveBeenCalledWith(closedRound);
    expect(mockedPublishLifecycleEvent).toHaveBeenCalledWith(
      "round.closed",
      closedRound,
    );
  });

  it("does not publish when tick has no lifecycle eventType", async () => {
    const currentRound = buildRound();
    const adjustedRound = buildRound({
      status: "CLOSED",
      intermissionEndsAt: new Date(Date.now() + 5_000).toISOString(),
      winnerKey: "A",
    });
    repo.getRound.mockResolvedValue(currentRound);
    mockedTickRound.mockReturnValue({
      round: adjustedRound,
      transitioned: true,
    });

    const result = await handler(buildEvent(), {} as never, () => undefined);
    const response = getResponse(result);

    expect(response.statusCode).toBe(200);
    expect(repo.putRound).toHaveBeenCalledWith(adjustedRound);
    expect(mockedPublishLifecycleEvent).not.toHaveBeenCalled();
  });

  it("does not write or publish when tick does not transition", async () => {
    const currentRound = buildRound();
    repo.getRound.mockResolvedValue(currentRound);
    mockedTickRound.mockReturnValue({
      round: currentRound,
      transitioned: false,
    });

    const result = await handler(buildEvent(), {} as never, () => undefined);
    const response = getResponse(result);

    expect(response.statusCode).toBe(200);
    expect(repo.putRound).not.toHaveBeenCalled();
    expect(mockedPublishLifecycleEvent).not.toHaveBeenCalled();
  });

  it("publishes lifecycle event for round.opened transitions", async () => {
    const closedRound = buildRound({
      status: "CLOSED",
      intermissionEndsAt: new Date(Date.now() - 1000).toISOString(),
      winnerKey: "A",
    });
    const openedRound = buildRound({
      nodeId: "round-2",
      status: "OPEN",
      winnerKey: null,
      intermissionEndsAt: null,
    });

    repo.getRound.mockResolvedValue(closedRound);
    mockedTickRound.mockReturnValue({
      round: openedRound,
      transitioned: true,
      eventType: "round.opened",
    });

    const result = await handler(buildEvent(), {} as never, () => undefined);
    const response = getResponse(result);

    expect(response.statusCode).toBe(200);
    expect(repo.putRound).toHaveBeenCalledWith(openedRound);
    expect(mockedPublishLifecycleEvent).toHaveBeenCalledWith(
      "round.opened",
      openedRound,
    );
  });
});
