import { createServer, type IncomingMessage, type ServerResponse } from "http";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { handler as getCurrentHandler } from "../handlers/getCurrent";
import { handler as voteHandler } from "../handlers/vote";
import { handler as closeRoundHandler } from "../handlers/closeRound";

process.env.API_REPO = process.env.API_REPO ?? "memory";

const DEFAULT_PORT = 3001;
const DEFAULT_LOCAL_TICK_INTERVAL_MS = 5000;

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const LOCAL_TICK_INTERVAL_MS = readPositiveIntEnv(
  "LOCAL_TICK_INTERVAL_MS",
  DEFAULT_LOCAL_TICK_INTERVAL_MS,
);

const PORT = readPositiveIntEnv("PORT", DEFAULT_PORT);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

type LambdaHandler = (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyResultV2>;

function buildEvent(
  method: string,
  path: string,
  body?: string,
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {},
    requestContext: {
      http: {
        method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "local-dev-server",
      },
    },
    isBase64Encoded: false,
    body,
  } as APIGatewayProxyEventV2;
}

async function readBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks).toString("utf8");
}

async function invoke(
  handler: LambdaHandler,
  method: string,
  path: string,
  body?: string,
) {
  const event = buildEvent(method, path, body);
  return handler(event);
}

function writeResponse(
  res: ServerResponse,
  result: APIGatewayProxyResultV2,
): void {
  const statusCode =
    typeof result === "object" && result && "statusCode" in result
      ? (result.statusCode ?? 200)
      : 200;
  const headers =
    typeof result === "object" && result && "headers" in result
      ? (result.headers ?? {})
      : {};
  const body =
    typeof result === "object" && result && "body" in result
      ? (result.body ?? "")
      : "";

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
    ...headers,
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const path = req.url?.split("?")[0] ?? "/";

  if (method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  try {
    if (method === "GET" && path === "/current") {
      const result = await invoke(
        getCurrentHandler as LambdaHandler,
        method,
        path,
      );
      writeResponse(res, result);
      return;
    }

    if (method === "POST" && path === "/vote") {
      const body = await readBody(req);
      const result = await invoke(
        voteHandler as LambdaHandler,
        method,
        path,
        body,
      );
      writeResponse(res, result);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify({ error: "Not Found" }));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

let tickInFlight = false;

async function runLocalTick(): Promise<void> {
  if (tickInFlight) {
    return;
  }

  tickInFlight = true;
  try {
    await invoke(closeRoundHandler as LambdaHandler, "POST", "/internal/tick");
  } catch (error) {
    console.error("Local lifecycle tick failed", error);
  } finally {
    tickInFlight = false;
  }
}

const tickTimer = setInterval(() => {
  void runLocalTick();
}, LOCAL_TICK_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
  console.log(`Local lifecycle tick interval: ${LOCAL_TICK_INTERVAL_MS}ms`);
});

function shutdown() {
  clearInterval(tickTimer);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void runLocalTick();
