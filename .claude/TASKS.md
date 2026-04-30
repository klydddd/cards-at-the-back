# Cards at the Back — Task Board

This is the living task board for the project. Findings are sourced from `AUDIT.md`.
For full descriptions, vulnerable code blocks, and patched implementations, refer to `AUDIT.md`.

---

## ✅ Completed — Next.js Migration

All migration tasks are complete. The app has been fully migrated from Vite + React Router DOM to Next.js 15 App Router with TypeScript.

<details>
<summary>View completed migration tasks</summary>

- [x] Initialize Next.js, remove Vite dependencies, update `package.json` scripts
- [x] Rename env vars to `NEXT_PUBLIC_*` / `GEMINI_API_KEY` convention
- [x] Delete `vite.config.js`, `index.html`, `src/main.jsx`
- [x] Create root layout (`src/app/layout.tsx`) with Navbar + Analytics
- [x] Migrate global styles to `src/app/globals.css`
- [x] Install TypeScript, create `tsconfig.json`, generate `next-env.d.ts`
- [x] Rename app shell files to `.tsx`
- [x] Create `src/types/index.ts` for shared interfaces
- [x] Replace all `react-router-dom` `<Link to>` with Next.js `<Link href>`
- [x] Replace `useNavigate` with `useRouter` from `next/navigation`
- [x] Replace `useParams` with Next.js App Router equivalent
- [x] Migrate all pages to `src/app/` App Router directory structure
- [x] Rename component files to `.tsx` and add TypeScript props
- [x] Rename lib files to `.ts` and update env var references
- [x] Move Gemini API key server-side via `/api/gemini/*` routes
- [x] Test dev build, production build, and end-to-end user flows
- [x] Uninstall `react-router-dom`

</details>

---

## 🔴 Critical Security — Fix Before Any Public Sharing

> These are active vulnerabilities. The app should not be used by real users until these are resolved.

- [ ] **[SEC-01]** Add IP-based rate limiting to `/api/gemini/parse` and `/api/gemini/quiz`
  - Install `@upstash/ratelimit` + `@upstash/redis`
  - Apply `slidingWindow(10, '1 m')` per IP to both routes
  - Return `429` with `X-RateLimit-*` headers on excess

- [ ] **[SEC-02]** Fix prompt injection — add strict data delimiter in both API routes
  - Wrap user content with `===USER_CONTENT_START===` sentinel in parse route
  - Allowlist `questionTypeCounts` keys against `ALLOWED_QUESTION_TYPES` set in quiz route
  - Never interpolate raw user strings directly into system instruction strings

- [ ] **[SEC-03]** Add content size limits to parse route
  - Add `MAX_CONTENT_CHARS = 50_000` guard with `413` response
  - Set Next.js `experimental.serverActions.bodySizeLimit = '512kb'` in `next.config.mjs`

- [ ] **[SECRET-01]** Rotate live credentials
  - Rotate the Gemini API key at Google AI Studio immediately
  - Verify current key is revoked
  - Generate and store a fresh key in `.env`

- [ ] **[SECRET-01]** Add pre-commit hook to prevent future secret leaks
  - Install `gitleaks` or `git-secrets`
  - Add `"precommit": "gitleaks detect --source . --no-git"` to `package.json`

---

## 🟠 High — Fix Before Next Deploy

- [ ] **[SEC-04]** Move score computation server-side
  - Create `src/app/api/quiz/[id]/submit/route.ts`
  - Accept only `answers` from client; load questions from DB and compute score on server
  - Remove `score` from the client-to-server payload in `take/[quizId]/page.tsx`

- [ ] **[SEC-04]** Add ownership check to `updateQuizResults`
  - Only allow updates to quiz records the caller created (once auth is in place)
  - Until then, move it behind the new server-side submit route

- [ ] **[SEC-05]** Add ownership check to `resetDeckSRS`
  - Move the delete operation to a server-side API route
  - Block direct client-side calls to Supabase for destructive operations

- [ ] **[SECRET-02]** Verify Supabase Row Level Security is enabled on all tables
  - Open Supabase Dashboard → Authentication → Policies
  - Confirm RLS is active on: `decks`, `cards`, `quizzes`, `card_progress`
  - Confirm no overly permissive `USING (true)` policies exist on write operations

