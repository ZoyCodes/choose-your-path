import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getRound, atomicVote } from '../db/dynamodb';
import type { VoteRequest, VoteResponse } from '@choose-your-path/contracts';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body ?? '{}') as Partial<VoteRequest>;
  const { voterId, optionKey } = body;

  if (!voterId || !optionKey || (optionKey !== 'A' && optionKey !== 'B')) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid request: voterId and optionKey (A or B) are required' }),
    };
  }

  const round = await getRound();
  if (!round) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'No active round found' }),
    };
  }

  if (round.status === 'CLOSED') {
    return {
      statusCode: 409,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Round is already closed' }),
    };
  }

  try {
    const counts = await atomicVote(round.nodeId, voterId, optionKey);
    const response: VoteResponse = counts;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(response),
    };
  } catch (err: unknown) {
    // ConditionalCheckFailedException means voter already voted or round closed
    if (
      err instanceof Error &&
      (err.name === 'ConditionalCheckFailedException' ||
        err.message.includes('ConditionalCheckFailedException'))
    ) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Duplicate vote or round is closed' }),
      };
    }
    throw err;
  }
};
