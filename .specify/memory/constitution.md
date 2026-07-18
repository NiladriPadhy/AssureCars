<!--
Sync Impact Report
Version change: 2.0.0 → 3.0.0 (2026-07-18)
MAJOR — incompatible redefinitions confirmed with stakeholder:
  - Buyer HUB VISIBILITY REVERSED: buyers MAY now see hub identity
    (name/address/city). The prior "buyers MUST NOT see internal hub
    identity" rule is removed (Principle VII + Domain Constraints).
  - RESERVATION MODEL redefined: reservations are STAFF-ONLY (Hub Admin;
    super_admin superset), created after an OFFLINE token payment. Users
    can NO LONGER self-reserve (removed from User App + Website). A
    reserved car is FULLY LOCKED (no interest, test drive, or second
    reservation) until Sold or released. Configurable hold, DEFAULT 15
    DAYS; auto-release if not Sold in time (Principles III & IV).
  - Web stack finalized: Angular ONLY for Website + Admin (no Next.js/React).
  - Roles UNIFIED across all docs: Super Admin, Hub Admin, Hub Employee, User.
  - WhatsApp confirmed as an in-scope notification channel.
  - Doorstep test-drive / nearest-hub service radius set to 40 km.
Propagated to:
  - ✅ Docs/Solution-Design-Document.md (v3.0)
  - ✅ Docs/API-Documentation.md (hub visibility, reservation endpoints, roles, WhatsApp)
  - ✅ database/migrations/005_reservation_redesign_and_settings.sql
  - ✅ README.md
  - ✅ Docs/Phase-Wise-Development-Plan.md
  - ✅ prototype/app.js (removed user reserve flow; hub shown; Reserved Vehicles admin screen + reserve form; roles; WhatsApp; Angular labels)

Prior report (1.1.0 → 2.0.0, 2026-07-18)
MAJOR — incompatible redefinition of Principle VII (client-access matrix):
  - Introduced hub-centric role hierarchy: super_admin (global), hub_admin
    (hub-scoped), hub_employee (hub-scoped), user.
  - Admin Login is now Admin Portal ONLY (removed Employee App + Inspection App
    access from admin tokens).
  - Inspection App is opened by hub_employee (Employee Login) tokens only
    (updated Principle V).
  - Added hub-scoped RBAC, Consignor-per-hub, Sell/PDI nearest-hub routing, and
    buyer hub-identity privacy to Domain Constraints.
Propagated to:
  - ✅ Docs/Solution-Design-Document.md (v2.0)
  - ✅ Docs/API-Documentation.md (auth matrix, staff/role endpoints, hub scoping)
  - ✅ database/migrations/004_hub_roles_and_scoping.sql
  - ✅ README.md
  - ✅ prototype/app.js

Prior report (1.0.0 → 1.1.0, 2026-07-18):
Amendment: Consignor onboarding may capture an agreed commission rate (%) as
non-financial reference data (both Vendor & Individual). Commission payout
calculation/settlement remains out of scope (offline). Updated Principle III,
Domain Constraints, and Out-of-Scope list. Propagated to:
  - ✅ Docs/Solution-Design-Document.md (v1.9)
  - ✅ Docs/API-Documentation.md (consignor endpoints)
  - ✅ database/migrations/003_consignor_commission.sql
  - ✅ README.md
  - ✅ prototype/app.js (Admin → Consignors)

Prior report (1.0.0):
Version change: (template) → 1.0.0
Principles added:
  - I. API-First, Single Source of Truth
  - II. Self-Hosted Single-Tenant Isolation
  - III. Non-Financial MVP Boundary
  - IV. Unique VIN Inventory & Concurrency Safety (NON-NEGOTIABLE)
  - V. Integrate, Don't Rebuild
  - VI. Contract-Driven Multi-Stack Development
  - VII. Security & Client-Scoped Auth
Sections added:
  - Technology Stack & Platform Constraints
  - Development Workflow & Quality Gates
Templates updated:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .specify/templates/spec-template.md (assumptions aligned with constitution scope)
Follow-up TODOs:
  - Align README.md and Docs/Solution-Design-Document.md web stack references
    (Next.js/React) with constitution-mandated Angular for website and admin
-->

# AssureCars Constitution

## Core Principles

### I. API-First, Single Source of Truth

All business logic MUST live in the ASP.NET Core WebAPI modular monolith. Client
applications (Flutter, Kotlin, Angular) MUST remain thin presentation layers with
no duplicated domain rules.

- Every client MUST consume the same versioned REST API (`/v1`).
- The OpenAPI/Swagger contract published from WebAPI is the canonical integration
  contract; typed SDKs MUST be generated from it.