- [ ] **[BUG-01]** Eliminate phantom quiz records — consolidate into one atomic write
  - Create `saveQuizAttempt()` in `supabase.ts` that inserts `answers` and `score` in the same row
  - Replace the `saveQuiz()` + `updateQuizResults()` two-step in `take/[quizId]/page.tsx`

- [ ] **[DEBT-01]** Remove `typescript: { ignoreBuildErrors: true }` from `next.config.mjs`
  - Fix all type errors that surface after removal
  - Generate Supabase TypeScript types: `npx supabase gen types typescript --project-id <id>`

---

## 🟡 Medium — Fix This Sprint

- [ ] **[SEC-07]** Add HTTP security headers to `next.config.mjs`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` covering self, Supabase, Gemini, Vercel Analytics

- [ ] **[SEC-08]** Sanitize raw error messages before displaying to users
  - Replace all `.catch((err) => setError(err.message))` patterns
  - Log full error with `console.error` and show a safe generic message to the user

- [ ] **[SEC-09]** Validate `cards` array contents in quiz route
  - Cap array length at `MAX_CARDS = 100`
  - Cap each field at `MAX_FIELD_LENGTH = 1_000` characters
  - Filter out cards with empty `front` or `back` after truncation

- [ ] **[BUG-02]** Fix enumeration answer comparison in `checkAnswer`
  - Add `Array.isArray` branch for enumeration questions
  - Make comparison order-insensitive using a `Set`

- [ ] **[BUG-04]** Add MIME-type validation to file upload handler
  - Check `selectedFile.type` against allowed MIME types, not just file extension
  - Use extension as secondary fallback only

- [ ] **[DEBT-02]** Delete dead duplicate source files
  - `rm src/lib/gemini.js`
  - `rm src/lib/quizGenerator.js`
  - Confirm no imports reference these files after deletion

---

## 🔵 Low — Polish

- [ ] **[BUG-05]** Add `maxLength` attributes and validation to all free-text inputs
  - `title`: 100 chars, `description`: 500 chars, `creatorName`: 50 chars, `subject`: 50 chars
  - Apply in both `create/page.tsx` and `ai-parse/page.tsx`

- [ ] **[BUG-03]** Fix `isGeminiReady()` — it always returns `true`
  - Either remove the function and all call sites, or replace with a real `/api/gemini/health` route

- [ ] **[DEBT-03]** Replace biased shuffle in `mcqGenerator.ts` with Fisher-Yates
  - Replace `sort(() => Math.random() - 0.5)` with a proper O(n) unbiased shuffle

- [ ] **[DEBT-04]** Add anonymous session ID for pre-auth creator attribution
  - Generate a `crypto.randomUUID()` token in `localStorage` on first visit
  - Store alongside `creator_name` to create a rudimentary audit trail

---

## 🟢 Future Features

- [ ] **[FEAT-01]** Implement authentication with Supabase Auth
  - Email/password + Google OAuth
  - Add `user_id` column to `decks`, `cards`, `quizzes`, `card_progress`
  - Write RLS policies for owner-only write access
  - Build "My Decks" dashboard with edit/delete controls
  - Gate deck creation and AI parse behind sign-in

- [ ] **[FEAT-02]** Deck forking / remix
  - "Fork this deck" button on any public deck view
  - Creates a full copy under the signed-in user's ownership
  - Shows fork provenance (forked from: Original Deck Name)

- [ ] **[FEAT-03]** Spaced repetition sync across devices
  - After auth (FEAT-01), promote Supabase SRS path to primary
  - Demote `localStorage` to offline-only cache
  - Sync on page load, debounce writes

- [ ] **[FEAT-04]** Quiz attempt history and personal performance dashboard
  - List all past attempts with date, deck name, score, and question types
  - Per-card accuracy: show which concepts the user gets wrong most
  - Score trend chart over time

- [ ] **[FEAT-05]** Streaming AI card generation
  - Use Next.js `ReadableStream` to send cards incrementally as they are generated
  - Show progressive "Analyzing... Generating... Done (42 cards)" status
  - Surface which model was used

- [ ] **[FEAT-06]** Batch ZIP upload → multiple decks
  - Upload a ZIP of PDFs/DOCX files
  - Parse each file into its own deck (or merged into one — user's choice)
  - Preview all generated decks before saving

- [ ] **[FEAT-07]** Configurable fuzzy answer matching
  - Per-quiz toggle: strict (exact) vs. fuzzy (Levenshtein similarity ≥ 80%)
  - Useful for foreign language vocab, medical terminology, free-text identification
