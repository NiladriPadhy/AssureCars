# Speckit Tasks Prompt — Product Marketing Website

## Command
`/speckit-tasks`

## Feature Directory
`specs/001-marketing-website`

## Task Generation Context

Generate `tasks.md` from:
- `specs/001-marketing-website/spec.md`
- `specs/001-marketing-website/plan.md`
- `specs/001-marketing-website/research.md`
- `specs/001-marketing-website/data-model.md`

### User Stories (from spec priorities)
- **US1 (P1)**: Visitor sees hero + platform overview with all 5 modules listed
- **US2 (P1)**: Visitor browses each module section with title, short description, tech badge, and screenshot gallery
- **US3 (P2)**: Visitor experiences consistent AssureCars branding (prototype tokens) across all sections
- **US4 (P2)**: Screenshots are captured from prototype and displayed responsively
- **US5 (P3)**: Site builds as static Angular app and passes basic accessibility checks

### Task Organization Requirements
- Phase 1: Angular project setup in `MarketingWebsite/`
- Phase 2: Design tokens, global styles, screenshot capture script
- Phase 3: US1 — Hero + navigation + module overview grid
- Phase 4: US2 — Per-module showcase sections with screenshot carousels
- Phase 5: US3/US4 — Polish, responsive layout, lazy-loaded images
- Phase 6: Build verification + quickstart validation

### No Tests Required
User did not request TDD. Skip test tasks unless build/lint verification.
