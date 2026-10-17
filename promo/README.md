# Solio explainer video

`solio-explainer.mp4`: 29 s, 1080x1920 (FHD portrait), 30 fps, Hebrew male narration
(Google TTS `he-IL-Chirp3-HD-Algieba`), Hebrew captions, soft synthesized pad.

Rebuild (from this folder, with the app served at http://localhost:8080/Solio/):

```sh
python3 tts.py he-IL-Chirp3-HD-Algieba      # narration lines from script.json -> audio/
# trim silence into audio/trimN.wav, then write timeline.json (line start/end times)
node record.mjs http://localhost:8080/Solio/ /tmp/frames   # real app, virtual clock
sh build.sh /tmp/frames solio-explainer.mp4
```
