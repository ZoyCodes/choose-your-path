import type { OptionKey, Round } from '@choose-your-path/contracts';
import type { RoundRepository } from './types';

function conditionalCheckFailedError(): Error {
  const err = new Error('ConditionalCheckFailedException');
  err.name = 'ConditionalCheckFailedException';
  return err;
}

export class InMemoryRepo implements RoundRepository {
  private round: Round | null = null;
  private voteReceipts = new Set<string>();

  async getRound(): Promise<Round | null> {
    return this.round;
  }

  async putRound(round: Round): Promise<void> {
    if (!this.round || this.round.nodeId !== round.nodeId) {
      this.voteReceipts.clear();
    }
    this.round = round;
  }

  async atomicVote(
    nodeId: string,
    voterId: string,
    optionKey: OptionKey
  ): Promise<{ votesA: number; votesB: number }> {
    if (!this.round || this.round.nodeId !== nodeId || this.round.status !== 'OPEN') {
      throw conditionalCheckFailedError();
    }

    const receiptKey = `${nodeId}:${voterId}`;
    if (this.voteReceipts.has(receiptKey)) {
      throw conditionalCheckFailedError();
    }

    this.voteReceipts.add(receiptKey);
    this.round = {
      ...this.round,
      votesA: optionKey === 'A' ? this.round.votesA + 1 : this.round.votesA,
      votesB: optionKey === 'B' ? this.round.votesB + 1 : this.round.votesB,
    };

    return { votesA: this.round.votesA, votesB: this.round.votesB };
  }
}
