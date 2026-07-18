# Research: Product Marketing Website

**Feature**: `specs/001-marketing-website` | **Date**: 2026-07-12

## R1: UI Framework Selection

**Decision**: Angular 22 standalone components + Tailwind CSS 3 + SCSS design tokens

**Rationale**:
- User mandated Angular
- Tailwind provides rapid responsive layout without fighting Angular's component encapsulation (use global styles + `@apply` sparingly)
- SCSS `_tokens.scss` mirrors `prototype/styles.css` CSS variables exactly for brand fidelity
- Avoids Angular Material's Material Design look which conflicts with custom AssureCars branding

**Alternatives considered**:
- Angular Material + custom theme — rejected: heavy bundle, Material look hard to override to prototype fidelity
- PrimeNG — rejected: enterprise widget focus unnecessary for static showcase
- Pure SCSS (no Tailwind) — rejected: slower responsive layout iteration

## R2: Screenshot Capture Strategy

**Decision**: Puppeteer script serving `prototype/` via `npx serve` or inline `file://` with local HTTP server

**Rationale**:
- Prototype is self-contained HTML/CSS/JS with surface tabs and in-frame navigation
- Puppeteer can click `#surfaceTabs` buttons and `[data-go]` targets to reach specific screens
- Captures at device-appropriate dimensions: 390×800 (phone), 1180×800 (desktop)

**Capture targets**:

| Module | Surface | Screens to capture |
|--------|---------|-------------------|
| User App | `app` | Home (`#app-home`), Search, Car Detail, Test-Drive Booking |
| Website | `web` | Home (`#web-home`), Listing, Car Detail |
| Admin Panel | `admin` | Dashboard (`#admin-dash`), Inventory, Test-Drive Config, Reserved Vehicles, Reserve Form |
| Employee App | `emp` | Schedule (`#emp-sched`), Conduct Drive, Leads, Reservation Follow-Up |
| Inspection App | `insp` | Checklist Hub, Section Capture, Report Summary |

**Alternatives considered**:
- Manual screenshots — rejected: not reproducible in CI
- html2canvas in-browser — rejected: lower quality, complex for multi-screen navigation

## R3: Inspection App Visual Representation

**Decision**: Add an `Inspection App` surface to `prototype/`, modeled from the existing Kotlin app's checklist-first inspection flow

**Rationale**:
- Marketing and live prototype should show the same five client surfaces
- Kotlin app source already defines the real flow: dashboard, vehicle identify, checklist hub/sections, capture, review, final verification, report export
- Puppeteer can capture Inspection App screenshots from the same live prototype workflow as every other module

**Alternatives considered**:
- Android emulator screenshots — rejected: requires Android SDK, heavy setup
- Separate HTML mock — rejected: drifted from the live prototype and hid the Inspection App from the prototype tabs
- Skip Inspection App — rejected: user explicitly requires all five modules

## R4: Page Architecture

**Decision**: Single-page application with anchor scroll navigation

**Rationale**:
- User requested "no extra information" — one scrolling showcase is simplest
- Anchor links (`#user-app`, `#website`, etc.) provide quick module access
- No Angular Router routes needed beyond default `''` → HomePage

**Alternatives considered**:
- Multi-route (one page per module) — rejected: adds navigation complexity beyond scope

## R5: Image Optimization

**Decision**: PNG screenshots at 2x resolution, displayed with `loading="lazy"` and `width`/`height` attributes

**Rationale**:
- PNG preserves UI text sharpness in screenshots
- Lazy loading keeps initial page weight low with ~15 images
- Responsive `max-width: 100%` in gallery component

**Alternatives considered**:
- WebP conversion — optional future optimization; PNG sufficient for MVP
