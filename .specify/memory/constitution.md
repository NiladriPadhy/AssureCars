<!--
Sync Impact Report
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
  refunds, invoicing, or commission settlement.
- Reservations are optimistic, non-financial holds with TTL — not purchases.
- Financial workflows MAY be designed for future extensibility but MUST NOT
  appear in current scope specs, tasks, or migrations without a constitution
  amendment.

*Rationale:* Fastest path to dealer value; defers money-movement complexity
until the core demand-capture engine is proven.

### IV. Unique VIN Inventory & Concurrency Safety (NON-NEGOTIABLE)

Every vehicle is a unique sellable unit (one VIN = quantity 1). Concurrency
rules differ by operation type and MUST be enforced in domain logic and tests.

- **Reserve / mark sold:** exactly one winner per car via optimistic lock on
  `row_version` + state machine (`Draft → … → Reserved → Sold`).
- **Test drive booking:** many bookings allowed, capped by slot capacity via
  Redis counter + DB conditional update.
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
- Inspection App auth MUST accept Employee or Admin Login tokens only; User Login
  tokens MUST be rejected.
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

### VII. Security & Client-Scoped Auth

Three login types issue JWTs scoped by `accountType` and `allowedClients`. The
gateway MUST reject tokens presented to unauthorized clients.

| Login Type | Auth | Clients Granted |
|------------|------|-----------------|
| User Login | OTP (phone/email) | User App, Website |
| Employee Login | Password (+ optional MFA) | Employee App, Inspection App |
| Admin Login | Password + MFA (required) | Admin Portal, Employee App, Inspection App |

- Every request MUST include `Authorization: Bearer <JWT>` and
  `X-Client-Id: UserApp|Website|EmployeeApp|AdminPortal|InspectionApp`.
- RBAC permissions MUST enforce staff authorization beyond client scoping.
- Admin actions, inventory-state changes, capacity changes, and reservations
  MUST be audit-logged.
- Security MUST align with OWASP ASVS; PII MUST be protected; media and
  inspection PDFs MUST be served via short-lived pre-signed URLs.

*Rationale:* Multiple personas across five clients share one API; client-scoped
tokens prevent lateral access (e.g., user tokens in admin or inspection flows).

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
  linked Consignor — commission tracking is OUT OF SCOPE.
- **Phase scope:** MVP-a (Get Online) → MVP-b (Capture Demand) → Phase 2
  (Engage & Grow). Financial module is future scope only.
- **Flagship feature:** Concurrent-slot test-drive booking engine with
  admin-configurable capacity per hub/car.
- **NFR targets (SMB single-server):** search p95 < 500 ms; detail p95 < 300 ms;
  booking/reservation p95 < 800 ms; WCAG 2.1 AA on web; structured logs +
  Sentry.

### Explicitly Out of Scope (Current)

- Online payments, deposits, financing, refunds
- Commission tracking and settlement
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

**Version**: 1.0.0 | **Ratified**: 2026-07-12 | **Last Amended**: 2026-07-12
