# AssureCars — Phase-Wise Development Plan

**Product:** AssureCars — Premium Certified Used-Car Reseller Platform
**Document Type:** Engineering Delivery Plan (phase-wise build plan)
**Version:** 2.0 (Decisions confirmed)
**Status:** All open decisions resolved (2026-07-18) — ready for build planning
**Last Updated:** 2026-07-18
**Companion documents:** [Solution-Design-Document.md](./Solution-Design-Document.md) · [API-Documentation.md](./API-Documentation.md) · [../.specify/memory/constitution.md](../.specify/memory/constitution.md)

---

## 1. Purpose & How to Read This Plan

This document turns the **scope defined in the Solution Design Document (SDD v3.0)** and the **Constitution v3.0** into an **executable, phase-wise engineering plan** across all stacks (WebAPI, User App, Employee App, Website, Admin Portal, Inspection integration, DevOps/self-host).

- **Scope boundary:** requirements are delivered **through Phase 2 only**, and everything is **non-financial** (no payments, deposits, financing, refunds; commission **rate** captured but **no payout/settlement**). Financial modules are out of the current scope.
- **Delivery philosophy:** get a dealer **online fast** (MVP‑a), then **capture demand** (MVP‑b), then **engage & grow** (Phase 2). Feature flags gate every module so a dealer can adopt at their own pace on a single upgrade path.
- **Each phase section contains:** goal, entry criteria, workstreams per surface, cross-cutting concerns, feature flags, test gates, and **exit ("definition of done") criteria**.
- **Sequencing:** phases are sequential at the *release* level, but **workstreams inside a phase run in parallel** across stack teams behind the API contract (contract-first, per Constitution Principle VI).

> **Decisions confirmed:** all previously open decisions were resolved on 2026-07-18 (see §9). They are now baked into the SDD v3.0, API v3.0, Constitution v3.0, and migration `005`. Highlights: **Angular-only** web stack; **hub info is visible to buyers**; unified roles (**Super Admin / Hub Admin / Hub Employee / User**); **WhatsApp** is an in-scope notification channel; **reservation is Hub Admin-only** (offline token, 15-day hold, reserved car fully locked); **doorstep/nearest-hub radius = 40 km**.

---

## 2. Delivery Model & Team Topology

### 2.1 Mandated stacks & repository paths (from Constitution §VI)

| Surface | Stack | Path |
|---------|-------|------|
| Web API | ASP.NET Core modular monolith | `src/WebApi/` |
| User Mobile App | Flutter | `apps/user-app/` |
| Employee Mobile App | Flutter | `apps/employee-app/` |
| Customer Website | Angular (SSR/SSG) | `apps/website/` |
| Admin Panel | Angular SPA | `apps/admin/` |
| Inspection App | Kotlin (external, **not rebuilt**) | `Vehicle-Inspection-Kotlin-Product/` |
| Database | PostgreSQL 15+ | `database/migrations/` |
| Self-host packaging | Docker Compose + Caddy | `deploy/` |

> **Web stack (resolved D1):** **Angular only** for Website (SSR/SSG) and Admin (SPA). All Next.js/React references have been removed from the SDD, README, and ADRs. Scaffold `apps/website` and `apps/admin` on Angular.

### 2.2 Suggested workstream teams (parallelizable)

| Team | Owns | Primary phases |
|------|------|----------------|
| **Platform/API** | WebAPI modular monolith, domain logic, DB migrations, OpenAPI contract | All |
| **Web** | Angular Website + Admin Portal | All |
| **Mobile** | Flutter User App + Employee App | MVP‑a → Phase 2 |
| **Integration** | Inspection ingestion pipeline, anti-corruption layer, HMAC webhook | MVP‑a, Phase 2 |
| **DevOps/Self-host** | Docker Compose, Caddy, migrations runner, backups, CI/CD, feature flags | All |
| **QA/Automation** | Contract tests, concurrency/race tests, E2E journeys, install/upgrade tests | All |

