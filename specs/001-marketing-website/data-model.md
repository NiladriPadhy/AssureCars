# Data Model: Product Marketing Website

**Feature**: `specs/001-marketing-website` | **Date**: 2026-07-12

## Entities

### Module

Represents one AssureCars client surface showcased on the marketing site.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | URL-safe anchor slug (e.g., `user-app`) |
| name | string | yes | Display name (e.g., "User App") |
| tagline | string | yes | One-line module description |
| stack | string | yes | Technology label (e.g., "Flutter · Android / iOS") |
| icon | string | yes | Emoji or icon identifier |
| deviceType | `'mobile' \| 'desktop'` | yes | Frame style for screenshots |
| order | number | yes | Display order on page (1–5) |
| screenshots | Screenshot[] | yes | Gallery images (min 2) |

**Validation rules**:
- Exactly 5 modules MUST exist
- `id` values MUST be unique
- `order` MUST be 1–5 without gaps
- `screenshots` MUST have length ≥ 2 per module

### Screenshot

A captured or mocked product UI image.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| src | string | yes | Path relative to public assets (e.g., `/assets/screenshots/user-app-home.png`) |
| alt | string | yes | Accessibility description |
| caption | string | yes | Short label shown below image |
| order | number | yes | Sort order within module gallery |

**Validation rules**:
- `alt` MUST be non-empty
- `src` MUST resolve to an existing file after capture script runs

### SiteConfig

Global site metadata (singleton).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandName | string | yes | "AssureCars" |
| tagline | string | yes | Platform hero tagline |
| subtitle | string | yes | Secondary hero text |
| year | number | yes | Footer copyright year |

## Relationships

```text
SiteConfig (1) ── presents ──> Module (5)
Module (1) ── contains ──> Screenshot (2..n)
```

## Content Seed Data

| order | id | name | stack | deviceType |
|-------|-----|------|-------|------------|
| 1 | user-app | User App | Flutter · Android / iOS | mobile |
| 2 | website | Website | Angular · SSR / SEO | desktop |
| 3 | admin-panel | Admin Panel | Angular · Dealer SPA | desktop |
| 4 | employee-app | Employee App | Flutter · Field Ops | mobile |
| 5 | inspection-app | Inspection App | Kotlin · Android | mobile |

## State Transitions

N/A — static content, no runtime state mutations. Screenshot files are generated offline by build script.
