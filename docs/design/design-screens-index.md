> **Repo note:** the images listed below live in this repo, not in the project. Customer app sheets are in `docs/design/customer-app/` (1 to 4), staff sheets in `docs/design/staff/` (6, 7, 11), the website home in `docs/design/website/` (13). Sheets 5, 8, 9, 10, 12, 14 and 15 have **not** been exported yet, so they are missing from the repo. `docs/design/superseded/` holds an older vehicle-page sheet (9-step timeline, mileage, colour) that no longer applies.

# Design screens index (v3, 18 Oct 2026)

The PNG mockups cannot be stored as project docs (text only). Upload them from the "designs" folder via Project > Add files. This index says what each image shows. Decisions are in `design/design-v3-existing-data.md`.

## Customer app (Expo, crimson accent)
1. `1-getting-started.png`: Welcome, Sign in, Create account steps 1-5 of 7, neutral "Request sent" for vehicle link requests.
2. `2-home-and-vehicles.png`: Home, My vehicles, filter sheet, purchase history without prices. Route reads Japan to destination country.
3. `3-vehicle-page.png`: status card, Overview / Timeline / Photos tabs, Documents section inline, document viewer, "photos coming soon" state. 7-step timeline from existing data.
4. `4-stock.png`: Stock = FL vehicles with no customer and show-in-app on. Price from existing sellingPrice only when show-price is Yes, else "Price on request". Reservation request sheet.
5. `5-messages-alerts-account.png`: Messages list and conversation, ask sheet, alerts, account, link-a-vehicle.

## CargoDev staff web (blue shadcn theme, dark sidebar)
6. `6-staff-inbox.png`: shared 3-pane inbox for app, website and email, internal notes.
7. `7-staff-link-approvals.png`: Admin/Manager approval of vehicle link requests, with match info only staff see.
8. `8-staff-vehicles-fl.png`: existing FL list with Show in app and Show price columns (no Stock page).
9. `9-staff-vehicle-customer-app.png`: Customer app tab: read-only timeline sources, per-document Visible to customer, show-in-app and show-price.
10. `10-staff-timeline-sources.png`: which existing field drives each of the 7 timeline steps, with open decisions (Arrived, Delivered).
11. `11-staff-website-cars.png`: Website cars list (published, featured, enquiries).
12. `12-staff-website-car-editor.png`: Website car form, photos, publishing, site preview. No price field.

## FTJ public website (dark luxury)
13. `13-site-home.png`: hero and Featured fleet.
14. `14-site-inventory.png`: filters (category, brand, transmission, fuel) and cards with Inquire. No price filter.
15. `15-site-car-detail.png`: gallery, specs, inquiry form that lands in the CargoDev Inbox.
