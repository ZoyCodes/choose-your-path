import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";
import type {
  LifecycleEventType,
  Round,
  RoundLifecycleEvent,
} from "@choose-your-path/contracts";

const sqsClient = new SQSClient({});

export async function publishLifecycleEvent(
  eventType: LifecycleEventType,
  round: Round,
): Promise<void> {
  const queueUrl = process.env.WEBHOOK_QUEUE_URL;
  if (!queueUrl) {
    return;
  }

  const event: RoundLifecycleEvent = {
    eventId: uuidv4(),
    eventType,
    eventVersion: "v1",
    occurredAt: new Date().toISOString(),
    round,
  };

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: "String",
          StringValue: eventType,
        },
        roundId: {
          DataType: "String",
          StringValue: round.nodeId,
        },
      },
    }),
  );
}
