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

- [x] Explainer video: promo/solio-explainer.mp4 (29 s, 1080x1920, Hebrew male voice + captions; narration by ElevenLabs "Amit")

- [x] Demo video button (film icon, top right) plays media/solio-explainer.mp4 (720p, cached on first play); end card held longer, URL removed

- [x] Hebrew description: README first paragraph (apps directory) + og: tags and manifest (WhatsApp previews)

## Current Focus
**Stopped here (2026-10-17):** Solio is live at https://solio.vplusstudio.app (Cloudflare, workers.dev off) and on GitHub Pages. Done today: all 7 build steps, Cloudflare deploy, help sheet removed, Hebrew explainer video (ElevenLabs "Amit", 30 s, `promo/`) + in-app demo button (720p in `media/`), Hebrew description (README for the apps directory, og: tags for WhatsApp previews, with the app icon). Ron confirmed the directory link, the description and the video work.

**Next step:** Ron tests on his phone: install from solio.vplusstudio.app, airplane mode, vibration follows the breath, tilt moves the sand, sound starts on first touch, demo button plays the video (with sound, and offline after the first play). Fix whatever he reports.
Not verifiable from the cloud: real-device haptics/tilt/audio quality/60 fps, live URL fetch.
Open option: turn off GitHub Pages (only if Ron asks; Repo → Settings → Pages).
Phase 2 ideas (not built): sleep fade-out, more scenes, local calm check, TWA wrapper.
