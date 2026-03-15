import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { Round } from "@choose-your-path/contracts";
import { handler } from "../vote";
import { getRoundRepo } from "../../repo";

jest.mock("../../repo", () => ({
  getRoundRepo: jest.fn(),
}));

const mockedGetRoundRepo = getRoundRepo as jest.MockedFunction<
  typeof getRoundRepo
>;

function buildRound(overrides: Partial<Round> = {}): Round {
  return {
    nodeId: "round-1",
    sceneText: "scene",
    optionA: "A",
    optionB: "B",
    opensAt: new Date(Date.now() - 5_000).toISOString(),
    closesAt: new Date(Date.now() + 5_000).toISOString(),
    status: "OPEN",
    votesA: 1,
    votesB: 2,
    winnerKey: null,
    ...overrides,
  };
}

function buildEvent(body: unknown): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /vote",
    rawPath: "/vote",
    rawQueryString: "",
    headers: {},
    requestContext: {
      http: {
        method: "POST",
        path: "/vote",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
    },
    isBase64Encoded: false,
    body: JSON.stringify(body),
  } as APIGatewayProxyEventV2;
}

function expectHttpResponse(result: unknown): {
  statusCode: number;
  body: string;
} {
  if (!result || typeof result !== "object") {
    throw new Error("Expected object response");
  }

  if (!("statusCode" in result) || !("body" in result)) {
    throw new Error("Expected HTTP-style lambda response");
  }

  return result as { statusCode: number; body: string };
}

describe("vote handler", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 409 when voting window has ended", async () => {
    mockedGetRoundRepo.mockReturnValue({
      getRound: jest
        .fn()
        .mockResolvedValue(
          buildRound({ closesAt: new Date(Date.now() - 1_000).toISOString() }),
        ),
      putRound: jest.fn(),
      atomicVote: jest.fn(),
    });

    const result = await handler(
      buildEvent({ voterId: "v1", optionKey: "A" }),
      {} as never,
      () => undefined,
    );
    const response = expectHttpResponse(result);

    expect(response.statusCode).toBe(409);
    expect(response.body).toContain("Voting window has ended");
  });

  it("returns 409 on close-race conditional failure", async () => {
    const conditionalErr = new Error("ConditionalCheckFailedException");
    conditionalErr.name = "ConditionalCheckFailedException";

    mockedGetRoundRepo.mockReturnValue({
      getRound: jest.fn().mockResolvedValue(buildRound()),
      putRound: jest.fn(),
      atomicVote: jest.fn().mockRejectedValue(conditionalErr),
    });

    const result = await handler(
      buildEvent({ voterId: "v1", optionKey: "A" }),
      {} as never,
      () => undefined,
    );
    const response = expectHttpResponse(result);

    expect(response.statusCode).toBe(409);
    expect(response.body).toContain(
      "Duplicate vote or voting window has ended",
    );
  });

  it("returns 409 on transactional cancellation failure", async () => {
    const txErr = new Error("TransactionCanceledException");
    txErr.name = "TransactionCanceledException";

    mockedGetRoundRepo.mockReturnValue({
      getRound: jest.fn().mockResolvedValue(buildRound()),
      putRound: jest.fn(),
      atomicVote: jest.fn().mockRejectedValue(txErr),
    });

    const result = await handler(
      buildEvent({ voterId: "v1", optionKey: "A" }),
      {} as never,
      () => undefined,
    );
    const response = expectHttpResponse(result);

    expect(response.statusCode).toBe(409);
    expect(response.body).toContain(
      "Duplicate vote or voting window has ended",
    );
  });
});
