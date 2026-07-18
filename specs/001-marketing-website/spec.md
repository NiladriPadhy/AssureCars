# Feature Specification: Product Marketing Website

**Feature Branch**: `001-marketing-website`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Design a Product Marketing Website to showcase the Whole Product. Showcase different modules (User App, Website, Admin Panel, Employee App, Inspection App) with screenshots from prototypes. Same design theme. Angular in MarketingWebsite/. No extra information."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Platform Overview (Priority: P1)

A visitor lands on the marketing website and immediately understands that AssureCars is a complete pre-owned car platform comprising five integrated client modules.

**Why this priority**: Without a clear overview, visitors cannot grasp the product scope — the primary goal of this site.

**Independent Test**: Open the homepage; verify hero section, platform tagline, and a visual grid or list naming all five modules (User App, Website, Admin Panel, Employee App, Inspection App).

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** they load the homepage, **Then** they see the AssureCars brand, a platform tagline, and all five module names within the first viewport scroll.
2. **Given** a visitor on desktop or mobile, **When** they view the overview section, **Then** all five modules are visible without horizontal clipping.

---

### User Story 2 - Module Showcase with Screenshots (Priority: P1)

A visitor scrolls through dedicated sections for each module and sees representative screenshots that illustrate real product screens.

**Why this priority**: Screenshots are the core deliverable — they prove the product exists and show each surface's purpose.

**Independent Test**: Navigate to each module section; confirm module title, one-line description, technology label, and at least two screenshots per module.

**Acceptance Scenarios**:

1. **Given** a visitor scrolling the page, **When** they reach the User App section, **Then** they see mobile screenshots (e.g., home, car detail, test-drive booking) sourced from the prototype.
2. **Given** a visitor scrolling the page, **When** they reach the Website section, **Then** they see desktop screenshots (e.g., homepage, listing, car detail) sourced from the prototype.
3. **Given** a visitor scrolling the page, **When** they reach the Admin Panel section, **Then** they see desktop screenshots (e.g., dashboard, inventory, test-drive config) sourced from the prototype.
4. **Given** a visitor scrolling the page, **When** they reach the Employee App section, **Then** they see mobile screenshots (e.g., schedule, conduct drive, leads) sourced from the prototype.
5. **Given** a visitor scrolling the page, **When** they reach the Inspection App section, **Then** they see mobile screenshots representing inspection checklist and report flows, styled consistently with the prototype theme.

---

### User Story 3 - Consistent Brand Experience (Priority: P2)

A visitor experiences a cohesive visual identity matching the AssureCars prototype design system across every section.

**Why this priority**: Brand consistency signals product maturity and ties the marketing site to the actual product UI.

**Independent Test**: Compare site colors, typography, and component styling against `prototype/styles.css` tokens; verify navy/teal palette and Inter font throughout.

**Acceptance Scenarios**:

1. **Given** any section of the marketing site, **When** compared to the prototype palette, **Then** primary colors (navy-900, teal-500) and neutral ink scale are used consistently.
2. **Given** a visitor using keyboard navigation, **When** they tab through navigation links, **Then** focus states are visible and module anchor links are reachable.

---

### User Story 4 - Responsive Screenshot Presentation (Priority: P2)

A visitor on any device size can view module screenshots without layout breakage or unreadable images.

**Why this priority**: Stakeholders review on phones, tablets, and projectors; screenshots must remain legible.

**Independent Test**: Resize viewport from 320px to 1920px; verify screenshot galleries reflow and remain viewable.

**Acceptance Scenarios**:

1. **Given** a mobile viewport (≤ 480px), **When** viewing a module section, **Then** screenshots stack vertically and scale to container width.
2. **Given** a desktop viewport (≥ 1024px), **When** viewing a module section, **Then** screenshots display in a multi-column gallery with adequate spacing.

---

### User Story 5 - Static Deployable Site (Priority: P3)

A team member can build and deploy the marketing site as static files without a backend.

**Why this priority**: Enables hosting on Netlify or similar for demos and investor presentations.

**Independent Test**: Run production build; verify static output contains all assets and loads correctly via a local static server.

**Acceptance Scenarios**:

1. **Given** the source repository, **When** a build command is executed, **Then** static HTML/CSS/JS and image assets are produced without errors.
2. **Given** the built output, **When** served statically, **Then** all screenshots load and anchor navigation works.

---

### Edge Cases

- What happens when a screenshot image fails to load? A placeholder with the screen name MUST display.
- How does the site handle very long module names on narrow screens? Text MUST wrap without overflow.
- What if a visitor has reduced motion preferences? Animations MUST be disabled or minimized.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Site MUST present exactly five module sections: User App, Website, Admin Panel, Employee App, Inspection App.
- **FR-002**: Each module section MUST include a title, one-line description, technology stack label, and screenshot gallery.
- **FR-003**: Screenshots for User App, Website, Admin Panel, Employee App, and Inspection App MUST be captured from `prototype/` interactive prototype screens.
- **FR-004**: Inspection App screenshots MUST visually match the existing Kotlin Inspection App workflow while using the shared prototype design theme (navy/teal, Inter font).
- **FR-005**: Site MUST use the AssureCars design tokens from `prototype/styles.css` (navy, teal, ink neutrals, Inter font).
- **FR-006**: Site MUST be a single-page scrolling experience with anchor navigation to each module section.
- **FR-007**: Site MUST NOT include pricing, signup, API documentation, or dealer onboarding content.
- **FR-008**: Site MUST be built with Angular in the `MarketingWebsite/` directory.
- **FR-009**: All screenshot images MUST have descriptive alt text.
- **FR-010**: Site MUST meet WCAG 2.1 AA for color contrast on text and interactive elements.

### Key Entities

- **Module**: One of five product surfaces; attributes: id, name, description, stack, icon, screenshots[], anchorId.
- **Screenshot**: A product UI capture; attributes: filename, alt, caption, sourceModule, displayOrder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can identify all five AssureCars modules within 10 seconds of landing.
- **SC-002**: Each module section displays at least 2 screenshots on desktop and mobile viewports.
- **SC-003**: Site achieves Lighthouse accessibility score ≥ 90 on the homepage.
- **SC-004**: Production build completes in under 2 minutes on a standard developer machine.
- **SC-005**: 100% of navigation anchor links scroll to the correct module section.

## Assumptions

- Screenshots are generated at build/setup time from the HTML prototype, not fetched at runtime.
- Inspection App is represented as a dedicated `prototype/` surface modeled from the existing Kotlin app's checklist-first workflow.
- The marketing site is internal/demo use — no SEO optimization or analytics required for MVP.
- English-only content is sufficient.
- No authentication or API integration is needed.
