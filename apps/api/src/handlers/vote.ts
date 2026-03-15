import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getRoundRepo } from "../repo";
import type { VoteRequest, VoteResponse } from "@choose-your-path/contracts";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const repo = getRoundRepo();
  const body = JSON.parse(event.body ?? "{}") as Partial<VoteRequest>;
  const { voterId, optionKey } = body;

  if (!voterId || !optionKey || (optionKey !== "A" && optionKey !== "B")) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Invalid request: voterId and optionKey (A or B) are required",
      }),
    };
  }

  const round = await repo.getRound();
  if (!round) {
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "No active round found" }),
    };
  }

  if (round.status === "CLOSED") {
    return {
      statusCode: 409,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Round is already closed" }),
    };
  }

  if (Date.now() >= new Date(round.closesAt).getTime()) {
    return {
      statusCode: 409,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Voting window has ended" }),
    };
  }

  try {
    const counts = await repo.atomicVote(round.nodeId, voterId, optionKey);
    const response: VoteResponse = counts;
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (err: unknown) {
    // Conditional/transaction failures mean duplicate vote or round closed/expired
    if (
      err instanceof Error &&
      (err.name === "ConditionalCheckFailedException" ||
        err.name === "TransactionCanceledException" ||
        err.message.includes("ConditionalCheckFailedException") ||
        err.message.includes("TransactionCanceledException"))
    ) {
      return {
        statusCode: 409,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Duplicate vote or voting window has ended",
        }),
      };
    }
    throw err;
  }
};
