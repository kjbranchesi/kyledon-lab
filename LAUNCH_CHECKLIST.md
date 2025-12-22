# Relaunch Checklist (Rice Lab)

## Product (content + UX)
- Mobile flow feels native: Browse → Detail → Back; filters open/close cleanly.
- Chef Notes show measured starting points (Salt • Fat • Acid • Heat) for every recipe.
- Copy/share actions work (Copy recipe, Copy ingredients, Share link).
- Food safety + holding note present and readable.

## Recipe quality pass (minimum viable “test kitchen”)
- Use `FLAGSHIP_RECIPES.md` as the starting test set (covers every cuisine + protein type).
- For each: note salt level, acid finish, fat finish, and whether the suggested “Sauce Pack” amounts feel right.
- Update cuisine-level defaults if a pattern emerges (e.g., “Thai needs more lime finish”).

## Accessibility / polish
- Search has a real label; focus states are visible; list items are buttons.
- Reduced Motion works (`prefers-reduced-motion`).
- No horizontal scrolling on iPhone SE-size viewports.

## Performance / build
- `npm run build` succeeds.
- `npm run preview` works and loads images correctly from `public/images`.
- Vite base path works on subpaths (`vite.config.js` uses `base: "./"`).

## Deploy
Choose one:
- GitHub Pages (recommended): deploy the `dist/` output from `npm run build`.
- Netlify / Vercel: build command `npm run build`, publish directory `dist`.

## Device QA (must-do)
- iPhone Safari: small (SE) + modern (14/15), portrait + landscape.
- Android Chrome: one Pixel-class device, portrait + landscape.
- Check: filter sheet, Back button, hash links (`#recipe-123`), scroll behavior, copy/share.
