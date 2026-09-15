# Security Findings

**Audit date:** 2026-09-15 · **Scope:** full repo at `20ff255` + live Supabase project `cards-at-the-back` (read-only inspection of RLS policies, constraints, advisors).

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low. IDs in *(parentheses)* refer to the April audit in `.claude/AUDIT.md`.

---

## SEC-01 🔴 Anyone can rewrite any published challenge (live `UPDATE` policy on `quizzes`)

**Where:** live database only; this policy is **not** in `supabase/migration.sql`, so the repo doesn't match production.

```
quizzes → policy "Public update quizzes"  FOR UPDATE  USING (true)  WITH CHECK (true)
```

**Impact:** With the public anon key (shipped in the JS bundle), anyone can `PATCH /rest/v1/quizzes?id=eq.<id>` and replace `questions`, including the answer keys that the server uses to grade `quiz_attempts`. They could wipe a challenge, change every answer so all players score 0, or inject offensive text that other users will see.

**Why it's safe to remove:** the client no longer updates quizzes. `updateQuizResults` was deleted when `quiz_attempts` was introduced, and no `.from('quizzes').update(` exists in `src/`.

**Fix:**
```sql
drop policy "Public update quizzes" on public.quizzes;
```

---

## SEC-02 🔴 `card_progress` is fully writable and deletable by anyone *(SEC-05)*

**Where:** live policy `"Allow all access to card_progress"` `FOR ALL USING (true) WITH CHECK (true)`; `src/lib/supabase.ts:221-254`.

**Impact:** One anon REST call (`DELETE /rest/v1/card_progress?deck_id=neq.00000000-0000-0000-0000-000000000000`) wipes all spaced-repetition data for every deck (309 rows today). Anyone can also set any card's `due_date` far into the future.

It's also a design flaw: the table has `UNIQUE (card_id)` and no user column, so **there is one global schedule per card, shared by every visitor**. See BUG-03 in `BUGS.md`.

**Fix:**
- **Short term:** make SRS progress local-only (localStorage already mirrors it), then `revoke delete, update on card_progress from anon` or drop the policy.
- **Proper fix:** use Supabase Auth, starting with anonymous sign-ins (FEAT-01). Add `user_id`, change the unique key to `(user_id, card_id)`, and use the policy `using (auth.uid() = user_id)`.

---

## SEC-03 🔴 AI endpoints are unauthenticated, unmetered and unbounded *(SEC-01, SEC-03, SEC-09)*

**Where:** `src/app/api/gemini/parse/route.ts`, `parse-ocr/route.ts` (new since April), `quiz/route.ts`.

**What's missing (all three routes):**
- No rate limiting, no origin check, no CAPTCHA or proof of use.
- No size cap. `parse` accepts any `content` length (`parse/route.ts:21-24`). `quiz` accepts any number of cards of any length (`quiz/route.ts:23-25`). The quiz UI sends the **whole deck** every time.
- Each request can make **up to 3 billable model calls** in sequence (the fallback chain). None of them has a timeout.

**Impact:** One script can drain the Gemini quota or budget. Very large prompts also raise the cost per call.

**Fix:**
1. Add per-IP rate limiting, e.g. `@upstash/ratelimit` at 10 requests/min per route plus a daily cap.
2. Reject oversized input: return 413 when `content.length > 60_000` chars, and cap at 150 cards and 1,000 chars per field.
3. Set `export const maxDuration = 60` and pass an `AbortSignal` timeout to each model call.
4. Only fall back to the next model on retryable errors (429/5xx), not on JSON-parse failures, which usually repeat.
5. Optionally require a same-origin `Origin` header. Attackers can spoof it, but it stops casual hotlinking.

---

## SEC-04 🟠 Admin authentication can be brute-forced and is a single shared secret

**Where:** `src/app/api/admin/delete-deck/route.ts:25`, `src/app/api/admin/edit-deck/route.ts:44`, `src/app/deck/[id]/DeckViewClient.tsx:246-257`.

