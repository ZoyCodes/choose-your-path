import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getRoundRepo } from "../repo";
import { createInitialRound, tickRound } from "../core/roundEngine";
import { publishLifecycleEvent } from "../events/publishLifecycleEvent";
import type { CloseRoundResponse } from "@choose-your-path/contracts";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const repo = getRoundRepo();
  const round = await repo.getRound();
  if (!round) {
    const initialRound = createInitialRound();
    await repo.putRound(initialRound);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ round: initialRound }),
    };
  }

  const result = tickRound(round, new Date());
  if (result.transitioned) {
    await repo.putRound(result.round);
    if (result.eventType) {
      await publishLifecycleEvent(result.eventType, result.round);
    }
  }

  const body: CloseRoundResponse = { round: result.round };
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
};
