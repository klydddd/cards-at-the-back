# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build → .next/
npm run start    # Serve the production build locally
npm run lint     # ESLint check
```

No test suite is configured.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

- `NEXT_PUBLIC_*` variables are embedded into the client bundle by Next.js.
- `GEMINI_API_KEY` is server-side only — never exposed to the browser.
- Supabase has graceful degradation: `isSupabaseReady()` returns false when unconfigured, and most operations return empty arrays or throw with a descriptive message.
- `isGeminiReady()` currently always returns `true` — the server API route reports configuration errors at call time. See `AUDIT.md` BUG-03.

## Architecture

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Supabase (Postgres + anon key) · Google Gemini API · Vercel Analytics.

**Framework:** Next.js App Router. All pages use `"use client"` since they depend on React hooks and browser APIs. No Server Components are used yet.

**Routing** is file-system based under `src/app/`. All routes are public — there is no authentication guard. See `AUDIT.md` SEC-06 for the full impact of this.

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx                      # Root layout: Navbar + Analytics
│   ├── page.tsx                        # Home: deck list + public quiz feed
│   ├── create/page.tsx                 # Manual deck creation
│   ├── ai-parse/page.tsx               # AI-powered deck creation from file upload
│   ├── deck/[id]/
│   │   ├── page.tsx                    # Deck detail view
│   │   ├── practice/page.tsx           # Flip-card practice mode
│   │   ├── review/page.tsx             # SRS-guided review mode
│   │   ├── quick-quiz/page.tsx         # Client-side quiz (no AI, not persisted)
│   │   └── quiz/
│   │       ├── page.tsx                # AI quiz generation + settings
│   │       └── [quizId]/page.tsx       # Quiz result review
│   ├── take/[quizId]/page.tsx          # Shareable quiz-taking flow
│   └── api/
│       ├── gemini/parse/route.ts       # POST: file text → AI flashcards
│       └── gemini/quiz/route.ts        # POST: cards → AI quiz questions
├── components/
│   ├── Navbar.tsx
│   ├── DeckCard.tsx
│   ├── CardForm.tsx
│   ├── FlipCard.tsx
│   └── Icons.tsx
├── lib/
│   ├── supabase.ts      # Supabase client + all DB operations (single source of truth)
│   ├── gemini.ts        # Client-side wrapper that calls /api/gemini/parse
│   ├── quizGenerator.ts # Client-side wrapper that calls /api/gemini/quiz
│   ├── mcqGenerator.ts  # Client-side quiz generator (no AI, no persistence)
│   ├── pdfParser.ts     # PDF → text via pdfjs-dist
│   ├── docParser.ts     # DOCX/PPTX → text via mammoth + jszip
│   ├── tracking.ts      # SRS progress: Supabase primary, localStorage fallback
│   ├── srs.ts           # SM-2 spaced repetition algorithm
│   └── theme.ts         # Light/dark theme via localStorage + data-theme on <html>
└── types/
    └── index.ts         # Shared TypeScript interfaces (Deck, Card, Quiz, CardProgress)
```

**Note:** `src/lib/gemini.js` and `src/lib/quizGenerator.js` are dead files left over from the Vite migration. They should be deleted. See `AUDIT.md` DEBT-02.

## Key Libraries

```
src/lib/supabase.ts      — All DB reads/writes. The only file that touches Supabase directly.
src/app/api/gemini/      — The only place GEMINI_API_KEY is used. Always server-side.
src/lib/tracking.ts      — SRS orchestration: loads from Supabase, falls back to localStorage.
src/lib/srs.ts           — Pure SM-2 algorithm. No I/O.
```

## Supabase Schema

```
decks         — id, title, description, creator_name, subject, created_at
cards         — id, deck_id, front, back, position
quizzes       — id, deck_id, creator_name, questions (JSON), question_types (JSON),
                answers (JSON), score, subject, created_at
card_progress — id, card_id, deck_id, ease_factor, interval, repetitions,
                due_date, last_reviewed
```

**Row Level Security:** RLS must be enabled on all tables. Without it, the public anon key grants full read/write access to the entire database. See `AUDIT.md` SECRET-02 and SEC-06.

## Flashcard Convention

`front` = description or definition of the concept  
`back` = the term, keyword, or short answer

This convention is enforced by the Gemini prompt in `/api/gemini/parse/route.ts` and relied on throughout quiz generation.

## AI Flows

**AI Parse (`/ai-parse`):**
1. User uploads `.md`, `.pdf`, `.docx`, or `.pptx`
2. Client extracts text using `pdfParser.ts` / `docParser.ts`
3. Text is POSTed to `/api/gemini/parse`
4. Server sends to Gemini with a flashcard-generation prompt
5. Server tries 3 models in sequence: `gemini-3.1-flash-lite-preview` → `gemini-2.5-flash` → `gemma-3-27b-it`
6. Returns JSON array of `{ front, back }` cards
7. User reviews/edits cards, then saves as a new deck via Supabase

**AI Quiz (`/deck/:id/quiz`):**
1. User selects question types and counts
2. Client POSTs cards + `questionTypeCounts` to `/api/gemini/quiz`
3. Server generates questions using the same 3-model fallback chain
4. Quiz is saved to Supabase with `saveQuiz()`
5. Shareable via `/take/:quizId`

**Quick Quiz (`/deck/:id/quick-quiz`):**
- No AI, no network call, not persisted to Supabase
- Uses `mcqGenerator.ts` to build MCQ / true-false / identification questions client-side

## Known Issues & Audit Status

A full Zero-Trust security and quality audit was conducted on 2026-04-08. See `AUDIT.md` for all findings and `TASKS.md` for the prioritized task board.

**Critical open items (do not share app publicly until resolved):**
- No rate limiting on `/api/gemini/*` routes — billable API abuse vector (SEC-01)
- Prompt injection via user-uploaded file content (SEC-02)
- No content size limit on parse route (SEC-03)
- Score computed client-side and written directly to DB (SEC-04)
- No authentication or ownership model — all data is globally writable (SEC-06)
- Live API credentials must be rotated (SECRET-01)
