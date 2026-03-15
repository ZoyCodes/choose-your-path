import { createHmac } from "crypto";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({});

let cachedSigningSecret: string | null | undefined;
let cachedSigningSecretArn: string | undefined;

async function getSigningSecret(): Promise<string | null> {
  const signingSecretArn = process.env.WEBHOOK_SIGNING_SECRET_ARN?.trim();

  if (cachedSigningSecretArn !== signingSecretArn) {
    cachedSigningSecret = undefined;
    cachedSigningSecretArn = signingSecretArn;
  }

  if (cachedSigningSecret !== undefined) {
    return cachedSigningSecret;
  }

  if (!signingSecretArn) {
    cachedSigningSecret = null;
    return cachedSigningSecret;
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: signingSecretArn,
    }),
  );

  if (!response.SecretString) {
    throw new Error("Webhook signing secret is missing or binary-encoded");
  }

  cachedSigningSecret = response.SecretString;
  return cachedSigningSecret;
}

function createSignature(body: string, secret: string): string {
  const digest = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");
  return `sha256=${digest}`;
}

async function deliverMessage(targetUrl: string, body: string): Promise<void> {
  const signingSecret = await getSigningSecret();
  const payload = JSON.parse(body) as {
    eventType?: string;
    eventId?: string;
    eventVersion?: string;
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-cyp-event-type": payload.eventType ?? "unknown",
    "x-cyp-event-id": payload.eventId ?? "",
    "x-cyp-event-version": payload.eventVersion ?? "v1",
  };

  if (signingSecret) {
    headers["x-cyp-signature"] = createSignature(body, signingSecret);
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with HTTP ${response.status}`);
  }
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const targetUrl = process.env.WEBHOOK_TARGET_URL?.trim();

  if (!targetUrl) {
    throw new Error("WEBHOOK_TARGET_URL is required for webhook delivery");
  }

  const failures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      await deliverMessage(targetUrl, record.body);
    } catch (error) {
      console.error("Webhook delivery failed", {
        messageId: record.messageId,
        error,
      });
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
