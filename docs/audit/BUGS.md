# Bugs & Logic Flaws

**Audit date:** 2026-09-15 · **Scope:** functional defects found by reading every file in `src/`, cross-checked against the live Supabase schema.

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low. Each entry gives **where**, **repro/impact**, and **fix**. Security issues live in `SECURITY.md`; compiler, tooling and runtime-error issues live in `ERRORS.md`.

"Verify" means the conclusion comes from reading the code and should be confirmed in a browser before fixing.

---

## Study modes (Practice / Review / SRS)

### BUG-01 🟠 Repeated key presses or taps rate the same card several times

**Where:** `src/app/deck/[id]/practice/page.tsx:101-145`, `src/app/deck/[id]/review/page.tsx:50-87`.

`handleMarkLearned`, `handleMarkLearning` and `handleRate` have no "in progress" guard. The next card only appears after a 300 ms `setTimeout`, and in Review only after `await rateCard(...)` (a network call) finishes. Until then, `current` still points at the same card.

**Repro:** In Practice, hold → (keyboard auto-repeat), or tap "Know It" twice quickly.

**Impact:**
- `rateCard(GOOD)` runs several times for one card, so its interval jumps 1 day → 6 days → 15 days in under a second.
- `cardsSeenSinceCheckIn` over-counts, so the check-in fires early.
- Several `goTo(current + 1)` timers fire, all with the same stale index.
- In Review, "Again" can re-queue the same card several times.

**Fix:** Keep a `busyRef` (a `useRef(false)`) that is set on entry and cleared once the next card is shown. Ignore `KeyboardEvent.repeat`. In Review, advance the UI first and persist the rating in the background.

---

### BUG-02 🟠 Practice mode changes the SRS schedule (cramming inflates intervals)

**Where:** `practice/page.tsx:126, 141` (calls `rateCard`), and `154-170` (re-inserted review cards).

Every "Know It" in Practice is recorded as an SRS `GOOD`. The check-in step then re-inserts up to 3 cards from the same batch, and rating those `GOOD` again **the same day** moves them from `repetitions 1 → 2`, i.e. a 6-day interval. So a card you saw for the first time 10 minutes ago isn't due again for 6 days.

**Fix:** Pick one:
- Practice doesn't write SRS at all (only the legacy learned set), and Review is the only place that schedules.
- Only the **first** rating per card per session is sent to `rateCard`.

---

### BUG-03 🟠 SRS progress is shared by every visitor, and two progress systems disagree

**Where:** `card_progress` has `UNIQUE (card_id)` and no user column; `src/lib/tracking.ts:61-113`; `DeckViewClient.tsx:39-45`.

- The "due for review" count and the review queue come from **one global row per card**. When a classmate reviews a deck, your due list changes.
- "Learned / learning" comes from **localStorage on this device only** (`cards_tracking_<deckId>`). The deck page can show "10 learned" next to "25 due", computed from two unrelated sources.
- `rateCard` starts from the **localStorage copy** (`tracking.ts:82-83`) and upserts the result. Whatever it computes overwrites newer DB values written from other devices or by other people (last write wins).

**Fix:** Keep progress per user: local-only now, per `auth.uid()` after FEAT-01. Derive "learned" from SRS (`repetitions > 0 && !isDue`) and remove the legacy learned set (see IMP-05).

---

### BUG-04 🟠 "Practice Not Learned" from the results screen crashes or spins forever

**Where:** `practice/page.tsx:372-383` (link handler), `57-81` (load effect), `396-397` (`cards[current].id`).

The link only calls `setFinished(false); setLoading(true)`. Changing the query string doesn't remount the page component, so:

1. **Crash:** Coming from Practice All, `?filter=not-learned` re-runs the load effect with a shorter list, but `current` still holds the last index of the old list. `cards[current]` is `undefined`, and `card.id` throws `TypeError`. There is no error boundary, so the page goes blank (ERR-05).
2. **Infinite spinner:** If you're **already** in `?filter=not-learned`, the URL doesn't change and the effect doesn't re-run, so `loading` stays `true` forever.

**Fix:** In `load()`, reset `current`, `finished`, `cardsSeenSinceCheckIn`, `checkInCount` and `reviewInsertedRef`, and drop the manual `setLoading(true)`. Alternatively, recompute the filtered list in place with a button instead of a `Link`.

