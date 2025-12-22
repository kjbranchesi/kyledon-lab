# kyledon-lab
🇯🇵🍚 Kylē Don (丼) Rice Lab – A tiny web app for experimenting with Zojirushi-friendly one-pot rice cooker recipes.

## Development
- Install deps: `npm install`
- Run dev server: `npm run dev`
- Build static site: `npm run build`
- Preview build: `npm run preview`
- Output lives in `dist/` (relative asset paths via `vite.config.js`, works on GitHub Pages/subpaths).

## Deploy (GitHub Pages)
- This repo includes a GitHub Actions workflow: `.github/workflows/deploy.yml`.
- In GitHub: Settings → Pages → Source → select **GitHub Actions**.
- Push to `main` to deploy.
