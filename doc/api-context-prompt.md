# Prompt: extract the customer API contract from the CargoDev API repo

---

You are working in the CargoDev backend (Node, REST, OpenAPI). I am building the **FTJ customer mobile app** (Expo + React Native, TypeScript, zod, TanStack Query) in a separate repo. I need an accurate contract for every endpoint the customer app can call, written from the **actual code in this repo**, not from design docs or memory.

## Rules

- Read the code: route files, controllers, validators (zod/joi/class-validator), DTOs/serializers, Prisma schema, auth middleware, error handler, OpenAPI generator config.
- If something is planned but not implemented, say **NOT IMPLEMENTED**. Never invent a field, path or status code.
- If code and an existing doc disagree, trust the code and note the conflict.
- Cite the source file and line for each endpoint (`src/routes/vehicles.ts:42`).
- Do not change any code. This is a read-only task.

## Step 1: Orientation (report briefly first)

1. Framework, language, how routes are registered, and the base path for customer routes (I expect `/customer/v1`; the staff API is `/api/v1`).
2. Is an OpenAPI/Swagger spec generated? Where, and how do I get it (file path, script, or URL like `/docs` / `/openapi.json`)? If one exists, also export it to `docs/openapi.customer.json` filtered to customer routes.
3. How to run the API locally: env vars needed (names only, no secret values), port, seed/test customer account, Docker or not.
4. Base URLs for staging and production if they are in config.

## Step 2: Global conventions

Document exactly:

- **Auth**: login flow, token type (JWT?), where it goes (`Authorization: Bearer`?), access token lifetime, refresh token lifetime, whether refresh tokens **rotate** and what happens on reuse, logout/revoke behaviour, account-delete endpoint.
- **Error format**: the JSON shape of errors (my client reads `message`), validation error shape, and which status codes are used (400, 401, 403, 404, 409, 422, 429).
- **Pagination**: cursor or page/limit, param names, response envelope (my client expects lists as `{ items: [...] }`; tell me if it differs).
- **Dates**: ISO strings? timezone? date-only vs datetime.
- **IDs**: cuid/uuid/int, returned as string?
- **Money**: number or string/Decimal, currency field name.
- **Enums**: every enum a customer response can contain, with all values (especially vehicle/shipment status).
- **Nullability**: which fields are `null` vs omitted.
- **Rate limits**, CORS, required headers (app version, platform, org/tenant).
- **Multi-tenancy**: how `orgId` is resolved for a customer (token claim? header?).
- **Files**: are document/photo URLs public R2 URLs or signed URLs, and how long do signed URLs last.
- **Realtime / push**: device token registration endpoint, push payload shape, any websocket/SSE for messages.
- **Minimum app version** endpoint, if any.

## Step 3: Endpoint reference

For **every** customer-facing endpoint, write this block:

```
### METHOD /path
Source: file:line
Auth: required | none
Purpose: one line
Path params / Query params: name, type, required, allowed values
Request body: JSON example + field table (type, required, constraints)
Response 2xx: status code + full JSON example with realistic values + field table (type, nullable?, notes)
Errors: status code -> when it happens -> example body
Business rules: anything the server enforces (e.g. price omitted unless showPriceInApp is true)
Status: IMPLEMENTED | PARTIAL | NOT IMPLEMENTED
```

Cover at least these areas, in this order. Mark each one even if it does not exist:

1. **Auth**: login, refresh, logout, forgot/reset password, delete account. (The app is sign-in only; account creation happens on the website, but note register endpoints if they exist.)
2. **Me / profile**: `GET /me`, `PATCH /me`, notification preferences.
3. **Home**: `GET /home` or whatever feeds the dashboard (counts, next arrival, recent alerts).
4. **My vehicles** (customer's FC vehicles): list with filters (status, brand), detail, timeline (7 derived steps: Purchased, EC issued, Booking received, Shipped, BL issued, Arrived, Delivered; say how each step is computed), photos.
5. **Vehicle documents**: list per vehicle (only `visibleToCustomer`), signed URL endpoint.
6. **Purchase history** (counts and dates, no prices).
7. **Link-a-vehicle requests**: create (should always return 202) and list.
8. **Stock** (FL vehicles with no customer and `showInApp = true`): list, detail, and confirm price is **omitted from the response** unless `showPriceInApp === true`.
9. **Conversations & messages**: list, create (types GENERAL, VEHICLE_QUESTION, PRICE_REQUEST, RESERVATION), list/send messages, read receipts, unread count. Confirm internal notes are never returned.
10. **Alerts / notifications** list and mark-read.
11. **Devices** (push token), **presence heartbeat**.
12. **Help / FAQs**.
13. **App config / minimum version**, `/health`.

## Step 4: Security checks (report what the code actually does)

- Every customer query is scoped by the customer's id **and** orgId (no IDOR). List any endpoint where it is not.
- Customer DTOs never expose: purchase/bought price, auction hall, bill-paid, costs, remarks, activity log, `isInternalNote` messages, staff-only match info on link requests.
- Link request responses are identical whether or not the serial exists.

## Step 5: Gap list

End with a table: **Feature the app needs | Endpoint | Status (ready / partial / missing) | Notes**, plus a list of open questions for the backend owner.

## Output

Write it all to `docs/CUSTOMER_API.md` (and `docs/openapi.customer.json` if a spec exists). Then reply with a short summary: how many endpoints are implemented, what is missing, and the exact command to run the API locally.

### For reference: what the app currently assumes

The app's client today calls these (mocked). Compare them with reality and flag every mismatch in path, method, field name, type or nullability:

```ts
POST /auth/login   { email, password } -> { accessToken, refreshToken }
POST /auth/refresh { refreshToken }    -> { accessToken, refreshToken }
POST /auth/logout                       -> 204
GET  /me     -> { id, name, email|null, companyName|null }
GET  /vehicles -> { items: [{ id, make, model, year|null, chassisNo|null,
                    status: "PENDING"|"BOOKING_RECEIVED"|"SHIPPED"|..., etd|null, eta|null, thumbnailUrl|null }] }
GET  /stock  -> { items: [{ id, make, model, year|null, thumbnailUrl|null,
                    price?: { amount: number, currency: string } }] }   // price key omitted unless allowed
```
