import { createInitialRound, acceptVote, closeRound } from '../roundEngine';
import type { Round } from '@choose-your-path/contracts';

describe('createInitialRound', () => {
  it('creates an OPEN round with zero votes', () => {
    const round = createInitialRound();
    expect(round.status).toBe('OPEN');
    expect(round.votesA).toBe(0);
    expect(round.votesB).toBe(0);
    expect(round.winnerKey).toBeNull();
    expect(round.nodeId).toBeTruthy();
  });
});

describe('acceptVote', () => {
  let round: Round;
  beforeEach(() => {
    round = createInitialRound();
  });

  it('increments votesA for option A', () => {
    const updated = acceptVote(round, 'voter1', 'A');
    expect(updated.votesA).toBe(1);
    expect(updated.votesB).toBe(0);
  });

  it('increments votesB for option B', () => {
    const updated = acceptVote(round, 'voter1', 'B');
    expect(updated.votesA).toBe(0);
    expect(updated.votesB).toBe(1);
  });

  it('throws if round is CLOSED', () => {
    const closed = closeRound(round, new Date());
    expect(() => acceptVote(closed, 'voter1', 'A')).toThrow('Round is already closed');
  });

  it('throws on invalid option key', () => {
    expect(() => acceptVote(round, 'voter1', 'C' as any)).toThrow('Invalid option key');
  });
});

describe('closeRound', () => {
  let round: Round;
  beforeEach(() => {
    round = createInitialRound();
  });

  it('closes an OPEN round', () => {
    const closed = closeRound(round, new Date());
    expect(closed.status).toBe('CLOSED');
  });

  it('A wins when tied', () => {
    let r = acceptVote(round, 'v1', 'A');
    r = acceptVote(r, 'v2', 'B');
    const closed = closeRound(r, new Date());
    expect(closed.winnerKey).toBe('A');
  });

  it('B wins when B has more votes', () => {
    let r = acceptVote(round, 'v1', 'B');
    r = acceptVote(r, 'v2', 'B');
    r = acceptVote(r, 'v3', 'A');
    const closed = closeRound(r, new Date());
    expect(closed.winnerKey).toBe('B');
  });

  it('A wins when A has more votes', () => {
    let r = acceptVote(round, 'v1', 'A');
    r = acceptVote(r, 'v2', 'A');
    r = acceptVote(r, 'v3', 'B');
    const closed = closeRound(r, new Date());
    expect(closed.winnerKey).toBe('A');
  });

  it('is idempotent - does not re-close', () => {
    const closed1 = closeRound(round, new Date());
    const closed2 = closeRound(closed1, new Date());
    expect(closed2).toEqual(closed1);
  });

  it('A wins with zero votes (tie)', () => {
    const closed = closeRound(round, new Date());
    expect(closed.winnerKey).toBe('A');
  });
});
