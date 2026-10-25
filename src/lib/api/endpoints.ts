import { z } from "zod";

import { request } from "./client";
import { authTokens, me, stockListResponse, vehicleListResponse } from "./schemas";

// One function per endpoint. Screens call these through React Query hooks and never
// build URLs themselves, so when the backend changes a path, only this file changes.
export const api = {
  login: (email: string, password: string) =>
    request("/auth/login", authTokens, { method: "POST", body: { email, password }, auth: false }),

  logout: () => request("/auth/logout", z.null(), { method: "POST" }),

  me: () => request("/me", me),

  vehicles: () => request("/vehicles", vehicleListResponse),

  stock: () => request("/stock", stockListResponse),
};