---

### BUG-15 🟡 Space doesn't flip the card after you click it

**Where:** `src/components/FlipCard.tsx:21` plus the window listeners at `practice/page.tsx:200-203` and `review/page.tsx:93-96`.

Clicking the card focuses it (`tabIndex={0}`). On the next Space press, **both** handlers run. First React's `onKeyDown` calls `setFlipped(!flipped)`, which sets `true`. Then the window listener calls `toggle()`, i.e. `f => !f`, which sets it back to `false`. The card doesn't move. Also, `FlipCard`'s own handler doesn't call `preventDefault`, so on other pages Space scrolls.

**Fix:** Handle Space in one place only. Either `e.stopPropagation(); e.preventDefault()` inside `FlipCard`, or remove its `onKeyDown` when a parent owns the shortcuts. Also add Enter.

---

### BUG-16 🟡 In Review, the card turns invisible while the rating saves

**Where:** `review/page.tsx:53-66`.

`setIsAnimatingOut(true)` sets opacity to 0, then the code `await`s `rateCard()`, which includes the Supabase upsert, **before** scheduling the next card. On a slow connection the screen stays blank for the whole request. The arrow-key handlers also lack `preventDefault`, so the page scrolls horizontally on narrow screens.

**Fix:** Advance first and persist in the background (as Practice does). Add `preventDefault` to the arrow keys.

---

## Challenges & Quizzes

### BUG-05 🟠 Clicking "Start Challenge" without a name leaves you stuck on an error page

**Where:** `src/app/take/[quizId]/TakeQuizClient.tsx:60-64` and `120-128`.

`startQuiz` sets `error` while `started === false`. The early return `if (error && !started)` then replaces the **whole** start screen with a full-page error that has only a "Go Home" button. The inline error box meant for this case (line 151) can never render.

**Fix:** Keep load errors and validation errors in separate state (e.g. `loadError` vs `formError`), or disable the button until a name is entered.

---

### BUG-06 🟠 AI Quiz and Quick Quiz errors throw away your settings or generated quiz

**Where:**
- `src/app/deck/[id]/quiz/page.tsx:181-189`: any generation failure (the most common failure in this flow) replaces the setup screen with an error and a "Go Back" link. The inline `{error && …}` at line 203 is unreachable.
- `src/app/deck/[id]/quick-quiz/page.tsx:149-157`: a **publish** failure on the "Quick Quiz Ready" screen (`started === false`) replaces the screen and **discards the generated quiz**.

**Fix:** Same as BUG-05. Only use the full-page error for load failures.

---

### BUG-07 🟠 The leaderboard on the challenge start screen is always empty

**Where:** `src/lib/supabase.ts:141-155` (`fetchQuizAttempts` uses the anon client); live RLS on `quiz_attempts` has **no SELECT policy**.

With the anon key, RLS returns `[]` without an error. The start screen shows "No attempts yet. Be the first score on the board." even though the live DB has 9 attempts. The board only appears after you submit, because that response is built with the service role.

**Fix:** Load the leaderboard through a server route using the service role, returning only `player_name, score, question_count, elapsed_ms`. Alternatively, add a SELECT policy on a view that excludes `answers`. Update `supabase/migration.sql` to match whichever you choose.

---

### BUG-08 🟡 "Quit" and "Play Again" on a challenge appear to do nothing *(verify)*

**Where:** `TakeQuizClient.tsx:276-278` (Play Again), `307-309` (Quit).

Both are `<Link href={`/take/${quizId}`}>`, which is the URL you're already on. In the App Router this is a soft navigation that re-renders the same client component with the same props, so React **keeps its state** (`started`, `showResults`, `answers`). You stay on the results or question screen.

**Fix:** Replace them with buttons that reset state (`setStarted(false); setShowResults(false); setAnswers({}); setCurrentQ(0); setSubmission(null)`), or give the client component a `key` that changes.

---

### BUG-13 🟠 Invalid AI-generated questions can leave players stuck

