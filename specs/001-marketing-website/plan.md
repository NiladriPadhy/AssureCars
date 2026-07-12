# Implementation Plan: Product Marketing Website

**Branch**: `001-marketing-website` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-marketing-website/spec.md`

## Summary

Build a single-page Angular marketing website in `MarketingWebsite/` that showcases all five AssureCars client modules with prototype-derived screenshots. The site uses the navy/teal AssureCars design system from `prototype/styles.css`, Tailwind CSS for layout utilities, and SCSS for design tokens. A Puppeteer script captures screenshots from the interactive HTML prototype; Inspection App screens use a themed HTML mock.

## Technical Context

**Language/Version**: Angular 19 / TypeScript 5.7

**Primary Dependencies**: `@angular/core`, `@angular/common`, Tailwind CSS 3.x, Puppeteer (dev, screenshot script)

**Storage**: Static JSON/TS content files only (no database)

**Testing**: Angular build verification; Lighthouse accessibility check (manual)

**Target Platform**: Static web (Netlify / any static host); modern browsers (Chrome, Safari, Firefox, Edge)

**Project Type**: Standalone Angular SPA — `MarketingWebsite/`

**Performance Goals**: First Contentful Paint < 1.5s on broadband; lazy-loaded screenshots

**Constraints**: No backend; no API; showcase-only content; WCAG 2.1 AA; prototype design token parity

**Scale/Scope**: 1 page, 5 module sections, ~15–20 screenshots total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **API-First**: N/A — static marketing site, no business logic
- [x] **Single-Tenant**: N/A — no data plane
- [x] **Non-Financial**: No payments or financial content
- [x] **Concurrency**: N/A
- [x] **Inspection Integration**: Inspection App shown as external module only; not rebuilt
- [x] **Multi-Stack**: References correct stacks per constitution (Flutter, Angular, Kotlin)
- [x] **Auth**: No authentication required
- [x] **Self-Host**: Static build, deployable anywhere

## Project Structure

### Documentation (this feature)

```text
specs/001-marketing-website/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
MarketingWebsite/
├── prompt/                          # Speckit workflow prompts
├── scripts/
│   ├── capture-screenshots.mjs      # Puppeteer prototype capture
│   └── inspection-mock.html         # Themed Inspection App mock for capture
├── public/
│   └── assets/screenshots/          # Generated PNG screenshots
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── components/
│   │   │   ├── hero/
│   │   │   ├── navbar/
│   │   │   ├── module-overview/
│   │   │   ├── module-showcase/
│   │   │   ├── screenshot-gallery/
│   │   │   └── footer/
│   │   ├── pages/
│   │   │   └── home/
│   │   └── data/
│   │       └── modules.data.ts
│   ├── styles/
│   │   ├── _tokens.scss
│   │   └── styles.scss
│   ├── index.html
│   └── main.ts
├── angular.json
├── package.json
├── tailwind.config.js
└── tsconfig.json

prototype/                           # Screenshot source (existing)
```

**Structure Decision**: Single Angular project under `MarketingWebsite/` separate from future `apps/website` and `apps/admin` production apps. This keeps the marketing showcase isolated and deployable independently.

## Complexity Tracking

> No constitution violations. Table not required.
