---
agent: speckit.constitution
---

Create the AssureCars project constitution (version 1.0.0) from the prepared design artifacts.

## Project

**Name:** AssureCars
**Description:** Self-hosted, single-tenant premium certified used-car reseller platform for SMB dealers. Not a marketplace — one isolated instance per dealer (own DB, storage, domain, branding).
**Ratification date:** 2026-07-12
**License:** Proprietary — internal project

## Authoritative Source Documents (read before drafting)

1. `README.md` — product overview, surfaces, roadmap, prototype
2. `Docs/Solution-Design-Document.md` (v1.7) — HLD/LLD, architecture, NFRs, security, ADRs
3. `Docs/API-Documentation.md` (v1) — REST API v1, auth model, contracts
4. `database/migrations/001_initial_schema.sql` — PostgreSQL baseline schema
5. `Vehicle-Inspection-Kotlin-Product/README.md` — external inspection app (integrate, do not rebuild)
6. `prototype/` — interactive UI prototype and design language (teal/navy tokens)

## Technology Stack (multi dev-stack monorepo)

| Layer | Stack | Notes |
|-------|-------|-------|
| User Mobile App | **Flutter** (Android + iOS) | Buyer/seller; User Login (OTP) |
| Employee Mobile App | **Flutter** (Android + iOS) | Sales, drivers, hub managers; Employee/Admin Login |
| Inspection Mobile App | **Kotlin** (Android, existing) | External system of record; integrate via webhook; Employee/Admin tokens only |
| Customer Website | **Angular** (TypeScript, SSR/SSG for SEO) | Dealer storefront; User Login for authenticated flows |
| Admin Panel | **Angular** (TypeScript SPA) | RBAC, catalog, hubs, slot config; Admin Login (password + MFA) |
| Web API | **ASP.NET Core (.NET)** modular monolith | Single source of truth; OpenAPI/Swagger; JWT scoped by accountType + allowedClients |
| Database | PostgreSQL 15+ | FTS for search in MVP; row_version optimistic concurrency |
| Cache/Locks | Redis | Slot capacity counters, sessions, rate limits |
| Object Storage | MinIO / local (S3-compatible) | Car media + inspection PDFs |
| Packaging | Docker Compose | One-command self-host per dealer instance |
| CI/CD | GitHub Actions | Build, test, scan, publish versioned images |

## Core Principles (7 — derive from design docs)

Encode as declarative, testable MUST/SHOULD rules:

1. **API-First, Single Source of Truth** — All business logic in WebAPI; clients are thin; versioned REST `/v1`; OpenAPI contract is canonical; typed SDKs generated from OpenAPI.
2. **Self-Hosted Single-Tenant Isolation** — One dealer = one instance; no shared data plane; config-not-fork; feature flags for phased rollout; Docker Compose MVP footprint.
3. **Non-Financial MVP Boundary** — MVP through Phase 2 is non-financial (no payments, deposits, financing, refunds, commission settlement). Reservations are optimistic holds with TTL; deals close offline.
4. **Unique VIN Inventory & Concurrency Safety (NON-NEGOTIABLE)** — One VIN = one sellable unit; reservation = single winner (optimistic lock); test-drive slots = capacity-based concurrency (Redis + DB); idempotency keys on state-changing POSTs; mandatory concurrency integration tests.
5. **Integrate, Don't Rebuild** — Inspection App is external; AssureCars ingests JSON + PDF via webhook; mandatory inspection PDF before any car goes Live (all listing sources); User Login tokens never accepted by Inspection App.
6. **Contract-Driven Multi-Stack Development** — Flutter, Kotlin, Angular, .NET stacks share OpenAPI contracts; contract tests between clients and API; RFC 7807 errors; ETag/If-Match for optimistic concurrency.
7. **Security & Client-Scoped Auth** — Three login types (User OTP, Employee password, Admin password+MFA); JWT claims: accountType + allowedClients; X-Client-Id enforcement; RBAC for staff; OWASP ASVS; audit log for admin/inventory actions.

## Additional Constraints Section

- **Listing sources:** Owned, ConsignedVendor, ConsignedIndividual — consignor recorded, commission tracking OUT OF SCOPE
- **Flagship capability:** Concurrent-slot test-drive booking engine
- **Phase scope:** MVP-a (Get Online) → MVP-b (Capture Demand) → Phase 2 (Engage & Grow); financial workflows explicitly future/out-of-scope
- **NFR targets:** SMB single-server; search p95 < 500ms; booking p95 < 800ms; WCAG 2.1 AA on web; structured logs + Sentry
- **Repository layout:** `apps/user-app/` (Flutter), `apps/employee-app/` (Flutter), `apps/website/` (Angular), `apps/admin/` (Angular), `src/WebApi/` (.NET), `Vehicle-Inspection-Kotlin-Product/` (existing Kotlin)

## Development Workflow Section

- Spec Kit workflow: constitution → specify → clarify → plan → tasks → implement
- Feature branches per speckit-git-feature conventions
- Testing gates: unit (domain/state machines), integration (API+DB+Redis races), contract (OpenAPI), E2E (search→interest→test-drive→reserve), install/upgrade (Compose)
- Critical-path tests (concurrency, auth, state machines) MUST be written before implementation; broader TDD is encouraged but not mandatory for all code
- Constitution Check gate in every implementation plan
- Reference `Docs/Solution-Design-Document.md` and `Docs/API-Documentation.md` as living architecture docs; prototype as UX reference

## Governance

- Constitution supersedes ad-hoc practices; amendments require version bump (semver) and sync impact report
- All PRs/reviews verify constitution compliance
- Complexity (Elasticsearch, K8s, microservices) must be justified against self-host SMB footprint
- Guidance files: `README.md` + `Docs/Solution-Design-Document.md`

## Template Sync

After filling constitution, update aligned sections in:
- `.specify/templates/plan-template.md` (Constitution Check gates, Technical Context defaults)
- `.specify/templates/spec-template.md` (if mandatory sections change)
- `.specify/templates/tasks-template.md` (multi-stack path conventions, mandatory test categories)

Prepend Sync Impact Report as HTML comment at top of constitution.md.
Version: 1.0.0 | Ratified: 2026-07-12 | Last Amended: 2026-07-12