**Where:** `src/app/api/gemini/quiz/route.ts:80-84` returns `JSON.parse` output unchanged; `parse-ocr/route.ts:118` passes through unknown types; the runners are `quiz/page.tsx:444-532` and `TakeQuizClient.tsx:327-415`.

Failure cases:
- **Unknown `type`** (e.g. `"fill_in_the_blank"`, `"Multiple Choice"`): no input renders, so there's no Submit and no way forward. The player is stuck on that question.
- **`multiple_choice` without `options`**: no buttons, same result.
- **`answer` not exactly one of `options`** (whitespace or casing differences): the question can never be answered correctly, and no option is highlighted as correct.
- **`true_false` with `"answer": "true"` (a string)**: `isAnswerCorrect` compares `true === "true"` (`quizGrading.ts:54-56`), so every answer is marked wrong.
- **Fewer questions than requested:** the user isn't told.

Published challenges store these objects permanently.

**Fix:** Add one `normalizeQuestion()` on the server:
- Map type aliases to known types.
- Coerce `"true"`/`"false"` to booleans.
- For MCQ, trim options, dedupe them, and require `answer ∈ options` (case-insensitive match, then snap to the exact option string).
- Drop anything invalid.

In the runner, render a "Skip" fallback for unknown types.

---

### BUG-17 🟡 Quick Quiz can generate duplicate options and wrong True/False questions

**Where:** `src/lib/mcqGenerator.ts:11-22, 24-46`.

- When cards share a `back` value (common in AI-generated decks, e.g. several cards with back "Stack"), MCQ distractors can match the correct answer. The user sees the same option twice, or two "correct" buttons.
- A True/False "false" question picks `wrongCard.back`. If that equals `card.back`, the statement is actually **true** but is graded false.
- The shuffle `sort(() => Math.random() - 0.5)` is biased *(DEBT-03)*.

**Fix:** Build distractors from **unique** `back` values that differ from the answer (case-insensitive). Pick the wrong card from cards whose `back` differs. Use a Fisher–Yates shuffle.

---

### BUG-24 🔵 A failed challenge submission sends you back to the last question with your answer gone

**Where:** `TakeQuizClient.tsx:72-100`.

`goNext` clears `feedback` before submitting. If the POST fails, the user lands back on the last question with an empty input and an error banner, and has to answer again to retry.

**Fix:** Show a results-pending screen with a "Retry submit" button that re-sends the saved `answers`.

---

### BUG-25 🔵 The quiz review page doesn't check that the quiz belongs to the deck in the URL

**Where:** `src/app/deck/[id]/quiz/[quizId]/page.tsx:17-24`.

`/deck/A/quiz/<quiz-of-deck-B>` renders deck A's title above deck B's questions.

**Fix:** If `quiz.deck_id !== deckId`, show not-found or redirect to the correct deck.

---

### BUG-26 🔵 The quiz API crashes or miscounts on a malformed `questionTypeCounts`

**Where:** `quiz/route.ts:29-34`.

A missing `questionTypeCounts` makes `Object.entries(undefined)` throw a `TypeError`, which becomes a 500 with the raw message. String counts concatenate: `0 + "2" + "3"` is `"023"`, and that string ends up in the prompt as the total.

**Fix:** Validate the input: an object whose keys are in the allowlist and whose values are integers from 0 to 50. Return 400 otherwise.

---

### BUG-27 🔵 Free-text grading is stricter than users expect

**Where:** `src/lib/quizGrading.ts:3-59`.

- **Identification / situational:** only whitespace and case are ignored. "the mitochondria", "Mitochondria." and "mitochondrion" are all wrong.
- **Enumeration:** requires exactly the same set of items. Items that contain commas (e.g. "Paris, France") get split apart, and "A and B" fails.

**Fix:**
- Normalize punctuation, leading articles and extra spaces.
- For enumeration, give partial credit or match items one by one, and accept newline-separated input.
- Consider fuzzy or AI grading (FEAT-06).

---

## Deck creation & AI Parse

### BUG-09 🟠 AI Parse can leave you on a blank page with no way back

**Where:** `src/app/ai-parse/page.tsx:417` and `520`.

Both preview blocks render only when `cards.length > 0` or `questions.length > 0`, and the "← Re-upload" button is **inside** those blocks. The user is stuck with just a heading when:
- the AI returns `[]` (e.g. the document is mostly images or tables), or
- the user deletes every card or question with ×.

