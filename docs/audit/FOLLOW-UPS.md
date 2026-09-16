# Follow-ups from the Challenges tab work

**Date:** 2026-09-16 · **Context:** found while building and verifying `/challenges` (PR #8). None of these were fixed there — the PR deliberately stayed scoped to the feature.

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low. Same conventions as `BUGS.md` and `ERRORS.md`.

---

## FU-01 🟠 An invalid service-role key is reported as "Quiz not found."

**Where:** `src/app/api/quizzes/[quizId]/attempts/route.ts:35-43`.

The route looks the quiz up with the service-role client and collapses **every** failure into one 404:

```ts
const { data: quiz, error: quizError } = await supabase
  .from('quizzes')
  .select('id, questions')
  .eq('id', quizId)
  .single();

if (quizError || !quiz) {
  return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
}
```

`quizError` is truthy for an auth failure, a network failure, and a genuinely missing row alike.

**Repro:** Put an invalid or truncated value in `SUPABASE_SERVICE_ROLE_KEY`, then finish any challenge at `/take/[quizId]`. Supabase returns `Invalid API key`; the player is told the quiz does not exist. This happened during development on 2026-09-16 and cost real time to diagnose — the quiz was plainly visible on the page that reported it missing.

**Impact:** A misconfigured or rotated key looks like missing data rather than a broken deployment. Every attempt silently fails to record while the UI blames the content. There is nothing in the server log to distinguish the two, because the error object is discarded.

**Fix:** Separate the cases. Return 404 only when the query succeeded and matched no row (`.maybeSingle()` returning `null`); otherwise log `quizError` server-side and return a 500 with a generic message. Worth applying the same treatment to the insert and leaderboard queries further down, which already `throw` into a 500 but discard the distinction between "bad key" and "bad data".

**Related:** `createServiceRoleSupabaseClient()` (`src/lib/supabaseAdmin.ts`) throws a clear "service role credentials are not configured" message when the key is *absent*, but cannot detect a key that is present and wrong. A startup or health-check probe would close that gap.

---

## FU-02 ✅ FIXED in PR #8 — the pre-quiz leaderboard was always empty

**Where:** `fetchQuizAttempts()` at `src/lib/supabase.ts:178`, called from `src/app/take/[quizId]/TakeQuizClient.tsx:45`.

A `select` on `quiz_attempts` with the anon key returns `rows=0, error=null` — indistinguishable from an empty table. The same query with the service-role key returns 10 rows. `fetchQuizAttempts()` uses the anon client, so it **always resolves to `[]`**.

**Confirmed in the browser on 2026-09-16:** `/take/01ff8702-3e0c-4464-b289-26b7d3a690fb` ("MOCK EXAMS ABC") renders *"No attempts yet. Be the first score on the board."* even though that quiz has three recorded attempts (63/75, 70/75, 64/75). Every challenge shows an empty leaderboard until the visitor submits their own attempt, at which point the board is populated from `result.leaderboard` — which the API route builds with the service-role key, so it is correct.

**Impact:** The competitive framing is lost exactly where it matters — a student deciding whether to take a challenge sees no scores to beat. Since PR #8, `/challenges` shows `3 players · top 93%` for this same quiz, so the two pages now openly contradict each other.

**Note:** `fetchQuizAttempts()` was *not* dead code — deleting it would have removed the (broken) fetch and left the bug in place.

**Fix applied:** Added `GET /api/quizzes/[quizId]/attempts`, sharing a `fetchRankedAttempts()` helper with the existing `POST` so the ordering lives in one place. `fetchQuizAttempts()` now calls that route instead of the anon client, and the call site in `TakeQuizClient` treats a failure as non-fatal (`.catch(() => [])`) so a leaderboard outage can't stop someone taking the quiz. The response is narrowed to display fields only, so `answers` is no longer returned for other players' attempts — the old `select('*')` did expose them in the post-submit payload.

**Verified:** `/take/01ff8702-…` now lists `8` 70/75, `fsf` 64/75, `A` 63/75 before the quiz starts; a challenge with no attempts still renders the empty state.

---

## Already documented elsewhere — not duplicated here

Both of these were confirmed again during this work and remain accurate:

- **ESLint lints no application code** — `ERRORS.md` ERR-02. `eslint.config.js` matches only `**/*.{js,jsx}`, so `npm run lint` reports thousands of problems that all originate from minified bundles under `.claude/worktrees` and `public/`, and zero from `src/`. ERR-02 already gives the config fix.
- **`tsconfig.tsbuildinfo` is committed** — `IMPROVEMENTS.md`. It is tracked, changes on every build, and caused a `git stash pop` conflict on 2026-09-16. Adding it to `.gitignore` and `git rm --cached`-ing it would remove recurring noise.
