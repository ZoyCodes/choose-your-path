import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getRoundRepo } from '../repo';
import { createInitialRound } from '../core/roundEngine';
import type { CurrentRoundResponse } from '@choose-your-path/contracts';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const repo = getRoundRepo();
  let round = await repo.getRound();

  if (!round) {
    round = createInitialRound();
    await repo.putRound(round);
  }

  const body: CurrentRoundResponse = { round };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
};
