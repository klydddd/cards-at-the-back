# Manual challenge creation (MCQ-only first version)

**Date:** 2026-09-18 · **Branch:** feat/manual-challenges · **Type:** feature

## Goal
Enable users to create and publish quiz challenges without first creating a deck, with a multiple-choice-only builder as the initial release.

## What changed

**New files:**
- `supabase/manual_challenges.sql` — schema migration for deck_id nullable, quizzes.title, source_kind, check constraint
- `src/lib/challenges.ts` — helpers `challengeTitle()` and `challengeKindLabel()`
- `src/lib/manualQuiz.ts` — draft types, `validateManualQuiz()`, `emptyMcqDraft()`
- `src/components/McqQuestionForm.tsx` — builder form for single MCQ questions
- `src/components/QuizReviewView.tsx` — shared answer key display
- `src/app/create/page.tsx` — deck vs challenge chooser (new routing hub)
- `src/app/create/challenge/page.tsx` — MCQ builder form
- `src/app/take/[quizId]/review/page.tsx` — standalone review route for manual challenges
- `docs/superpowers/specs/2026-09-18-manual-challenges-design.md` — design spec

**Modified files:**
- `src/types/index.ts` — QuizSourceKind adds `'manual'`; `quizzes.deck_id` nullable; `quizzes.title` added; ChallengeListItem.title added
- `src/lib/supabase.ts` — `saveQuiz()` now takes options object (deckId, title); `fetchQuizChallenges()` selects title
- `src/app/ai-parse/page.tsx`, `src/app/deck/[id]/quiz/page.tsx`, `src/app/deck/[id]/quick-quiz/page.tsx` — updated `saveQuiz()` callers
- `src/app/take/[quizId]/page.tsx`, `src/app/take/[quizId]/TakeQuizClient.tsx` — fetch deck only when deck_id exists; use `challengeTitle()` for display; back/study links fallback to /challenges
- `src/app/challenges/ChallengesClient.tsx` — hero section with "Create Challenge" link; search by title; improved copy
- `src/components/ChallengeCard.tsx` — always link to /take/[id]/review
- `src/app/deck/[id]/DeckViewClient.tsx` — use `challengeKindLabel()` helper
- `src/app/deck/[id]/quiz/[quizId]/page.tsx` — simplified to thin wrapper, delegates to QuizReviewView
- `src/app/globals.css` — added .mcq-* builder styles and .hero-compact utility
- `src/app/page.tsx` — hero button links to /create/deck
- `src/lib/announcements.ts` — entry 2026-09-manual-challenges
- `supabase/current.sql` — updated schema snapshot
- `.claude/CLAUDE.md` — documented new routes and flows
- `src/app/create/page.tsx` git-mv'd to `src/app/create/deck/page.tsx`

## Decisions and rationale

**Storage model:** Made `quizzes.deck_id` nullable rather than auto-creating empty decks per challenge. This avoids orphaned deck records and cleanly separates the concepts. Title is required for manual challenges and optional for deck-based ones via check constraint `quizzes_title_or_deck`.

**Routing:** Created a dedicated `/create` chooser page (deck vs challenge). The deck form moved to `/create/deck` to avoid namespace collision. This centralizes entry points and makes the UX explicit about the two paths.

**Answer key:** New `/take/[quizId]/review` route serves standalone reviews. Both `/deck/[id]/quiz/[id]` and `/take/[quizId]/review` render the shared `QuizReviewView` component to avoid duplication. ChallengeCard always links to the standalone review.

**Validation:** Enforced client-side only (SEC-06 audit item remains open): title ≤120 chars, 2–50 questions, 2–6 options per question, non-empty options, no case-insensitive duplicates, exactly one correct answer.

## Verification

- `npx tsc --noEmit` — error set unchanged (17 pre-existing TypeScript errors; 2 errors in moved `/create/deck/page.tsx` just changed file path)
- Manual validation script exercised `validateManualQuiz()` across 8 test cases (blank title, too few/many questions, blank question, empty/duplicate options, zero/no correct answers, too few options, valid) and `challengeTitle()`/`challengeKindLabel()` — all passed
- HTTP route tests (against dev server): `/create`, `/create/deck`, `/create/challenge`, `/challenges`, `/take/<existing id>`, `/take/<id>/review`, `/deck/<id>/quiz/<id>` all return 200 with expected markup
- OG metadata: deck-based challenge still renders title "50 questions · AI challenge"

## Open items

- **Supabase migration pending:** `supabase/manual_challenges.sql` has not been run; publishing from `/create/challenge` will fail on NOT NULL `deck_id` until the schema is migrated in the SQL editor
- **No end-to-end browser walkthrough:** Chrome extension could not reach localhost; create → publish → take → leaderboard → review flow still needs manual click-through after migration
- **Future work:** other question types in builder (new draft kind in manualQuiz.ts, branch in renderQuestion); editing/deleting a manual challenge; server-side validation of quiz inserts (SEC-06)
