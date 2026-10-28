> **Repo note:** partly superseded by `design-v3-existing-data.md` (derived 7-step timeline, no `Stock` table or `showPrice` on a new field, price reuse) and by the 19 Oct decision that the app is **sign-in only**. The inbox, link-approval and messaging sections still apply.

# CargoDev customer app v2: change notes

Date: 18 Oct 2026 · Supersedes parts of `design/cargodev-final-system-design.md` v1.0 and `CargoDev-customer-app-screens.pdf` (7 Oct) · Screens: the 9 PNG sheets delivered with this note.

## 1. What you asked for, and what changed

| Your request | Result in the design |
|---|---|
| Link-vehicle needs manager/admin approval; always say "sent", never say a vehicle doesn't exist | Neutral "Request sent" screen. Staff **Approvals** page shows match / no match / owned by someone else. Approve/Reject limited to Manager and Admin. |
| No pricing on vehicles the customer already bought | "Total spent", "Highest price" sort and price on the vehicle page all removed. History shows delivered count and customer since. |
| Stock = FL vehicles with no customer; show price only if a boolean is true | Stock lists FL vehicles with no customer. Price appears only when `showPrice === true`; otherwise "Price on request". |
| Remove vehicle-page details we can't back with data | Removed auction hall, lot, bill-paid note, free-text timeline notes, times of day, purchase price, "replies within an hour". Kept only fields CargoDev holds. |
| All messages / "Ask about" handled in a chat + email-like service | One **Inbox** in CargoDev. See section 4. |
| Reservation requests go through that service | Reservation is a conversation of type RESERVATION. No automatic 48h hold. |
| Website enquiries go through that service | Website form creates a conversation of channel WEB (see section 4). |
| Documents on the vehicle page, no separate view | Documents section sits under the status card. Documents hub, Home shortcut and Documents tab removed. |
| Take notes on CargoDev changes | Sections 3 to 6. |

## 2. Decisions I made that you must confirm

1. **Messages is now a tab; Alerts moved to a bell on Home.** Chat is now central, so it earns a tab. Easy to reverse.
2. **Timeline step 2 is relabelled "Purchase confirmed"** (was "Auction bill paid"). Our agreed rule says customers never see bill-paid, but the old design showed it. Options: keep the relabel, or hide milestone 2 from customers (8 visible steps).
3. **Cost-to-Mombasa (CIF) estimate removed.** It needed `CostRate` data we don't have, and stock vehicles are FL (never shipped). Can return later.
4. **No 48-hour hold.** If the team replies in chat, a hold timer is extra machinery. Staff mark a stock vehicle "Reserved" manually. `Reservation` table and expiry cron drop out of phase 2.
5. **No `StockVehicle` table.** Stock is just `Vehicle` where type = FL, no customer, `customerVisible = true`. One less table to keep in sync.
6. **Price slider and price sort removed from Stock.** If the API can filter or sort by price, a customer can work out hidden prices (for example, by narrowing the max-price filter until a car disappears). This is called an *inference attack*.
7. **Stock price currency and meaning is unknown** (the sample says US$ FOB). Needs FTJ's answer (section 7).

## 3. Schema changes (Prisma)

Remove from the v1 plan: `StockVehicle`, `Reservation`, `CostRate`.

Add or change:

- `Vehicle`: `showPrice Boolean?` (tri-state: only `true` shows the price; `null` and `false` both hide it), `price Decimal?` and `priceCurrency` (stock only), `customerVisible`. Existing planned fields stay (ports, vessel, voyage).
- `VehicleLinkRequest`: `serialEntered` (store raw and normalised), `status` (PENDING, APPROVED, REJECTED), `matchedVehicleId?`, `reviewedById?`, `reviewedAt?`, `staffNote?`. Unique on (customerId, normalised serial, PENDING) to stop duplicate spam.
- `SavedVehicle` now points at `Vehicle`.
- Messaging (replaces the simple `Conversation`/`Message` from v1):