The only way out is reloading the page.

**Fix:** Render the preview container whenever `step === 'preview'`, with an empty state ("No cards generated — try another file or mode") and the Re-upload button always visible.

---

### BUG-10 🟡 A new file can show the previous file's text, and scanned PDFs fail silently

**Where:** `ai-parse/page.tsx:48-97, 328`.

- `handleFile` sets the new `file` but only replaces `parsedContent` on success. If the second file fails to parse, the UI shows the **new filename** with the **old file's text**, and "Generate" uses that old text.
- An image-only or scanned PDF yields `''` with no error. The condition `parsedContent && !ocrProcessing` hides everything, so nothing happens after the drop.
- PDF, DOCX and PPTX extraction show no progress indicator. Large PDFs look frozen for several seconds.

**Fix:**
- Call `setParsedContent('')` at the start of `handleFile` and add an `extracting` state with a spinner.
- If extracted text is under ~50 chars, show "No selectable text found. This looks like a scanned PDF. Try exporting pages as images to use OCR." (or run OCR on rendered pages; see FEAT-07).

---

### BUG-11 🟡 `.ppt` uploads always fail, and `.pptx` text is garbled

**Where:** `ai-parse/page.tsx:14, 87-88`; `src/lib/docParser.ts:16-46`.

- `.ppt` is listed as supported, but legacy PowerPoint is a binary format, not a ZIP, so `JSZip.loadAsync` throws "End of central directory not found".
- XML entities aren't decoded: `R&amp;D`, `&lt;T&gt;`, `&quot;` end up verbatim in the text sent to the AI and in the cards.
- Speaker notes (`ppt/notesSlides/*.xml`) are ignored, even though they often hold the best explanatory text.
- An empty presentation returns the string `'No text content found in the presentation.'`, which is then **sent to Gemini as content** and generates nonsense cards.

**Fix:**
- Remove `.ppt` from the accepted list, or show "Save as .pptx".
- Parse slide XML with `DOMParser` and read `textContent`, which decodes entities.
- Optionally include notes.
- Return `''` for no text and let the UI handle it (BUG-10).

---

### BUG-12 🟡 Editing the text of the correct MCQ option unmarks it as correct

**Where:** `ai-parse/page.tsx:183-190` (`updateQuestionOption`), `575, 588` (correct-answer check `opt === q.answer`).

`answer` is stored as the option's **text**. Fixing a typo in the correct option ("Mitocondria" → "Mitochondria") leaves `answer` as the old string. No option matches, so the saved challenge has **no correct answer** and everyone gets that question wrong.

**Fix:** When the edited option equals the current answer, update `answer` too, or track the answer as an index while editing and convert to text on save. Block saving an MCQ whose `answer` isn't in `options`.

---

### BUG-14 🟡 The Tesseract-only MCQ parser marks option A correct and misreads question lines

**Where:** `src/lib/ocrParser.ts:143, 194` (answer), `79, 99, 128` (`optionLooseRegex`).

- Every extracted question gets `answer: options[0]`. The UI never says so, so users save challenges where A is always "correct".
- `optionLooseRegex` (`/^\s*\(?([A-Da-d])\)?\s+(.{2,})/`) matches **any line starting with a single A–D followed by a space**, such as "A process that…", "a data structure…" or "B vitamins are…". Continuation lines of a question are treated as options, which garbles both the question and its choices.

**Fix:**
- Leave `answer` empty and require the user to pick one before saving (highlight unanswered questions).
- Only use the loose regex when the previous line was an option, or require the letters to appear in sequence (a, b, c…).

---

### BUG-18 🟡 Multi-step saves leave partial data behind when a step fails

| Flow | Where | Failure leaves |
|---|---|---|
| Create deck | `create/page.tsx:65-66` | Public deck with **0 cards** if the cards insert fails |
| AI Parse → deck | `ai-parse/page.tsx:210-211` | Same |
| AI Parse → deck + quiz | `ai-parse/page.tsx:234-252` | Deck with cards but no quiz, or an empty deck; retrying creates **duplicates** |
| Admin edit | `api/admin/edit-deck/route.ts:79-119` | New cards inserted, then an update fails, so some edits are applied and some aren't |
| Admin delete | `api/admin/delete-deck/route.ts:40-53` | Errors from the first four deletes are **ignored**; the deck delete can then fail after cards are gone |

