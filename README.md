# Design docs and screens

Everything the customer app is built from, copied from the "FTJ Exports Website" project on 25 Oct 2026. These are **copies**: the project is the source, so when a decision changes, update the project doc first and then refresh the copy here.

## Which doc wins?

Newest decision first. If two files disagree, the one higher in this list wins.

1. **Chat decisions not yet written into any doc** (see "Decisions newer than the docs" below)
2. `design/cargodev-final-system-design.md` (v1.2, 19 Oct): architecture, backend, security, API list, build order
3. `design/design-v3-existing-data.md` (18 Oct): price, stock, 7-step timeline, website cars
4. `design/customer-app-v2-change-notes.md` (18 Oct): inbox/messaging, link-request approval flow, API changes
5. `design/design-screens-index.md` + images: what each v3 screen shows
6. `design/CargoDev-customer-app-screens.md` and `design/pdf/*.pdf`: **v1, 7 Oct. Superseded.** Reference only.

## Files

| Path | What it is |
|---|---|
| `project-instructions.md` | Project brief and checklist (18 Oct version) |
| `design/cargodev-final-system-design.md` | Final system design v1.2 |
| `design/design-v3-existing-data.md` | Data decisions behind the v3 screens |
| `design/customer-app-v2-change-notes.md` | Messaging, approvals, API changes |
| `design/design-screens-index.md` | Index of all v3 screens (some not exported yet) |
| `design/CargoDev-customer-app-screens.md` | Old v1 walkthrough (text), superseded |
| `design/customer-app/` | v3 app screens: 1 getting started, 2 home and vehicles, 3 vehicle page, 4 stock |
| `design/staff/` | Staff web screens that define the backend contract: 6 inbox, 7 link approvals, 11 website cars |
| `design/website/` | 13 site home (the website is a separate project) |
| `design/superseded/` | Old vehicle-page sheet (9-step timeline, mileage, colour). Do not build from it. |
| `design/pdf/` | Original v1 screens PDF |

## Decisions newer than the docs

These were agreed after the design docs were last updated. The project docs still need to be changed.

- **Sign-in only (19 Oct):** the app has no account creation. Customers create accounts on the FTJ website. The "Create account" screens in `1-getting-started.png` are not built.
- **Sentry dropped (19 Oct)**; report generation added to the staff iOS app.
- **Pusher dropped (24 Oct):** the backend does live notifications itself and runs scheduled jobs in-process, no external cron.
- **Backend repo (22 and 24 Oct):** public, owns the database schema and migrations; migrations are allowed against a designated test database.

## Not copied (and why)

- `design/cargodev-context-report.md`: large report on CargoDev's internals, useful to the backend developers, not to the app.
- Website docs (`ftj-website-brief.md`, `ftj-website-design-images.md`, `FTJWebsite_compressed.pdf`) and the quotation docs: belong to the website and commercial work, not the app. Quotations contain pricing.
- Screens 5, 8, 9, 10, 12, 14, 15 from the index: not exported to PNG yet. Screen 5 (messages, alerts, account) is the main gap for the app.
