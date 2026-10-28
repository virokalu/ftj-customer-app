# Design v3: built on existing CargoDev data (18 Oct 2026)

Supersedes parts of `customer-app-v2-change-notes.md`.

## Decisions
| Topic | Decision |
|---|---|
| Price | Reuse existing `sellingPrice` + `sellingPriceCurrency`. No new `listPrice`. |
| App Stock | Existing FL vehicles with no customer and `showInApp = true`. No Stock page in CargoDev. |
| Show price | New tri-state `Boolean? showPriceInApp`. Yes shows price; No and null both show "Price on request". Price is stripped from the API response, not just hidden. |
| Customer timeline | 7 steps derived from existing data. No `VehicleMilestone` table for now. |
| Website luxury cars | Separate staff area "Website cars" (separate from shipments). Published and Featured flags. No price on the site; "Inquire" goes to the Inbox. |
| Site filters | Category, brand, transmission, fuel type. Price-range filter removed. |

## Timeline sources
1 Purchased: purchaseDate. 2 EC issued: EC VehicleDocument upload date. 3 Booking received: StatusHistory. 4 Shipped: shipmentStatus SHIPPED (cron), shows "Expected ETD" before. 5 BL issued: BL document or blNo. 6 Arrived: ETA (OPEN: automatic from ETA, or staff button?). 7 Delivered: existing Delivered milestone (OPEN: confirm where FC records it).
Dropped: Auction bill paid (internal), At export yard (no field).

## New data needed
- Vehicle: `showInApp Boolean`, `showPriceInApp Boolean?`
- VehicleDocument: `visibleToCustomer Boolean @default(false)` (also needs private storage / signed URLs, files are public today)
- WebsiteCar: brand, model, year, category, engine, displacementCc, transmission, fuelType, mileage Boolean?-style optional, description, photos, published, featured, orgId
- Conversation / Message / Lead (see v2 notes), with a `websiteCarId` link
- VehicleLinkRequest (Admin/Manager approval)

## Staff screens
Inbox, Link approvals, Vehicles (FL) with Show in app and Show price columns, Vehicle > Customer app tab, Website cars list and editor.

## Update `design/cargodev-final-system-design.md`
No VehicleMilestone table (derived timeline); no listPrice; no Stock page; Website cars module; API path is /api/v1 in the repo; Resend and WhatsApp are not implemented yet; document storage must become private.

## Update 18 Oct 2026: backend decision
A separate Node backend now owns the schema, migrations, rules, cron and integrations, built before the customer features. The decisions above (price reuse, derived timeline, FL stock, website cars) apply unchanged, but their tables and endpoints are built in the new backend, not inside CargoDev. See `design/cargodev-final-system-design.md` v1.1 for architecture, migration plan, schema ownership rules and the new build order.
Where this note says "update the design doc": done in v1.1.
