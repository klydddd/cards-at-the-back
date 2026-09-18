# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # http://localhost:3000 (LAN origins 192.168.*.* are allowed in next.config.mjs)
npm run build      # Production build → .next/  (does NOT type-check — see caveats)
npm run start      # Serve the production build
npm run lint       # ESLint — currently checks no source files, see caveats
npx tsc --noEmit   # The real type check

npm run test:models                        # Smoke-test the Gemini fallback chain (needs GEMINI_API_KEY in .env)
npm run test:models -- --all               # Every text model available to the key
npm run test:models -- gemini-2.5-flash    # Specific model(s) only
```

There is no test suite beyond the model smoke test.

### Tooling caveats

- `eslint.config.js` only matches `**/*.{js,jsx}`, so `npm run lint` lints nothing under `src/` (all TS/TSX). Audit ERR-02.
- `next.config.mjs` sets `typescript.ignoreBuildErrors: true`; the build passes with ~19 known type errors. Run `npx tsc --noEmit` before claiming type safety. Audit ERR-01.
- `tsconfig.json`: `strict: false` but `strictNullChecks: true`. Path alias `@/*` → `src/*`.
- `README.md` still describes the old Vite setup (`VITE_*` env vars, port 5173). Ignore it; this file is current.

## Environment variables

From `.env.example` (copy to `.env`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
ADMIN_PASSWORD=          # required by /api/admin/*
```

- `NEXT_PUBLIC_*` values are embedded in the client bundle.
- The service-role key, Gemini key and admin password are server-only. They are read only in `src/app/api/**` and `src/lib/supabaseAdmin.ts`.
- `isSupabaseReady()` returns false when unconfigured: reads return `[]`, writes throw. `isGeminiReady()` always returns true and is unused; the API routes report a missing key at call time.

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 6 · Supabase (Postgres; anon key in the browser, service role on the server) · Google Gemini via `@google/generative-ai` · Vercel Analytics.

**Rendering.** Almost every page is `"use client"`. Three routes are async Server Components purely so they can export `generateMetadata` (OG tags for sharing) and then delegate to a sibling `*Client.tsx`: `deck/[id]`, `take/[quizId]`, `challenges`. Follow that pattern when a page needs dynamic metadata.

**Root layout** (`src/app/layout.tsx`) mounts fonts (Bricolage Grotesque + Onest via `next/font`), `Navbar`, `Footer`, `WelcomeGate`, `WhatsNew`, Analytics, and a blocking inline script that stamps `data-theme` and `data-sound` on `<html>` before first paint. That script must mirror `getInitialTheme()` in `src/lib/theme.ts` and `isSoundEnabled()` in `src/lib/sounds.ts`; `Navbar` holds no theme or sound state (CSS picks the icons off the attributes).

**No authentication.** Every route is public and browser code writes to Supabase with the anon key. Two things run server-side with the service-role client (`createServiceRoleSupabaseClient()` in `src/lib/supabaseAdmin.ts`):

- **Admin** — `api/admin/edit-deck` and `api/admin/delete-deck`, guarded only by `ADMIN_PASSWORD` sent in the request body. UI: `/deck/[id]/edit` and the delete button in `DeckViewClient`.
- **Challenge attempts** — `api/quizzes/[quizId]/attempts`: `POST` grades the submission server-side with `src/lib/quizGrading.ts` and inserts into `quiz_attempts`; `GET` returns the top-10 leaderboard. This must be server-side because RLS on `quiz_attempts` silently returns zero rows to the anon key. `api/challenges/stats` exists for the same reason (aggregates only).

### Where things live (the non-obvious parts)

- `src/lib/supabase.ts` — every anon-key DB read/write. The only browser-side file that touches Supabase.
- `src/lib/aiModels.ts` — `AI_MODELS`, the fallback chain shared by all three `api/gemini/*` routes (`parse`, `parse-ocr`, `quiz`). Run `npm run test:models -- --all` before changing it; models that 404, stay overloaded, or wrap JSON in prose break the routes.
- `src/lib/rateLimit.ts` — in-memory, best-effort per-IP limiter. Used only by `api/contact` and `api/onboarding`. The Gemini routes are **not** rate-limited (audit SEC-03).
- `src/lib/tracking.ts` — SRS orchestration. Writes localStorage first (`srs_progress_<deckId>`, plus legacy `cards_tracking_<deckId>`), then syncs to the `card_progress` table. `src/lib/srs.ts` is the pure SM-2 algorithm.
- `src/lib/quizGrading.ts` — the single grading implementation (enumeration answers are order-insensitive). Used by the client quiz pages and the attempts route.
- `src/lib/mcqGenerator.ts` — client-side Quick Quiz generator, no AI. `src/lib/ocrParser.ts` — tesseract.js image OCR plus a regex MCQ extractor.
- `src/lib/subjectHue.ts` — subject → hue name, applied as `data-hue` attributes that `globals.css` styles.
- `src/lib/sounds.ts` — correct/wrong sound effects (`playSound`, `preloadSounds`) and the mute preference (`cards_sound`, stamped as `data-sound` on `<html>` by the layout script, same pattern as theme). Files are served from `public/sounds/`.
- `src/components/Modal.tsx` — shared by `WelcomeGate` and `WhatsNew`.

### localStorage keys

`cards_theme` · `cards_sound` · `gokards_terms_accepted` · `gokards_onboarding_id` · `gokards_seen_announcements` · `gokards_completed_challenges` · `srs_progress_<deckId>` · `cards_tracking_<deckId>`

## Supabase schema

```
decks            — id, title, description, creator_name, subject, created_at
cards            — id, deck_id, front, back, position
quizzes          — id, deck_id, creator_name, source_kind ('ai' | 'quick'), questions (jsonb),
                   question_types, subject, created_at   (answers/score columns are legacy)
quiz_attempts    — id, quiz_id, player_name, answers, score, question_count, elapsed_ms,
                   started_at, completed_at   (written only by the attempts route; hidden from anon by RLS)
card_progress    — id, card_id (unique), deck_id, ease_factor, interval, repetitions, due_date, last_reviewed
contact_messages — private: RLS on, no policies; written by /api/contact with the service role
onboarding_responses — private, same pattern; written by /api/onboarding. Allowed values live in
                   src/lib/onboarding.ts and the table's check constraints
```

`supabase/current.sql` is a schema dump for context only (not runnable). The runnable pieces are `supabase/migration.sql`, `supabase/add_missing_columns.sql`, `supabase/contact_messages.sql`, `supabase/onboarding_responses.sql`, and `supabase_migration_card_progress.sql`.

RLS must stay enabled on every table — without it the public anon key has full read/write access. Several live policies are still too permissive (e.g. `UPDATE USING (true)` on `quizzes`); see `docs/audit/SECURITY.md`.

## Flows

**Flashcard convention:** `front` = description or definition, `back` = the term or short answer. Enforced by the prompt in `api/gemini/parse/route.ts` and relied on by quiz generation.

- **AI Parse** (`/ai-parse`): client extracts text (`pdfParser.ts` for PDF, `docParser.ts` for DOCX/PPTX, `ocrParser.ts` for images) → `POST /api/gemini/parse` for text, or `POST /api/gemini/parse-ocr` with `mode: 'mcq' | 'cards'` for OCR output → model fallback → user edits → `createDeck` + `createCards`.
- **AI Quiz** (`/deck/[id]/quiz`): `POST /api/gemini/quiz` with cards + `questionTypeCounts` → `saveQuiz(..., 'ai')`. Result page at `/deck/[id]/quiz/[quizId]`.
- **Quick Quiz** (`/deck/[id]/quick-quiz`): `generateQuickQuiz` runs client-side with no network call; "Publish challenge" persists it via `saveQuiz(..., 'quick')`.
- **Challenges**: `/challenges` lists published quizzes (`fetchQuizChallenges`, play counts from `/api/challenges/stats`). `/take/[quizId]` plays one and `POST`s the attempt for server grading; completed ids are tracked in `src/lib/challengeHistory.ts`.

## Onboarding, legal, announcements

- `WelcomeGate` shows the consent step, then required onboarding questions (name or Anonymous, age range, grade level, strand/program). Under-13 is blocked client- and server-side and never stored. Completion is the response id in `gokards_onboarding_id`. Any change to the collected fields must also update the Privacy Policy and bump `LEGAL_LAST_UPDATED` in `src/lib/legal.ts`.
- Both modals stay closed on `LEGAL_PATHS` (`/privacy`, `/terms`, `/contact`) so those pages are always readable.
- `WhatsNew` shows unseen entries from `ANNOUNCEMENTS` in `src/lib/announcements.ts`. To post an update, add an entry at the top with a new, unique id; never reuse or rename ids. It only opens after `WelcomeGate` closes (`GATE_CLOSED_EVENT`), and finishing onboarding marks every current announcement seen, so only returning visitors get updates. Entries can be limited with `paths`, `startsAt`, `endsAt`.

## UI theme

The app uses the **Pop Quiz** design system. `UI_THEME_EDIT.md` is the source of truth: cream/ink tokens, 2–3px ink borders (never hairline), hard offset shadows with no blur, the `--space-*` and `--container-*` scales, and breakpoints at 640px and 1024px. Read its "`var()` trap" section before touching CSS custom properties: a token defined as `var(--ink)` resolves once where it is declared, so hue-filled components must be added to the shared `[data-hue]` block in `globals.css` — overriding `--ink` alone leaves their text the wrong colour. Do not hardcode colours in TSX `style` props; the theme passes removed all of those.

## Audit and task tracking

- **Current audit:** `docs/audit/` (2026-09-15). `README.md` there has the top-10 fixes and maps every ID from the older audit. `FOLLOW-UPS.md` holds issues found during the Challenges work.
- `.claude/AUDIT.md` and `.claude/TASKS.md` (2026-04-08) are superseded and kept for history only.
- Design specs and implementation plans from the superpowers workflow live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

Open items to keep in mind while changing code: no rate or size limits on `api/gemini/*`; prompt injection via uploaded text; permissive RLS on `quizzes` and `card_progress`; no auth or ownership model.

## Session summaries

At the end of any conversation that implemented or changed something (code, docs, config), invoke the `session-summarizer` subagent (`.claude/agents/session-summarizer.md`, runs on Haiku) with a short description of the goal, files changed, decisions, verification done, and open items. It writes `summaries/YYYY-MM-DD-<slug>.md`. Commit the summary together with the change.
