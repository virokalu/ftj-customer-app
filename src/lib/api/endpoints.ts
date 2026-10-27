import { z } from "zod";

import { request } from "./client";
import { me, session, stockListResponse, vehicleListResponse } from "./schemas";

// One function per endpoint. Screens call these through React Query hooks and never
// build URLs themselves, so when the backend changes a path, only this file changes.
// Paths are relative to config.apiUrl (/api/customer/v1). See doc/api/CUSTOMER_API.md.
export const api = {
  login: (email: string, password: string) =>
    request("/auth/login", session, { method: "POST", body: { email, password }, auth: false }),

  // The refresh token is the credential here: logout revokes that one session, no access token needed.
  logout: (refreshToken: string) =>
    request("/auth/logout", z.object({ loggedOut: z.literal(true) }), {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),

  // NOT IMPLEMENTED in the backend yet: served by mocks only.

  me: () => request("/me", me),

  vehicles: () => request("/vehicles", vehicleListResponse),

  stock: () => request("/stock", stockListResponse),
};
