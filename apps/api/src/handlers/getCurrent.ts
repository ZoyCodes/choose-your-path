import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getRoundRepo } from "../repo";
import { createInitialRound } from "../core/roundEngine";
import type {
  CurrentRoundResponse,
  RoundPhase,
} from "@choose-your-path/contracts";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const repo = getRoundRepo();
  let round = await repo.getRound();

  if (!round) {
    round = createInitialRound();
    await repo.putRound(round);
  }

  const serverNow = new Date().toISOString();
  const phase: RoundPhase = round.status === "OPEN" ? "VOTING" : "INTERMISSION";
  const nextTransitionAt =
    round.status === "OPEN"
      ? round.closesAt
      : (round.intermissionEndsAt ?? round.closesAt);

  const body: CurrentRoundResponse = {
    round,
    phase,
    serverNow,
    nextTransitionAt,
  };
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
};
