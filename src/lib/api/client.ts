import { z } from "zod";

import { clearTokens, loadTokens, saveTokens } from "@/features/auth/token-storage";
import { config } from "@/lib/config";

import { mockRequest } from "./mock";
import { authTokens } from "./schemas";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Backend error code, e.g. "VALIDATION", "FORBIDDEN", "RATE_LIMITED". */
    public readonly code?: string,
    /** One message per field (dot paths), for form validation errors. */
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The backend wraps every success as { data } and every failure as
// { error: { code, message, fieldErrors? } } (docs/cargodev-api-integration.md section 3).
const successEnvelope = z.object({ data: z.unknown() });
const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
});

// The auth provider registers this so the client can tell the UI "you are signed out"
// without importing React code (keeps the dependency pointing one way).
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Set false for endpoints that must work without a token (login, refresh). */
  auth?: boolean;
};

async function send(path: string, opts: RequestOptions, accessToken: string | null) {
  if (config.useMocks) {
    return mockRequest(path, opts.method ?? "GET", opts.body, accessToken);
  }
  // fetch only throws when no response arrived at all (offline, DNS, TLS): report it as
  // status 0 so screens can say "no connection" instead of blaming the server.
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: opts.method ?? "GET",
    // Content-Type only with a body: the server rejects a JSON content type on an empty body.
    headers: {
      Accept: "application/json",
      ...(opts.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  }).catch(() => {
    throw new ApiError(0, "Network request failed", "NETWORK");
  });
  if (res.status === 204) return { status: 204, data: null };
  const data: unknown = await res.json().catch(() => null);
  return { status: res.status, data };
}

// Single-flight refresh: if five requests get a 401 at once, only ONE refresh call runs
// and the others wait for it. This matters because refresh tokens ROTATE: using the same
// refresh token twice would make the server treat the second call as token theft.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const tokens = await loadTokens();
      if (!tokens) return false;
      const res = await send(
        "/auth/refresh",
        { method: "POST", body: { refreshToken: tokens.refreshToken }, auth: false },
        null,
      );
      // A dead, expired or reused refresh token is 403, not 401: any non-200 means signed out.
      if (res.status !== 200) return false;
      await saveTokens(authTokens.parse(successEnvelope.parse(res.data).data));
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Seconds until the JWT's `exp`, or 0 when it cannot be read. Decoding only: the server
// verifies the signature, the app just needs to know when to refresh.
function secondsLeft(accessToken: string): number {
  try {
    const payload = accessToken.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: number }).exp ?? 0;
    return exp - Date.now() / 1000;
  } catch {
    return 0;
  }
}

/**
 * An access token with at least two minutes left, refreshing first if needed (through the same
 * single-flight). For requests that cannot await a 401-and-retry themselves: image headers and
 * file downloads. Null when signed out.
 */
export async function freshAccessToken(): Promise<string | null> {
  if (config.useMocks) return (await loadTokens())?.accessToken ?? null;
  const tokens = await loadTokens();
  if (!tokens) return null;
  if (secondsLeft(tokens.accessToken) > 120) return tokens.accessToken;
  return (await refreshSession()) ? ((await loadTokens())?.accessToken ?? null) : null;
}

/**
 * Typed request. The zod schema validates the response at the boundary ("parse, don't
 * trust"): if the server sends something unexpected we fail here with a clear error,
 * not later inside a component.
 */
export async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  opts: RequestOptions = {},
): Promise<z.infer<S>> {
  const useAuth = opts.auth !== false;
  let tokens = useAuth ? await loadTokens() : null;
  let res = await send(path, opts, tokens?.accessToken ?? null);

  if (res.status === 401 && useAuth) {
    if (await refreshSession()) {
      tokens = await loadTokens();
      res = await send(path, opts, tokens?.accessToken ?? null);
    }
    if (res.status === 401) {
      await clearTokens();
      onSessionExpired?.();
      throw new ApiError(401, "Session expired");
    }
  }

  if (res.status < 200 || res.status >= 300) {
    const parsed = errorEnvelope.safeParse(res.data);
    if (!parsed.success) throw new ApiError(res.status, `Request failed (${res.status})`);
    const { code, message, fieldErrors } = parsed.data.error;
    throw new ApiError(res.status, message, code, fieldErrors);
  }
  return schema.parse(successEnvelope.parse(res.data).data);
}
