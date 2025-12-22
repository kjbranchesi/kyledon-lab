# Mobile UX + Apple HIG Audit (Kylē Don Rice Lab)

Date: 2025-12-22  
Scope: Current single-page app in `index.html` (layout, flow, interactions, mobile Safari ergonomics, accessibility).

## Executive Summary (what feels “broken” on mobile)

1. **The app behaves like a desktop split-view forced into a phone**: after filtering, it auto-opens a recipe detail “bottom sheet”, which blocks browsing the list and creates a stop/start loop.
2. **Competing scroll regions + `vh` sizing** create “scroll-jank” and awkward reachability on iOS Safari (dynamic address bar) and smaller devices.
3. **Overloaded entry screen** (large hero + always-visible filter chips) pushes the actual browsing content below the fold on phones.
4. **Custom bottom-sheet gestures** (touch handlers + overlay) are fragile, non-standard, and easy to mis-trigger; they also add complexity without clear benefit.
5. **Accessibility and iOS ergonomics gaps**: missing labels/semantics, limited keyboard/focus affordances, no safe-area handling, heavy visual effects for mobile.

## “Expert Panel” Notes (what each specialist would flag)

### Mobile UX / Flow (HIG-aligned patterns)
- **Primary task on mobile is “find a recipe fast”**. The first screen should show an actionable list (or search results), not a large hero + multiple chip rows.
- **Use hierarchical navigation on phones**: *List → Detail* with an explicit Back control (and native browser back support). Bottom sheets are better for “secondary tasks” (filters, quick actions) than for primary reading.
- **Reduce cognitive load**: collapse filtering into a single “Filter” entry point on mobile (sheet), keep the search field prominent and sticky.

### UI / Visual Design (HIG principles: clarity, deference, depth)
- **Clarity**: increase baseline legibility (avoid ultra-small meta text), keep a consistent type scale, and prioritize recipe title + ingredients/method.
- **Deference**: reduce background animation/visual noise on mobile (animated gradients, multiple bouncing/floating elements) so content remains the focus.
- **Depth**: if you keep a sheet, follow a consistent “detents” model (collapsed / medium / full) with clear affordances and predictable dismissal.

### Accessibility (minimum bar to feel “iOS-quality”)
- Add an explicit label for the search field (placeholder-only isn’t sufficient).
- Make interactive list rows real interactive elements (`button`/`a`), with visible focus states.
- Provide a “Reduce Motion” path via `prefers-reduced-motion` (disable background/mascot/bounce/sparkle animations).
- Ensure contrast and text sizing remain readable at common zoom levels.

### Front-end Engineering (why current mobile feels fragile)
- The current approach mixes **page scrolling** with a **fixed, scrollable sheet**, plus an **overlay pseudo-element**; this commonly causes scroll and tap inconsistencies on iOS.
- Custom touch handling should use pointer events (or explicit non-passive touch listeners) and needs careful scroll/gesture arbitration; otherwise it’s easy to block scroll unexpectedly.
- `vh`-based max-heights are unreliable on mobile Safari; prefer `dvh/svh` with fallbacks and a single “app scroll container” model.

### QA / Device Testing
- Test matrix should include at minimum: iPhone SE (small viewport), iPhone 14/15, and one Android device. Verify portrait/landscape, zoom, and “address bar collapsed” states.

## Concrete Findings in the Current Build (symptoms → likely cause)

### 1) Flow mismatch on phones (list browsing is constantly interrupted)
- The app **auto-selects the first recipe** after rendering the list; on mobile this effectively **auto-opens detail** immediately after filtering/searching.
- The **overlay blocks interaction** with the list while the sheet is open, so users must close the sheet to pick another recipe.

### 2) Scroll + layout issues
- Multiple scroll containers compete: body/page scroll, recipe list scroll, and recipe detail scroll (sheet). This tends to feel “sticky”, especially with fixed positioning.
- Reliance on `vh` for max-heights can cause content to jump/crop when iOS Safari UI expands/collapses.

