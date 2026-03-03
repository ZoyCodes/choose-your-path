import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getRound, putRound } from '../db/dynamodb';
import { createInitialRound } from '../core/roundEngine';
import type { CurrentRoundResponse } from '@choose-your-path/contracts';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  let round = await getRound();

  if (!round) {
    round = createInitialRound();
    await putRound(round);
  }

  const body: CurrentRoundResponse = { round };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
};
