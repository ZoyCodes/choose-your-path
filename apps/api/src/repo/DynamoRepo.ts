import { atomicVote, getRound, putRound } from '../db/dynamodb';
import type { RoundRepository } from './types';

export class DynamoRepo implements RoundRepository {
  getRound = getRound;
  putRound = putRound;
  atomicVote = atomicVote;
}
