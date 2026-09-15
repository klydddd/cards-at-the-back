# Improvements: Code Quality, Performance, UX, Accessibility & Docs

**Audit date:** 2026-09-15 · These aren't bugs. They make the app easier to change, faster, and nicer to use. Effort: **S** < 2 h · **M** ≈ a day · **L** several days.

---

## Architecture & code quality

### IMP-01 · Extract one shared `QuizRunner` component · **M** · high value
About 250 lines of question rendering, feedback and results UI are copied almost line for line into three files:
- `src/app/deck/[id]/quiz/page.tsx:418-579`
- `src/app/deck/[id]/quick-quiz/page.tsx:365-487`
- `src/app/take/[quizId]/TakeQuizClient.tsx:299-457`

The copies have already drifted (e.g. `key` formats, "Skipped" rendering, Quick Quiz lacks enumeration and situational). Any fix to BUG-13, BUG-27 or accessibility now has to be made three times.

**Proposal:**
- `components/quiz/QuestionView.tsx` renders one question with input and feedback.
- `components/quiz/ResultsList.tsx` renders the answer review.
- `hooks/useQuizSession(questions)` owns `currentQ`, `answers`, `feedback`, `submit` and `next`.

Each page then only handles its own concerns: generation, publishing, or leaderboard submission.

### IMP-02 · Extract a card-session hook for Practice and Review; delete `add_swipe.cjs` · **M**
`practice/page.tsx` and `review/page.tsx` duplicate the animation state machine (`isAnimatingOut`/`isAnimatingIn`/`swipeOffset`/`swipeAction`), keyboard handling and the swipe badge. Review has no touch swipe because the code was copied over only in part. `add_swipe.cjs` at the repo root is a one-off string-replace script used to patch those pages; it's dead and should be removed.

**Proposal:** `useCardSwipe({ onLeft, onRight })` returning `{ ref, style, badge, busy }`, which also fixes BUG-01 in one place. Share a `<SwipeableFlipCard>`.

### IMP-03 · Type the data layer and turn on `strict` · **M**
- `src/lib/supabase.ts`, `tracking.ts`, `srs.ts`, `mcqGenerator.ts` and `docParser.ts` are mostly untyped (implicit `any` parameters).
- Pages use `useState<any>` and `catch (err) { err.message }`.
- Generate DB types with `npx supabase gen types typescript --project-id fiqrpudjzdyhohocbulx > src/types/database.ts` and use `createClient<Database>()`.
- Split `Card` (persisted, `id: string`) from `CardDraft` (`{ front, back }`). That alone clears 6 of the 19 TS errors (ERR-01).
- Enable `"strict": true` and `"noUncheckedIndexedAccess": true`, starting with `src/lib`.

### IMP-04 · Validate every write on the server · **M**
Today the browser writes decks, cards and quizzes straight to Supabase with the anon key (SEC-06). Move them to route handlers or Server Actions with shared **zod** schemas (`DeckInput`, `CardInput`, `QuizQuestion`). The same schemas can validate AI output (BUG-13) and client forms, so limits are defined once.

### IMP-05 · Use one progress model · **S–M**
There are two parallel systems: the legacy "learned" `Set` in localStorage (`cards_tracking_*`) and the SM-2 `card_progress`. Every rating writes both (`tracking.ts:96-101`). Keep SRS only, derive "learned" from `repetitions > 0 && !isDue(progress)`, and migrate old localStorage keys once on load.

### IMP-06 · Make SRS more useful · **S**
- Only 2 of the 4 SM-2 ratings are exposed (AGAIN, GOOD). `Rating.HARD`/`EASY` and `previewIntervals()` exist but no UI uses them.
- Show the next interval under each button ("Again · now", "Good · 6 days").
- Consider migrating to **FSRS** (`ts-fsrs`), which schedules more accurately than SM-2 with the same UI.

