import type { SQSEvent } from "aws-lambda";
import { handler } from "../webhookDelivery";

jest.mock("@aws-sdk/client-secrets-manager", () => {
  const send = jest.fn();
  class SecretsManagerClient {
    send = send;
  }
  class GetSecretValueCommand {
    constructor(public readonly input: unknown) {}
  }

  return {
    SecretsManagerClient,
    GetSecretValueCommand,
    __mockSend: send,
  };
});

const { __mockSend } = jest.requireMock("@aws-sdk/client-secrets-manager") as {
  __mockSend: jest.Mock;
};

function buildEvent(
  records: Array<{ messageId: string; body: string }>,
): SQSEvent {
  return {
    Records: records.map((record) => ({
      messageId: record.messageId,
      body: record.body,
      receiptHandle: "receipt",
      attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: String(Date.now()),
        SenderId: "sender",
        ApproximateFirstReceiveTimestamp: String(Date.now()),
      },
      messageAttributes: {},
      md5OfBody: "md5",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:queue",
      awsRegion: "us-east-1",
    })),
  };
}

describe("webhookDelivery handler", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WEBHOOK_TARGET_URL = "https://example.com/webhook";
    process.env.WEBHOOK_SIGNING_SECRET_ARN = "";
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns no failures when all deliveries succeed", async () => {
    const event = buildEvent([
      {
        messageId: "msg-1",
        body: JSON.stringify({
          eventType: "round.closed",
          eventId: "evt-1",
          eventVersion: "v1",
        }),
      },
    ]);

    const result = await handler(event);

    expect(result.batchItemFailures).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns failed item identifiers for failed webhook responses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const event = buildEvent([
      {
        messageId: "msg-1",
        body: JSON.stringify({ eventType: "round.closed" }),
      },
      {
        messageId: "msg-2",
        body: JSON.stringify({ eventType: "round.opened" }),
      },
    ]);

    const result = await handler(event);

    expect(result.batchItemFailures).toEqual([{ itemIdentifier: "msg-1" }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("includes signature header when signing secret is configured", async () => {
    process.env.WEBHOOK_SIGNING_SECRET_ARN =
      "arn:aws:secretsmanager:us-east-1:123456789012:secret:webhook";
    __mockSend.mockResolvedValue({ SecretString: "top-secret" });

    const event = buildEvent([
      {
        messageId: "msg-1",
        body: JSON.stringify({
          eventType: "round.closed",
          eventId: "evt-1",
          eventVersion: "v1",
        }),
      },
    ]);

    await handler(event);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestInit = fetchCall[1] as { headers?: Record<string, string> };

    expect(requestInit.headers?.["x-cyp-signature"]).toMatch(/^sha256=/);
    expect(__mockSend).toHaveBeenCalledTimes(1);
  });

  it("throws when webhook target is not configured", async () => {
    delete process.env.WEBHOOK_TARGET_URL;

    await expect(
      handler(buildEvent([{ messageId: "msg-1", body: "{}" }])),
    ).rejects.toThrow("WEBHOOK_TARGET_URL is required for webhook delivery");
  });
});