**Fix:** Use Postgres functions called via `rpc()` so each flow runs in a single transaction: `create_deck_with_cards(deck jsonb, cards jsonb)`, `replace_deck_cards(...)`. The live FKs already have `ON DELETE CASCADE`, so delete-deck can be a **single** `delete from decks where id = $1`.

---

### BUG-19 🟡 AI Parse can save cards with an empty front or back

**Where:** `ai-parse/page.tsx:201-211`; `api/gemini/parse/route.ts:58-61` turns missing fields into `''`.

`saveDeck` only checks `cards.length >= 2`. Cards the AI returned half-empty, or that the user cleared while editing, get saved. (The live DB has 0 blank cards today, but the path exists.) Manual create filters them out; AI Parse doesn't.

**Fix:** `const valid = cards.filter(c => c.front.trim() && c.back.trim())`, same as `create/page.tsx:60`. Filter on the server as well.

---

## Deck page, edit & global UI

### BUG-20 🟡 Theme hydration mismatch and a white flash for dark-mode users

**Where:** `src/components/Navbar.tsx:9`, `src/lib/theme.ts:3-16`, `src/app/layout.tsx`.

`useState(getInitialTheme())` returns `'light'` on the server and possibly `'dark'` in the browser. That causes a React hydration mismatch warning and the wrong icon on first render. `data-theme` is only set in an effect after hydration, so every page load flashes the light theme.

**Fix:** Add a tiny inline `<script>` in `layout.tsx` `<head>` that sets `document.documentElement.dataset.theme` from localStorage or `prefers-color-scheme` before paint, plus `suppressHydrationWarning` on `<html>`. Read the theme in `useEffect` in `Navbar`.

---

### BUG-21 🔵 Bad or deleted deck and quiz URLs show raw database errors

**Where:** `DeckViewClient.tsx:46-48`, `TakeQuizClient.tsx:50-51`, all study pages.

`/deck/not-a-uuid` shows `invalid input syntax for type uuid: "not-a-uuid"`. A deleted deck shows `JSON object requested, multiple (or no) rows returned`. The app has no `not-found.tsx`.

**Fix:** In the server `page.tsx` wrappers (which already fetch the deck for metadata), call `notFound()` when the fetch fails. Add `src/app/not-found.tsx`.

---

### BUG-22 🔵 Copy-link buttons can fail silently or throw unhandled errors

**Where:** `DeckViewClient.tsx:80-87`, `quiz/page.tsx:157-163`, `quick-quiz/page.tsx:125-131`, `components/ShareButton.tsx:24-30`.

`navigator.clipboard.writeText` rejects when permission is denied, in insecure contexts (plain-http LAN testing) and in some in-app browsers. The three page handlers have no `try/catch`, so the rejection is unhandled. `ShareButton` swallows it and shows no feedback.

**Fix:** Share one `copyToClipboard()` helper with a `textarea` + `execCommand` fallback, and show "Couldn't copy, long-press to copy" with the URL visible.

---

### BUG-23 🔵 Edit Deck "unlocks" with any password, and removing cards has no confirmation

**Where:** `src/app/deck/[id]/edit/page.tsx:64-79, 97-99`.

- `handleUnlock` accepts any non-empty string. You only learn the password was wrong after making all your edits and pressing Save, which then re-locks the form.
- Removing an existing card and saving **permanently deletes the card and its SRS progress** with no confirmation or undo.

**Fix:** Verify the password against the server on unlock (see SEC-04 login cookie). Before saving, show "You're removing N existing cards".

---

### BUG-28 🔵 Small UI defects

- Typo on the home page: "Create, share, and practice **flashkards**." (`src/app/page.tsx:70`).
- The practice check-in collects a feeling (`lastFeeling`, `practice/page.tsx:48, 148`) and never uses it. The follow-up text promises review cards regardless of the answer.
- "Card X of Y" grows mid-session as review cards are inserted, and the progress bar jumps backwards (`practice/page.tsx:164-169, 517`).