- The password travels in the JSON body and is compared with `!==`. That comparison isn't constant-time, and nothing limits attempts or locks the account.
- Every visitor sees the Edit and Delete buttons, which invites guessing.
- One password covers every deck. Admin actions leave no audit trail and there is no way to revoke access.
- The edit page keeps the plaintext password in React state and re-sends it on every save.

**Fix:**
- **Now:** rate-limit the admin routes, e.g. 5 attempts per 15 min per IP. Compare with `crypto.timingSafeEqual` over SHA-256 digests. Hide admin controls unless the URL has `?admin=1`.
- **Better:** a `POST /api/admin/login` that sets an `httpOnly`, `SameSite=Strict`, short-lived signed cookie. Admin routes then check the cookie instead of a password.
- **Best:** Supabase Auth with an `admin` role claim, plus deck ownership so creators can edit their own decks (FEAT-01).

---

## SEC-05 🟠 Challenge leaderboards can be faked in several ways *(follow-up to SEC-04)*

Server-side grading was a real improvement: `api/quizzes/[quizId]/attempts` recomputes the score. But the leaderboard can still be gamed several ways:

| Vector | Where | Effect |
|---|---|---|
| **Answer key is public** | `fetchQuiz` does `select('*')` (`supabase.ts:128-139`); the `quizzes` SELECT policy is `true` | Open DevTools and read every answer before starting |
| **Answer key is shown in the UI** | `/deck/[id]/quiz/[quizId]` lists all correct answers; the take flow reveals each correct answer right after you answer | Take it once, click "Play Again", get a perfect score |
| **Client controls the timer** | `attempts/route.ts:28-31, 47` trusts `startedAt`/`completedAt` from the body | Send identical timestamps and your time is `0:00`, so you rank first |
| **Unlimited attempts and any name** | no uniqueness or length limit on `player_name` | Flood the top 10 and impersonate classmates; a 1 MB name gets stored |

**Fix:**
- Add `POST /api/quizzes/[id]/attempts/start`. It inserts a pending attempt with a server `started_at` and returns the attempt ID plus the questions **without answers**. Submit then uses the server time for `completed_at`.
- Serve public quiz data through a view or RPC that strips `answer`. Show correct answers only after submission, or offer a "no reveal" mode.
- Cap `player_name` at 40 chars (DB `CHECK` + route). Optionally allow one attempt per name, or per device ID in localStorage.

---

## SEC-06 🟠 Anyone can insert into `decks`, `cards` and `quizzes`, with no validation *(SEC-06)*

**Where:** live policies `Public insert decks/cards/quizzes WITH CHECK (true)`; client-side writes in `src/lib/supabase.ts:57-111`.

**Impact:**
- **Cards can be added to other people's decks.** The insert policy never checks `deck_id`, so anyone can POST cards into any existing deck.
- Spam decks and quizzes appear in the public feed with no limit.
- Row size is unlimited (title, front/back, `questions` JSON). The DB has no `CHECK` constraints.
- Quiz `questions` JSON can hold any shape, which can crash players' browsers (see BUG-13).

**Fix:**
- Route all creates through API routes that validate with a schema (e.g. zod) and rate-limit, using the service role on the server. Then `revoke insert on decks, cards, quizzes from anon`.
- Add DB constraints as a backstop:
  ```sql
  alter table decks add constraint decks_title_len check (char_length(title) between 1 and 120);
  alter table cards add constraint cards_len check (char_length(front) <= 2000 and char_length(back) <= 300);
  alter table quiz_attempts add constraint player_name_len check (char_length(player_name) between 1 and 40);
  ```

---

## SEC-07 🟡 Prompt injection, and AI output is stored without validation *(SEC-02)*

**Where:** all three Gemini routes build prompts with `${content}` or `JSON.stringify(cards)`. `quiz/route.ts:29-32` also interpolates the `questionTypeCounts` **keys** from the request body verbatim.

**Impact:** A crafted document or deck can steer what the model outputs. `quiz/route.ts:80-84` returns the model's objects unvalidated, the client saves them, and every challenge player then loads them.

**Fix:**
- Allowlist question types and clamp each count to 0–50.
- Put user content in a separate `contents` part and keep instructions in `systemInstruction`.
- Use Gemini structured output (`responseMimeType: 'application/json'` + `responseSchema`).
- **Validate every returned object server-side** and drop invalid ones (see BUG-13).