### 2.3 Contract-first cadence (non-negotiable)

1. Platform/API publishes/updates the **OpenAPI contract** for a module **before** clients build against it.
2. Typed SDKs are generated from OpenAPI for each client surface.
3. **Contract tests** exist per client surface; **concurrency tests** exist for inventory/slot/reservation paths and MUST fail before implementation (per Constitution testing discipline).

---

## 3. Phase 0 — Foundations (Enablement)

**Goal:** Establish the skeleton that every later phase depends on. No end-user features; this de-risks the multi-stack build.

**Entry criteria:** repo access & CI runners available. (Web stack resolved: Angular.)

### 3.1 Workstreams

| # | Workstream | Deliverables |
|---|-----------|--------------|
| F1 | **Monorepo & scaffolding** | Create `src/WebApi/`, `apps/{user-app,employee-app,website,admin}/` skeletons per Constitution paths |
| F2 | **WebAPI baseline** | ASP.NET Core modular-monolith skeleton, bounded-context module layout, health check (`/health`), RFC 7807 problem+json, `traceparent` propagation |
| F3 | **Database baseline** | Wire migrations `001`–`005` into an automated, forward-only migration runner (expand-contract); seed script (super_admin, roles, default hub/slot template, makes/models, dealer settings incl. `reservation_hold_days=15`, `min_publish_score=70`) |
| F4 | **Contract & SDK pipeline** | OpenAPI publishing from WebAPI; SDK generation for Angular + Flutter clients; contract-test harness |
| F5 | **Auth/gateway cross-cutting** | JWT issuance/validation, `X-Client-Id` gateway check, `accountType`/`allowedClients`/`roles`/`hubIds` claims, idempotency-key + `ETag/If-Match` middleware |
| F6 | **Self-host packaging** | `docker-compose.yml` (WebAPI, PostgreSQL, Redis, MinIO, Caddy, web/admin static); `.env` template; one-command up |
| F7 | **CI/CD** | GitHub Actions: build, test, SAST/dependency scan, image publish; migration/upgrade job |
| F8 | **Observability & feature flags** | Structured logging + Sentry; `feature_flags` table wired to a runtime flag service |
| F9 | **Design system** | Shared token set aligned to `prototype/` (teal/navy/Inter) for Flutter + Angular |

### 3.2 Exit criteria
- `docker compose up` yields a healthy stack; `/health` returns all green.
- Migrations `001`–`005` apply cleanly on a fresh DB and on a seeded DB (upgrade test).
- A trivial authenticated endpoint enforces the full **client + role + hub** matrix in an automated test.
- OpenAPI published; SDKs generate; CI is green end-to-end.

---

## 4. Phase MVP‑a — "Get Online" (Foundation)

**Goal:** A dealer can install the platform, configure hubs/staff/branding, onboard inventory with mandatory inspection reports, and buyers can **browse & view certified cars** on Website + User App. **No demand capture yet** (no interest/TD/reservation).

**Theme:** publish trustworthy inventory; buyers browse.

**Entry criteria:** Phase 0 exit met. (Resolved: **hub info is shown to buyers**; publish `min_publish_score` default 70.)

### 4.1 Modules in scope (SDD refs)

| Module | SDD | Feature flag |
|--------|-----|--------------|
| Identity, Auth & Profile (3 logins + hub RBAC) | §10.1 | always-on |
| Car Catalog & Inventory (unique VIN, 3 sources, lifecycle) | §10.2 | `catalog` |
| Consignor onboarding (+ commission % capture) | §10.2 | `consignors` |
| Inspection App Integration (ingest PDF + full graph, VIN auto-map) | §10.14 | `inspection_ingest` |
| Vehicle Detail & Inspection Report display | §10.2, §8 (API) | `catalog` |
| Search, Filter & Discovery (Postgres FTS, geo, facets) | §10.3 | `search` |
| Admin & Configuration (hubs, staff/RBAC, slot templates, settings, CMS, flags) | §10.12 | `admin` |
| Reporting (basic ops dashboard) | §10.13 | `dashboard` |

