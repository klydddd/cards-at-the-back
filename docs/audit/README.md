# Cards at the Back: Full Application Audit

**Date:** 2026-09-15 · **Commit:** `20ff255` (main) · **Auditor:** Claude (Opus 5)
**Supersedes:** `.claude/AUDIT.md` and `.claude/TASKS.md` (2026-04-08). Their status is summarized below.

## What was checked

- Every file in `src/`, the SQL in `supabase/`, and the configs (`next.config.mjs`, `tsconfig.json`, `eslint.config.js`, `package.json`).
- Tooling actually run: `npm ci`, `npx tsc --noEmit`, `npx eslint . --debug`, `npm run build`, `npm audit --omit=dev`.
- The **live Supabase project** (`cards-at-the-back`), read-only: RLS policies, foreign keys, indexes, functions, security and performance advisors, and row counts. No data was changed.

## Report files

| File | Contents | Count |
|---|---|---|
| [SECURITY.md](./SECURITY.md) | Vulnerabilities, RLS, secrets, dependencies | 12 findings |
| [BUGS.md](./BUGS.md) | Functional defects and logic flaws | 28 findings |
| [ERRORS.md](./ERRORS.md) | Type errors, lint config, build, runtime error handling | 9 findings |
| [IMPROVEMENTS.md](./IMPROVEMENTS.md) | Refactors, performance, UX, accessibility, DB ops, docs | 17 items |
| [FEATURES.md](./FEATURES.md) | New feature proposals, tiered | 15 proposals |

## Headline numbers

| Check | Result |
|---|---|
| Production build | ✅ passes, but with type checking disabled |
| TypeScript | ❌ 19 errors hidden by `ignoreBuildErrors` |
| ESLint | ⚠️ lints 0 source files (config only matches `.js/.jsx`) |
| npm audit (prod) | ❌ 7 vulns: 1 critical (`next`), 5 high, 1 moderate |
| Live DB | 24 decks · 1,087 cards · 24 quizzes · 9 attempts · 309 progress rows |

## Top 10: fix these first

| # | ID | Why it's urgent | Effort |
|---|---|---|---|
| 1 | **SEC-01** | Live `UPDATE USING (true)` policy on `quizzes` lets anyone rewrite challenge answer keys. It's a one-line `drop policy`. | S |
| 2 | **SEC-02** | Anyone can delete all SRS progress with one REST call | S (short term) |
| 3 | **SEC-03** | Unmetered, unbounded Gemini endpoints are a billing-abuse risk | M |
| 4 | **SEC-10** | Critical `next` advisory; run `npm audit fix` | S |
| 5 | **BUG-01 + BUG-02** | Double ratings and practice-mode ratings corrupt SRS schedules | S |
| 6 | **BUG-04** | Practice crashes or spins forever after "Practice Not Learned" | S |
| 7 | **BUG-05 / 06 / 09** | Dead-end screens in Take Challenge, AI Quiz and AI Parse | S |
| 8 | **BUG-07** | Challenge leaderboard always empty before you play (missing RLS SELECT policy) | S |
| 9 | **BUG-13** | Malformed AI questions can soft-lock players; validate on the server | M |
| 10 | **ERR-01 + ERR-02** | Turn type-checking and linting back on so regressions get caught | S–M |

## Status of the April 2026 audit

| April ID | Status now | Notes |
|---|---|---|
| SEC-01 Rate limiting | ❌ Open | Now 3 routes (`parse-ocr` added) → SEC-03 |
| SEC-02 Prompt injection | ❌ Open | → SEC-07 |
| SEC-03 Size limits | ❌ Open | → SEC-03 |
| SEC-04 Client-side score | ✅ **Fixed** for challenges | Server grades in `api/quizzes/[quizId]/attempts`. New cheating vectors → SEC-05 |
| SEC-05 `resetDeckSRS` IDOR | ❌ Open | Worse than described: live policy allows all → SEC-02 |
| SEC-06 No auth | ❌ Open | → SEC-06, FEAT-01 |
| SEC-07 Security headers | ❌ Open | → SEC-09 |
| SEC-08 Error leakage | ❌ Open | Admin and attempt routes added more → SEC-08 |
| SEC-09 Quiz cards validation | ❌ Open | → SEC-03 |
| SECRET-01 Rotate keys | ❓ Unverifiable from code | Also rotate the service-role key and admin password if `.env` was shared |
| SECRET-02 Verify RLS | ✅ Checked | RLS is **enabled** on all tables, but the policies are too permissive → SEC-01/02/06 |
| BUG-01 Phantom quiz records | ✅ **Fixed** | `quiz_attempts` table replaces the save+update pattern |
| BUG-02 Enumeration grading | ✅ **Fixed** | `quizGrading.ts` is order-insensitive; strictness remains → BUG-27 |
| BUG-03 `isGeminiReady` | ⚠️ Moot | Still exists, but unused → IMP-07 |
| BUG-04 MIME validation | ⏸ Deprioritized | Parsing is client-side; server size limits matter more |
| BUG-05 Max lengths | ❌ Open | → SEC-06 |
| DEBT-01 `ignoreBuildErrors` | ❌ Open | Only 19 errors to fix → ERR-01 |
| DEBT-02 Dead `.js` files | ✅ **Fixed** | Removed |
| DEBT-03 Biased shuffle | ❌ Open | → BUG-17 |
| DEBT-04 Anonymous session ID | ❌ Open | Superseded by Supabase anonymous sign-ins → FEAT-01 |

## Severity scale

| Level | Meaning |
|---|---|
| 🔴 Critical | Exploitable now; data loss or financial risk |
| 🟠 High | Major integrity, security or usability failure; fix before sharing widely |
| 🟡 Medium | Wrong behavior under specific conditions |
| 🔵 Low | Minor defect or polish |