### IMP-07 · Remove dead code · **S**
| Symbol | Where |
|---|---|
| `isGeminiReady()` (always `true`, never called) | `src/lib/gemini.ts:3-7` |
| `fetchSingleCardProgress()` | `src/lib/supabase.ts:208-219` |
| `getDueCards()` | `src/lib/srs.ts:86-88` |
| `resetSRSProgress()` / `resetDeckSRS()`: no UI calls them (but see FEAT-10) | `tracking.ts:144`, `supabase.ts:245` |
| `extractTextFromImages()`: unused, but useful (FEAT-07) | `ocrParser.ts:38-52` |
| Unused imports `formatInterval`, `previewIntervals` | `practice/page.tsx:9`, `review/page.tsx:9` |
| Unused state `srsProgress`, `lastFeeling` | `practice/page.tsx:38, 48` |
| Commented-out keyboard hints (restore them instead; see IMP-11) | `practice/page.tsx:510-512`, `review/page.tsx:264-266` |
| `tsconfig.tsbuildinfo` **is committed**; add it to `.gitignore` | repo root |
| Vite leftovers in `.gitignore` (`dist`, `dist-ssr`) | `.gitignore` |

### IMP-08 · Use Server Components for initial data · **M**
`deck/[id]/page.tsx` and `take/[quizId]/page.tsx` already fetch the deck or quiz on the server for `generateMetadata`, then the client component fetches it **again** on mount. That's two round-trips plus a spinner.

**Proposal:** Wrap the fetch in React `cache()`, fetch in the server `page.tsx`, pass `initialDeck`/`initialCards` as props, and call `notFound()` on failure (fixes BUG-21). The home page deck list can also be server-rendered, which is better for SEO and time to first content.

---

## Performance

### IMP-09 · Remove per-card localStorage parsing on the deck page · **S**
`DeckViewClient.tsx:172` calls `getLearnedCardIds(id)` **inside `cards.map`**, doing a `localStorage.getItem` + `JSON.parse` + `new Set` for every card on every render. Large decks (the live DB averages about 45 cards per deck) re-parse dozens of times whenever any state changes, e.g. opening the delete modal or typing the password. Compute the set once in `load()` and keep it in state.

### IMP-10 · Bound payloads and lazy-load heavy parsers · **S–M**
- **Home page:** `fetchDecks()` loads **every** deck with nested card counts. Add pagination (`range(0, 23)`) and search (FEAT-03).
- **AI Quiz:** sends the whole deck to Gemini. Sample up to ~80 cards, weighted toward cards the user struggles with, which is cheaper and faster.
- **`/ai-parse`:** statically imports `tesseract.js` (via `ocrParser.ts`) and `mammoth` (via `docParser.ts`). Use `await import()` inside `handleFile`, as `pdfParser.ts` already does, so users who only upload a `.md` don't download them.
- **Tesseract:** re-creates a worker for every image. Reuse one `createWorker('eng')` per session, and terminate it on unmount.

### IMP-11 · Cut down inline styles · **M**
Hundreds of `style={{…}}` objects repeat the same values (rounded pill buttons, badge sizes, card padding, feedback boxes). They also hard-code colours that bypass the theme tokens (`'#fff'`, `'#10b981'` in `practice/page.tsx:17-19`, `rgba(0,0,0,0.5)` overlays), which hurts dark-mode contrast. Move them into `globals.css` utilities or CSS Modules (`.pill`, `.feedback--correct`, `.modal-backdrop`).

---

## UX

### IMP-12 · Improve feedback and prevent lost work · **S each**
- Show a progress state while extracting PDF, DOCX or PPTX text (BUG-10).
- Warn before leaving `/create` or `/ai-parse` with unsaved cards (`beforeunload` + in-app link guard).
- Show file-size and page limits in the drop zone, and reject files over ~20 MB before parsing.
- Restore the keyboard-shortcut hints ("Space flip · ← still learning · → know it") and hide them on touch devices.
- Hide admin Edit/Delete behind an explicit admin mode (SEC-04).
- Confirm destructive edits: removing existing cards in Edit Deck (BUG-23).
- Show "Generated 18 of 20 requested questions" when the AI under-delivers.
- After publishing a challenge, show the link as text (not only a copy button), with a QR code for classrooms.