### 3) Entry screen density
- Large header/hero + multiple chip groups make the “browse” content hard to reach on smaller screens.

### 4) Motion/visual performance on mobile
- Animated gradient background + multiple element animations + heavy blur/shadows can impact scrolling smoothness and battery life.

### 5) Accessibility gaps (also affects perceived quality)
- Search input lacks an explicit label; recipe rows aren’t semantic interactive elements; ARIA/roles are minimal.

## HIG-Aligned Target Experience (what “good” looks like on mobile)

### Mobile primary flow (iPhone)
1. **Browse**: sticky top bar with Search + Filter button; list occupies the rest of the screen.
2. **Select recipe**: navigate to a dedicated detail view (push navigation pattern); show Back.
3. **Adjust batch**: a simple control inside detail (or a compact toolbar) with immediate updates.
4. **Share**: share link and/or use `navigator.share()` where available.

### Secondary flows (sheets work well here)
- **Filters sheet**: Protein, Cuisine, Batch, “Clear all”, “Apply”.
- Optional: **Quick actions sheet** in detail (Copy ingredients, Copy method, Share).

## Recommended Product Decisions (to resolve mobile pain fast)

### Decision A: Replace “detail bottom sheet” with “detail screen” on phones
- Keep split-view on desktop/tablet.
- On phone, treat detail as a separate route/view with Back (no custom drag).

### Decision B: Collapse chip filters into a Filter sheet on mobile
- Keep chips on desktop if desired; on mobile show a single Filter button to reduce vertical clutter.

### Decision C: Single-scroll model on mobile
- Make the app viewport-height constrained (`100dvh` with fallbacks) and scroll the list/detail within the app, not the body.

## Quick Wins (1–2 hours each; can be done even before the refactor)

1. **Stop auto-opening detail on mobile** (no auto-select first recipe when in phone layout).
2. **Reduce header footprint on small screens** (smaller hero, tighter spacing, optional collapse).
3. **Add `prefers-reduced-motion` handling** (disable gradient shift / float / bounce / sparkle).
4. **Add safe-area padding** for fixed elements and full-height surfaces.
5. **Replace overlay pseudo-element with a real overlay element** (predictable tap handling).
6. **Accessibility basics**: label search, make list rows buttons/links, visible focus styles.

## Refactor Blueprint (the next logical step — do this when you switch to Codex)

### Minimal structure (keeps things simple, still deploys to GitHub Pages)
- `index.html` (shell + mounting points)
- `styles.css` (tokens + components + responsive layout)
- `app.js` (state, routing, rendering)
- `recipes.js` or `data/recipes.json` (data separated from UI code)

### Implementation milestones
1. **Routing & views**: `/#/browse` and `/#/recipe/:id` (or hash `#recipe-123` with true “view state”).
2. **Responsive navigation**:
   - Wide screens: split view (list + detail).
   - Phones: list view → detail view with Back.
3. **Filters UX**:
   - Mobile: Filter sheet + applied filter summary chips.
   - Desktop: chips can remain inline.
4. **Accessibility pass**: semantics, focus order, keyboard, screen reader labels.
5. **Performance pass**: reduce heavy effects on mobile; ensure smooth scrolling.

## Acceptance Criteria (definition of “mobile works well”)

- iPhone Safari: no horizontal scroll; no content hidden behind the home indicator/notch; stable layout when the address bar expands/collapses.
- Primary flow is 1-handed and predictable: Browse → Detail → Back.
- All primary tap targets meet ~44×44pt and have clear pressed/active states.
- Reduced motion is respected (`prefers-reduced-motion`).
- Baseline accessibility: labeled search, semantic interactive list rows, visible focus styles, Escape/back works.

## Device QA Checklist (minimum)

- iPhone SE (small viewport), iPhone 14/15 (modern), Android Pixel-class device
- Portrait + landscape
- Zoom at 125%/150%
- With/without reduced motion
- Back button behavior (browser back + in-app Back)