### 4.2 Workstreams

**Platform/API**
- Identity: OTP (user), password+optional MFA (employee), password+**mandatory MFA** (admin); refresh rotation + reuse detection; **first-run super_admin bootstrap + TOTP enrollment** (Open Decision D9).
- Hub-scoped RBAC enforcement (row-level filter by `hubIds`) as a reusable query filter.
- Catalog: car CRUD, listing-source rules, `chk_consigned_requires_consignor`, same-hub trigger, VIN auto-map (`link_inspection_reports_by_vin`), publish gate (passing report + price + min-score).
- Consignors: hub-scoped CRUD incl. `commissionPct` (reference-only).
- Inspection integration: HMAC webhook, idempotency on `reportId`, anti-corruption layer → summary (001) + complete graph (002), PDF to private bucket, unmatched queue, supersede/versioning, context routing (RESALE now; SELL/PDI Phase 2).
- Search service over Postgres FTS + facets + geo distance (from hub geo; **hub name/city shown to buyers**, filterable by hub/city).
- Media presign (admin car photos) + private inspection PDF pre-signed URLs.
- Admin config: hubs (super_admin), staff onboarding, slot templates, dealer settings, feature flags, CMS banners; ops dashboard read models.

**Web (Angular)**
- Website (SSR/SSG): Home, Listing (facets), Car Detail + inspection report card, Certified program, Sign-in (OTP), Sell/PDI/landing marketing pages (static until Phase 2 wiring).
- Admin Portal (SPA): login+MFA, Dashboard, Cars & Catalog, Add/Edit Car (publish gate UI + VIN auto-map result), Consignors, Inspections (ingested + unmatched queue resolve), Hubs & Staff/RBAC, Test-Drive Config (templates), Branding, Feature Flags.

**Mobile (Flutter — User App)**
- OTP login, Home/discovery, Search + filters, Car Detail + inspection report/score ring/grade, Saved cars, Account/Profile/Settings. (Interest/TD/reservation screens deferred to MVP‑b but navigable placeholders acceptable.)

**Integration**
- Confirm Inspection App contract (`context`, PDF delivery mode: inline/`pdfUrl`/follow-up); manual-upload fallback path in Admin; VIN correlation both directions.

**DevOps/Self-host**
- Provisioning runbook (§14.2): VM → images → `.env` → migrate+seed → live on domain.
- Scheduled `pg_dump` + media snapshot + documented restore.

### 4.3 Real-time scenarios to validate
- Report arrives **before** the car is listed → parked Unmatched → **auto-links** the instant the admin lists that VIN.
- Consigned car assigned to a hub **different** from its consignor's hub → rejected by trigger.
- Publish attempted without passing report or without price → `422` with violation codes.
- Guest opens a Car Detail → **hub name/address/city + distance** are shown; internal fields (listing source, consignor, commission %) remain staff-only.

### 4.4 Test gates
- Contract tests: Website + User App + Admin against OpenAPI.
- Integration: inspection ingest idempotency; VIN auto-map (both orders); publish-gate rules.
- Auth matrix: user/employee/admin tokens rejected on wrong clients; hub scoping row-level.
- Install/upgrade: fresh Compose + migration on seeded data.

### 4.5 Exit criteria (Definition of Done)
- A fresh dealer instance can be provisioned and configured end-to-end by a Super Admin.
- Owned **and** both consigned sources can be onboarded, inspected (ingested PDF), certified, priced, and published Live.
- Buyers browse/search and view certified detail + inspection report (incl. **hub name/city + distance**) on Website and User App; internal-only fields stay hidden.
- Basic ops dashboard renders live inventory counts.

---

## 5. Phase MVP‑b — "Capture Demand" (Core Value)