### IMP-13 · Accessibility · **M**
A search for `aria-`, `role=` and `maxLength` in `src/app` finds **zero** matches.
- **Labels not associated:** `<label className="label">` is a sibling of the input, not wrapping it, and has no `htmlFor` (e.g. `CardForm.tsx:21-28`), so screen readers read unlabeled inputs. Use `useId()` + `htmlFor`.
- **Delete modal** (`DeckViewClient.tsx:261-319`): no `role="dialog"`/`aria-modal`, no focus trap, no Escape to close, focus not returned. Use `<dialog>`.
- **Icon-only buttons:** "×" remove buttons (`ai-parse/page.tsx:431-437, 539-545`) and "✓" mark-correct buttons have no `aria-label`.
- **State not exposed:** toggle buttons (parse mode, T/F correct answer, subject filters) need `aria-pressed`. Progress bars need `role="progressbar"` with `aria-valuenow`.
- **Feedback not announced:** "Correct!/Incorrect" should be an `aria-live="polite"` region.
- **Swipe-only cues:** swipe feedback is colour + arrow only; this is acceptable since buttons exist, but the buttons should say what the arrow keys do.
- **Reduced motion:** `prefers-reduced-motion` is handled in CSS (`globals.css:236`), but the JS swipe animations in Practice/Review ignore it.

### IMP-14 · Metadata & SEO · **S**
- No `metadataBase` in `layout.tsx`, so Open Graph URLs are relative and share previews (the Share button's main use) may have no image.
- Add an OG image, route-level titles for `/create` and `/ai-parse`, and `robots.ts` / `sitemap.ts` listing public decks.

---

## Database & operations

### IMP-15 · Put the schema under version control · **M**
The repo's SQL no longer describes production:

| Repo says | Live DB has |
|---|---|
| `supabase/current.sql`: FKs **without** `ON DELETE CASCADE`, no `source_kind` | All FKs `ON DELETE CASCADE`; `source_kind` exists |
| `migration.sql`: `"Public read quiz attempts"` policy | **No** policy on `quiz_attempts` (BUG-07) |
| No update policy on `quizzes` | `"Public update quizzes" USING (true)` (SEC-01) |
| — | `rls_auto_enable()` event-trigger function |
| `card_progress` defined in a root-level file | `supabase_migration_card_progress.sql` should live in `supabase/` |

**Proposal:**
- Adopt Supabase CLI migrations: `supabase db pull` to snapshot production, then commit every change as a numbered migration.
- Drop the legacy `quizzes.answers`/`score` columns once no code reads them. Only 4 old rows use them, and `fetchQuizChallengesByDeck` filters them out with `is null`.
- Add the `CHECK` constraints from SEC-06, and `updated_at` on `decks`/`cards`.

### IMP-16 · Tests and CI · **M** · high value
There are no tests. The pure modules are easy to test and have caused bugs:
- `srs.ts`: interval progression, ease floor.
- `quizGrading.ts`: booleans as strings, enumeration order, punctuation.
- `mcqGenerator.ts`: duplicate backs (BUG-17).
- `ocrParser.ts`: lines starting with "A " (BUG-14).
- `docParser.ts`: entity decoding.

**Proposal:** `vitest` for `src/lib`, plus one Playwright smoke test (create deck → practice → quick quiz → publish → take). Add a GitHub Actions workflow running `lint`, `tsc --noEmit`, `test` and `build` on every PR.

### IMP-17 · Documentation drift · **S**
- **`README.md`:** still describes **Vite + React Router**, `VITE_*` env vars, port 5173, a `dist/` output, `src/pages/`, and "Supabase Auth" (not used). Rewrite it for Next.js.
- **`.claude/CLAUDE.md`:**
  - says Next.js 15 (installed: **16.2.3**) and "No Server Components are used yet" (`deck/[id]/page.tsx` and `take/[quizId]/page.tsx` are Server Components);
  - tells readers to delete `gemini.js`/`quizGenerator.js`, which are already gone;
  - omits `quiz_attempts`, `source_kind`, the admin routes, `parse-ocr`, OCR, `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD`.
- **`GEMINI.md`:** lists the model order differently from the code, and mentions ZIP upload, which doesn't exist.
- **`.claude/AUDIT.md` / `TASKS.md`:** several items are fixed (BUG-01, BUG-02, DEBT-02) but still unchecked. Mark them superseded by `docs/audit/`.
- **`package.json`:** `"name"` is fine, but `"version": "0.0.0"` and there's no `engines.node`. Add `"engines": { "node": ">=20" }`.
