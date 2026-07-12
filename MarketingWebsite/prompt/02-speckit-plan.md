# Speckit Plan Prompt — Product Marketing Website

## Command
`/speckit-plan`

## Feature Directory
`specs/001-marketing-website`

## Planning Context

Create an implementation plan for the AssureCars Product Marketing Website based on `specs/001-marketing-website/spec.md`.

### Technical Decisions (pre-resolved)
- **Stack**: Angular 19+ standalone components, TypeScript, SCSS with CSS custom properties mirroring `prototype/styles.css` tokens
- **UI Framework**: Tailwind CSS v4 (or v3) for layout/utilities + custom SCSS design tokens (navy/teal AssureCars theme)
- **Location**: `MarketingWebsite/` at repository root
- **Build**: Angular CLI (`ng build`) producing static output in `MarketingWebsite/dist/`
- **Screenshots**: Capture from `prototype/index.html` using headless browser script; Inspection App screens styled to match prototype theme (no separate HTML prototype exists)
- **Deployment**: Static site (Netlify-compatible); no backend

### Constitution Check Notes
- Marketing site is presentation-only — no API-first violations
- No financial features
- No multi-tenant concerns
- Inspection App shown as external integrated module (not rebuilt)

### Expected Artifacts
- `plan.md` — architecture, structure, tech stack
- `research.md` — UI framework choice, screenshot capture approach
- `data-model.md` — module showcase content model (sections, screenshots metadata)
- `quickstart.md` — dev server, build, screenshot regeneration
- `contracts/` — skip or minimal (static content JSON schema if needed)

### Project Structure Target

```text
MarketingWebsite/
├── prompt/                    # Speckit prompts (this folder)
├── scripts/
│   └── capture-screenshots.mjs
├── public/
│   └── assets/screenshots/    # Captured prototype images
├── src/
│   ├── app/
│   │   ├── components/        # hero, module-card, screenshot-gallery, navbar, footer
│   │   ├── pages/             # home (single-page showcase)
│   │   ├── models/            # module metadata types
│   │   └── data/              # modules.json content
│   └── styles/                # tokens.scss, global styles
├── angular.json
├── package.json
└── tailwind.config.js
```
