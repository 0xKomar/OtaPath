# OtaPath — 120-second pitch & product demo (Remotion)

Editable source for `out/demo.mp4` (1920×1080, 30 fps, 120 s): a hackathon pitch
video for OtaPath built from **real
recordings of the running app** — no mock-ups, no generated UI.

| Time | Section | Source |
| --- | --- | --- |
| 0:00–0:12 | Hook & problem | `src/scenes/Hook.tsx` |
| 0:12–0:25 | The solution | `src/scenes/Solution.tsx` |
| 0:25–0:47 | Feature 1 — the map is the game | `src/scenes/Feature1.tsx` |
| 0:47–1:11 | Feature 2 — memory capsules | `src/scenes/Feature2.tsx` |
| 1:11–1:35 | Feature 3 — the clinician's side of the loop | `src/scenes/Feature3.tsx` |
| 1:35–1:50 | Differentiation & what is actually built | `src/scenes/Difference.tsx` |
| 1:50–2:00 | Ending | `src/scenes/Ending.tsx` |

The voiceover script with timecodes is in [`VOICEOVER.md`](VOICEOVER.md).

## Edit and render

```bash
npm install
npm run dev                                   # Remotion Studio (live preview, timeline)
npx remotion render OtaPathDemo out/demo.mp4 --codec=h264 --crf=16 --jpeg-quality=95
```

- `src/theme.ts` — palette, fonts and the master timeline (`SECTION`, in seconds).
- `src/Main.tsx` — the seven scenes, scene-change wipes, subtitles, music, narration.
- Each scene lists its footage as `Cut`s (`{ at, src: [in, out], rate }`), so a trim
  or speed change is a one-line edit. Scenes are also registered on their own
  (Studio → *Scenes* folder) for isolated editing.
- `src/data/vo-placement.json` — when each narration line starts. After changing it
  (or the script) run `node scripts/build-vo.mjs` to rebuild `src/data/vo.json`,
  the word-level `src/data/captions.json` and `VOICEOVER.md`.

## How the footage was made (all reproducible)

1. **Backend** — a local Supabase stack (`backend/`, Docker) seeded with the repo's own
   `supabase/schema.sql`: five fictional demo patients, no real user data.
   `cd backend && npx supabase@3.0.0 start`, then load the schema with `psql`.
   The app reads it through `OtaPath/.env.local` (local-development keys only).
2. **App** — `npx next build && npx next start -p 3100` inside `../OtaPath`.
3. **Recording** — `node capture/record.mjs` drives the real app with Playwright and
   records the screen through the Chrome DevTools screencast
   (`capture/lib.mjs`), then `node capture/encode.mjs` turns the frames into
   constant-30-fps H.264 in `public/footage/` plus `src/footage/meta.json`
   (durations and the named moments the edit syncs to).
   - Patient phone: 430×900 CSS px recorded at 1032×2160.
   - Clinician portal / stage / landing: 1600×900 CSS px recorded at 2880×1620
     (downscales to a crisp 1920×1080 and leaves room to zoom).
   - `phone2` and `clinic` are recorded **at the same time on one clock**, which is
     what makes the split-screen "it lands on his phone" shot a true sync.
4. **Safe demo inputs** — the photo is a CC0 image from Wikimedia Commons
   ("A yellow curtain of birch trees leaves in autumn"); the patient's 10-second
   voice note is synthetic speech fed to the browser's microphone, so the app's
   real acoustic analysis runs on it. IP geolocation is blocked so the map stays
   on the app's default Otaniemi position and nothing about the recording
   machine is exposed.

## Audio

- **Narration** — Kokoro-82M (`af_heart`), an Apache-2.0 neural TTS that runs
  locally: `tts/generate.py`. `tts/align.py` checks every line with Whisper and
  produces the word timings used for the subtitles. The two model files
  (`kokoro-v1.0.onnx`, `voices-v1.0.bin`, from the kokoro-onnx GitHub release
  `model-files-v1.0`) live in `tts/models/` and are git-ignored. Run with
  `uv run --python 3.12 --with kokoro-onnx --with soundfile python generate.py`.
- **Music** — an original score synthesised from scratch by `audio/make_music.py`
  (no samples), structured to the seven sections; ducked under the narration in
  `src/components/Soundtrack.tsx`.
- **Sound effects** — synthesised by `audio/make_sfx.py`, plus a few from
  Remotion's free SFX set (`remotion.media`: whoosh, mouse-click, shutter, page-turn).

## Honesty notes

- Everything on screen inside a phone or browser frame is the real app.
- The walk uses the app's built-in 550 m demo-walk simulator and is sped up ~3×
  (labelled on screen). Several other cuts are sped up 1.3–5.8×.
- Headless Chromium has no speech-to-text service, so the voice-note transcript
  is typed (the app's own fallback); the acoustic analysis is real.
- The numbers in Feature 2 (F0 113 Hz, ±39.5 Hz, vocal score 97, vibrancy 81,
  luminance 54, savoring 100, themes, palette) are what the app stored for the
  capsule captured in that take.
- "1 in 3 relapse within 12 months" is the figure the OtaPath README cites
  (Dunner et al., 2014). The "+22 % / +19 %" learning read-out visible in the
  portal comes from the seeded demo cohort, and is labelled as such.
- The mission builder's mini-map is framed out: on a direct load of `/clinician`
  the Leaflet stylesheet is not loaded and the CARTO tiles now ask for an API
  key, so that map does not render. Places are picked with the chips below it.

## Notes for whoever renders next

- `remotion.config.ts` sets `Config.setChromeMode("chrome-for-testing")`: Remotion's
  default Chrome Headless Shell crashed on the machine this was made on
  (macOS 26.5 arm64, "GPU process isn't usable"). Delete that line if the default
  works for you.
- QA helpers: `node scripts/stills.mjs <label> <seconds…>` renders contact sheets of
  chosen moments; `tts/verify_mix.py` transcribes the final mix with Whisper and
  reports how far each narration line is from its planned start.
- Raw screencast frames (`capture/raw`, ~2 GB) are not kept; `npm run record`
  regenerates them and re-encodes `public/footage/`.