```prisma
model Conversation {
  id             String   @id @default(cuid())
  orgId          String
  channel        ConversationChannel   // APP | WEB | EMAIL
  type           ConversationType      // GENERAL | VEHICLE_QUESTION | PRICE_REQUEST | RESERVATION | ENQUIRY
  status         ConversationStatus    // OPEN | RESOLVED
  customerId     String?               // null for a website lead with no account
  leadId         String?
  vehicleId      String?
  assignedToId   String?
  subject        String
  lastMessageAt  DateTime
  firstReplyAt   DateTime?
  messages       Message[]
  @@index([orgId, status, lastMessageAt])
}

model Message {
  id             String   @id @default(cuid())
  orgId          String
  conversationId String
  direction      MessageDirection      // INBOUND | OUTBOUND | SYSTEM
  isInternalNote Boolean  @default(false)   // staff-only. Never returned to customers.
  authorUserId   String?
  body           String
  attachments    Json?                 // R2 object keys only
  deliveredVia   String[]              // e.g. ["PUSH","EMAIL"]
  createdAt      DateTime @default(now())
  readAt         DateTime?
}

model Lead {            // someone who used the website form but has no account
  id String @id @default(cuid())
  orgId String
  name String
  email String
  phone String?
  country String?
  convertedToUserId String?
}
```

Notes: every table carries `orgId`. `isInternalNote` is the one field that must never leak, so the customer DTO should not even select it.

## 4. Suggestion: one team inbox for app, website and email

**The idea.** Treat every inbound contact as a `Conversation` with `Message`s, regardless of where it came from. The channel is a tag, not a separate system. (Pattern name: a *shared inbox* or *help-desk ticketing* model.)

**What feeds it**

| Source | Creates | Customer or lead |
|---|---|---|
| App: Ask about this car | VEHICLE_QUESTION, linked to vehicle | Customer |
| App: Request reservation | RESERVATION, linked to stock vehicle | Customer |
| App: Ask for the price | PRICE_REQUEST | Customer |
| App: Messages tab, new message | GENERAL | Customer |
| Website enquiry form | ENQUIRY, channel WEB | Lead (or matched customer by email) |
| Customer replies to an email | New message in the same conversation | Either |

**How replies travel back** (the "email-like" part)

- If the customer has the app and a recent device token: push notification + message in the app.
- Otherwise, or in addition by notification preference: email.
- Use a per-conversation reply address, for example `c-<conversationId>@mail.<your-domain>`, so a reply to the email lands in the right thread. Inbound email needs a provider that can POST incoming mail to a webhook. I have not verified whether your Resend plan offers inbound; check, otherwise use Postmark, SES or Cloudflare Email Routing into a webhook route.
- Strip quoted text and signatures from inbound email before saving.

**Staff inbox screen** (see sheet 6): list with filters (All, Mine, Unassigned, Resolved) and channel tags; thread in the middle with a Reply / Internal note switch; right panel with customer context (sales agent, last active, their vehicles, the linked vehicle) and actions (assign, resolve, "Mark vehicle as Reserved").

**Rules worth writing down**

1. Default assignee = the customer's `assignedAgentId`. Leads start unassigned.
2. Internal notes never leave staff DTOs. Write a test: a customer fetching a conversation never sees `isInternalNote` rows (add it to the IDOR test suite).
3. Customer can only read conversations where `customerId` equals their own id AND `orgId` matches.
4. A lead who later registers with the same verified email gets their conversations attached to the new account (`Lead.convertedToUserId`).
5. Rate limit message sending and the website form; add spam protection (for example Cloudflare Turnstile) on the form.
6. Write an `ActivityLog` entry for assign, resolve and "mark reserved".
7. Realtime: one Pusher staff-channel event (`inbox.updated`) plus polling fallback; unread count in the sidebar badge.

**Build in this order** (keeps scope small):
1. v1: conversations and messages, app + website sources, staff inbox with reply and internal notes, push on reply.
2. v1.1: email replies out, inbound email in, saved replies.
3. Later: response-time stats, auto-assignment, tags, WhatsApp as a channel.

**Build vs buy.** A hosted tool (Chatwoot, Crisp, Intercom) would ship faster but keeps customer data and vehicle context outside CargoDev, and you would still need custom glue to attach vehicle and customer context. Because you already have users, vehicles, roles and notifications, building the focused version is reasonable. Decide with FTJ based on budget.

## 5. Link-request approval flow

