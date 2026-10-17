# Solio

משחק רגיעה בלי מילים: כדור אור נושם בקצב איטי ונעים, ואתם משחקים בחול, במים ובאור שמגיבים למגע. בלי ניקוד, בלי טיימר ובלי הרשמה, פשוט פותחים ונושמים עם הכדור.

Solio is a language-free calm-down game. A glowing orb breathes at a slow,
gentle pace (longer out-breath than in-breath) and you play with sand,
water and light that answer your touch. There are no scores, timers,
accounts or text to read: open it and follow the orb.

Modes (bottom dock): **Flow** (the orb pours sand or water as you breathe
out; wake buried stars), **Sand** (pour and rake a mandala), **Water**
(ripples and floating lights) and **Breathe** (just the orb, works with
eyes closed through sound and vibration). The film icon (top right) plays a
30-second demo video with Hebrew narration (`media/`, cached for offline after the first play).

## Run locally

Any static file server works, for example:

```sh
npx serve .
```

No build step, no dependencies. The app uses only relative URLs, so it can be
served from any path or domain.

## Install

Open https://solio.vplusstudio.app/ (also at https://ronmailx-boop.github.io/Solio/) in Chrome on Android and tap the
install icon (top right), or use the browser menu → *Install app* /
*Add to Home screen*. After the first load it works fully offline.
Long-press the home-screen icon for a direct **Breathe** shortcut.

## Privacy

No data leaves the device. No tracking, analytics, ads or accounts, and no
network requests at runtime. Settings are kept in the browser's local storage.

A wellness tool, not a medical treatment.
