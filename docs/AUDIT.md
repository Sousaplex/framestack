# FrameStack — Codebase Audit

Findings from a review of the main process, FFmpeg wrapper, IPC layer, store,
preload, and utilities. Ranked by severity. Line references are to the state of
the code at the initial commit.

---

## High — functional correctness

### 1. `-start_number` is never passed → sequences not starting at frame 0 fail
- **Where:** [`src/main/ffmpeg.ts:108`](../src/main/ffmpeg.ts) (`buildFFmpegArgs`)
- **Problem:** The input is built as `-framerate 24 -i <pattern>` with no
  `-start_number`. FFmpeg's image2 demuxer defaults to looking for frame `0`/`1`.
  The detected `firstFrame` ([`src/main/index.ts:743`](../src/main/index.ts)) is
  never used. A sequence like `shot_0047.png … shot_0192.png` errors with exit
  254 (the exact failure the code apologizes for at `index.ts:850`) or starts at
  the wrong frame.
- **Fix:** Pass `-start_number ${sequenceInfo.firstFrame}` before `-i`.

### 2. Pattern detection grabs the *first* number group, not the frame number
- **Where:** [`src/main/index.ts:751`](../src/main/index.ts) (pattern build) and
  `index.ts:715` (sort comparator)
- **Problem:** `firstBase.replace(/\d+/, patternStr)` replaces the first digit
  run. For a common name like `render_v02_0001.png` this yields
  `render_v%02d_0001.png` — pointing FFmpeg at the version number instead of the
  frame counter. The sort has the same bug (`aNumbers[0]`).
- **Fix:** Match the *trailing* number group (frame numbers are almost always
  last), for both the pattern replacement and the sort key.

### 3. ZIP extraction flattens to basename → silent frame loss on collisions
- **Where:** [`src/main/index.ts:342`](../src/main/index.ts) (`extractZipFile`)
- **Problem:** Every entry is written to `join(extractTo, basename(fileName))`.
  When merging multiple ZIPs (a supported flow) or extracting a ZIP with
  subfolders, two `frame_0001.png` entries overwrite each other. No error — the
  sequence silently loses frames and `frameCount` (the progress denominator and
  completion signal) is wrong.
- **Fix:** Preserve enough of the entry path to disambiguate, or namespace each
  ZIP's output into its own subdirectory and detect collisions.

---

## High — security

### 4. Command injection via crafted filenames in `ffprobe`
- **Where:** [`src/main/index.ts:765`](../src/main/index.ts)
- **Problem:** `execSync(\`ffprobe … "${firstFile}"\`)` interpolates the path into
  a shell string. On macOS/Linux a filename can legally contain `"`, `` ` ``,
  `$()`. Inputs come from arbitrary ZIPs / drag-drop, so they're untrusted. A
  file named `a";touch ~/pwned;".png` breaks out and executes.
- **Fix:** Use `execFileSync('ffprobe', ['-v','error', …, firstFile])` (arg
  array, no shell). Apply the same fix to the `execSync` calls in
  [`src/main/ffmpeg.ts:189`](../src/main/ffmpeg.ts) and the check/set-path
  handlers (lower risk since user-chosen, but same shape).

---

## Medium — correctness / consistency

### 5. `ffprobe` isn't located the way `ffmpeg` is → dimensions never detected in packaged app
- **Where:** [`src/main/index.ts:765`](../src/main/index.ts) vs
  [`src/main/ffmpeg.ts:206`](../src/main/ffmpeg.ts)
- **Problem:** The app has an elaborate `findFFmpegPath()` because packaged apps
  don't inherit full PATH, but the ffprobe call hardcodes the bare `ffprobe`. In
  a packaged macOS app that's exactly the PATH problem it was built to avoid, so
  `width`/`height` silently come back undefined.
- **Fix:** Derive the ffprobe path next to the resolved ffmpeg binary.

### 6. Hardcoded 24 fps, not configurable
- **Where:** [`src/main/ffmpeg.ts:110`](../src/main/ffmpeg.ts)
- **Problem:** Every render uses `-framerate 24` regardless of source intent — a
  real limitation for a sequence→video tool. `ImageSequenceInfo` has no fps field
  to thread through.
- **Fix:** Add an fps setting to the UI/output settings and plumb it through the
  IPC payload into `buildFFmpegArgs`.

### 7. Alpha is inferred purely from file extension
- **Where:** [`src/main/index.ts:758`](../src/main/index.ts)
- **Problem:** Any `.png/.tiff/.exr` is flagged `hasAlpha`, so opaque PNGs get
  encoded as ProRes 4444 `yuva444p10le` — a wasted, always-opaque alpha plane and
  larger files.
- **Fix:** Detect real alpha via ffprobe's `pix_fmt` on the first frame.

---

## Low — quality / bugs that don't break output

### 8. O(n²) stderr re-parsing + redundant progress emits
- **Where:** [`src/main/ffmpeg.ts:291-339`](../src/main/ffmpeg.ts)
- **Problem:** Re-splits and re-scans the *entire accumulated* stderr buffer on
  every data chunk, calling `onProgress` for every historical `frame=` line each
  time. Grows quadratically on long renders.
- **Fix:** Track only the newest line / partial-line remainder.

### 9. Dead logging branch
- **Where:** [`src/main/ffmpeg.ts:325`](../src/main/ffmpeg.ts)
- **Problem:** Compares `percentage` against `lastProgress.percentage`, but
  `lastProgress` was reassigned to the new value nine lines up — the "every 5%"
  condition compares a value to itself and is always false. Only the every-10-
  frames log fires.
- **Fix:** Capture the previous percentage before reassigning `lastProgress`.

### 10. Preload type declarations are stale/wrong
- **Where:** [`src/preload/index.ts:122`](../src/preload/index.ts) (and a second
  copy in [`src/renderer/types.d.ts`](../src/renderer/types.d.ts))
- **Problem:** Declares `selectZipFile: () => Promise<string | null>` and
  `extractAndDetectZip(zipPath: string)`, but the implementations take
  `allowMultiple` / `string | string[]`. TS consumers get wrong signatures.
- **Fix:** Sync the declared types to the real signatures; dedupe the two copies.

### 11. Single-render guard has a small race
- **Where:** [`src/main/index.ts:831`](../src/main/index.ts)
- **Problem:** `currentRenderProcess` is assigned *after* `await
  renderSequence(...)`, while the guard check is at the top of the handler. Two
  near-simultaneous invocations could both pass the check. Low risk with one
  window.
- **Fix:** Set the guard synchronously before awaiting.

---

## Notes / non-issues
- Electron security posture is good: `contextIsolation: true`,
  `nodeIntegration: false`, `will-navigate` blocked. Consider adding a
  `Content-Security-Policy` for defense in depth.
- Build output paths (`dist-electron/main` + default `out/renderer`) are
  consistent with what `index.ts` searches for and `package.json` `main` — no
  launch-path bug there.

---

## Suggested fix order
1. **#1, #2** — cause failed or wrong renders; small, contained changes.
2. **#4** — command injection; swap `execSync` → `execFileSync`.
3. **#3, #5** — silent data loss and packaged-app dimension detection.
4. **#6, #7** — feature/quality improvements (fps control, real alpha).
5. **#8–#11** — cleanups.
