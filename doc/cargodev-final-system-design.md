> **Repo note:** copied from the project, version 1.2 (19 Oct 2026). Still to update in the project (not yet done): the **sign-in-only** customer app decision (19 Oct), **Sentry dropped**, and **Pusher replaced by backend realtime** (24 Oct). Sections 6, 9 and 14 below still mention register endpoints, Sentry and Pusher.

# CargoDev + FTJ Website + Customer App: Final System Design

Version 1.2 · 19 Oct 2026 · Status: proposed · Supersedes v1.0 (10 Oct 2026) and v1.1 (18 Oct 2026)
Screens: v3 mockups listed in `design/design-screens-index.md`; earlier `CargoDev-customer-app-screens.pdf` (34 screens, 7 Oct 2026) is the v1 reference.
Related: `design/design-v3-existing-data.md` (data decisions), `design/cargodev-context-report.md` (what the repo really contains).

## What changed in v1.2 (19 Oct 2026): hosting

- **Vendor plan B chosen.** Backend on **Render** (always-on Docker service); frontends stay on **Vercel**; **Supabase** stays as the database (not moved to Render Postgres for now); **Cloudflare** for DNS/WAF/R2/Turnstile. Small extras: an email provider, Sentry, Expo push, Apple, Meta, GitHub.
- Vercel functions were rejected for the BE because it needs an always-on process (in-process scheduler, later WebSocket/SSE). Cloudflare Workers/Containers were rejected as the BE host (not always-on by default; Containers sleep after 10 minutes idle by default).
- Moving the database to Render Postgres is a possible later, separate project, not part of the backend migration.
- Details in section 3 and section 14.

## What changed since v1.0

| Area | v1.0 | v1.1 |
|---|---|---|
| Backend | One Next.js monolith, customer API inside it | **Separate Node backend (BE) built first.** CargoDev web becomes a frontend only. |
| Schema owner | CargoDev Prisma schema | **The new BE repo owns the schema and all migrations.** FE has no DB access. |
| Timeline | `VehicleMilestone` table, 9 steps | 7 steps **derived from existing data**, no new table for now |
| Price | New reliable price field | Reuse existing `sellingPrice` + `sellingPriceCurrency` |
| Stock | New `StockVehicle` table and phase 2 | Existing **FL vehicles with no customer**, flagged `showInApp`; no separate stock table, no Stock page in CargoDev |
| Website | Stock listing from stock table | Separate **Website cars** area (luxury showroom cars), no prices, "Inquire" to the Inbox |
| Messages | `Conversation` / `Message` only | One **shared Inbox** for app, website enquiries and email (`Conversation`, `Message`, `Lead`) |
| Link requests | Staff approve | **Admin or Manager** approves; app always shows neutral "Request sent" |
| Reality checks | Resend and WhatsApp assumed | **Not implemented yet.** Files are **public R2 URLs** today. No tests exist. Staff mobile API is `/api/v1/*`. |

## 1. Goal

Add a public FTJ website and a customer mobile app on top of CargoDev's data and rules, while staff can see which customers are active in the app. The work starts by moving CargoDev's backend into a separate Node service, then builds the customer features there.

## 2. Decisions and why

| # | Decision | Why |
|---|----------|-----|
| D1 | **Separate Node BE owns the database schema, migrations, business rules, cron and integrations.** CargoDev web, the staff mobile app and the customer app are clients of it. | Chosen by Viro on 18 Oct 2026 to have one backend for all clients and to migrate every feature to it over time. Replaces v1.0 D1 (no separate backend). |
| D2 | Customer and staff are separate security zones (token audience, routes, DTOs) | Customers must never reach staff data or routes. |
| D3 | Responses are whitelisted DTOs, never raw Prisma rows | Hides remarks, auction hall, bill-paid, transport, costs, activity log. |
| D4 | Customer timeline is **derived** from existing fields (7 steps) | Nothing new for staff to type. Revisit a milestone table only if derived data proves too thin. |
| D5 | App Stock = FL vehicles with no customer and `showInApp = true`. Price shown only if tri-state `showPriceInApp` is Yes. | Reuses existing FL stock and `sellingPrice`. |
| D6 | Presence by heartbeat + `lastActiveAt` | Simple; no connection per customer. |
| D7 | Move off free tiers before launch | Commercial use; Supabase Pro adds backups. |
| D8 | Migrate by **strangler fig**: port one module at a time behind a flag, tests first | Zero tests exist today; behaviour must not change silently. |
| D9 | Documents move to a **private** R2 bucket with signed URLs, and get a `visibleToCustomer` flag | Files are public unsigned URLs today. |
| D10 | One shared Inbox for app messages, reservation requests, website enquiries and email | One place for the team to answer. |
| D11 | Link requests approved by Admin or Manager; customer is never told whether a vehicle exists | Prevents guessing which serials exist. |
| D12 | **BE hosted on Render as an always-on Docker service; frontends on Vercel; database stays on Supabase; Cloudflare stays (vendor plan B).** | Decided by Viro 19 Oct 2026. The BE needs an always-on process for in-process cron and later realtime. Vercel functions and Cloudflare Workers/Containers are not always-on. Fewest changes to what already works; do not change code, host and database in the same phase. |
| D13 | Scheduled jobs run inside the BE process, guarded by a Postgres advisory lock (or a queue such as pg-boss) so only one instance runs a job. Jobs must also be idempotent. | Prevents duplicate runs during deploys or when scaled to two instances. |
| D14 | Staff realtime may move from Pusher to WebSocket/SSE from the BE later. | Always-on BE makes it possible and removes a vendor. Multi-instance needs a shared channel (Postgres LISTEN/NOTIFY or Redis). Keep Pusher until the BE is stable. |

