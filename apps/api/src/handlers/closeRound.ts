import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getRoundRepo } from '../repo';
import { closeRound } from '../core/roundEngine';
import type { CloseRoundResponse } from '@choose-your-path/contracts';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const repo = getRoundRepo();
  const round = await repo.getRound();
  if (!round) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'No round found' }),
    };
  }

  const closed = closeRound(round, new Date());
  await repo.putRound(closed);

  const body: CloseRoundResponse = { round: closed };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
};
