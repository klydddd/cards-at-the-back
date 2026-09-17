# CLAUDE.md refresh for current codebase state

**Date:** 2026-09-18 · **Branch:** feat/pop-quiz-theme · **Type:** docs

## Goal

Refresh `.claude/CLAUDE.md` to reflect the current state of the codebase (as of 2026-09-18), which has diverged significantly since the April 2026 audit. Simultaneously, create a `.claude/agents/session-summarizer.md` agent to automatically generate session summaries into a `summaries/` folder at the end of each implementation session.

## What changed

- `.claude/CLAUDE.md` — full rewrite, restructured:
  - Corrected Next.js version from 15 to 16; TypeScript version from unspecified to 6
  - Added three Server Component routes with `generateMetadata`: `deck/[id]`, `take/[quizId]`, `challenges`
  - Added environment variables: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`
  - Documented server-side grading in `api/quizzes/[quizId]/attempts` using `src/lib/quizGrading.ts`
  - Quick Quiz now persists via `saveQuiz(..., 'quick')` rather than being ephemeral
  - Added new routes: `/challenges`, `/contact`, `/privacy`, `/terms`, `/deck/[id]/edit`, `/api/admin/*`, `/api/onboarding`, `/api/gemini/parse-ocr`, `/api/challenges/stats`
  - Added new libraries: `supabaseAdmin.ts`, `rateLimit.ts`, `quizGrading.ts`, `ocrParser.ts`, `challengeHistory.ts`, `legal.ts`, `onboarding.ts`, `announcements.ts`, `subjectHue.ts`, `aiModels.ts`
  - Added `quiz_attempts` table and its RLS protections
  - Documented localStorage keys used throughout
  - Updated audit pointer from `.claude/AUDIT.md` and `.claude/TASKS.md` (2026-04-08) to `docs/audit/` (2026-09-15)
  - Added Pop Quiz theme notes with reference to `UI_THEME_EDIT.md` and the `var()` token trap
  - Added tooling caveats: ESLint only matches `.js/.jsx` (no TS), `ignoreBuildErrors: true`, README is stale
  - Added new section: "Session summaries" with instructions to invoke `session-summarizer` subagent

- `.claude/agents/session-summarizer.md` — new Haiku subagent definition:
  - Writes one Markdown summary per session to `summaries/YYYY-MM-DD-<kebab-slug>.md`
  - Takes a description as input (goal, files changed, decisions, verification, open items)
  - Validates output by spot-checking against git diff and git log
  - Rules: factual, concise; never modifies files outside `summaries/`; never invents details

- `summaries/` — new directory to hold session summaries

## Decisions and rationale

- **Kept `.claude/CLAUDE.md` at its current location** rather than moving to repo root. Rationale: avoid churn; `.claude/` is already the convention for Claude Code guidance files.

- **Did not edit `README.md`** even though it is stale (still describes Vite, port 5173). Rationale: out of scope for this refresh; CLAUDE.md now flags the staleness.

- **Did not import foreign-agent configs** (`GEMINI.md`, `~/.codex/config.toml`, `~/.gemini/settings.json`). Rationale: user can run `/import` if desired; keeping CLAUDE.md focused on this repo.

- **Chose Haiku for `session-summarizer`** (not a larger model). Rationale: summaries are factual synthesis, not creative writing; Haiku is sufficient and fast.

## Verification

- Spot-checked every path and claim in the new CLAUDE.md against the actual codebase:
  - `parse-ocr` mode values confirmed: `'mcq' | 'cards'` in `/api/gemini/parse-ocr`
  - `saveQuiz(..., 'quick')` usage confirmed in `/deck/[id]/quick-quiz/page.tsx`
  - `LEGAL_PATHS` gating confirmed in `WelcomeGate` and `WhatsNew` components
  - `rateLimit` usage confirmed: only in `/api/contact` and `/api/onboarding` routes
  - localStorage keys enumerated by grep and confirmed against `src/lib/theme.ts`, `src/lib/tracking.ts`, etc.
  - Server Component routes confirmed: `deck/[id]/page.tsx`, `take/[quizId]/page.tsx`, `challenges/page.tsx`
  - RLS table list confirmed via schema dump; `quiz_attempts` verified as present and RLS-protected
- No build, lint, or test suite run (out of scope).

## Open items

- User may run `/import` to pull in foreign-agent configs (`GEMINI.md`, etc.) if desired
- `README.md` remains stale and unedited; it should eventually be updated or deprecated
- Nothing has been committed yet; changes await user approval
- Agent definition (`.claude/agents/session-summarizer.md`) will only be available when Claude Code restarts (agents load at startup)