**Goal:** Turn browsing into demand: **interest/leads**, the **flagship concurrent-slot test-drive engine** (Hub + Doorstep ≤40 km), the **Employee App** to work leads and conduct drives, **Hub Admin-only reservations**, and **notifications (incl. WhatsApp)**.

**Theme:** capture and operate demand.

**Entry criteria:** MVP‑a exit met. Resolved: auto-create lead on direct TD (**yes**); AtHub capacity = bays, assign agent at conduct time; **doorstep radius 40 km**; **reservation is Hub Admin-only** after offline token; **reserved car fully locked** (no interest/TD/second reservation).

### 5.1 Modules in scope (SDD refs)

| Module | SDD | Feature flag |
|--------|-----|--------------|
| Interest / Lead Management (scoring, assignment, SLA) | §10.4 | `leads` |
| Test Drive Booking — concurrent-slot engine | §10.5 | `test_drives` |
| Employee Operations (leads, conduct TD, OTP, offline sync) | §10.6 | `employee_app` |
| Reservation / Deal Handoff (**Hub Admin-only**, offline token, 15-day hold, fully-locked) | §10.7 | `reservations` |
| Notifications (Push/Email/SMS/**WhatsApp**) | §10.10 | `notifications` |
| Reporting (demand funnel + TD ops board) | §10.13 | `dashboard` |

### 5.2 Workstreams

**Platform/API**
- Lead service: create/merge (`uq_leads_open_per_user_car`), scoring, assignment engine (hub + load + round-robin), SLA timer + escalation job. **Auto-create lead when a TD booking originates without an existing lead** (resolved: yes).
- Test-drive engine: slot templates → **rolling slot generation job**, Redis atomic counter + DB conditional `UPDATE ... WHERE booked_count < capacity`, idempotency, `(slot_id,user_id)` uniqueness, cancel/no-show/reschedule capacity release, reconciliation job, **AtHub capacity = bays / assign agent at conduct time**, **doorstep radius 40 km**. Reject booking on a `Reserved` car.
- Reservation service (**Hub Admin-only**): `POST /v1/admin/reservations` (existing open lead required; lead must match the same car/hub; `token_received` + `token_amount_paise` display-only), optimistic lock on `row_version`, `uq_reservations_active_car`, **Super Admin-configured hold (default 15 days) auto-release job**, state machine (`Reserved → DealInProgress → Sold`/`Released`/`Cancelled`), **reserved-car lock** (reject interest/TD/second reservation and block future test drives unless released), **Reserved Vehicles** worklist with `daysPending`, remaining offline amount on Mark Sold, `notify-employee` action.
- Notification service: event subscribers (`LeadAssigned`, `TestDriveBooked`, `CarReserved`, `CarSold`, `ReservationFollowUpRequested`, reminders), channels **Push/Email/SMS/WhatsApp**, template/locale/prefs, delivery tracking + push→SMS fallback, scheduled reminders (T‑24h/T‑2h, hold-expiry).
- Read models: interest→TD→reservation funnel; slot fill rate; no-shows; staff conversion.

**Mobile (Flutter — User App)**
- Send Interest + success, Book Test Drive (capacity-aware slot picker, AtHub/Doorstep ≤40 km), Booking success, My Drives/Detail/Reschedule/Cancel, Notifications. **No reserve screens** (reservation is staff-only); a `Reserved` car renders **read-only** (interest/TD actions disabled).

**Mobile (Flutter — Employee App)**
- Login, Today's Schedule, Conduct Test Drive (EnRoute → OTP check-in → odometer/photos → complete + interest), My Leads/Lead Detail (disposition, log notes), Hub Inventory availability toggle, **Reservation Follow-Up** (view reservations flagged by Hub Admin; follow up on the final deal — read-only, Hub Admin closes), Profile/availability, **offline queue & sync**.

**Web (Angular — Admin)**
- Leads/CRM Kanban + Lead Detail (assignment rules, SLA thresholds), Test-Drive Config live capacity preview, **Reserve a car** (link lead / manual buyer + token), **Reserved Vehicles** screen (days-pending, mark Sold/Release, **Notify Employee App**), enriched Dashboard (demand funnel + TD ops board).

**QA/Automation**
- **Concurrency proof (Constitution §IV):** N parallel bookings on capacity K → exactly K succeed; duplicate idempotent request → single booking; two Hub Admins reserving one car → single winner; Redis-down fallback still correct.

### 5.3 Real-time scenarios to validate
- 100 buyers hit the last seat of a 09:20 slot → only `capacity` succeed, rest get `409` + alternates.
- Buyer cancels → freed seat is immediately bookable (DB + Redis consistent after reconciliation).
- Doorstep agent: EnRoute → arrives → buyer OTP → InProgress → Completed → agent freed for next slot.
- Hub Admin reserves a car after offline token → car `Reserved` and **locked** (interest/TD rejected); not marked Sold within 15 days → auto-released to Live.
- Hub Admin opens **Reserved Vehicles**, sees days-pending, taps **Notify Employee App** → assigned Hub Employee gets a follow-up task (WhatsApp/push).
- Direct test-drive booking with no prior "Send Interest" → lead auto-created for follow-up.

### 5.4 Exit criteria (Definition of Done)
- Full funnel works: browse → interest → test drive (AtHub + Doorstep ≤40 km) → offline token → **Hub Admin reserves** → Hub Admin marks Sold (offline close), all hub-scoped; reserved cars fully locked; 15-day auto-release verified.
- Concurrency guarantees proven by automated race tests.
- Notifications delivered across push/email/SMS/**WhatsApp** with fallback.
- Employee App usable in the field including offline sync.

---

## 6. Phase 2 — "Engage & Grow" (Trust + Supply)

**Goal:** Deepen trust and open the supply/service funnel: **Reviews**, **user-initiated Inspection Services (Sell + PDI)** with **nearest-hub routing**, plus growth features.

**Theme:** trust, supply acquisition, engagement.

**Entry criteria:** MVP‑b exit met. Resolved: Sell **indicative quote / final offer** captured as **display-only reference fields** (money offline); Sell/PDI inspection is a **technician appointment** gated by per-hub `daily_inspection_capacity` + technician availability (not the test-drive slot engine).

### 6.1 Modules in scope (SDD refs)

| Module | SDD | Feature flag |
|--------|-----|--------------|
| Reviews & Ratings (verified, moderation) | §10.11 | `reviews` |
| Inspection Services — Sell + PDI (user-initiated) | §10.9 | `inspection_services` |
| Nearest-hub routing (GPS/pincode, super_admin reassign) | §10.9, migration 004 | `inspection_services` |
| Recommendations (similar/price-drop) | §10.3 | `recommendations` |
| Promotions / Coupons | §10.12 | `promotions` |
| Richer analytics | §10.13 | `analytics` |

### 6.2 Workstreams

**Platform/API**
- Inspection-request service: Sell/PDI intake, **nearest-hub router within 40 km** (haversine over hub geo; fallback pincode geocode; NULL → manual assignment), **technician appointment scheduling** (per-hub `daily_inspection_capacity` + availability), context routing (SELL/PDI) via `inspectionRequestId`, report link → `ReportReady`, Sell **indicative quote / final offer** (display-only refs), Sell-acceptance → create `Car(Draft)` in the assigned hub, super_admin reassign.
- Reviews: verified-only (post completed TD / closed deal), moderation, aggregates into hub/staff dashboards.
- Recommendations, promotions, richer analytics/event stream. (WhatsApp channel already delivered in MVP‑b.)

**Mobile + Web**
- User App/Website: Services hub, Sell request, PDI request, Request tracker (status + report PDF; **assigned hub shown**, appointment address after scheduling).
- Employee App: assigned-hub Sell/PDI queue (schedule/close/notes, hub-scoped).
- Admin: Sell/PDI triage, **super_admin hub (re)assign**, reviews moderation, promotions.

### 6.3 Real-time scenarios to validate
- Sell/PDI submitted with GPS → routed to nearest active hub within 40 km; none in range → parked for super_admin manual assignment.
- Sell accepted → `Car(Draft)` created in the **assigned hub** with the already-ingested report → satisfies publish gate.
- PDI (used-car-from-another-dealer) → PDF delivered to user; **no inventory car** created.

### 6.4 Exit criteria (Definition of Done)
- Users submit Sell/PDI from App/Web; requests auto-route to nearest hub within 40 km and are worked hub-scoped as technician appointments.
- Verified reviews render on car detail and feed dashboards.
- Recommendations and promotions functioning.

---

## 7. Cross-Cutting Concerns (Every Phase)

| Concern | Requirement |
|---------|-------------|
| **Security** | OWASP ASVS; TLS; encryption at rest; PII protection; private media/PDF via short-lived pre-signed URLs; HMAC on inspection webhook; audit log for admin/inventory/capacity/reservation actions |
| **Concurrency & idempotency** | Idempotency-Key on all state-changing POSTs; `ETag/If-Match` (row_version) on updates; race tests mandatory for slots/reservations |
| **Feature flags** | Every module gated; dealers adopt incrementally on one upgrade path (config-not-fork) |
| **Localization** | en-IN + Hindi baseline; extensible |
| **Accessibility** | WCAG 2.1 AA on web |
| **NFR targets** | search p95 < 500 ms; detail p95 < 300 ms; booking/reservation p95 < 800 ms |
| **Observability** | Structured logs + Sentry; optional metrics stack |
| **Self-host correctness** | Fresh install + upgrade-on-seeded-data tests each release; automated backups + documented restore |

---

## 8. Feature-Flag Rollout Map

| Flag | Phase | Depends on |
|------|-------|-----------|
| `catalog`, `consignors`, `inspection_ingest`, `search`, `admin`, `dashboard` | MVP‑a | Phase 0 auth/gateway |
| `leads`, `test_drives`, `employee_app`, `reservations`, `notifications` (push/email/SMS/**WhatsApp**) | MVP‑b | `catalog`, `search` |
| `reviews`, `inspection_services`, `recommendations`, `promotions`, `analytics` | Phase 2 | `test_drives`, `notifications` |

---

## 9. Resolved Decisions (confirmed 2026-07-18)

> All decisions from the deep workflow review are now **resolved** and baked into the SDD v3.0, API v3.0, Constitution v3.0, and migration `005`.

| # | Decision | Affects | **Resolution** |
|---|----------|---------|----------------|
| **D1** | Web stack: Angular vs Next.js/React. | Phase 0 | ✅ **Angular only** for Website (SSR/SSG) + Admin (SPA). All Next.js/React references removed. |
| **D2** | Buyer hub visibility on public car APIs. | MVP‑a | ✅ **Show hub info** (name/address/city + distance) to buyers. Hub *scoping* still restricts staff. |
| **D3** | Auto-create a Lead on a direct TD booking (no prior interest). | MVP‑b | ✅ **Yes** — auto-create lead (source=Interest). |
| **D4** | AtHub test-drive agent/bay assignment. | MVP‑b | ✅ Capacity = **bays**; assign agent at **conduct time** from hub pool. TD offered at **both Hub and Doorstep**. |
| **D5** | Minimum publish score. | MVP‑a | ✅ Added `dealer_settings.min_publish_score` (**default 70**). |
| **D6** | Doorstep serviceable radius. | MVP‑b | ✅ **40 km** (also the nearest-hub Sell/PDI routing radius). |
| **D7** | Who reserves. | MVP‑b | ✅ **Hub Admin only** (super_admin superset). Users **cannot** reserve — reserve removed from User App/Website. Reservation placed **after an offline token** (recorded display-only). |
| **D8** | Interaction on a `Reserved` car. | MVP‑b | ✅ **Fully locked / read-only** — no interest, no test drive, no second reservation until Sold/released. |
| **D9** | First-run Super Admin bootstrap + MFA. | Phase 0/MVP‑a | ✅ Seed super_admin from `.env`; **force TOTP enrollment** on first login. |
| **D10** | Sell quote / final offer capture. | Phase 2 | ✅ **Display-only reference fields** (`indicative_quote_paise`, `final_offer_paise`) — money stays offline; no ledger. |
| **D11** | Inspection appointment vs slot engine. | Phase 2 | ✅ **Technician appointment** gated by per-hub `daily_inspection_capacity` + availability — **not** the test-drive slot-capacity engine. |
| **D12** | EMI display. | MVP‑a | ✅ **Indicative display only**; labelled; no financing flow. |
| **D13** | Right-to-erasure / account deletion. | Phase 2 | ✅ **Phase 2** self-service deletion request + retention policy (DPDP/GDPR). |

**Reservation lifecycle (confirmed model):**
1. Buyer pays a **token offline** → informs the hub.
2. **Hub Admin reserves** the car (links a lead **or** enters buyer name+phone; records token flag/amount). Car → `Reserved` and **fully locked**.
3. **Reserved Vehicles** screen (Hub Admin + Super Admin) shows each hold's **days-pending**; Hub Admin can **Notify Employee App** so the assigned Hub Employee follows up on the final deal.
4. **Hub Admin marks Sold** (deal closed offline) → `Sold`; **or** if not Sold within the configurable hold (**default 15 days**), the system **auto-releases** the car to `Live`.

---

## 10. Documentation Consistency Fixes — **Applied**

All items below were corrected as part of this finalization (SDD v3.0, API v3.0, Constitution v3.0, README, migration `005`):

1. ✅ SDD footer updated to **v3.0** (header/revision history aligned).
2. ✅ SDD §5.1/§8/ADR #8 and README tech-stack tables now list **Angular** (Next.js/React removed).
3. ✅ API §10/§11 headers use canonical roles `hub_employee` / `hub_admin` / `super_admin`.
4. ✅ API + SDD now **show hub info** to buyers (privacy caveats removed) per D2.
5. ✅ **WhatsApp** promoted to an in-scope notification channel (MVP‑b), removed from Phase 2 as "later".
6. ✅ Reservation converted to a **Hub Admin-only** staff flow across SDD §10.7, API §7/§11.16, README, and migration `005` (user reservation endpoints removed).

7. ✅ `prototype/app.js` brought in line with v3.0 — removed the user-facing reserve flow (screen, account menu, detail CTA), now shows hub info (name/area/distance), added the Admin **Reserved Vehicles** screen + **Reserve a car** form (link lead / manual buyer / token / 15-day hold / Notify Employee App), reframed the Employee App to read-only **Reservation Follow-Up**, unified roles, enabled WhatsApp, added dealer settings (hold days, min publish score), and relabeled web/admin as **Angular**.

---

## 11. Milestone Summary

| Phase | Theme | Headline outcome | Gate to next phase |
|-------|-------|------------------|--------------------|
| **Phase 0** | Foundations | Stack skeleton, auth/gateway, migrations, CI, self-host up | Healthy stack + auth matrix + contract pipeline |
| **MVP‑a** | Get Online | Configure instance, publish certified inventory, buyers browse (hub info shown) | Onboard→certify→publish→browse works |
| **MVP‑b** | Capture Demand | Interest, concurrent test drives (Hub+Doorstep ≤40 km), employee app, Hub Admin reservations, notifications (incl. WhatsApp) | Full funnel + concurrency proofs green |
| **Phase 2** | Engage & Grow | Reviews, Sell/PDI services with nearest-hub routing, growth features | Sell/PDI routed & worked; reviews live |

---

*End of Phase-Wise Development Plan v2.0 — all decisions confirmed; ready for build planning.*