---

## SEC-08 🟡 Raw internal errors are sent to clients *(SEC-08)*

**Where:**
- `attempts/route.ts:92-95`, `delete-deck/route.ts:62`, `edit-deck/route.ts:65,124` return Supabase `error.message`.
- The Gemini routes return `lastError.message` (`parse/route.ts:73`, etc.).
- Every page renders `err.message` directly.

**Impact:** Leaks table, column and constraint names, model IDs and quota details. Users also see confusing text such as `invalid input syntax for type uuid`.

**Fix:** Log the full error on the server. Return a stable `{ error: 'Could not save attempt', code: 'ATTEMPT_SAVE_FAILED' }`. Map codes to friendly messages in one client helper.

---

## SEC-09 🟡 No HTTP security headers *(SEC-07)*

**Where:** `next.config.mjs` still has no `headers()`.

**Fix:** Add `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Then add a CSP that allows `https://*.supabase.co`, Vercel Analytics, `blob:` workers (pdf.js and Tesseract need them) and the Tesseract CDN, which `tesseract.js` fetches language data and core from by default. Test OCR after adding the CSP.

---

## SEC-10 🟡 Vulnerable dependencies (`npm audit --omit=dev`: 7 findings, 1 critical)

| Package | Severity | Notes |
|---|---|---|
| `next` 16.2.3 (range ≤16.3.2) | **Critical** | Multiple advisories incl. DoS with Server Components and middleware/proxy bypass (GHSA-8h8q-6873-q5fj, GHSA-26hh-7cqf-hhc6, GHSA-3g8h-86w9-wvmq) |
| `postcss` ≤8.5.22 | High | XSS in stringify output; sourceMappingURL file disclosure |
| `sharp` ≤0.35.4-rc.0 | High | libvips / libheif CVEs |
| `ws` 8.0.0–8.20.1 | High | memory disclosure, DoS |
| `@xmldom/xmldom` ≤0.8.14 | High | via `mammoth`; injection + ReDoS/quadratic parsing. This parser runs on user-uploaded DOCX, in the browser |
| `nanoid` ≤3.3.17 | High | infinite loop / overflow |
| `baseline-browser-mapping` | Moderate | DoS on invalid input |

**Fix:** Run `npm audit fix`, confirm `next` lands on a patched release, then `npm run build`. Add Dependabot or Renovate.

---

## SEC-11 🔵 Supabase advisor warnings

- `public.rls_auto_enable()` is `SECURITY DEFINER` and `anon`/`authenticated` can execute it via `/rest/v1/rpc/rls_auto_enable`. It returns `event_trigger`, so calling it directly should fail, but there's no reason to expose it:
  `revoke execute on function public.rls_auto_enable() from anon, authenticated;`
- `public.update_card_progress_updated_at()` has a mutable `search_path`:
  `alter function public.update_card_progress_updated_at() set search_path = '';`
- `quiz_attempts` has RLS on with no policies. Blocking anon **writes** is correct, since only the service-role route should insert. But `migration.sql` declares a `"Public read quiz attempts"` SELECT policy that **doesn't exist live**, and the client reads the leaderboard with the anon key (`supabase.ts:141-155`). As a result, **the leaderboard on the challenge start screen is always empty**. See BUG-07. When you add the SELECT policy back, expose only safe columns (e.g. through a view without `answers`).

---

## SEC-12 🔵 Service-role client could end up in client code

**Where:** `delete-deck` and `edit-deck` call `createClient(url, serviceRoleKey)` inline instead of `src/lib/supabaseAdmin.ts`. Nothing stops a future `"use client"` file from importing `supabaseAdmin.ts`.

**Fix:** Add `import 'server-only'` at the top of `supabaseAdmin.ts` and use it in all server routes.

---

## Still open from the April audit (couldn't verify from code)

- **SECRET-01:** rotate the Gemini key and confirm the old key is revoked. Also rotate `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` if `.env` was ever shared.
- **BUG-04 (MIME validation):** low value, since all parsing happens client-side. Superseded by server-side size limits (SEC-03).