- Breaking API changes require a new URI version (`/v2`); additive changes MUST
  remain backward-compatible.
- State-changing POSTs MUST accept `Idempotency-Key`; updates MUST support
  `ETag`/`If-Match` via `row_version`.

*Rationale:* Five client surfaces plus an external inspection app depend on one
authoritative backend; contract-first development prevents drift across stacks.

### II. Self-Hosted Single-Tenant Isolation

Each dealer MUST run exactly one isolated AssureCars instance with its own
PostgreSQL database, Redis, object storage, domain, and secrets. There MUST be
no shared multi-tenant data plane.

- MVP MUST deploy via Docker Compose on a modest single-server footprint.
- Dealer differences (branding, slot rules, provider keys) MUST be configuration
  — never code forks.
- Feature flags MUST gate phased module rollout so every dealer stays on the
  upgrade path.
- Optional scale components (Elasticsearch, Kubernetes, message brokers) MUST be
  justified in plan Complexity Tracking before adoption.

*Rationale:* SMB dealers require data ownership, simple licensing, and low
operational burden — the product is sold per instance, not as a marketplace.

### III. Non-Financial MVP Boundary

Requirements scoped through Phase 2 MUST remain non-financial. The platform
captures intent; dealers close deals offline.

- MVP and Phase 2 MUST NOT implement online payments, deposits, EMI/financing,
  refunds, invoicing, or commission **settlement/payout computation**.
- An agreed **commission rate (%)** MAY be recorded on a Consignor at onboarding
  as non-financial reference data. Recording the rate is permitted; **calculating
  payouts, tracking balances, or settling commissions MUST remain offline**.
- Reservations are **staff-created (Hub Admin) non-financial holds** placed
  after an **offline token payment**; users cannot self-reserve. Any token
  amount is recorded as **reference/display only** (no ledger/settlement).
- Financial workflows MAY be designed for future extensibility but MUST NOT
  appear in current scope specs, tasks, or migrations without a constitution
  amendment.

*Rationale:* Fastest path to dealer value; defers money-movement complexity
until the core demand-capture engine is proven.

### IV. Unique VIN Inventory & Concurrency Safety (NON-NEGOTIABLE)

Every vehicle is a unique sellable unit (one VIN = quantity 1). Concurrency
rules differ by operation type and MUST be enforced in domain logic and tests.

- **Reserve / mark sold:** a **Hub Admin** (super_admin superset) reserves a
  car after an offline token payment; exactly one winner per car via optimistic
  lock on `row_version` + state machine (`Draft → … → Reserved → Sold`). A
  **reserved car is fully locked** — no interest, test drive, or second
  reservation until it is Sold or released. If not marked Sold within the
  configurable hold (**default 15 days**) the system auto-releases it to Live.
- **Test drive booking:** many bookings allowed, capped by slot capacity via
  Redis counter + DB conditional update. Doorstep and nearest-hub service is
  bounded to a **40 km** radius.
- Idempotency keys MUST be honored on all inventory transitions and bookings.
- Integration tests MUST prove: N parallel bookings on capacity K → exactly K
  succeed; duplicate idempotent requests → single effect; reservation race →
  single winner.

*Rationale:* Inventory uniqueness is the defining constraint of a used-car
platform; the concurrent-slot test-drive engine is the flagship differentiator.

### V. Integrate, Don't Rebuild

The Vehicle Inspection Mobile App (`Vehicle-Inspection-Kotlin-Product/`) is an
external system of record. AssureCars MUST NOT rebuild inspection capture.

- AssureCars MUST ingest structured JSON + PDF reports via webhook/push with an
  anti-corruption layer mapping to normalized tables + object storage.
- An ingested, passing inspection PDF is MANDATORY before any car (Owned,
  ConsignedVendor, or ConsignedIndividual) transitions to Live.
- Inspection App auth MUST accept `hub_employee` (Employee Login) tokens only;
  User Login and Admin (dashboard) tokens MUST be rejected.
- Sell and PDI inspection services (Phase 2) MUST route through the same
  external app and ingestion pipeline.

*Rationale:* Reuse proven checklist + PDF generation; AssureCars owns trust
display and publish gates, not field inspection UX.

### VI. Contract-Driven Multi-Stack Development

AssureCars is a multi-stack monorepo. Cross-stack integration MUST be
contract-driven, not ad hoc.

| Surface | Stack | Path |
|---------|-------|------|
| User Mobile App | Flutter | `apps/user-app/` |
| Employee Mobile App | Flutter | `apps/employee-app/` |
| Customer Website | Angular (SSR/SSG) | `apps/website/` |
| Admin Panel | Angular SPA | `apps/admin/` |
| Web API | ASP.NET Core | `src/WebApi/` |
| Inspection App | Kotlin (external) | `Vehicle-Inspection-Kotlin-Product/` |

