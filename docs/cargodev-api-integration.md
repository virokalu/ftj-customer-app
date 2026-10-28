# CargoDev API integration guide (customer app)

Status: draft for review · Date: 2026-10-29 · Documentation only. All example values are fake.

Markers: `TO CONFIRM (API contract)` and `TO CONFIRM (screens)` are collected in the final section.

---

## 1. Purpose, scope, source of truth

**Purpose.** What the FTJ customer app (Expo, iOS first) needs from the CargoDev API and how it should use it.

**Source of truth.** The API owner's contract, **version 1.0.0 (2026-10-29)**, scope `/api/customer/v1` only.
- Input state: `docs/customer-app-integration.md` is **not in the repo yet** (`docs/` holds only the design notes and this guide). This guide was written from the identical text supplied with the task. Copy that file into `docs/` unchanged so section references (`contract §x.y`) resolve. If the two ever differ, the contract wins.
- The design inputs are in `docs/design/`. `design-screens-index.md` (v3, 18 Oct) and `design-v3-existing-data.md` are **partly older than the contract and your decisions**; see the conflicts list in section 6.
- Anything the contract does not state is marked `TO CONFIRM`. Never invent endpoints, fields, limits or shapes.

**The app must never**
- call `/api/v1` (staff) or `/api/public`;
- show or compute any price, amount, total purchase value or currency; sort by price (400);
- show cancelled vehicles, or say whether an email address or a serial number exists;
- offer phone or OTP login, WhatsApp as a working channel, stock, Reserve, cost estimates, saved vehicles, chat attachments;
- put tokens in AsyncStorage, URLs, logs, analytics, crash reports or deep links;
- hold or log a storage address (the API never returns one);
- ignore unknown response keys badly: **ignore unknown keys, tolerate unknown enum values** (contract §13).

**What the app stores locally.** Tokens (Keychain). Non-sensitive preferences (last tab, theme choice cache, "seen" markers for chat, push-prompt state). Cached image and PDF files (wiped on sign-out). No cached API JSON beyond screen lifetime (contract §1 Caching; see section 7 for the in-memory query cache).

---

## 2. Configuration

Variable names only. Values live in EAS build profiles / `.env.local` (git-ignored), never in the repo.

| Name | Purpose | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Base address of the environment, **including** `/api/customer/v1` or not (decide once) | Existing `src/lib/config.ts` default is `http://localhost:4000/customer/v1`, which does **not** match the contract path `/api/customer/v1`. Fix when the real API is wired. HTTPS only outside local dev |
| `EXPO_PUBLIC_USE_MOCKS` | `true` serves FAKE fixtures | Already exists. Must be `false` in staging and production profiles |
| `EXPO_PUBLIC_ENV` | `development` / `staging` / `production` | Used for the dev-only "environment is not set up" banner |
| `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_STORE_URL_IOS` | Links used in settings and the update screen | Values `TO CONFIRM` (section 20) |

Rules
- `EXPO_PUBLIC_*` is inlined into the bundle and readable by anyone: **no secrets** in any of them. There are no client secrets in this API (the JWT secret is server-only).
- Three environments: development, staging, production, one EAS profile each. Never send production credentials to non-production or the reverse (contract §12). Show the environment name only in non-production builds.
- Real hostnames are obtained privately from the maintainers and set in EAS, not committed.
- **Minimum version:** `APP_MIN_VERSION` is a server setting, read through `GET /app/min-version` (section 15). The app only needs its own version (`expo-constants`/`app.json` `version`, currently `1.0.0`).
- A `404` on `/app/min-version` means the customer zone is switched off in that environment (contract §12): show a configuration error in development builds only; in production fail open.

---

## 3. Networking layer

One module, `src/lib/api/client.ts` (exists as a scaffold), is the only code that calls `fetch`.

**Shape.** `request<T>(method, path, { query, body, signal, auth })` returns `T` (the contents of `data`) or throws one `ApiError`.

**Headers.** `Accept: application/json`; `Content-Type: application/json` only when a body exists; `Authorization: Bearer <accessToken>` on `customer` routes only. `POST /presence/heartbeat` sends `{}` or no body **and** no content type. Never send unknown fields: bodies and queries are strict (400). Build request bodies from typed objects, never by spreading form state.

**Timeouts.** App decision: 15 s for JSON calls, 60 s for file downloads, none for the SSE stream (it has its own watchdog, section 10). Implemented with `AbortController`. Server-side timeout `TO CONFIRM (API contract)`.

**Validation.** Parse every response with a schema (the repo has `schemas.ts`; zod style). A failed parse is `ApiError{kind:"BAD_RESPONSE"}`: show the generic error, log the path and status only, no body.

**Success envelope.** `{ data }`; lists `{ data: { rows, total, page, pageSize } }`. Exceptions with plain arrays in `data`: timeline, photos, FAQs. Alerts use `days`. Do not assume one list shape.

**Single error model.**

```ts
type ApiError = {
  kind: "VALIDATION" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"
      | "RATE_LIMITED" | "INTERNAL" | "NETWORK" | "TIMEOUT" | "ABORTED" | "BAD_RESPONSE";
  status: number | null;
  code: string | null;                       // envelope code
  fieldErrors: Record<string, string>;       // {} when absent
  retryAfterSeconds: number | null;          // from Retry-After on 429
  // `message` is kept for debug logs only. Never branch on it, never show it,
  // except where a section below says the exact server message may be shown.
};
```

Parsing rules (contract §1)
- Branch on `code` and HTTP status, never on `message`.
- `fieldErrors` exist only on 400 `VALIDATION` caused by malformed input; they are zod **English** texts: map field names to your own localized copy, do not display the server text.
- Two 400 situations carry no `fieldErrors` key (wrong code, wrong credentials). Treat a missing key as `{}`.
- Non-JSON error bodies (proxy pages) become `INTERNAL`/`BAD_RESPONSE`.
- For file routes check `status` before touching bytes (errors are JSON).

**Retry rules**

| Request | Auto-retry? |
|---|---|
| Idempotent GET (lists, detail, timeline, FAQs, `min-version`, preferences) | Yes: max 2 retries, only on `NETWORK`, `TIMEOUT`, 500. Backoff 1 s, 3 s plus up to 500 ms jitter. Never on 4xx |
| `register`, `resend-verification`, `forgot-password`, `verify-email`, `reset-password`, `login` | **Never** |
| `chat` start and send, `link-requests`, `delete-account`, `mark-read`, `PATCH`, `POST /devices`, `DELETE /devices` | **Never** auto. User-initiated retry only (chat: refetch page 1 first, contract §8.4) |
| `refresh` | One retry with the same token **only if no response at all was received**, inside the single-flight (section 4) |
| `heartbeat` | No retry; the next tick is the retry |

**429 and `Retry-After`.** Read `Retry-After` (seconds). Stop calling that route until it elapses; store a per-route "not before" timestamp and disable the triggering button with a visible countdown. No automatic retry loop. A per-identifier limit reports the full window (an upper bound), so word it "try again in a few minutes", not as an exact timer, unless the value is under 120 s. `x-ratelimit-*` headers are informational only. `RATE_LIMITED` on SSE open adds `Retry-After: 30`.

