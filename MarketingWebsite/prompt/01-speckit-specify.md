# Speckit Specify Prompt — Product Marketing Website

## Command
`/speckit-specify`

## Feature Directory
`specs/001-marketing-website`

## Feature Description

Design and specify a **Product Marketing Website** for AssureCars that showcases the whole product platform. The site is a static marketing showcase only — no extra product information, pricing, signup flows, or dealer onboarding. Its sole purpose is to visually present the five client modules of the AssureCars ecosystem.

### Modules to Showcase
1. **User App** — Flutter mobile app for buyers/sellers (end users)
2. **Website** — Angular customer storefront (SSR/SEO)
3. **Admin Panel** — Angular SPA for dealer self-service
4. **Employee App** — Flutter mobile app for dealership field staff
5. **Inspection App** — Kotlin mobile app for certified vehicle inspections (external system)

### Design Requirements
- Use the **same design theme** as the interactive prototype in `prototype/` (navy/teal palette, Inter font, design tokens from `prototype/styles.css`)
- Include **screenshots captured from prototypes** for each module
- Reference prototype screens: User App home, Website home, Admin dashboard, Employee schedule, Inspection checklist/report
- Modern, premium, polished marketing presentation
- WCAG 2.1 AA accessibility on web surfaces

### Technical Constraint (for planning phase)
- Built with **Angular** (TypeScript) in `MarketingWebsite/` folder
- Use a best-in-class UI approach (Tailwind CSS + Angular standalone components recommended for token parity with prototype)

### Out of Scope
- Live API integration, authentication, dealer signup, payments
- Product documentation, API docs, pricing pages
- Any content beyond module showcase (hero, module sections, screenshots, minimal footer)

### Reference Assets
- Interactive prototype: `prototype/index.html`, `prototype/styles.css`, `prototype/app.js`
- Inspection App theme reference: `Vehicle-Inspection-Kotlin-Product/core/ui/src/main/kotlin/com/vsp/core/ui/theme/Color.kt`
- Constitution: `.specify/memory/constitution.md`
