import { InMemoryRepo } from "../InMemoryRepo";
import type { Round } from "@choose-your-path/contracts";

function createRound(overrides: Partial<Round> = {}): Round {
  const now = Date.now();
  return {
    nodeId: "round-1",
    sceneText: "scene",
    optionA: "A",
    optionB: "B",
    opensAt: new Date(now - 5_000).toISOString(),
    closesAt: new Date(now + 5_000).toISOString(),
    status: "OPEN",
    votesA: 0,
    votesB: 0,
    winnerKey: null,
    ...overrides,
  };
}

describe("InMemoryRepo.atomicVote", () => {
  it("accepts a vote while round is open and before closesAt", async () => {
    const repo = new InMemoryRepo();
    await repo.putRound(createRound());

    const result = await repo.atomicVote("round-1", "v1", "A");

    expect(result).toEqual({ votesA: 1, votesB: 0 });
  });

  it("rejects votes after closesAt even if status is OPEN", async () => {
    const repo = new InMemoryRepo();
    await repo.putRound(
      createRound({
        closesAt: new Date(Date.now() - 1000).toISOString(),
      }),
    );

    await expect(repo.atomicVote("round-1", "v1", "A")).rejects.toMatchObject({
      name: "ConditionalCheckFailedException",
    });
  });
});