- OpenAPI contract tests MUST exist between WebAPI and each client surface.
- Errors MUST use RFC 7807 `problem+json` with `traceId`.
- Shared design tokens SHOULD align with the `prototype/` reference and Figma.
- API SDK generation from OpenAPI is REQUIRED for typed client access.

*Rationale:* Independent dev stacks ship in parallel only when the API contract
is the single integration seam.

### VII. Security, Client-Scoped Auth & Hub-Scoped RBAC

Three login types issue JWTs scoped by `accountType` and `allowedClients`, and
staff authority is further scoped by a **hub-centric role hierarchy**. The
gateway MUST reject tokens presented to unauthorized clients.

| Login Type | Auth | Clients Granted |
|------------|------|-----------------|
| User Login | OTP (phone/email) | User App, Website |
| Employee Login | Password (+ optional MFA) | Employee App, Inspection App |
| Admin Login | Password + MFA (required) | Admin Portal **only** |

**Role hierarchy (staff):**

| Role | Login type | Clients | Scope | Key powers |
|------|-----------|---------|-------|------------|
| `super_admin` | Admin | Admin Portal | **All hubs (global)** | Onboards hubs, hub admins, hub employees, consignors; dealer-wide settings. One seeded/static login. |
| `hub_admin` | Admin | Admin Portal | **Assigned hub(s)** | Onboards hub employees + consignors for their hub(s); manages their hub catalog. |
| `hub_employee` | Employee | Employee App, Inspection App | **Assigned hub(s)** | Runs sales, test-drive, and inspection ops for their hub(s). |
| `user` | User | User App, Website | — | Buyer/seller; sees hub info (name/city + distance); cannot self-reserve. |

- Every request MUST include `Authorization: Bearer <JWT>` and
  `X-Client-Id: UserApp|Website|EmployeeApp|AdminPortal|InspectionApp`.
- Admin logins (`super_admin`, `hub_admin`) are **dashboard-only** — Admin
  Portal, NOT Employee App or Inspection App.
- The **Inspection App is opened by `hub_employee` tokens** (`InspectionApp`
  client); this is the only staff role that performs inspections.
- **Hub scoping MUST be enforced** (row-level) for `hub_admin` and
  `hub_employee`: they may read/act only within their assigned hub(s)
  (`employee_hubs`). `super_admin` is global.
- **Only `super_admin` creates Hub Admins and Hubs.** `hub_admin` and
  `super_admin` create Hub Employees and consignors for a hub.
- **Buyers MAY see hub information** (name, address, city) on listings and car
  detail; distance MAY also be shown. Hub scoping still governs which **staff**
  can act on a hub's resources (below).
- RBAC permissions MUST enforce staff authorization beyond client + hub scoping.
- Admin actions, inventory-state changes, capacity changes, and reservations
  MUST be audit-logged.
- Security MUST align with OWASP ASVS; PII MUST be protected; media and
  inspection PDFs MUST be served via short-lived pre-signed URLs.

*Rationale:* A dealer runs multiple hubs (yards) from one instance; hub-scoped
roles keep each hub's staff to their own inventory and customers, while a global
super admin governs the whole dealership. Client-scoped tokens prevent lateral
access (e.g., user tokens in admin or inspection flows). Hub identity is
customer-facing (buyers can see where a car is); hub *scoping* is a staff
authorization concern, not a buyer-privacy one.

## Technology Stack & Platform Constraints

### Mandated Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| User + Employee Mobile | Flutter | Shared design system; Android + iOS |
| Customer Website | Angular + TypeScript | SSR/SSG for dealer listing SEO |
| Admin Panel | Angular SPA + component library | Data-dense RBAC views |
| Web API | ASP.NET Core modular monolith | Background workers for jobs/reminders |
| Database | PostgreSQL 15+ | FTS for MVP search; `snake_case`; UUID PKs |
| Cache / Locks | Redis | Slot counters, sessions, rate limits |
| Object Storage | MinIO / local (S3-compatible) | Car media + inspection PDFs |
| Auth | OIDC + JWT (Keycloak or built-in) | Three login types per §VII |
| Packaging | Docker Compose | One-command self-host |
| CI/CD | GitHub Actions | Build, test, scan, publish images |

### Domain Constraints

- **Listing sources:** `Owned`, `ConsignedVendor`, `ConsignedIndividual` with
  linked Consignor. The agreed **commission % is captured** on the Consignor at
  onboarding (reference data); commission **payout calculation/settlement is OUT
  OF SCOPE** (offline).
- **Multi-hub (yards):** a single dealer instance runs one or more hubs (yards).
  Every car is assigned to a hub (`cars.hub_id`); each **Consignor is scoped to
  exactly one hub**, and a consigned car MUST share its consignor's hub.
