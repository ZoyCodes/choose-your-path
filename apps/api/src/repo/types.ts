import type { OptionKey, Round } from '@choose-your-path/contracts';

export interface RoundRepository {
  getRound(): Promise<Round | null>;
  putRound(round: Round): Promise<void>;
  atomicVote(nodeId: string, voterId: string, optionKey: OptionKey): Promise<{ votesA: number; votesB: number }>;
}