**Offline detection.** Use `expo-network`/NetInfo state only as a hint (add the package only with your approval; `fetch` failure is authoritative). Show a slim offline banner and keep last rendered data on screen. On reconnect, refetch the visible screen's queries. Writes while offline fail immediately with a "no connection" message and keep the user's input.

**Cancellation.** Every query/mutation receives an `AbortSignal`; screens abort in-flight GETs on unmount or when a newer query supersedes. `ABORTED` is never shown to the user. Do not abort a mutation (send, link request, delete) on screen exit: let it finish and reconcile.

**Rate-budget awareness** (contract §1, 4.1, 5): "read" routes share 120/min per IP and 240/min per customer; files 120/min per customer, so cap concurrent thumbnail loads at about 6; overall 300/min per IP.

---

## 4. Authentication and session

**Storage choice: `expo-secure-store` (already installed, `~58.0.2`).** iOS Keychain; Android Keystore-backed. Store one JSON entry `{accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, userId}` under one key so a pair is replaced in one write. Use `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (decision; allows background push-triggered work, never migrates to another device or backup).

Alternatives considered: `react-native-keychain` (finer biometric control, extra native dependency; not needed); AsyncStorage/MMKV (not encrypted, **forbidden** by the contract); biometrics (only as a local gate on stored tokens, contract §11; optional later).

**In memory.** `auth-context` holds the access token and its expiry in a module variable (not React state, not persisted separately). On cold start read Keychain once; treat a stored access token as expired when `accessExpiresAt` has passed (computed from `accessTokenExpiresIn` at receipt, minus 30 s skew).

**Single-flight refresh (critical).**

```ts
let inflight: Promise<Session> | null = null;
function refreshSession() {
  inflight ??= doRefresh().finally(() => { inflight = null; });
  return inflight;
}
async function doRefresh() {
  const { refreshToken } = await readStored();       // read inside the flight, not before
  const session = await postRefresh(refreshToken);    // one request
  await writeStored(session);                         // persist BEFORE any caller reuses it
  memory.set(session);
  return session;
}
```

Rules, all because replaying a rotated token after the roughly 10 s grace window revokes **every session of the customer** (contract §2.5):
1. One in-flight promise for the whole app. Every concurrent 401, the proactive timer and the SSE `reauth` handler all `await refreshSession()`.
2. The new pair is written to Keychain **before** it is used or the promise resolves.
3. Never send the same refresh token from two places. No refresh from background tasks (there are none planned) while the UI may also refresh.
4. Proactive refresh at about 80% of `accessTokenExpiresIn` (12 min), through the same function; also check on foreground.
5. Request flow: 401 on a `customer` route → `await refreshSession()` → retry the original request **once** → a second 401 means sign out. Requests started while a refresh runs wait for it (`await inflight` before attaching the header).
6. Network failure with no response: retry **once** with the same token; if that yields 403, sign out. Never loop.
7. Refresh `403` = session dead (also reuse detection, expired, disabled account): clear tokens, clear caches, route to sign-in with a neutral "Please sign in again" message.

**App killed during refresh.** The server may have rotated while the client never saved the new pair. On next launch the stored token is the old one: refresh returns 403 (inside 10 s: no mass revocation; after: revocation of all sessions). Accept it: land on sign-in, user signs in again. Minimise the risk by writing the pair synchronously right after the response, and by not refreshing while the app is going to the background. Do not attempt "retry with older tokens" tricks.

**Forced sign-out on reuse detection.** The client cannot distinguish it from an ordinary dead session (both 403). Same handling. Because other devices may also be signed out, copy stays generic.

**Logout (user-initiated), in this order** (contract §2.6):
1. `DELETE /devices/:id` using the stored device id (needs the access token; ignore failure).
2. `POST /auth/logout {refreshToken}` (idempotent; ignore failure).
3. Close the SSE stream; stop the heartbeat; cancel queries.
4. Wipe Keychain entry; clear query cache and in-memory state; clear image cache and downloaded PDFs; clear the stored device id and chat "seen" markers; reset badge to 0.
5. Navigate to the first screen. Steps 3-5 happen even if 1-2 fail.

**Account deletion flow** (contract §2.8, App Store requirement)
1. Account → Delete account → explain consequences.
2. Ask for the **current password** in a modal (required field).
3. Confirmation sheet, destructive button. Copy: "Delete your account? This permanently removes your profile, chat history, alerts and notification settings. Your vehicle and shipping records are kept by CargoDev for business reasons and will no longer be linked to your name or email. This cannot be undone."
4. `POST /auth/delete-account {password}`; no auto-retry; disable the button while pending.
5. Errors: 400 "Incorrect password" shown as a field error (counts toward the 5-failure lockout; warn on the second failure); 403 locked → show the lock message, no retry for 15 min; 404 "Account not found" → treat as deleted and sign out; 429 → countdown.
6. On `200`: full local wipe as in logout steps 3-5 **without** the API calls (the token already stopped working), delete cached files, return to the first screen, and show "Your account was deleted."

**Never log or expose tokens.** Redact `Authorization` and any `refreshToken` in debug logging by construction (the client logs method, path without query values for ids, status, duration). Tokens never go in URLs, deep links, analytics, Sentry breadcrumbs, or error messages.

---

## 5. Account flows (UX)

No phone or OTP anywhere. Email and password only (contract §11). The existing `sign-in.tsx` has no phone option; keep it so. Note the design says the app is sign-in only (19 Oct) while the contract and your decisions include self-registration: see section 20.

**Registration (2 API steps).**
1. Form → `POST /auth/register`: `name` (required, 1-150), `email` (valid, ≤150, lower-case/trim client-side), optional `phone` (≤30), `companyName` (≤150), `country` (≤100). **No password field on this screen.** Send only fields the user filled; empty optional means omit.
2. Always `202`. Always go to the code screen with the neutral text: "If this address can be used, we have emailed you a 6-digit code." Never say "email sent", "already registered", "account exists".
3. Code screen → `POST /auth/verify-email {email, code, password}`: the user enters the code and **chooses the password here**. Password rules: at least 12 characters and **at most 72 bytes UTF-8**. Validate with `new TextEncoder().encode(p).length <= 72`; show a strength-neutral hint "12 to 72 characters"; show/hide toggle; confirm field. Use `textContentType="newPassword"` so iOS offers a strong password.
4. `200 {verified:true}` returns no tokens: call `POST /auth/login` with the same credentials (keep the password in memory only for this hop, then drop it), or send the user to sign-in. Decision: auto-login, fall back to the sign-in screen on any failure.

**Six-box code entry.**
- Six single-digit boxes, numeric keypad, `textContentType="oneTimeCode"` and `autoComplete="one-time-code"` so iOS offers the code from Mail.
- Auto-advance on digit, backspace moves back, paste of 6 digits (spaces or dashes stripped) fills all boxes. Submit enabled at exactly 6 digits; validate `^\d{6}$` locally.
- **Countdown:** show "Code valid for 10:00" from the moment the user reaches the screen. The server is the authority; at 0:00 show "The code may have expired" and promote Resend, but still allow submitting.
- **Attempts:** 5 attempts; each submission spends one. Server answers are identical for wrong, expired, used, exhausted, unknown address, already verified: `That code is invalid or has expired.` Show only: "That code didn't work. Check it or request a new one." Never count down remaining attempts as a promise about the address; a local counter "attempts used on this screen" is allowed only as a hint after the 3rd failure: "Still stuck? Request a new code." After 5 local failures, disable Submit and offer only Resend/Start again.
- Clear the boxes after a failure; keep the email and password the user typed.
- Resend → `POST /auth/resend-verification {email}`: always 202; **60 s visible cooldown** (contract §2.3), plus 3 per 10 min per email. On 429 show a countdown from `Retry-After`. Resend invalidates the old code: say so ("your previous code no longer works").
- Back to edit the email returns to step 1.

**Sign in.** `POST /auth/login`. Validation mirrors the server: email format, password 1-1000. Failure `400 Invalid email or password.` shown as one neutral banner: "Email or password is incorrect. If you haven't verified your email yet, request a new code." with a "Request a new code" link going to the verify screen (which then calls resend). Never differentiate unknown, unverified, disabled, deleted or staff accounts. `403` lock: show the server's lock message (allowed, contract §2.4) and disable Sign in for 15 minutes locally (persist the timestamp so a relaunch keeps it; the server remains the authority). 429: countdown.

**Forgot and reset.** `forgot-password {email}` → always 202, neutral text "If this address has an account, we have emailed a code." → six-box screen + `newPassword` (12-72 bytes) → `reset-password {email, code, newPassword}`. Success `200`: "Password changed. Please sign in." Every session on every device ends; clear any local lockout timer. Errors: identical `That code is invalid or has expired.` copy as above. Staff-created customers (no password yet) use this same pair to get in: put a "First time here? Use Forgot password" line on sign-in.

**Lockout and rate-limit messages**

| Situation | Copy |
|---|---|
| 403 lock | "Too many attempts. Please try again in a few minutes." (or the server message) |
| 429 any auth route | "Too many requests. Please wait a moment and try again." plus countdown if `Retry-After` is under 120 s |
| Network | "No connection. Check your internet and try again." |
| 5xx | "Something went wrong on our side. Please try again." |

**Copy that must never appear:** "email already registered", "no account found", "account is disabled", "email not verified" (as a diagnosis), "code sent to you@..." as a confirmation. Echoing the address the user just typed back to them ("we sent a code to ...") is also avoided; say "to the address you entered".

There is **no change-password endpoint** in the contract. "Change password" in Settings = start Forgot password for the signed-in email (note: ends all sessions). `TO CONFIRM (API contract)`.

---

## 6. Screen-to-endpoint map

Design sources: `docs/design/*.png` sheets 1 to 4 plus `design-screens-index.md`. **Sheet 5 (messages, alerts, account, link-a-vehicle) is not exported to the repo**, so those rows are `TO CONFIRM (screens)`. Generic states: **Loading** = skeleton; **Error** = inline retry card with the generic copy; 401 handled by the client.

**Design versus contract conflicts (contract and your decisions win)**
- Design shows a 7-step timeline; contract returns **9 steps** (section 7).
- Design has a Stock tab with price; **not in this version**. The scaffold has `src/app/(tabs)/stock.tsx`: hide the tab and keep no route to it (`TO CONFIRM (screens)`: remove or leave file unrouted).
- Design says Alerts is a bell on Home (v2 note) while sheet 5 is unseen: `TO CONFIRM (screens)`.
- Design says "Documents section inline on the vehicle page"; contract has `GET /documents?vehicleId=` for that.

| Screen | Endpoints | Data | Empty | Error / special | Refresh |
|---|---|---|---|---|---|
| Version gate (launch) | `GET /app/min-version` | `minVersion` | n/a | Fail open | Cold start, foreground after long time |
| Welcome / first screen | none | static | | | |
| Sign in | `POST /auth/login` | session | | Section 5 | |
| Create account (details) | `POST /auth/register` | | | Section 5; sheet shows "steps 1-5 of 7", contract needs 2 API steps: `TO CONFIRM (screens)` | |
| Verify code + set password | `POST /auth/verify-email`, `POST /auth/resend-verification` | | | Section 5 | |
| Forgot / reset | `POST /auth/forgot-password`, `POST /auth/reset-password` | | | | |
| Home | `GET /home` | `name`, `activeCount`, `deliveredCount`, `nextDeparture`, `recentVehicles` (≤3), plus `GET /alerts` page 1 for bell badge | New customer: welcome card + "Link your first vehicle" + FTJ contact | 404 never; if `/home` fails show cached screen state with retry | Pull to refresh; focus refresh if older than 60 s; on `notification` event |
| My vehicles (list) | `GET /vehicles?page&pageSize&status&brand&sort&dir` | summary objects | Empty state (section 13 link CTA) | 400 if bad filter: reset filters | Pull to refresh; focus refresh when stale |
| Filter sheet | none (client state → query) | statuses fixed; brand: `TO CONFIRM (API contract)` (no brand-list endpoint; derive from loaded rows or free text, exact match, case-insensitive) | "No vehicles match" + Clear filters | | |
| Vehicle detail, Overview | `GET /vehicles/:id` | summary + `voyageNo`, `blNo`, `shippingMethod`, `containerNumber` | | 404 "being prepared / no longer available", go back and refetch list | Pull to refresh; refetch when an alert for this `vehicleId` arrives |
| Vehicle detail, Timeline | `GET /vehicles/:id/timeline` | 9 steps | never empty (always 9) | | With Overview |
| Vehicle detail, Photos | `GET /vehicles/:id/photos`, `GET /photos/:id/image?size=thumb\|full` | ids, `createdAt` | "Photos coming soon" | Per-image placeholder on 404 | Pull to refresh; on `PHOTOS_ADDED` |
| Vehicle detail, Documents | `GET /documents?vehicleId=` | `name`, `type`, `createdAt` | "No documents yet" | | On `DOCUMENTS_READY` |
| Document viewer | `GET /documents/:id/file` | PDF | | Section 8 | |
| Purchase history | `GET /purchase-history` | `deliveredCount`, `customerSince` | 0 delivered shows 0 | 404 account gone → sign out | On focus |
| Documents (global list, if kept) | `GET /documents?page&pageSize` | | | Design removed the Documents hub: `TO CONFIRM (screens)` | |
| Messages list | `GET /conversations` | `vehicle`, `lastMessageAt`, `lastMessage.snippet` | "Start a conversation" + suggested questions | | Pull to refresh; on `message` event |
| Conversation thread | `GET /conversations/:id/messages`, `POST .../messages`, `POST /conversations` | Section 12 | "Say hello" + suggested questions | 404 → back to list | Refetch page 1 on focus, foreground and `message` event |
| Alerts | `GET /alerts`, `POST /alerts/mark-read` | Day groups | "No alerts yet" | | Pull to refresh; on `notification` event |
| Link a vehicle | `POST /vehicles/link-requests` | | | Section 13 | |
| Help / FAQs | `GET /help/faqs` | `question`, `answer` (plain text) | "No FAQs yet" | | On open |
| Agent contact card | none in contract (no agent field) | | | `TO CONFIRM (API contract)`, `TO CONFIRM (screens)` | |
| Account / profile | `GET /me`, `PATCH /me` | Section 14 | | | On focus |
| Notification settings | `GET`/`PATCH /me/notification-preferences` | | | | On open |
| Appearance, language | `PATCH /me` | `theme`, `language` | | | |
| Delete account | `POST /auth/delete-account` | | | Section 4 | |
| Update required | none | | | Section 15 | |
| Stock, Reserve, cost estimator | **Not built** | | | Do not render | |

Empty new customer: `/home` gives zero counts and an empty `recentVehicles`; `/vehicles` gives `rows: []`. Same state also covers "linked but not yet released" (the app cannot tell them apart).

---

## 7. Data fetching and caching

**State management options** (no new package without your approval)

| Option | Pros | Cons |
|---|---|---|
| TanStack Query (**already in `package.json`**, `^5.104.5`) | Caching, dedupe, abort signals, invalidation, pagination (`useInfiniteQuery`), retry rules, focus/online managers; the scaffold already has `features/vehicles/hooks.ts` | Needs care: disable its default retry for mutations and 4xx; cache must be cleared on logout |
| Hand-rolled hooks + context | No dependency | Re-implements dedupe, cancellation, invalidation; high bug risk |
| Redux Toolkit / Zustand | Fine for UI state | Not a server-cache; would still need fetching logic; new dependency |

**Recommendation:** TanStack Query for server data (already approved by being installed; confirm), plain React context for auth/session and UI preferences. No new package.

**Defaults:** `staleTime` 30 s for lists, 0 for chat and alerts; `gcTime` 5 min (contract: no device caching of JSON beyond the screen; keep in memory only, never `persistQueryClient`); `retry`: GET 2 on network/5xx only (section 3), mutations 0. `queryClient.clear()` on logout and on refresh 403.

**Query keys:** `["home"]`, `["vehicles", filters]`, `["vehicle", id]`, `["timeline", id]`, `["photos", id]`, `["documents", {vehicleId}]`, `["alerts"]`, `["conversations"]`, `["messages", id]`, `["me"]`, `["prefs"]`, `["faqs"]`.

**Invalidation after actions**

| Action | Invalidate |
|---|---|
| Mark alerts read | `["alerts"]` (badge from `unreadCount`) |
| Send / start chat | `["messages", id]`, `["conversations"]` |
| Link request | none immediately; the result arrives as an alert (section 13) |
| `PATCH /me`, preferences | set from the response (full object is returned) |
| Stream `notification` | `["alerts"]`; and `["vehicle", vehicleId]`, `["vehicles"]`, `["home"]`, plus `["photos"]` for `PHOTOS_ADDED` or `["documents"]` for `DOCUMENTS_READY` |
| Stream `message` | `["messages", conversationId]`, `["conversations"]` |

**Pagination rules**
- Page-number paging everywhere (no cursors). `pageSize` max 50; app uses 20. Last page = `ceil(total / pageSize)`; a page beyond the end returns `rows: []`.
- Lists: infinite scroll with `useInfiniteQuery`; de-duplicate by `id` when appending; on pull to refresh refetch page 1 and drop later pages.
- Alerts: merge `days` by `date` when appending (a day can span pages).
- Chat: **newest first**; use an inverted list; older pages by page 2, 3…; de-duplicate by `id`; prefer refetching page 1 to trusting offsets.

**Enumerations (use `type`/value as identifier, own translated labels, tolerate unknown)**
- Status: `PENDING`, `BOOKING_RECEIVED`, `SHIPPED`, `ARRIVED`, `DELIVERED` (`CANCELLED` is never sent). Unknown → generic grey "Status".
- Sort: `purchaseDate` (default) or `arrival`; `dir` `asc`/`desc` (default `desc`). **No price sort, no price UI.** Vehicles with no value sort last either way.
- Document `type`: `LC, EC, ED, BL, INSPECTION_REPORT, SHAKEN_SHO, FREIGHT_INVOICE, PURCHASE_INVOICE, SALES_INVOICE, MEGI_HENKO, CASH_RECEIPT, OTHER`; unknown → generic "Document".
- Alert `event`: the eight in contract §7.2; unknown → show title/body, open Alerts.

**Nine-step timeline rendering.** Always exactly nine entries in this order: `BOUGHT`, `AUCTION_BILL_PAID`, `AT_EXPORT_YARD`, `EXPORT_CERT_ISSUED`, `BOOKING_RECEIVED`, `SHIPPED`, `BL_ISSUED`, `ARRIVED`, `DELIVERED`. Render all nine as a vertical list; completed steps filled with date (`occurredAt`, **format in the UTC calendar**), incomplete steps hollow with no date. Steps may complete out of order: do **not** infer earlier steps from later ones and do not draw a progress bar from "last completed". Use `type` for icon and translated label; `label` is English fallback. Design (7 steps, relabelled "Purchase confirmed") conflicts: the contract exposes `AUCTION_BILL_PAID`, which the earlier decision called internal; show it as the contract states unless FTJ decides otherwise (`TO CONFIRM (screens)`).

**No assumptions about missing fields.** Every summary field except `id`, `serial`, `status`, `photoCount` can be `null`: render "-" or hide the row. `etd`/`eta` are midnight UTC timestamps: format with `timeZone: "UTC"`. `vehicle` in a conversation can be `null`. Do not derive prices, durations or locations that the API does not send.

---

## 8. Images and documents

**Authenticated loading.** Files are fetched by database id with the access token; nothing redirects; no storage URL ever exists.

```tsx
<Image
  source={{ uri: `${API}/photos/${id}/image?size=thumb`, headers: { Authorization: `Bearer ${token}` } }}
  cachePolicy="disk"
  recyclingKey={id}            // key by file id; see below
/>
```

- Use `expo-image` (installed). The header must be on **every** image request. When the token refreshes, existing cached images stay valid because the cache key is the file **id**, not the URL with a token. Confirm the cache key behaviour for header-authenticated sources on SDK 58 during testing (`TO CONFIRM` manually on device).
- A token-expiry problem can show up as 401 on an image: image components cannot await the refresh. Mitigation: before rendering a screen with many images, ensure the token has at least 2 minutes left (`ensureFreshToken()` through the single-flight).
- Thumbnails (`size=thumb`) in lists and the photo grid; `full` only in the full-screen viewer. `thumb` may quietly return the full image, so never assume byte size. Limit concurrent thumbnail loads to about 6; lazy-load off-screen items.
- Cover on cards: `coverPhotoId` (null → placeholder).

**Caching and eviction.** Server sends `Cache-Control: private, max-age=300`, `ETag`, supports `If-None-Match` (304). Let `expo-image` disk cache handle it. App-level rules: on a **404** for an id, evict that id, show a neutral placeholder, and refetch the parent list (`/vehicles/:id/photos` or `/documents`). Assume up to 5 minutes of stale display after staff un-release. On logout, account deletion or refresh 403: `Image.clearDiskCache()` and `clearMemoryCache()`, and delete the PDF cache directory.

**Photo viewer.** Full-screen pager, pinch to zoom, loads `size=full` for the visible photo, shows a progress indicator; photos are at most 10 MB. No download/save in this version (`TO CONFIRM (screens)`).

**"Photos arrive later".** `photoCount === 0` or an empty photos array: show a placeholder "Photos will appear here once our team adds them" and no spinner. `PHOTOS_ADDED` event or pull to refresh updates it.

**PDF and documents.**
1. Tap → show a progress indicator ("Preparing document").
2. Download with the Authorization header to the app cache directory (`expo-file-system`, `downloadAsync`/`File.downloadFileAsync` per SDK 58 docs: check the versioned docs before coding). Documents are at most 20 MB; there is no Range support; do not stream.
3. File name: a safe local name built from the document **id** (`<id>.pdf`), never the server `name` or the `Content-Disposition` filename (path-traversal safety).
4. Open in an in-app viewer or the system viewer. Sharing through the share sheet (`expo-sharing`, add only with approval; `TO CONFIRM`) shares the cached file. Sharing is a deliberate user action: warn nothing, but never auto-share.
5. Delete the cached file on logout, on deletion, on a 404 for that id, and when the cache exceeds about 100 MB (oldest first).
6. Verify `Content-Type: application/pdf` before opening.

**Failure states.** 404 `File not found.` → "This file is no longer available" and refresh the list. 429 → "Please wait a moment" + `Retry-After`. 500 `File storage is not available` → "Try again later" with a retry button (user-initiated). Offline → "You're offline". The app cannot distinguish a private file from a missing one; never claim which.

---

## 9. Push notifications

Uses `expo-notifications` (installed, `~58.1.6`). Remote push does **not** work in Expo Go (SDK 53+): use a development build and a physical iPhone (contract §10).

**Permission timing.** Never on first launch or on the sign-in screen. Ask after the first successful sign-in **and** once the user has context: show a pre-prompt card on Home ("Get told when your vehicle ships or a document is ready") with "Turn on" / "Not now". "Turn on" triggers the OS prompt. "Not now" stores a local timestamp and offers again after 14 days at most twice. Permission copy (`NSUserNotificationsUsageDescription` is not required on iOS; the system dialog text is fixed). Also offered from Settings → Notifications.

**Token registration.** After permission is granted and the user is signed in:
1. Get the Expo push token (needs the EAS `projectId`).
2. `POST /devices {expoPushToken, platform: "ios", appVersion}`. It is an upsert: do it on every cold start after sign-in and whenever the token changes. Save the returned `id` locally (not secret) for deletion. The token is never echoed back.
3. Error `400 Not a valid Expo push token` → drop it, do not retry in a loop, log the status only.
4. Server keeps at most 10 devices per customer; a token held by another customer on the same phone moves to the current one (so shared phones work).

**Removal.** On logout: `DELETE /devices/:id` **before** `/auth/logout` (section 4). Account deletion removes server-side tokens itself. If permission is revoked in OS settings, do nothing (the server will remove tokens Expo reports unregistered).

**Foreground vs background.**
- Foreground: set the notification handler to show a banner only when the user is **not** on the related screen; otherwise suppress and refresh data (the SSE stream also delivers the alert; **dedupe by `notificationId`/alert id**).
- Background/killed: system shows it; no in-app code runs. On foreground always run the catch-up GETs (section 10).
- No personal text is in pushes: only generic title/body, and `data` keys `event`, `vehicleId`, `vehicleSerial`, `notificationId`.
- Android (later): create channel `default`.

**Tap to screen** (from `data.event` and `data.vehicleId`; contract §7.2). Always treat ids as untrusted; the destination screen fetches with the server and handles 404.

| `event` | Destination | Notes |
|---|---|---|
| `BOOKING_RECEIVED` | Vehicle detail (Overview) | |
| `PHOTOS_ADDED` | Vehicle detail, Photos tab | |
| `DOCUMENTS_READY` | Documents for `vehicleId` | |
| `DEPARTURE_REMINDER` | Vehicle detail | |
| `NEW_STOCK` | Alerts list | Stock not built |
| `CHAT_MESSAGE` | Conversation for that vehicle if one exists (match `vehicle.id` in `/conversations`), else the conversation list | No conversation id is provided |
| `LINK_REQUEST_APPROVED` | Vehicle detail; on 404 "Your vehicle is being prepared" and go to the vehicle list | |
| `LINK_REQUEST_REJECTED` | Messages (reason may be there) | or Alerts |
| unknown | Alerts list | |

On tap also call `POST /alerts/mark-read {ids:[notificationId]}` (fire and forget, no retry). If the user is signed out when tapping, store the destination and route after sign-in (only the event type and ids, in memory).

**Badge.** Set the app icon badge from `unreadCount` of `GET /alerts` after each fetch and after mark-read; set to 0 at logout. The server sets no badge.

**Denied permission.** Quiet failure: no repeated prompts, no error banners. Settings shows "Notifications are off" with a link to iOS Settings. The app keeps working with the stream and the alerts list.

---

## 10. Live updates

React Native has no native `EventSource`, and the stream requires the `Authorization` header (contract §9.1).

| Option | Pros | Cons |
|---|---|---|
| A. SSE polyfill supporting headers (for example `react-native-sse`) | Simple API, handles reconnect | New third-party dependency to vet; behaviour on iOS background and proxies varies |
| B. Streaming `fetch` reader (`expo/fetch` with `ReadableStream`) plus our own line parser (`event:`, `id:`, `data:`) | No new package, full control of watchdog and backoff, same module can send the `Authorization` header | We own and test the parser; verify `expo/fetch` streaming on SDK 58 docs and a real device |
| C. Poll `GET /alerts` (e.g. every 30-60 s while foreground) | Trivial, robust | Latency; uses the read budget (240/min per customer); no chat event ids; battery |

**Recommendation:** B, with C as the automatic fallback while the stream is down (poll alerts and open conversation every 60 s only while foreground and disconnected). Push covers the background. Confirm B before writing any code; otherwise A needs your approval as a new dependency.

**Behaviour (one module, one connection per app)**
- **Foreground only.** Open on app foreground and when signed in; abort on background and on logout. Never keep a stream in the background (the OS suspends it).
- One stream per app. A 4th stream from the same customer closes the oldest with `closed`/`replaced`: after `closed`, **do not reconnect immediately**; wait for next foreground (reconnecting would evict your own other stream in a loop).
- Request `Accept: text/event-stream` with a fresh token (at least a few minutes left; call `ensureFreshToken()` first).
- Wire format: first `retry: 5000`, then `: connected`, events, `: ping` every 25 s. **Watchdog:** if nothing (not even a ping) for 60 s, abort and reconnect.
- **Backoff with jitter:** start 5 s (server hint), double each failure, cap 60 s, plus random 0-1 s; reset after a connection survives 30 s.
- Events: `notification` (ids and alert fields; **no** `isRead`; `vehicleId` may refer to a vehicle that answers 404), `message` (ids only: refetch page 1), `reauth`, `closed`, `shutdown`. Ignore unknown events.
- **`reauth`** (`token_expired`): the server ends the stream. `await refreshSession()` (the single-flight) then reconnect. If refresh fails → sign out.
- **`shutdown`**: reconnect after random 1-5 s.
- Errors before streaming are JSON: 401 → refresh once then retry; 429 (including capacity, `Retry-After: 30`) → wait the header, fall back to polling; 404 → zone off.
- **Catch-up after every (re)connect and foreground** (no replay; `Last-Event-ID` is ignored): `GET /alerts` page 1; `GET /conversations` and page 1 of the open thread; the open vehicle and `/home` or `/vehicles` if visible. Dedupe by id: an alert on the stream also appears in the list.
- You do not receive stream events for your own messages (even from another device): refetch on foreground.

---

## 11. Presence

- `POST /presence/heartbeat` with body `{}` (or none, no `Content-Type`). Response `{ data: { ok: true } }`.
- **When:** immediately on app foreground (when signed in), then every 90 s while foreground and the app is active; stop on background and logout. Server writes at most once per 60 s per customer and treats the customer as active for 5 minutes, so 60-120 s is right. Limits 60/min per IP, 30/min per customer; never faster than 60 s. No retry on failure; ignore errors silently, and honour 429.
- **What is sent:** nothing beyond the authenticated request (the account is identified by the token). No location, no screen names, no device identifiers.
- **Battery:** one tiny request every 90 s in the foreground only; negligible. No background tasks, no timers while backgrounded.
- **Privacy disclosure** (must be in the privacy policy and in Settings → Privacy): "While you use the app, it tells CargoDev that you are online so our team can see whether you are available. We do not track your location or what you view. This stops when you close the app or sign out." Disclose also in App Store privacy answers (section 16). No toggle exists in the API; whether to offer an opt-out is `TO CONFIRM (API contract)`.

---

## 12. Chat

Plain text with the CargoDev team (the customer's assigned agent, otherwise administrators and managers; the API exposes no agent field, so show "CargoDev team"). `TO CONFIRM (API contract)`: agent name or contact card.

**Conversation list.** `GET /conversations` (page 20), newest activity first; row = vehicle serial (or "General"), snippet (already ≤120 chars), time. A vehicle the customer may no longer see yields `vehicle: null`; show "General". "New message" button.

**Thread.** Inverted list from `GET /conversations/:id/messages` (newest first, reversed for display). Customer bubbles right, staff left labelled "CargoDev team". Render `body` as plain `Text` only (never markdown/HTML, no link auto-detect that executes). Show a static note "We usually reply during business hours" (optional).

**Starting.** `POST /conversations {vehicleId?, body}` creates a **new** conversation each call. From a vehicle's "Ask about this vehicle": first look in `["conversations"]` for `vehicle.id === vehicleId` (fetch more pages if needed, up to 50 conversations total) and open it instead of creating one. `409` "maximum number of conversations" → "You have reached the conversation limit. Please continue in an existing conversation." `404` vehicle → "This vehicle is not available to message about."

**Sending and optimistic UI.** Show the message immediately with state `sending`. On `201` replace with the server message (by `id`). On failure mark `failed` with "Not sent. Tap to retry". **No automatic retry**: a no-response failure may have stored the message. The retry action first refetches page 1 and checks whether a matching `body` from `CUSTOMER` appears newer than the attempt; only then offers "Send again". Keep failed drafts in memory only.

**Limits and counter.** Text trimmed; **1 to 2000 characters measured as `String.length`** (an emoji counts as 2); control characters except newline and tab are rejected. Show the counter from 1800 ("1850 / 2000"), disable Send over 2000 or when empty after trim; strip disallowed control characters on paste. No attachments, no formatting.

**Rate-limit feedback.** 15 messages/min per customer, shared with starting; 10 conversations/hour. On 429 disable Send and show "You're sending messages quickly. Please wait a moment." with a countdown from `Retry-After`; keep the text in the input.

**Suggested questions.** `GET /chat/suggested-questions` for an empty thread or on the composer; tapping puts the text in the input; **never auto-sends**.

**Unread indicators.** The API has no per-message or conversation read state. Track "last seen" locally per conversation (latest message `id` and `createdAt`, kept in memory plus a small non-sensitive local store, wiped on logout). Show a dot when the newest message is `STAFF` and newer than last seen; update on `message` events. The tab badge is the unread `CHAT_MESSAGE` alerts count. Opening a thread marks the corresponding `CHAT_MESSAGE` alerts read (`POST /alerts/mark-read` with their ids, from the alerts list).

---

## 13. Link-a-vehicle

- Input: serial, trimmed and upper-cased on the device; must match `^(FC|FL)\d{1,9}$` (example `FC1024`). Mirror the server error copy: "Enter a serial number such as FC1024." Disable Submit until valid. Sending any other field is a 400.
- `POST /vehicles/link-requests {serial}` → **always `202 {accepted:true}`** whether the serial exists, belongs to someone else, is a duplicate, or the 20-pending cap is hit.
- **Neutral confirmation copy:** "Thanks. We'll check and let you know." (never "vehicle found", "request created", "already linked", "not found"). Keep the field cleared; no list of pending requests exists in the API, so none is shown. Do not retry automatically; 429 (10/min/IP, 5/hour/customer) → "You've sent several requests. Please try again later."
- **How the result arrives:** as an alert (and stream event and push, unless push is off). `LINK_REQUEST_APPROVED` (carries `vehicleId`) → vehicle detail; the vehicle may 404 until staff **release** it: show "Your vehicle is being prepared" (not an error). `LINK_REQUEST_REJECTED` → no vehicle id; the reason, if staff chose to give one, is a staff **chat message** "About your request to link FC1024: ..." in the customer's latest conversation with no vehicle. Neither alert can be switched off in preferences.
- Entry points: empty Home / empty vehicles state, and Account.

---

## 14. Settings and profile

`GET /me` and `PATCH /me` (send only changed fields, at least one; unknown fields like `email` are a 400). `email` and `memberSince` are read-only.

| Setting | API | Rules |
|---|---|---|
| Name | `PATCH /me name` | 1-150, cannot clear |
| Phone, company, country, destination port | `phone` ≤30, `companyName` ≤150, `country` ≤100, `destinationPort` ≤100 | empty or null clears |
| Language | `language` | e.g. `en`; server stores only; the app translates itself. Choices at launch undecided: default English |
| Appearance | `theme` | `light` / `dark` / `system`; `null` means follow system. Apply locally immediately, send in background |
| Notification events | `PATCH /me/notification-preferences events` | `BOOKING_RECEIVED`, `PHOTOS_ADDED`, `DOCUMENTS_READY`, `DEPARTURE_REMINDER`, `NEW_STOCK`, `CHAT_MESSAGE` booleans. Do **not** show `NEW_STOCK` while stock is not built (`TO CONFIRM (screens)`). `LINK_REQUEST_*` is always delivered: say so in a footnote |
| Departure lead days | `departureLeadDays` | exactly `3`, `7` or `14` (segmented control) |
| Push / email channels | `pushEnabled`, `emailEnabled` | Switching a channel off keeps alerts in the list |
| WhatsApp | stored only | **Hide it**: not sent (contract §11) |
| Member since | read only | |
| Sign out | section 4 | |
| Delete account | section 4 | |
| Change password | no endpoint | Forgot-password route; `TO CONFIRM (API contract)` |

Switching an **event** off means no alert at all (no list entry, stream event, push or email): explain in helper text. Preferences save immediately per toggle with optimistic update and rollback on error (PATCH is not auto-retried; show an inline "Couldn't save"). Rate limit: 30/min.

---

## 15. App version gate

- Call `GET /app/min-version` (no auth) at every cold start **before** sign-in or any other call, and on returning to foreground after more than 1 hour.
- Compare installed `x.y.z` to `minVersion` numerically per segment (1.10.0 > 1.9.0). If installed is **lower**: block the whole app with a full-screen "Please update" screen and an "Update" button; make no other API calls while blocked.
- Failure (offline, 5xx, 429, 404) → **fail open** and re-check later. A later successful check that says OK clears the block; never cache "must update" across a newer success.
- Store link: `EXPO_PUBLIC_STORE_URL_IOS` opened with `Linking.openURL`; validate it is an `https://apps.apple.com/...` URL; app id `TO CONFIRM (API contract)` (not an API item; it is FTJ's App Store id).
- The app version value to compare must come from one place (`expo-constants`), matching the build.

---

## 16. App Store and privacy checklist

- [ ] **In-app account deletion** reachable from Account (section 4). Required by Apple.
- [ ] **Privacy policy URL** in App Store Connect and in the app (Settings). Text `TO CONFIRM` (section 20).
- [ ] **Presence disclosure** (section 11) in the policy and privacy answers.
- [ ] **Demo account for the reviewer.** Credentials supplied in App Store Connect notes, **never in the repo**. The contract gives no demo mechanism: a staff-created customer with login enabled (sets the password through forgot-password then reset-password, which needs the email provider configured) and at least one released vehicle, photos, documents, and a conversation. `TO CONFIRM (API contract)`.
- [ ] **No in-app purchases.** No payments, no prices or amounts shown; the "How do I pay for my vehicle?" suggested question is answered by staff in chat.
- [ ] **Data collected** (for privacy nutrition label): name, email, optional phone, company, country, destination port; push token (device ID); chat messages; app usage presence ("online" signal); linked vehicle data. Linked to the user; used for app functionality; no tracking across apps; no ads SDK. `TO CONFIRM`: any analytics/crash tool is not present today. Add it to the label if adopted.
- [ ] **Retention.** Contract: deletion anonymises the account row, removes sessions, codes, push tokens, chat, alerts and preferences; vehicle and audit records are kept. Other retention periods `TO CONFIRM (API contract)`.
- [ ] **Notification permission copy:** pre-prompt "Get told when your vehicle ships, arrives or a document is ready." Never mandatory.
- [ ] No private API use; HTTPS only (ATS default); export-compliance answer (standard HTTPS only).
- [ ] Support URL and contact (`TO CONFIRM`).

---

## 17. Security checklist

- [ ] Nothing secret in the bundle (`EXPO_PUBLIC_*` public; no JWT secret, no API keys; mocks off in production).
- [ ] Tokens only in Keychain (section 4); in-memory elsewhere; cleared on 403 refresh, logout, deletion.
- [ ] Redacted logs: no tokens, no email, no password, no message bodies, no file names; analytics (if any) carries no PII. Production builds strip `console.log`.
- [ ] Passwords never stored, never in navigation params, never in the query cache; cleared from state after submission.
- [ ] **Screenshot / app-switcher privacy:** decision: blur or cover the app in the iOS app switcher (snapshot) while on Account, Chat and document viewer screens, using a neutral overlay when the app becomes inactive. Do not block screenshots (iOS cannot reliably). Library need: `expo-screen-capture` is for Android flag only; implement the overlay in React (`AppState`). No new package.
- [ ] **Certificate handling:** standard system TLS validation. **Pinning deferred**: the API address and certificate rotation are not yet known, pinning in Expo needs a native module/config plugin, and a wrong pin locks every user out until an app update. Revisit after the production host and certificate renewal process are fixed.
- [ ] **Deep links:** scheme `ftjcustomer` exists. Links carry only an event type and ids; never auto-perform an action from a link; route to the screen and let the server decide (404 → neutral message). Never accept URLs, tokens or HTML from a link; ids must match `^[A-Za-z0-9_-]{1,64}$` or be dropped. Unauthenticated → sign in first, keep only the safe destination in memory.
- [ ] **Jailbreak detection:** decision: **not implemented**. The app holds no payment data or prices, server-side authorisation protects everything, and detection adds a dependency and false positives. Revisit if scope grows.
- [ ] Render all server text (alerts, FAQs, document names, chat) as plain text.
- [ ] Do not open links found in server text automatically.
- [ ] Ids used in paths are encoded (`encodeURIComponent`) and validated before use.
- [ ] Files: only open `application/pdf`/images; cache names from ids.

---

## 18. Testing

**Mocking.** Use the existing mock layer (`src/lib/api/mock.ts`, `EXPO_PUBLIC_USE_MOCKS`) with **FAKE fixtures only** (names like Alex Example, serials FC1024, ids `ckfake0...`, emails `@example.test`). The contract's `example=` blocks are the fixture shapes. Never call the real API from tests or commit real tokens.

**Case list**

| Case | Expected |
|---|---|
| Empty vehicles (new customer) | Empty states on Home and Vehicles with link CTA |
| Long timeline, out-of-order steps | Nine steps, no inference; dates in UTC |
| 401 then refresh | One refresh, original request retried once |
| Concurrent 401s (5 parallel calls) | Exactly one refresh request; all callers succeed |
| Refresh 403 | Tokens, caches cleared; sign-in shown |
| App killed mid-refresh | Next launch lands on sign-in cleanly |
| Refresh network failure with no response | One retry, then sign out on 403; no loop |
| 429 with `Retry-After` | Button disabled with countdown; no auto-retry |
| Offline | Banner; cached screen data kept; writes fail with input preserved |
| Code expired / wrong (identical response) | Same neutral copy; boxes cleared |
| Code attempts exhausted | Submit disabled locally after 5; Resend offered |
| Locked account (403) | Message; sign-in disabled 15 min |
| Register for existing email | Identical 202 flow and copy |
| Password length: 11 chars, 72 bytes, 73 bytes (emoji) | Client blocks as the server would |
| Image 404 | Placeholder, id evicted, list refetched |
| PDF download failure | Retry button, no partial file left |
| SSE reconnect | Backoff with jitter; catch-up GETs; no duplicates |
| SSE `reauth`, `shutdown`, `closed` | Per section 10 |
| SSE watchdog (no ping 60 s) | Reconnect |
| Push tap routing (all 8 types + unknown, signed in and signed out) | Section 9 table; 404 handled |
| Chat 2000/2001 chars, emoji counting, 429, send failure | Section 12 |
| Link request: valid, invalid, duplicates | Always the same confirmation; 400 only for bad format |
| Logout and account deletion | Section 4 wipe verified (Keychain, query cache, images, PDFs) |
| Version gate: lower, equal, higher, 1.10.0 vs 1.9.0, failure | Blocks only when lower |

Unit-test the single-flight refresh, error mapping, version comparison, password byte length, code input and message length rules. Component tests with mock backend; no snapshot of tokens.

**Manual on a real iPhone (development build):** push permission and delivery in foreground, background and killed states; tap routing; SecureStore persistence across reinstall and app kill; Keychain accessibility after reboot; SSE through cellular and Wi-Fi switches and app backgrounding; authenticated image caching (`expo-image` header and cache key); PDF open and share sheet; keyboard `oneTimeCode` autofill; dark/light themes; Dynamic Type; VoiceOver; privacy overlay in app switcher; staging environment end-to-end with a staff-created test customer.

Run `npx tsc --noEmit` and `npx expo lint` before finishing any implementation task.

---

## 19. Accessibility, localization, error copy

**Accessibility**
- All controls have `accessibilityLabel`/role; touch targets at least 44 pt; support Dynamic Type (no fixed-height text); contrast of the crimson accent checked in light and dark (text on crimson at least 4.5:1).
- Code boxes: one hidden input or grouped fields with a single label "6-digit code, digit 3 of 6"; announce errors with `accessibilityLiveRegion`/announce on iOS.
- Status and timeline steps convey state in text ("Completed on 1 Sep 2026" / "Not yet"), never by colour alone.
- Respect Reduce Motion. Photos have alt text "Photo 2 of 5 of FC1024".

**Localization.** All user-facing strings in one catalog (`src/i18n/en.ts`, new file when implementing; no hard-coded strings in components). English default; languages at launch undecided (section 20). Keys by feature. Dates and numbers through `Intl` with the chosen locale; dates for `etd`/`eta` formatted in UTC. Server texts (alerts, FAQs, error messages) are English: localise alerts by `event`, ignore server `message`. Never parse `message`.

**Error-copy guidelines**
- One short sentence on what happened, one on what to do. No error codes, no HTTP numbers, no blame.
- Generic by default; specific only where the contract allows (lock message, "Incorrect password", validation by field).
- Never reveal existence of accounts, vehicles or files.
- Offline, rate limit, server error and timeout each have one shared string.
- Buttons say the action ("Try again", "Request a new code").
- Preserve user input on every error.

---

## 20. Open questions (with suggested default)

| # | Question | Owner | Suggested default |
|---|---|---|---|
| 1 | Languages at launch | FTJ | English only; strings catalog ready |
| 2 | Self-registration vs sign-in only (design said sign-in only on 19 Oct; contract and decisions have registration) | FTJ | Include registration as in the contract |
| 3 | Agent contact card content (name, phone, hours); the API has no agent field | FTJ, API owner | Static "CargoDev team" card with support email and hours |
| 4 | Stock tab in this version | FTJ | Not in this version; remove tab (`src/app/(tabs)/stock.tsx` exists) |
| 5 | Notification copy (alert titles/bodies are fixed English from the server) | FTJ | Use server text; localise by `event` later |
| 6 | Support contact details, privacy policy text and URL, app store id | FTJ | `support@` placeholder shown from env; policy drafted by FTJ |
| 7 | Timeline: show `AUCTION_BILL_PAID` and `AT_EXPORT_YARD` (contract) vs 7-step design | FTJ | Show all nine as the contract |
| 8 | Alerts location: bell on Home vs tab | FTJ | Bell on Home with badge |
| 9 | Change password endpoint | API owner | Use forgot-password; request a dedicated endpoint later |
| 10 | Brand list for the filter sheet | API owner | Derive from loaded vehicles |
| 11 | Presence opt-out | FTJ, API owner | No opt-out; disclosure only |
| 12 | Reviewer demo account procedure | API owner | Staff-created customer with a released demo vehicle |
| 13 | Retention periods (chat, audit) | API owner | As stated by contract on deletion; document in policy |
| 14 | Photo save/share | FTJ | Not in v1 |
| 15 | API base path (`/api/customer/v1`) vs scaffold default | Developer | Fix in config before wiring |

---

## 21. Launch readiness checklist

- [ ] Contract copied to `docs/customer-app-integration.md` and version noted (1.0.0 or later); app tolerates unknown keys/enums.
- [ ] Production EAS profile: real API URL set privately, mocks off, bundle id changed from `com.example.ftjcustomer`.
- [ ] Version gate verified against staging with a high `APP_MIN_VERSION`.
- [ ] Single-flight refresh, logout wipe and deletion wipe tested.
- [ ] Registration, verify, resend, forgot/reset, lockout tested on staging with real email delivery.
- [ ] Vehicles, timeline, photos, documents tested with released/unreleased/cancelled/no-vehicle data.
- [ ] Push tested on a physical device via development and TestFlight builds; token register/remove verified.
- [ ] SSE reconnect, `reauth`, background/foreground catch-up verified.
- [ ] Chat limits, retry and 429 verified; no auto-resend.
- [ ] No price or cancelled-vehicle UI anywhere; Stock/Reserve/cost estimator absent.
- [ ] App Store checklist (section 16) and security checklist (section 17) complete.
- [ ] Accessibility pass (VoiceOver, Dynamic Type, dark/light).
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` clean.

---

## Items to resolve

**TO CONFIRM (API contract)**
1. Server-side request timeout (section 3).
2. Change-password endpoint: none exists (sections 5, 14, 20).
3. Brand list source for the filter sheet: no endpoint (section 6).
4. Agent name or contact data: no field in the API (sections 6, 12).
5. Presence opt-out or toggle (section 11).
6. Reviewer demo-account procedure (section 16).
7. Retention periods beyond deletion behaviour (section 16).
8. App Store id / store URL for the update screen (section 15).
9. Contract file `docs/customer-app-integration.md` is absent from the repo; this guide used the supplied text of v1.0.0 (section 1).

**TO CONFIRM (screens)**
1. Sheet 5 (messages, conversation, alerts, account, link-a-vehicle) is not in the repo: all related rows (section 6).
2. Registration steps ("1-5 of 7" on the sheet) versus the contract's two API steps (section 6).
3. Remove or keep unrouted `stock.tsx`; hide `NEW_STOCK` toggle (sections 6, 14).
4. Alerts placement: bell on Home vs tab (section 6).
5. 7-step design timeline vs 9-step contract; label for `AUCTION_BILL_PAID` (sections 6, 7).
6. Global Documents list (design removed it) (section 6).
7. Agent contact card (section 6).
8. Photo save/share in the viewer (section 8).
9. Filter sheet contents (section 6).
