# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run lint     # ESLint check
npm run preview  # Preview production build locally
```

No test suite is configured.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

Both Supabase and Gemini have graceful degradation — the app checks `isSupabaseReady()` / `isGeminiReady()` before using them. Missing keys won't crash the app on load, but core features will fail at runtime.

## Architecture

**Stack:** React 19 + Vite, React Router DOM, Supabase (auth + DB), Google Gemini (`gemini-2.5-flash`), Vercel Analytics.

**Routing** is defined in `src/App.jsx`. All routes are public (no auth guard).

**`src/lib/`** — All backend interaction and shared logic lives here:
- `supabase.js` — Supabase client + all DB operations (decks, cards, quizzes). The single source of truth for data access.
- `gemini.js` — Parses raw text into flashcards via Gemini (`parseMarkdownToCards`).
- `quizGenerator.js` — AI-powered quiz generation from flashcards via Gemini (`generateQuizFromCards`). Supports 5 question types: `multiple_choice`, `true_false`, `identification`, `enumeration`, `situational`.
- `mcqGenerator.js` — Client-side (no AI) quick quiz generator (`generateQuickQuiz`). Builds MCQ, true/false, or identification questions directly from card data.
- `pdfParser.js` / `docParser.js` — Document-to-text extraction using `pdfjs-dist` (PDF) and `mammoth` (Word/.docx), with `jszip` for ZIP bundles.
- `tracking.js` — localStorage-based per-deck card progress tracking (learned/learning state).
- `theme.js` — Light/dark theme via `localStorage` + `data-theme` attribute on `<html>`.

**Supabase schema** (inferred):
- `decks` — `id, title, description, creator_name, subject, created_at`
- `cards` — `id, deck_id, front, back, position`
- `quizzes` — `id, deck_id, creator_name, questions (JSON), question_types (JSON), answers (JSON), score, subject, created_at`

**Flashcard convention:** `front` = description/definition, `back` = term/keyword. This is enforced by the Gemini prompt and used throughout quiz generation.

**AI Parse flow (`/ai-parse`):** Upload PDF/Word/ZIP → parse to markdown text → send to `parseMarkdownToCards` → review generated cards → save as a new deck.

**Quiz flow (`/deck/:id/quiz`):** AI generates questions from deck cards → quiz is saved to Supabase → shareable via `/take/:quizId`.

**Quick Quiz (`/deck/:id/quick-quiz`):** No AI — uses `mcqGenerator.js` to generate questions client-side; not persisted.
