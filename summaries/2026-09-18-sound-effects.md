# Sound effects for quiz and flashcard flows

**Date:** 2026-09-18 · **Branch:** main · **Type:** feature

## Goal
Add correct/wrong answer sound effects to quiz pages and flashcard study flows, with a user-controllable mute toggle in the navbar.

## What changed
- `public/sounds/correct_answer.mp3`, `public/sounds/wrong_answer.mp3` — sound files moved from `src/assets/` to `public/` for static serving via URL (CDN-cacheable, no bundler config).
- `src/lib/sounds.ts` (new) — sound-effects module: localStorage key `cards_sound` (values: `'off'` muted, absent/`'on'` enabled), functions `isSoundEnabled()`, `setSoundEnabled()`, `toggleSound()`, `preloadSounds()`, and `playSound('correct'|'wrong')`. Audio elements cached in module-level Map; `play()` rejections silently swallowed; localStorage written only on explicit toggle, never on mount.
- `src/app/layout.tsx` — inline blocking script now stamps both `data-theme` and `data-sound` on `<html>` before first paint, mirrors `isSoundEnabled()` logic.
- `src/components/Icons.tsx` — added `VolumeIcon` and `VolumeOffIcon` components.
- `src/components/Navbar.tsx` — second navbar toggle button (aria-label "Toggle sound effects") after theme toggle; no React state; CSS swaps icons off `[data-sound]` attribute.
- `src/app/globals.css` — icon swap rules (`.sound-icon-*`) next to theme icons; mobile (<640px) navbar compacted: gap 4px, divider hidden, toggles 40px, button padding reduced to 10px to fit two toggles at 375px width.
- Sound playback hook points (one `playSound()` call each, in user-gesture handlers): `submitAnswer()` in `src/app/deck/[id]/quiz/page.tsx`, `src/app/deck/[id]/quick-quiz/page.tsx`, `src/app/take/[quizId]/TakeQuizClient.tsx`; `handleMarkLearned()` → correct, `handleMarkLearning()` → wrong in `src/app/deck/[id]/practice/page.tsx`; `handleRate()` (AGAIN → wrong, else correct) in `src/app/deck/[id]/review/page.tsx`. Each page calls `preloadSounds()` in a mount effect.
- `.claude/CLAUDE.md` — documented `src/lib/sounds.ts`, `cards_sound` key, and inline script behavior.

## Decisions and rationale
- **Static assets in `public/`** — sounds are immutable, globally cacheable, and don't need bundler involvement. Simpler than Supabase storage.
- **Mute toggle in navbar, default enabled** — consistent with theme toggle UX; on by default to reward user discovery without friction.
- **Sound mapped to flashcard feedback** — "Know it" / "Good" → correct sound; "Still learning" / "Again" → wrong sound. No flip sound to keep interaction feedback minimal.
- **Playback in parent handlers, not components** — ensures audio plays synchronously in the click handler, respecting browser autoplay policies. Avoids async issues in child components.
- **No localStorage write on mount** — mirrors `theme.ts` pattern: read localStorage once at startup (via inline script), write only on explicit user action (toggle). Prevents hydration mismatches and unnecessary writes.
- **Module-level audio cache** — audio elements persist across renders; `play()` rejections swallowed (no error log noise if autoplay is blocked by the browser or user gesture is incomplete).

## Verification
- `npx tsc --noEmit`: 17 pre-existing errors before and after (no new type errors introduced).
- Manual testing in Chrome dev server (`http://192.168.100.184:3000` — see note on localhost proxy):
  - Quick Quiz: wrong answer → `wrong_answer.mp3` plays once, correct answer → `correct_answer.mp3` plays once.
  - Mute toggle: swaps icon, writes `cards_sound=off` to localStorage, suppresses all playback, persists across page reload with no icon flash.
  - Practice page: "Know it" and "Still learning" buttons each play the right sound; ArrowLeft/ArrowRight keyboard shortcuts play the right sound.
  - Review page: AGAIN maps to wrong sound, GOOD/EASY map to correct sound.
  - Console: clean after reload (no hydration warnings).
  - Layout: navbar fits on one row in a 375px iframe with two toggle buttons visible and readable.
  - HTTP: `GET /sounds/correct_answer.mp3` returns 200 with `audio/mpeg` Content-Type.

## Open items
- Optional follow-up: add a `2026-09-sound-effects` entry to `ANNOUNCEMENTS` in `src/lib/announcements.ts` to notify returning users of the new feature.
- **Note:** localhost proxy on the user's machine intercepts browser requests to `localhost:3000` and `127.0.0.1:3000` (routes to "Hello Lumpia" app instead of gokards). Testing used the LAN URL. Testing via curl and local Next.js dev server work correctly.
- Pre-existing uncommitted work on the `subject-filter` branch (`ChallengesClient`, `SubjectFilter`, `useDismiss`) is unrelated to this change.
