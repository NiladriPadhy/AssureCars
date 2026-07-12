# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [Flutter/Dart | Kotlin | Angular/TypeScript | C#/.NET — per affected surface; see `.specify/memory/constitution.md`]

**Primary Dependencies**: [e.g., ASP.NET Core, Flutter SDK, Angular CLI — per affected surface]

**Storage**: PostgreSQL 15+ (primary), Redis (cache/locks), MinIO/local S3-compatible (media + PDFs)

**Testing**: xUnit/NUnit (.NET), Flutter test, Angular/Jest/Karma, contract tests from OpenAPI — mandatory integration tests for concurrency/auth paths

**Target Platform**: Self-hosted Docker Compose (Linux); Flutter Android+iOS; Angular web (SSR/SSG website + SPA admin); Kotlin Inspection App (external)

**Project Type**: Multi-stack monorepo — `apps/user-app`, `apps/employee-app`, `apps/website`, `apps/admin`, `src/WebApi`

**Performance Goals**: Search p95 < 500 ms; detail p95 < 300 ms; booking/reservation p95 < 800 ms (SMB single-server)

**Constraints**: Non-financial MVP through Phase 2; single-tenant per dealer; API-first; OpenAPI contract required; WCAG 2.1 AA on web

**Scale/Scope**: SMB dealer catalog; concurrent-slot test-drive engine; five client surfaces + external Inspection App integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify against `.specify/memory/constitution.md` before proceeding. All gates MUST pass; document any violation in Complexity Tracking below.

- [ ] **API-First**: No business logic in client-only code; changes align with OpenAPI `/v1` contract
- [ ] **Single-Tenant**: No shared multi-tenant data assumptions; config-not-fork for dealer differences
- [ ] **Non-Financial**: Feature excludes payments, deposits, financing, refunds, commission settlement
- [ ] **Concurrency**: Inventory/slot changes include idempotency + optimistic locking + integration test plan
- [ ] **Inspection Integration**: No in-app inspection capture; PDF ingestion / webhook only if touching inspections
- [ ] **Multi-Stack**: Affected surfaces identified (`apps/*`, `src/WebApi/`); contract tests planned per client
- [ ] **Auth**: Three login types respected; `accountType` + `allowedClients` + `X-Client-Id` enforced
- [ ] **Self-Host**: Docker Compose deployable; no mandatory cloud-only dependencies for MVP

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/
├── user-app/              # Flutter — buyer/seller mobile
├── employee-app/          # Flutter — dealer staff mobile
├── website/               # Angular — customer storefront (SSR/SSG)
└── admin/                 # Angular — admin panel SPA

src/
└── WebApi/                # ASP.NET Core modular monolith

Vehicle-Inspection-Kotlin-Product/   # External Kotlin inspection app (integrate only)

database/migrations/       # PostgreSQL DDL

tests/                     # Cross-cutting or WebAPI-focused
├── contract/              # OpenAPI contract tests (mandatory per client)
├── integration/           # API + DB + Redis (mandatory for concurrency)
└── unit/

specs/[###-feature]/       # Per-feature design artifacts
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
