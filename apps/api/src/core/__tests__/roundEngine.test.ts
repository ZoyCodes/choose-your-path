import {
  createInitialRound,
  acceptVote,
  closeRound,
  tickRound,
} from "../roundEngine";
import type { Round } from "@choose-your-path/contracts";

describe("createInitialRound", () => {
  it("creates an OPEN round with zero votes", () => {
    const round = createInitialRound();
    expect(round.status).toBe("OPEN");
    expect(round.votesA).toBe(0);
    expect(round.votesB).toBe(0);
    expect(round.winnerKey).toBeNull();
    expect(round.nodeId).toBeTruthy();
  });
});

describe("acceptVote", () => {
  let round: Round;
  beforeEach(() => {
    round = createInitialRound();
  });

  it("increments votesA for option A", () => {
    const updated = acceptVote(round, "voter1", "A");
    expect(updated.votesA).toBe(1);
    expect(updated.votesB).toBe(0);
  });

  it("increments votesB for option B", () => {
    const updated = acceptVote(round, "voter1", "B");
    expect(updated.votesA).toBe(0);
    expect(updated.votesB).toBe(1);
  });

  it("throws if round is CLOSED", () => {
    const closed = closeRound(round, new Date());
    expect(() => acceptVote(closed, "voter1", "A")).toThrow(
      "Round is already closed",
    );
  });

  it("throws on invalid option key", () => {
    expect(() => acceptVote(round, "voter1", "C" as any)).toThrow(
      "Invalid option key",
    );
  });
});

describe("closeRound", () => {
  let round: Round;
  beforeEach(() => {
    round = createInitialRound();
  });

  it("closes an OPEN round", () => {
    const closed = closeRound(round, new Date());
    expect(closed.status).toBe("CLOSED");
  });

  it("A wins when tied", () => {
    let r = acceptVote(round, "v1", "A");
    r = acceptVote(r, "v2", "B");
    const closed = closeRound(r, new Date());
    expect(closed.winnerKey).toBe("A");
  });

  it("B wins when B has more votes", () => {
    let r = acceptVote(round, "v1", "B");
    r = acceptVote(r, "v2", "B");
    r = acceptVote(r, "v3", "A");
    const closed = closeRound(r, new Date());
    expect(closed.winnerKey).toBe("B");
  });

  it("A wins when A has more votes", () => {
    let r = acceptVote(round, "v1", "A");
    r = acceptVote(r, "v2", "A");
    r = acceptVote(r, "v3", "B");
    const closed = closeRound(r, new Date());
    expect(closed.winnerKey).toBe("A");
  });

  it("is idempotent - does not re-close", () => {
    const closed1 = closeRound(round, new Date());
    const closed2 = closeRound(closed1, new Date());
    expect(closed2).toEqual(closed1);
  });

  it("A wins with zero votes (tie)", () => {
    const closed = closeRound(round, new Date());
    expect(closed.winnerKey).toBe("A");
  });

  it("sets intermission end when closing", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const closed = closeRound(round, now);
    expect(closed.intermissionEndsAt).toBeTruthy();
    expect(
      new Date(closed.intermissionEndsAt as string).getTime(),
    ).toBeGreaterThan(now.getTime());
  });
});

describe("tickRound", () => {
  it("does not transition while open before closesAt", () => {
    const openRound = createInitialRound();
    const now = new Date(new Date(openRound.opensAt).getTime() + 1000);

    const result = tickRound(openRound, now);

    expect(result.transitioned).toBe(false);
    expect(result.round).toEqual(openRound);
    expect(result.eventType).toBeUndefined();
  });

  it("transitions OPEN to CLOSED when closesAt has passed", () => {
    const openRound = createInitialRound();
    const now = new Date(new Date(openRound.closesAt).getTime() + 1);

    const result = tickRound(openRound, now);

    expect(result.transitioned).toBe(true);
    expect(result.eventType).toBe("round.closed");
    expect(result.round.status).toBe("CLOSED");
    expect(result.round.intermissionEndsAt).toBeTruthy();
  });

  it("transitions CLOSED to new OPEN round when intermission ends", () => {
    const openRound = createInitialRound();
    const closedAt = new Date(new Date(openRound.closesAt).getTime() + 1);
    const closedRound = closeRound(openRound, closedAt);
    const now = new Date(
      new Date(closedRound.intermissionEndsAt as string).getTime() + 1,
    );

    const result = tickRound(closedRound, now);

    expect(result.transitioned).toBe(true);
    expect(result.eventType).toBe("round.opened");
    expect(result.round.status).toBe("OPEN");
    expect(result.round.nodeId).not.toBe(closedRound.nodeId);
    expect(result.round.winnerKey).toBeNull();
  });

  it("completes full lifecycle and remains stable between boundaries", () => {
    const initialRound = createInitialRound();

    const beforeClose = new Date(new Date(initialRound.closesAt).getTime() - 1);
    const stillOpen = tickRound(initialRound, beforeClose);
    expect(stillOpen.transitioned).toBe(false);
    expect(stillOpen.round.status).toBe("OPEN");

    const atClose = new Date(new Date(initialRound.closesAt).getTime() + 1);
    const closed = tickRound(initialRound, atClose);
    expect(closed.transitioned).toBe(true);
    expect(closed.eventType).toBe("round.closed");
    expect(closed.round.status).toBe("CLOSED");

    const beforeIntermissionEnd = new Date(
      new Date(closed.round.intermissionEndsAt as string).getTime() - 1,
    );
    const stillClosed = tickRound(closed.round, beforeIntermissionEnd);
    expect(stillClosed.transitioned).toBe(false);
    expect(stillClosed.round.status).toBe("CLOSED");

    const afterIntermissionEnd = new Date(
      new Date(closed.round.intermissionEndsAt as string).getTime() + 1,
    );
    const reopened = tickRound(closed.round, afterIntermissionEnd);
    expect(reopened.transitioned).toBe(true);
    expect(reopened.eventType).toBe("round.opened");
    expect(reopened.round.status).toBe("OPEN");
    expect(reopened.round.nodeId).not.toBe(initialRound.nodeId);
  });
});
