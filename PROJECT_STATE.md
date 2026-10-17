# Solio — Project State

Build brief: language-free calm PWA (breathing orb, sand, water). Vanilla JS, no build, GitHub Pages at https://ronmailx-boop.github.io/Solio/.

## Tasks
- [x] 1. PWA shell + icon
- [x] 2. Breath engine + BREATHE mode
- [x] 3. Simulation + FLOW mode
- [x] 4. SAND mode
- [x] 5. WATER mode
- [x] 6. Audio, haptics, polish
- [x] 7. my-site integration (automatic: my-site lists public repos and reads the icon from the live Pages manifest; no change needed)

## Cloudflare
- [x] wrangler.jsonc (name `solio`, route solio.vplusstudio.app, workers_dev false since 2026-10-17: only the custom domain), .assetsignore, deploy workflow
- [x] Secret CLOUDFLARE_API_TOKEN added; deployed 2026-10-17 (workers.dev URL later disabled; log shows only the custom domain)
- [x] my-site CUSTOM_URLS: `Solio: 'https://solio.vplusstudio.app/'` (key matches repo name casing)
- GitHub Pages stays on in parallel.

- Help sheet (heart icon + support lines) removed at Ron's request, 2026-10-17.

- [x] Explainer video: promo/solio-explainer.mp4 (29 s, 1080x1920, Hebrew male voice + captions)

## Current Focus
All 7 steps done and live on main (GitHub Pages). Next: Ron tests on his phone (install icon, airplane mode, vibration, tilt, sound, help sheet).
Not verifiable from the cloud: real-device haptics/tilt/audio quality/60 fps, live URL fetch (github.io blocked by proxy).
Phase 2 ideas (not built): sleep fade-out, more scenes, local calm check, TWA wrapper, solio.vplusstudio.app.
