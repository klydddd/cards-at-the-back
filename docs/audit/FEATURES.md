# New Feature Proposals

**Audit date:** 2026-09-15 · Ordered by value to the app's apparent audience: students sharing decks and competing on challenges in a class. Effort: **S** < 2 h · **M** ≈ a day · **L** several days. Each proposal notes what already exists in the codebase to build on.

---

## Tier 1: Foundations (these also fix security and data problems)

### FEAT-01 · Anonymous accounts first, real sign-in later · **L**
**Why:** This one change fixes the root causes of SEC-02, SEC-04, SEC-05, SEC-06 and BUG-03. There's no per-user progress, no ownership and no trustworthy leaderboard identity without it.

**How:**
- **Step 1:** Supabase **anonymous sign-ins** (`supabase.auth.signInAnonymously()`) on first visit. There's no login screen, but every visitor gets a stable `auth.uid()`.
- **Step 2:** Add `owner_id` to `decks`/`quizzes` and `user_id` to `card_progress`/`quiz_attempts`. Write RLS policies: owners edit or delete their own decks, and progress is private.
- **Step 3:** Optional "Save your progress" upgrade to email magic link or Google (`linkIdentity`), which keeps the same user ID and data.
- The admin password becomes an `is_admin` claim, used only for moderation.

### FEAT-02 · A "Today" review queue across all decks · **M**
**Why:** Spaced repetition only works if people come back daily. Today, due cards are only visible per deck, after you open that deck.

**How:**
- Home page section: "12 cards due across 3 decks → Start review".
- The review session pulls due cards across decks (needs per-user progress from FEAT-01, or local progress for now).
- Add a daily streak counter and an optional browser notification or email reminder.

**Builds on:** `getDueCardsList()` in `tracking.ts`, `/deck/[id]/review`.

### FEAT-03 · Search, sort and "My decks" · **S–M**
**Why:** The home page lists every public deck in one unpaginated grid with only a subject filter. That won't scale past a few dozen decks (24 today).

**How:**
- A search box using Postgres full-text search on title, description and subject.
- Sort by Newest / Most cards / Most played (count of `quiz_attempts`).
- Paginate with infinite scroll.
- "Recently studied" and "Created by me" tabs (localStorage deck IDs now, `owner_id` after FEAT-01).

---

## Tier 2: Study experience

### FEAT-04 · More study modes · **M each**
- **Learn / Write mode:** show the description, the user types the term, and the answer is checked with the improved grading (BUG-27). Much stronger recall than flip-and-self-rate.
- **Match game:** a timed grid pairing terms with descriptions. It suits the existing leaderboard idea well.
- **Reverse direction:** a toggle to show term → description. Today it's always description → term.
- **Star / flag difficult cards,** and practice only starred cards.
- **Text-to-speech** on cards (`speechSynthesis`), which helps language decks.

**Builds on:** `FlipCard`, `quizGrading.ts`, the Practice session state.

### FEAT-05 · Stats & progress · **M**
- A per-deck mastery bar (new / learning / mature, from SRS `interval`).
- A review heatmap (from `last_reviewed`).
- Challenge history per player: "your attempts on this challenge" and score trend.
- **Hardest cards:** per-question accuracy across all `quiz_attempts.answers`. The data already exists and nothing reads it yet.

### FEAT-06 · Better AI features · **M each**
- **AI-assisted grading** for identification and situational answers. When the exact match fails, ask a small model "Is `<user>` equivalent to `<answer>` for `<question>`?" Cache the verdicts per question.
- **Explain this card / give me a mnemonic** button in Practice after a "Still Learning" swipe.
- **Generation controls:** number of cards, difficulty, focus topics, and "definitions only" vs "concepts + examples".
- **Add AI cards to an existing deck,** with duplicate detection against its current cards. Today AI Parse can only create a new deck.
- **Regenerate one card** from the preview list.
- **More sources:** pasted text, a web URL, a YouTube transcript.
- **Streaming progress** *(April FEAT-05)*: show cards as they are generated.

### FEAT-07 · Multi-page scans & camera capture · **S–M**
**Why:** Students photograph handouts, and scanned PDFs currently fail silently (BUG-10).

**How:**
- Accept multiple images in one upload. `extractTextFromImages()` already exists in `ocrParser.ts:38` but is never called.
- Add `capture="environment"` on mobile so the camera opens directly.
- For PDFs with no text layer, render each page to a canvas with pdf.js and OCR it with Tesseract.

### FEAT-08 · Rich card content · **M**
- Markdown in cards (bold, lists, `code`), and KaTeX for math and chemistry.
- Image cards, stored in Supabase Storage (diagrams, anatomy).
- Cloze deletions: "The {{c1::mitochondria}} is the powerhouse of the cell" generates one card per blank.

---

## Tier 3: Sharing, classrooms & competition

### FEAT-09 · Stronger challenge modes · **M**
- **Exam mode:** no per-question reveal, answers shown only after submission. Also closes part of SEC-05.
- **One attempt per player,** with optional **time limit** and **expiry date**.
- **Per-question timer** with a speed bonus.
- **QR code** on the share screen for projecting in class.
- **Live room (Kahoot-style):** the host starts the game, players join with a 6-digit code, and questions advance in sync over Supabase Realtime.

**Builds on:** `quiz_attempts`, the leaderboard ordering index, `ShareButton`.

### FEAT-10 · Deck management for owners · **S–M**
- **Reset my progress** for a deck. `resetSRSProgress()` is implemented in `tracking.ts:144` but no UI calls it.
- **Duplicate / fork deck** *(April FEAT-02)*: copy any public deck to your own, and credit the source deck.
- **Private or unlisted decks:** shared by link only, not shown in the public feed.
- **Reorder cards** by drag and drop (the `position` column already exists).
- **Bulk edit:** paste a `term – definition` list to add many cards at once.

### FEAT-11 · Import & export · **S–M**
- **Import:** CSV/TSV, "Quizlet-style" pasted text (term⇥definition per line), and Anki `.apkg` (via `sql.js`).
- **Export:** CSV, printable PDF study sheet, and printable quiz with an answer key.

### FEAT-12 · Classes · **L**
- A teacher creates a class and students join with a code.
- Teachers assign decks or challenges with due dates.
- The class dashboard shows who completed what, average scores, and the hardest questions (from FEAT-05 data).

### FEAT-13 · Moderation & admin dashboard · **M**
**Why:** Anyone can publish publicly, and moderation today is one deck at a time behind a password.

**How:**
- A "Report" button on decks and challenges, stored in a `reports` table.
- `/admin` lists reported and recent content with bulk hide or delete, an audit log of admin actions, and a per-IP creation counter to spot spam.

---

## Tier 4: Platform

### FEAT-14 · Installable, offline-capable PWA · **M**
- Web app manifest and service worker, so the app can be added to the home screen.
- Cache the decks you've opened, and practice or review offline. Ratings queue locally (tracking already writes localStorage first) and sync when back online (pairs with ERR-06).

### FEAT-15 · Usage insight for the maintainer · **S**
- Vercel Analytics custom events: `deck_created`, `ai_parse_success/fail` (with model), `challenge_published`, `attempt_submitted`, `review_completed`.
- A weekly Gemini cost and request-count view (pairs with ERR-08). This shows which features people actually use before more are built.
