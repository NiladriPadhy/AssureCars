# Speckit Implement Prompt — Product Marketing Website

## Command
`/speckit-implement`

## Feature Directory
`specs/001-marketing-website`

## Implementation Instructions

Execute all tasks in `specs/001-marketing-website/tasks.md` sequentially. Mark each task `[X]` when complete.

### Critical Implementation Details

1. **Initialize Angular** in `MarketingWebsite/` with routing (single home page + anchor nav)
2. **Design tokens** — copy CSS variables from `prototype/styles.css` into `src/styles/_tokens.scss`
3. **Screenshot capture** — create `MarketingWebsite/scripts/capture-screenshots.mjs` using Puppeteer:
   - Serve `prototype/` locally
   - Switch surface tabs (app, web, admin, emp)
   - Capture key screens per module
   - For Inspection App: render a themed HTML mock page matching prototype style (checklist + report screens)
   - Save to `MarketingWebsite/public/assets/screenshots/`
4. **Module content** — `src/app/data/modules.data.ts` with 5 modules, each having 2–4 screenshots
5. **Components**:
   - `HeroComponent` — AssureCars logo, tagline "The Complete Pre-Owned Car Platform", subtle gradient background matching prototype canvas
   - `ModuleShowcaseComponent` — alternating left/right layout per module
   - `ScreenshotGalleryComponent` — responsive image grid with lightbox or carousel
   - `NavbarComponent` — sticky nav with anchor links to each module
   - `FooterComponent` — minimal "AssureCars Platform Showcase"
6. **No extra pages** — single scrolling landing page only
7. **Verify build**: `cd MarketingWebsite && npm install && npm run build`

### Quality Bar
- Pixel-faithful color palette to prototype
- Smooth scroll navigation between module sections
- Mobile-responsive layout
- Images have alt text per module/screen name
