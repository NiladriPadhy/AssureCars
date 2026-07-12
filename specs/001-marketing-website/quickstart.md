# Quickstart: Product Marketing Website

**Feature**: `specs/001-marketing-website`

## Prerequisites

- Node.js 20+ and npm
- Angular CLI (`npm install -g @angular/cli`) or use `npx ng`

## Setup

```bash
cd MarketingWebsite
npm install
```

## Capture Screenshots (first time / after prototype changes)

```bash
cd MarketingWebsite
npm run capture-screenshots
```

This generates PNG files in `public/assets/screenshots/` from `../prototype/`.

## Development Server

```bash
cd MarketingWebsite
npm start
```

Open http://localhost:4200

## Production Build

```bash
cd MarketingWebsite
npm run build
```

Output: `MarketingWebsite/dist/marketing-website/browser/`

## Serve Built Output Locally

```bash
npx serve dist/marketing-website/browser
```

## Verify Checklist

- [ ] Hero shows AssureCars brand and all 5 module names
- [ ] Each module section has screenshots loading correctly
- [ ] Anchor nav links scroll to correct sections
- [ ] Page is responsive at 375px and 1440px widths
- [ ] `npm run build` completes without errors

## Regenerate Inspection App Mock Screenshots

Edit `MarketingWebsite/scripts/inspection-mock.html` then re-run `npm run capture-screenshots`.
