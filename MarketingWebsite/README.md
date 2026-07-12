# AssureCars Product Marketing Website

Single-page Angular showcase of the complete AssureCars platform — five client modules with prototype screenshots.

## Modules Showcased

| Module | Stack | Screenshots |
|--------|-------|-------------|
| User App | Flutter · Android / iOS | Home, Search, Detail, Booking |
| Website | Angular · SSR / SEO | Home, Listing, Detail |
| Admin Panel | Angular · Dealer SPA | Dashboard, Inventory, Test-Drive Config |
| Employee App | Flutter · Field Ops | Schedule, Conduct Drive, Leads |
| Inspection App | Kotlin · Android | Checklist, Capture, Report |

## Quick Start

```bash
npm install
npm run capture-screenshots   # Regenerate screenshots from prototype/
npm start                     # http://localhost:4200
npm run build                 # Output: dist/MarketingWebsite/
```

## Design

Uses AssureCars design tokens from `../prototype/styles.css` (navy/teal palette, Inter font).

## Speckit Artifacts

Feature specification and tasks: `../specs/001-marketing-website/`

Prompts used to generate this project: `prompt/`
