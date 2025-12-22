# Product Roadmap (Relaunch + Next Features)

## North Star
Make this the fastest way on a phone to answer: “What should I cook in my rice cooker this week, and how do I make it taste great?”

## Core Jobs To Be Done
1. **Pick**: find something that fits mood/diet/spice/time.
2. **Shop**: know what to buy (and what you already have).
3. **Cook**: follow clear steps without rereading or scrolling a lot.
4. **Improve**: learn how to fix flavor (Salt • Fat • Acid • Heat).
5. **Repeat**: save favorites, track wins, keep it fun.

## Relaunch Scope Freeze (v1.0)
Keep the product focused; ship with:
- Mobile-first Browse → Detail flow
- Filters + Search
- Chef Notes (SFAH) + Measurement help
- Copy/share actions
- Safety footer

## v1.1 (High impact, low/medium effort) — “Make it sticky”

### 1) Weekly Plan (3 picks)
**UX**
- Button: “🍱 Make my week” (generates 3 recipes).
- Shows 3 cards: Mon/Wed/Fri (or “Pick 1/2/3”), each with Spice + Cuisine + Protein.
- Actions: **Swap** (per slot), **Lock**, **Regenerate**, **Share plan**.
- Persists for the week (so it feels intentional, not random chaos).

**Logic**
- Use current filters as constraints by default (toggle “Use current filters”).
- Variety rules (with fallbacks):
  - Prefer 3 different cuisines + proteins
  - Prefer spice spread (Mild/Medium/Hot) if available
  - Avoid repeats from last week (if history exists)
- Deterministic seed per week (stable plan) with manual “reshuffle”.

**Fun**
- “Roulette spin” micro-animation on generation.
- Optional confetti for “Plan complete” (respects `prefers-reduced-motion`).

### 2) Favorites + “Cooked”
**UX**
- ⭐ Favorite on detail
- ✅ Mark cooked + optional 1–5 rating
- “Favorites” tab/section + “Recently cooked”

**Why**
This becomes the personalization layer without accounts.

## v1.2 (High impact, medium effort) — “Make it cookable”

### 3) Shopping List (from weekly plan or selected recipes)
**UX**
- One-tap “Build shopping list”
- Groups: Produce / Protein / Pantry / Herbs & aromatics
- Copy/share as plain text (and optionally iOS share sheet)

**Note**
This works best once we add light ingredient structure over time; start with a simple parser + manual overrides later.

### 4) Cook Mode
**UX**
- Big text, step-by-step with checkboxes
- “Keep screen awake” (Wake Lock API when supported)
- Optional timers (soft reminders; no account required)

**HIG fit**
Focus and readability; minimum chrome.

## v1.3 (Medium impact, medium effort) — “Make it app-like”

### 5) PWA + Offline
- Add manifest + service worker
- Offline recipe browsing + saved plans
- Add-to-home-screen prompt (non-intrusive)

## v2+ (Big impact, bigger effort) — “Recipe quality system”

### 6) Structured Recipe Schema + Editor
- Move from free-text fields to structured ingredients (amount, unit, “add after cooking”)
- Add “Scorch risk” + “Finish required” badges (derived from schema)
- Build an internal “recipe editor” page for you to refine recipes quickly

## Success Metrics (simple)
- Time to first recipe view (mobile)
- Weekly plan created % and week return rate
- Favorites created % and repeat cooks
- Copy/share usage

