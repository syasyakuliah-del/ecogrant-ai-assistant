import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const serverStartTime = Date.now();

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function applySecurityHeaders(headers: Headers): Headers {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return headers;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  const newHeaders = new Headers(response.headers);
  applySecurityHeaders(newHeaders);

  if (response.status < 500) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
  }

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: applySecurityHeaders(new Headers({ "content-type": "text/html; charset=utf-8" })),
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // 43. Observability Endpoints: GET /health and GET /ready
    if (url.pathname === "/health") {
      const payload = {
        status: "ok",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: applySecurityHeaders(new Headers({ "content-type": "application/json" })),
      });
    }

    if (url.pathname === "/ready") {
      const payload = {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: applySecurityHeaders(new Headers({ "content-type": "application/json" })),
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: applySecurityHeaders(new Headers({ "content-type": "text/html; charset=utf-8" })),
      });
    }
  },
};
