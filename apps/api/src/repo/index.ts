import { DynamoRepo } from './DynamoRepo';
import { InMemoryRepo } from './InMemoryRepo';
import type { RoundRepository } from './types';

let memoryRepo: InMemoryRepo | null = null;
const dynamoRepo = new DynamoRepo();

export function getRoundRepo(): RoundRepository {
  if (process.env.API_REPO === 'memory') {
    if (!memoryRepo) {
      memoryRepo = new InMemoryRepo();
    }
    return memoryRepo;
  }

  return dynamoRepo;
}