- **Hub-scoped ownership:** the hub that holds a car (or is assigned a Sell/PDI
  request) owns all downstream activity (leads, test drives, reservations,
  inspection). Its `hub_employee` staff manage it; `hub_admin` administers it;
  `super_admin` spans all hubs.
- **Sell/PDI routing:** user-initiated Sell/PDI requests are routed to the
  customer's **nearest active hub within 40 km** (GPS, fallback pincode geocode);
  `super_admin` may reassign; if no hub is in range the request awaits manual
  assignment.
- **Buyer hub visibility:** buyers MAY see hub name/address/city and distance on
  listings and detail. (Hub *scoping* still restricts which staff act on a hub.)
- **Reservation:** a **Hub Admin** (super_admin superset) reserves a car after an
  offline token payment; **users cannot self-reserve** (no reserve action in User
  App/Website). Reserved cars are **fully locked** (no interest/test-drive/second
  reservation). Configurable hold, **default 15 days**, then auto-release.
- **Notifications:** Push, Email, SMS, and **WhatsApp** are in-scope channels.
- **Doorstep test drive:** offered from a hub within a **40 km** service radius.
- **Phase scope:** MVP-a (Get Online) → MVP-b (Capture Demand) → Phase 2
  (Engage & Grow). Financial module is future scope only.
- **Flagship feature:** Concurrent-slot test-drive booking engine with
  admin-configurable capacity per hub/car.
- **NFR targets (SMB single-server):** search p95 < 500 ms; detail p95 < 300 ms;
  booking/reservation p95 < 800 ms; WCAG 2.1 AA on web; structured logs +
  Sentry.

### Explicitly Out of Scope (Current)

- Online payments, deposits, financing, refunds
- Commission **payout calculation & settlement** (the agreed rate is recorded on
  the Consignor for reference only)
- Multi-tenant SaaS shared data plane
- C2C private listings / auctions
- Rebuilding the Inspection Mobile App

## Development Workflow & Quality Gates

### Spec Kit Workflow

Features follow: **constitution → specify → clarify → plan → tasks →
implement**. Each feature lives under `specs/[###-feature-name]/` with `spec.md`,
`plan.md`, and `tasks.md`.

### Branching

Feature branches MUST follow speckit-git-feature naming conventions. Constitution
compliance MUST be verified at plan time (Constitution Check gate) and re-checked
after design.

### Testing Discipline

| Level | Focus | Mandatory |
|-------|-------|-----------|
| Unit | State machines, capacity math, scoring | For domain logic |
| Integration | API + DB + Redis concurrency races | **YES** for inventory/slots |
| Contract | OpenAPI between clients and WebAPI | **YES** per client surface |
| E2E | search → interest → test-drive → reserve | Critical journeys |
| Install/Upgrade | Fresh Compose + migration on seeded data | Self-host correctness |

Critical-path tests (concurrency, auth client matrix, state machines) MUST be
written and MUST fail before implementation. Broader TDD is encouraged but not
mandatory for all code paths.

### Reference Documents

- Architecture: `Docs/Solution-Design-Document.md`
- API contracts: `Docs/API-Documentation.md`
- Database baseline: `database/migrations/001_initial_schema.sql`
- UX reference: `prototype/`
- Inspection integration: `Vehicle-Inspection-Kotlin-Product/README.md`

## Governance

This constitution supersedes ad-hoc engineering practices for AssureCars. All
feature specs, implementation plans, tasks, and pull requests MUST verify
compliance with the principles above.

**Amendment procedure:**

1. Propose change with rationale and version bump type (MAJOR/MINOR/PATCH).
2. Update `.specify/memory/constitution.md` with a Sync Impact Report comment.
3. Propagate changes to dependent templates (`plan-template.md`,
   `spec-template.md`, `tasks-template.md`) and runtime docs as needed.
4. Record `LAST_AMENDED_DATE` and increment `CONSTITUTION_VERSION`.

**Versioning policy:** MAJOR for principle removals or incompatible redefinitions;
MINOR for new principles or materially expanded guidance; PATCH for clarifications
and non-semantic wording.

**Compliance review:** Plan Constitution Check gates MUST be evaluated before
Phase 0 research and again after Phase 1 design. Complexity beyond the lean
self-host stack MUST be documented in plan Complexity Tracking with rejected
simpler alternatives.

**Runtime guidance:** `README.md` and `Docs/Solution-Design-Document.md` are
living references; where they conflict with this constitution, the constitution
prevails until docs are amended.

**Version**: 3.0.0 | **Ratified**: 2026-07-12 | **Last Amended**: 2026-07-18