## 3. Architecture

```
Customer app (Expo)   Staff iOS app   CargoDev web (Next.js, FE only)   FTJ website (Next.js)
        |                   |                    |                           |
        +-------------------+--------------------+---------------------------+
                                        |
                         Node BE (REST + OpenAPI, own repo)
                    JWT aud=staff / aud=customer, DTOs, services
                                        |
        +------------+---------------+--------------+----------------+
   PostgreSQL       R2 (private)     Pusher        Email / WhatsApp     Expo push
   (Supabase)      signed URLs      (staff live)   (to build)          (customers + staff)
```

- The BE is the **only** thing that talks to the database. The FE has no Prisma and no `lib/services`.
- Next.js server components and server actions call the BE server-to-server (no CORS, no tokens in the browser). Mobile apps call the BE directly.
- Typed clients are generated from the OpenAPI spec for the Next.js apps and Expo.
- **Hosting (decided 19 Oct 2026, plan B):** the BE runs as a Docker image on **Render** (always-on web service, with a separate worker or cron service when jobs are split out). CargoDev web and the FTJ website stay on **Vercel**. **Supabase** Pro (Postgres) and **Cloudflare** (DNS, CDN/WAF, R2, Turnstile) stay. Create the Render service in the **same region as the Supabase project** (check the Supabase project settings first, and Render's current region list).
- **Framework (to decide):** NestJS (fits Clean Architecture/CQRS background) or Fastify + zod.

## 4. Schema ownership and migrations

- The BE repo holds `prisma/` (Prisma 7, `@prisma/adapter-pg`). It is the only place that runs `migrate`. CargoDev web must not run migrations once the BE exists.
- **Expand/contract:** FE and BE deploy independently, so add columns as nullable or with defaults first, ship the code that uses them, and drop or rename in a later migration.
- Database roles: one migrator role (`DIRECT_URL`), runtime roles with least privilege.
- Every table keeps `org_id`; every query filters by it. Tri-state `Boolean?` fields never default to false.
- CI runs `prisma migrate deploy` once, from the BE pipeline, against staging before production.
- Both apps use the Supabase pooler at runtime with small pools.

## 5. Migration plan (backend first)

1. **Safety:** staging DB; inventory of existing behaviour (see context report); tests around FC/FL rules, status automation, serial counter transaction, activity log, `org_id` scoping, plus a login-and-list smoke test.
2. **Scaffold BE:** new repo, move `prisma/` and migration history unchanged.
3. **Auth:** staff JWT issued by the BE for web and staff mobile; customer audience added later. Decide whether NextAuth stays as a thin session layer.
4. **Port by module:** vehicles, documents/photos, customers/users, notifications, reports, settings. For each: port service logic, add endpoint, switch FE server actions to call it, keep the old path behind a flag until proven.
5. **Jobs and integrations:** daily status cron (`/api/cron/daily-vehicle-checks` today), Pusher, Expo push and R2 move to the BE. The cron must run in exactly one place at a time.
6. **Retire** Prisma and `lib/services` from the FE once nothing imports them.
7. **Build customer features** directly in the BE (sections 6 to 9).

## 6. Auth and security

- Customer login: email + password (argon2/bcrypt), forgot-password by emailed code, optional phone OTP later. Sign-up step 3 is a real 6-digit email verification. Short-lived access JWT (`aud=customer`) plus rotating hashed refresh tokens (`CustomerSession`).
- Customers already exist as `User` rows (`userType = CUSTOMER`, `loginEnabled = false`, no password, optional email). Sign-up must match or claim these rows safely; email is unique per org and shared with staff.
- Vehicle link at sign-up creates a `VehicleLinkRequest` (Admin or Manager approves). The app always answers "Request sent".
- Staff tokens are rejected on customer routes and the reverse, with one guard per surface.
- Every customer query filters by `orgId` AND customer ownership. IDOR tests are required.
- Prices hidden by `showPriceInApp` are removed from the response itself. No price filter or sort in the customer API (it would leak hidden prices).
- Rate limits on login, OTP, reset, link requests and enquiry forms. Account deletion endpoint (App Store). Privacy policy covers presence tracking.
- Customer-facing mutations also write to ActivityLog.

## 7. Data model changes

| Table | Change |
|---|---|
| `User` | passwordHash, emailVerifiedAt, companyName, country, language, theme, destinationCountry, assignedAgentId, lastActiveAt; `loginEnabled` becomes the portal switch |
| `CustomerSession`, `OtpCode` | Refresh tokens; email verify / reset / phone login codes (hashed) |
| `DeviceToken` | support customer users, platform, appVersion, lastSeenAt |
| `Vehicle` | `showInApp Boolean`, `showPriceInApp Boolean?` (uses existing `sellingPrice`, `sellingPriceCurrency`) |
| `VehicleDocument` | `visibleToCustomer Boolean @default(false)`; object key stored, files in private bucket (existing types EC, BL, OTHER are reused) |
| `VehicleLinkRequest` | customerId, serialEntered, status, reviewedBy, note |
| `WebsiteCar` (+ photos) | brand, model, year, category, engine, displacementCc, transmission, fuelType, description, published, featured, orgId. No price. |
| `Conversation`, `Message`, `Lead` | Shared inbox; channels APP / WEB / EMAIL; types GENERAL / VEHICLE_QUESTION / PRICE_REQUEST / RESERVATION / ENQUIRY; optional `vehicleId` / `websiteCarId`; internal notes never returned to customers |
| `NotificationPreference`, `Faq` | Settings screen; staff-editable help |

Dropped from v1.0: `VehicleMilestone`, `StockVehicle`, `Reservation` table, `CostRate`, `listPrice`, port/voyage columns. Reservation is a conversation of type RESERVATION handled in the Inbox. Add `SavedVehicle` only if hearts stay in scope.

## 8. Customer timeline (derived, 7 steps)

1 Purchased: `purchaseDate`. 2 Export certificate issued: EC document upload date. 3 Booking received: status history (ETD saved). 4 Shipped: `SHIPPED` set by cron, "Expected ETD" before. 5 Bill of Lading issued: BL document or `blNo`. 6 Arrived: ETA (**open**: automatic once ETA passes, or a staff button). 7 Delivered: existing Delivered milestone (**open**: confirm where FC records it).
Not shown: auction bill paid (internal), at export yard (no field).

## 9. API surface (v1, in the BE)

Customer (`/customer/v1`): auth (register, verify-email, login, forgot/reset, refresh, logout, delete account, OTP later); `GET/PATCH /me`, notification preferences; `GET /home`; `GET /vehicles` (filter by status, brand; no price sort), `/vehicles/:id`, `/timeline`, `/photos`; `GET /purchase-history` (counts and dates, no prices); `GET /documents/:id/url` (signed, 5-15 min); `POST /vehicles/link-requests` (always 202); `GET /stock`, `GET /stock/:id`; alerts; conversations and messages; `GET /help/faqs`; `POST /devices`, `POST /presence/heartbeat`; minimum-app-version endpoint.
Public (`/public`): website cars list and detail, enquiry form (rate limited, spam protected).
Staff (`/v1`, existing prefix kept for the staff mobile app): active customers, link approvals, document visibility, show-in-app and show-price, inbox, FAQ management, website cars CRUD.
All inputs validated (zod); OpenAPI spec generated.

## 10. Presence

App sends a heartbeat every ~2 min while foregrounded; the BE updates `lastActiveAt` (throttled). "Active now" = seen in the last 5 minutes. Staff list polls every 30-60 s; optionally one Pusher staff event.

## 11. Notifications

Today `emit()` creates in-transaction DB rows and `notifyRealtime()` sends Pusher and Expo push, to staff (Admin/Manager) only. Extend with customer events (booking received, photos added, documents ready, departure reminder 3/7/14 days, new stock) honoring `NotificationPreference`. **Email (Resend) and WhatsApp are not built yet**; ship push first, then email, then WhatsApp after template approval.

## 12. Files

Move to a private R2 bucket. Store object keys, not URLs. Customer reads: authorization check, then a signed URL (5-15 min). Resize photos on upload (thumbnail + full). Existing public URLs need a migration plan.

## 13. Staff additions in CargoDev (FE)

Inbox; Link approvals (Admin/Manager); Customers: login enabled, assigned agent, active now; Vehicles list: Show in app and Show price columns on FL; Vehicle > Customer app tab with timeline preview and document visibility switches; Website cars list and editor; FAQ management. All are served by BE endpoints.

## 14. Operations

- Environments: local, staging (own DB, bucket, demo account for App Store review), production.
- CI: every new env var goes into the CI dummy-env block. Migrations run once from the BE pipeline.
- Cron: status automation, departure reminders; only the BE runs them after cut-over.
- Backups: Supabase Pro daily and one restore drill; retention for ActivityLog, StatusHistory, Notification.
- Monitoring: Sentry, uptime check, cron-failure alert.
- **Render setup:** one Docker image, a `/health` endpoint, `SIGTERM` graceful shutdown, listen on `0.0.0.0:$PORT`; separate staging and production services, each with its own database and R2 bucket. Later split into a web service and a worker/cron service from the same image.
- **Deploy order (GitHub Actions):** tests, then `prisma migrate deploy` once, then deploy the BE.
- **Jobs:** in-process scheduler with a Postgres advisory lock (same connection for lock, job and unlock) or pg-boss. pg-boss creates its own schema in the database.
- **Files:** uploads go straight to R2 with presigned URLs, not through the BE.
- Accounts (Render, Vercel, Supabase, Apple, Meta, Cloudflare, email provider) owned by FTJ with the dev team as admins. Fewer vendors is a goal: revisit moving the frontends and the database onto Render later as a separate project.
- API versioning plus a minimum-supported-version endpoint for the apps.

## 15. App Store notes

Public listing: account deletion in app, privacy policy URL, working demo login for reviewers on staging, no payments in app.

## 16. Build order

1. Safety: staging DB, behaviour inventory, tests around core rules
2. BE scaffold and schema ownership
3. Staff auth in the BE (web + staff mobile)
4. Port modules one by one (vehicles, documents, customers/users, notifications, reports, settings)
5. Move cron, Pusher, Expo push, R2 to the BE; make files private
6. Customer auth, guards, IDOR tests
7. Customer read APIs (vehicles, derived timeline, photos, documents with signed URLs)
8. Staff tools (link approvals, show-in-app/price, document visibility)
9. Inbox and messaging
10. Push and preferences, presence
11. Website cars and public site
12. Hardening and App Store submission

## 17. Open questions

For FTJ: languages at launch; phone OTP channel (WhatsApp or SMS); public website stock at launch; budget for paid tiers (now including Render); who besides Admin/Manager may approve links.
Technical: NestJS or Fastify (both run in a Docker container on Render); Supabase region and the matching Render region; email provider (outbound, and inbound for the inbox); keep or drop Pusher later; does the staff mobile app move in the same phases; Arrived rule (automatic from ETA or button); where FC records Delivered; how customer sign-up matches existing customer rows; plan for moving existing public files to private storage; does website "Login" lead to a web portal.

## 18. Risks

| Risk | Mitigation |
|---|---|
| Behaviour changes while porting | Tests first; flagged cut-over per module |
| Customer delay (features wait for migration) | Agree scope and timeline with FTJ; build new customer features directly in the BE |
| Data leak between customers | DTO whitelist, ownership filter, IDOR tests |
| Hidden price inferred from filters/sort | No price filter or sort; strip price from response |
| Public document URLs | Private bucket and signed URLs |
| Cron runs in two places | Single owner; disable old Vercel cron at cut-over; advisory lock inside the BE |
| Single BE instance is a single point of failure | Health checks and auto-restart on Render; Sentry and uptime alerts; add a second API instance once locking is proven |
| Connection exhaustion with two services | Pooler URL, small pools |
| Free-tier limits at launch | Upgrade before release |
| WhatsApp template approval delays | Push and email first |
