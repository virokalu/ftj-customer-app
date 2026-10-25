import type { z } from "zod";

import { clearTokens, loadTokens, saveTokens } from "@/features/auth/token-storage";
import { config } from "@/lib/config";

import { mockRequest } from "./mock";
import { authTokens } from "./schemas";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
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
      if (res.status !== 200) return false;
      await saveTokens(authTokens.parse(res.data));
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
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
    const message =
      typeof res.data === "object" && res.data !== null && "message" in res.data
        ? String((res.data as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return schema.parse(res.data);
}