1. Sign-up step 1 creates the user as unverified. Step 2 posts the serial. Step 3 verifies email.
2. The API always responds `202 { status: "RECEIVED" }`, same body and similar timing whether or not the serial exists. This avoids *user/resource enumeration*.
3. A request is stored with the match result computed server-side (found / found but owned by another customer / not found). The customer never receives the match result.
4. Staff see only requests from **email-verified** accounts, so bot sign-ups don't flood managers.
5. Approve (Manager or Admin only) sets `Vehicle.customerId`, creates a "Vehicle added" alert, and writes ActivityLog.
6. Reject or "no match": staff message the customer from the Inbox to ask for the invoice. In the app the request keeps showing "Under review"; the customer is never told it doesn't exist.
7. Check how CargoDev stores roles today. I don't know the exact role names, so map "Manager or Admin" to your real ones.

## 6. CargoDev staff dashboard changes

| Area | Change |
|---|---|
| Sidebar | Add Inbox (unread badge), Approvals (pending badge), Stock (FL), Customers. |
| Inbox | New page (sheet 6). |
| Approvals | New page (sheet 7). |
| Stock (FL) | New list (sheet 8): "Visible in app" toggle, tri-state "Show price" (Yes / No / Not set), price, status (Available / Reserved / Hidden), enquiry count. Only FL vehicles with no customer are eligible. |
| Vehicle page | New "Customer app milestones" editor (9 milestones; ETD and cron rows marked Auto), Document **type** (EC / BL / Other) and **Visible to customer** toggle, a "Customer portal" card (visible toggle, login enabled, last active, agent), and a link to open this car's conversations. (Sheet 9.) |
| Customers | List with login enabled, assigned agent, last active, "Active now" view (as already planned, poll 30 to 60 s). |
| Existing rules | Keep FC/FL, status automation with StatusHistory, tri-state Booleans, append-only remarks, activity log on every mutation, `org_id` everywhere. |

## 7. API changes

- Remove: `GET /documents`, `GET /documents/:id/url` as a hub. Keep a signed-URL endpoint **per vehicle**: `GET /vehicles/:id/documents` and `GET /vehicles/:id/documents/:docId/url` (5 to 15 min).
- `GET /purchase-history`: remove `totalSpent`.
- `GET /vehicles`: remove price sort. Vehicle DTO has no price field at all.
- `GET /stock`, `GET /stock/:id`: include `price` **only when** `showPrice === true` (omit the key in the server, never hide it in the app). No price filter, no price sort.
- Conversations: `GET /conversations`, `POST /conversations` (type, vehicleId?, body), `GET/POST /conversations/:id/messages`. Staff-only: inbox list, assign, resolve, internal notes.
- `POST /vehicles/link-requests`: always `202`. Add `GET /vehicles/link-requests` (status shown as "Under review" until approved).
- Public: `POST /api/public/enquiries` creates a Lead + conversation (rate limited, spam protected).
- Remove: `POST /reservations` (replaced by a RESERVATION conversation).

## 8. Updated build order

1. Auth, guards, IDOR tests
2. Schema (section 3)
3. Read APIs (vehicles, timeline, photos, vehicle documents)
4. Staff tools: milestones, document type and visibility, link approvals
5. Messaging + staff inbox (moved earlier because reservations and price requests depend on it)
6. Push and preferences
7. Presence + active customers
8. Stock (FL) management and customer Stock tab
9. Website (enquiry form feeds the inbox)
10. Hardening, App Store

## 9. Open questions for FTJ (new and changed)

- Stock price: currency, and is it FOB, in-Japan sale price, or something else? When a customer buys an FL vehicle, does it become an FC vehicle for shipping? Today FL means never shipped.
- Who may approve link requests: Manager or Admin only (as you said), or also the assigned sales agent?
- Messaging: who answers when the assigned agent is away? Any response-time promise to show customers?
- Keep the "Purchase confirmed" relabel, or hide milestone 2?
- Languages at launch, phone OTP channel, budget for paid tiers (still open from before).
- Closed by this change: "Is Stock + Reserve in v1?" (reserve is now just a message) and "total spent" (removed).

## 10. Update the design doc

Change these sections of `design/cargodev-final-system-design.md`: Decision D5 (Stock/Reserve), section 5 data model (drop `StockVehicle`, `Reservation`, `CostRate`; new `Conversation`/`Message`/`Lead`; `showPrice`), section 6 API list, section 12 build order, section 13 open questions. The agreed rule "only FC vehicles appear in the customer app" becomes: **My vehicles = the customer's FC vehicles; Stock = FL vehicles with no customer.**
