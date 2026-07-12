# Tasks: Product Marketing Website

**Input**: Design documents from `/specs/001-marketing-website/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Not requested — build verification only.

**Organization**: Tasks grouped by user story for independent delivery.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Angular project and tooling in `MarketingWebsite/`

- [X] T001 Create Angular 19 project in `MarketingWebsite/` with standalone components and SCSS
- [X] T002 Add Tailwind CSS 3 configuration in `MarketingWebsite/tailwind.config.js` and `MarketingWebsite/src/styles.scss`
- [X] T003 [P] Add Puppeteer dev dependency and `capture-screenshots` npm script in `MarketingWebsite/package.json`
- [X] T004 [P] Create design tokens file `MarketingWebsite/src/styles/_tokens.scss` from `prototype/styles.css` variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Screenshot assets and content data required before UI components

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create screenshot capture script `MarketingWebsite/scripts/capture-screenshots.mjs` for prototype surfaces
- [X] T006 [P] Create Inspection App mock HTML `MarketingWebsite/scripts/inspection-mock.html` with prototype theme
- [X] T007 Run screenshot capture and populate `MarketingWebsite/public/assets/screenshots/`
- [X] T008 Create module content data `MarketingWebsite/src/app/data/modules.data.ts` with all 5 modules and screenshot metadata

**Checkpoint**: Screenshots and content data ready

---

## Phase 3: User Story 1 — Platform Overview (Priority: P1)

**Goal**: Visitor sees hero + all five modules at a glance

**Independent Test**: Load homepage; verify hero and module overview grid lists all 5 modules

- [X] T009 [US1] Create `MarketingWebsite/src/app/components/navbar/navbar.component.ts` with anchor links to all modules
- [X] T010 [US1] Create `MarketingWebsite/src/app/components/hero/hero.component.ts` with brand, tagline, and platform subtitle
- [X] T011 [US1] Create `MarketingWebsite/src/app/components/module-overview/module-overview.component.ts` showing 5-module grid with icons and stack labels
- [X] T012 [US1] Create `MarketingWebsite/src/app/pages/home/home.component.ts` assembling hero + overview sections

**Checkpoint**: US1 independently testable

---

## Phase 4: User Story 2 — Module Showcase with Screenshots (Priority: P1)

**Goal**: Each module has a dedicated section with screenshot gallery

**Independent Test**: Scroll to each module; verify title, description, and ≥2 screenshots

- [X] T013 [P] [US2] Create `MarketingWebsite/src/app/components/screenshot-gallery/screenshot-gallery.component.ts` with responsive image grid
- [X] T014 [US2] Create `MarketingWebsite/src/app/components/module-showcase/module-showcase.component.ts` with alternating layout per module
- [X] T015 [US2] Wire all 5 module showcase sections into `MarketingWebsite/src/app/pages/home/home.component.ts`

**Checkpoint**: US2 independently testable

---

## Phase 5: User Story 3 & 4 — Brand Consistency & Responsive Layout (Priority: P2)

**Goal**: Prototype theme parity and responsive screenshot presentation

**Independent Test**: Compare colors/fonts to prototype; resize viewport 320px–1920px

- [X] T016 [US3] Apply global styles and gradient background in `MarketingWebsite/src/styles/styles.scss` matching prototype canvas
- [X] T017 [P] [US3] Add focus-visible styles and skip-to-content link in `MarketingWebsite/src/index.html` and navbar
- [X] T018 [US4] Add responsive breakpoints and mobile stacking in `MarketingWebsite/src/app/components/module-showcase/module-showcase.component.ts` styles
- [X] T019 [US4] Add lazy loading and image error fallback in `MarketingWebsite/src/app/components/screenshot-gallery/screenshot-gallery.component.ts`

**Checkpoint**: US3 and US4 complete

---

## Phase 6: User Story 5 — Static Deployable Site (Priority: P3)

**Goal**: Production build succeeds and site is deployable

**Independent Test**: `npm run build` produces static output; all assets load

- [X] T020 [US5] Create `MarketingWebsite/src/app/components/footer/footer.component.ts` with minimal copyright footer
- [X] T021 [US5] Configure `MarketingWebsite/angular.json` output and asset paths for `public/assets/`
- [X] T022 [US5] Run `npm run build` and fix any build errors in `MarketingWebsite/`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T023 [P] Add smooth scroll behavior for anchor navigation in `MarketingWebsite/src/styles/styles.scss`
- [X] T024 [P] Update `MarketingWebsite/README.md` with quickstart instructions from `specs/001-marketing-website/quickstart.md`
- [X] T025 Mark all tasks complete and validate against spec acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2; can start after US1 components exist
- **US3/US4 (Phase 5)**: Depends on US1 + US2
- **US5 (Phase 6)**: Depends on all prior phases
- **Polish (Phase 7)**: Depends on US5

### User Story Dependencies

- **US1 (P1)**: After Foundational — no deps on other stories
- **US2 (P1)**: After Foundational — integrates into same home page as US1
- **US3 (P2)**: After US1 + US2
- **US4 (P2)**: After US1 + US2
- **US5 (P3)**: After all UI complete

### Parallel Opportunities

- T003, T004 can run in parallel (Phase 1)
- T005, T006 can run in parallel (Phase 2)
- T013 can run parallel to T014 prep (Phase 4)
- T017, T023, T024 can run in parallel (final polish)

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Screenshots + data (CRITICAL)
3. Complete Phase 3: Hero + overview (US1)
4. Complete Phase 4: Module showcases (US2)
5. **STOP and VALIDATE**: All 5 modules visible with screenshots

### Incremental Delivery

1. Setup + Foundational → assets ready
2. US1 → platform overview live
3. US2 → full screenshot showcase
4. US3/US4 → polish and responsive
5. US5 → production build

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Commit after each phase or at end per user preference
- Avoid modifying `prototype/` — read-only screenshot source
