import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Round } from '@choose-your-path/contracts';

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME ?? 'choose-your-path';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const STORY_PK = 'STORY';
const ROUND_SK = 'ROUND';

export async function getRound(): Promise<Round | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: STORY_PK, sk: ROUND_SK },
    })
  );
  if (!result.Item) return null;
  return result.Item as Round;
}

export async function putRound(round: Round): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: STORY_PK, sk: ROUND_SK, ...round },
    })
  );
}

export async function checkVoteReceipt(nodeId: string, voterId: string): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `ROUND#${nodeId}`,
        sk: `VOTE#${voterId}`,
      },
    })
  );
  return !!result.Item;
}

export async function atomicVote(
  nodeId: string,
  voterId: string,
  optionKey: 'A' | 'B'
): Promise<{ votesA: number; votesB: number }> {
  const voteField = optionKey === 'A' ? 'votesA' : 'votesB';

  // Write vote receipt
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `ROUND#${nodeId}`,
        sk: `VOTE#${voterId}`,
        votedAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );

  // Atomically increment vote count
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: STORY_PK, sk: ROUND_SK },
      UpdateExpression: `SET ${voteField} = ${voteField} + :inc`,
      ConditionExpression: '#status = :open',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':inc': 1, ':open': 'OPEN' },
      ReturnValues: 'ALL_NEW',
    })
  );

  const attrs = result.Attributes as Record<string, number>;
  return { votesA: attrs.votesA, votesB: attrs.votesB };
}
