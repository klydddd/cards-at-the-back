# Manual challenges (quizzes without a deck)

## Context

Today a challenge can only be born from a deck: `/deck/[id]/quiz` (AI) or `/deck/[id]/quick-quiz`. `quizzes.deck_id` is `NOT NULL` and every consumer — `/take/[quizId]` (page + OG metadata), `ChallengeCard`, the answer-key page `/deck/[id]/quiz/[quizId]`, `DeckViewClient` — fetches the deck for the title and back-links. We want people to write a challenge by hand with no deck at all. First version is **multiple choice only**, but the builder should be structured so other question types slot in later.

Decisions already made with the user:
- **Storage:** make `quizzes.deck_id` nullable, add `quizzes.title`, add `source_kind = 'manual'`. Existing quizzes keep borrowing their deck's title.
- **Entry points:** navbar "Create" goes to a chooser page (deck or challenge). The Challenges page gets a hero-style header (like the home page) with a "Create challenge" button.

## 1. Schema — `supabase/manual_challenges.sql` (new, runnable)

```sql
alter table public.quizzes alter column deck_id drop not null;
alter table public.quizzes add column if not exists title text;
-- A quiz must have somewhere to get its title from
alter table public.quizzes add constraint quizzes_title_or_deck
  check (deck_id is not null or (title is not null and length(trim(title)) > 0));
```

Also update the `quizzes` block in `supabase/current.sql` (context dump) and the schema table in `.claude/CLAUDE.md`. The user runs the migration in Supabase; nothing else changes on the DB (existing `Public insert quizzes WITH CHECK (true)` policy already allows the insert).

## 2. Types & shared helpers

- `src/types/index.ts`: `QuizSourceKind = 'ai' | 'quick' | 'manual'`; `Quiz.deck_id: string | null`, `Quiz.title?: string | null`; same two fields on `ChallengeListItem`.
- New `src/lib/challenges.ts`:
  - `challengeTitle(q: { title?; decks? })` → `q.title?.trim() || q.decks?.title || 'Untitled challenge'` (for `Quiz` without the join, callers pass the fetched deck title as a fallback).
  - `challengeKindLabel(kind)` → `'AI challenge' | 'Quick challenge' | 'Custom challenge'`. Replaces the five copies of `source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'` in `TakeQuizClient.tsx:177`, `take/[quizId]/page.tsx:13`, `DeckViewClient.tsx:204`, `deck/[id]/quiz/[quizId]/page.tsx:60`, `ChallengeCard.tsx:56`.
- New `src/lib/manualQuiz.ts` (pure, no React): draft types + `validateManualQuiz(draft) → { questions: QuizQuestion[] } | { error: string }`. Rules: title required (≤120 chars); 2–50 questions; question text required; 2–6 options, all non-empty, no duplicates (case-insensitive trim); exactly one correct. Builds `{ type: 'multiple_choice', question, options, answer: options[correctIndex] }` — the same shape `mcqGenerator.ts` produces, so `quizGrading.ts` and `QuizQuestionView` need no changes. Structure the draft as `{ type: 'multiple_choice', ... }` per question so future types are a new union member + a new `case`.

## 3. Data layer — `src/lib/supabase.ts`

- `saveQuiz` → single options object `{ deckId: string | null, title?: string, creatorName, questions, questionTypes, subject, sourceKind }`. Update the two callers (`deck/[id]/quiz/page.tsx`, `deck/[id]/quick-quiz/page.tsx`).
- `fetchQuizChallenges` select adds `title`. The `decks(...)` embed already comes back `null` for a null FK — `ChallengeListItem.decks` is already typed `| null`.

## 4. Routes

| Route | Change |
|---|---|
| `/create` | **New chooser page.** Two big `index-card` tiles: "Deck" → `/create/deck`, "Challenge" → `/create/challenge`. Navbar keeps linking to `/create`. |
| `/create/deck` | Move existing `src/app/create/page.tsx` here unchanged. Update the two `href="/create"` links in `src/app/page.tsx` (hero + empty state) to `/create/deck`. |
| `/create/challenge` | **New builder** (`"use client"`, same form idiom as the deck form). Fields: title, subject, your name, then a list of question cards. New `src/components/McqQuestionForm.tsx`: question textarea, options list with a radio for the correct one, add/remove option (2–6), remove question. Starts with 2 blank questions × 4 options; "+ Add question" button. Submit → `validateManualQuiz` → `saveQuiz({ deckId: null, title, sourceKind: 'manual', questionTypes: ['multiple_choice'], … })` → `router.push('/take/<id>')`. |
| `/take/[quizId]` | `page.tsx` `generateMetadata`: only `fetchDeck` when `quiz.deck_id`; title via `challengeTitle`. `TakeQuizClient`: fetch deck conditionally; back link → `/deck/<id>` or `/challenges`; `<h1>` via `challengeTitle`; "Study this deck" → "More challenges" (`/challenges`) when there is no deck. |
| `/take/[quizId]/review` | **New deck-less answer key.** Extract the body of `deck/[id]/quiz/[quizId]/page.tsx` into `src/components/QuizReviewView.tsx` (`{ quiz, title, backHref, backLabel }`); both routes render it. `ChallengeCard`'s "Review Questions" link now always points to `/take/<id>/review` (one URL for every kind); `DeckViewClient` keeps its deck-scoped link. |
| `/challenges` | Header becomes a `hero`/`hero-copy` block (eyebrow, title, lede) with a primary "Create challenge" button → `/create/challenge` (no `hero-stack` illustration). Lede + search placeholder no longer say "from every deck"/"by deck". Empty-state copy + button → `/create/challenge`. Search also matches `c.title`. `ChallengeCard` title via `challengeTitle`. |

## 5. Announcement & docs

- `src/lib/announcements.ts`: new entry at the top (new unique id) — "Build your own challenge", CTA → `/create/challenge`.
- `.claude/CLAUDE.md`: schema row for `quizzes` (`deck_id` nullable, `title`, `source_kind` adds `'manual'`), Flows section gets a "Manual challenge" bullet, note `/create` is now a chooser.
- Save this design as `docs/superpowers/specs/2026-09-18-manual-challenges-design.md` (repo convention).
- Not in scope: editing/deleting a manual challenge, non-MCQ types, server-side validation of inserts (already an open audit item SEC-06 — client limits only, same as decks today).

## 6. Verification

1. Run `supabase/manual_challenges.sql` in the Supabase SQL editor.
2. `npx tsc --noEmit` — error count must not rise above the ~19 baseline (record it first).
3. `npm run dev`, then:
   - Navbar **Create** → chooser → both tiles land on the right page; home hero "Create Deck" still opens the deck form.
   - `/create/challenge`: submit with a blank title / 1 question / no correct option / duplicate options → inline error, nothing saved. Valid form → lands on `/take/<id>` showing the typed title and a "Custom challenge" label.
   - Play it: correct/wrong feedback, leaderboard row appears (server grading unchanged), `/take/<id>/review` shows the answer key, back link goes to `/challenges`.
   - `/challenges`: the new challenge lists with its title, subject and badge; search by its title works; an existing deck-based challenge still shows the deck title and its "Review Questions" opens `/take/<id>/review` with a back link to the deck.
   - `curl -s localhost:3000/take/<id> | grep og:title` shows the custom title.
   - Publish a quick quiz from a deck to confirm the `saveQuiz` refactor didn't break deck-based publishing.
4. End of session: run the `session-summarizer` agent and commit the summary with the change (CLAUDE.md rule).
