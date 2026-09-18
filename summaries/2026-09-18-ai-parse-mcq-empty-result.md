# AI Parse: MCQ generation and flashcard coverage

**Date:** 2026-09-18 · **Branch:** main · **Type:** fix

## Goal
1. Fix the AI Parse "Multiple Choice Quiz" mode, which was not generating or returning questions for documents, leaving the user with a blank preview page and no error message.
2. Improve flashcard generation coverage. User-reported AI-generated decks felt lacking (~20 cards regardless of document length).

## What changed

### Change 1: MCQ generation fix
- `src/app/api/gemini/parse-ocr/route.ts` — MCQ prompt rewritten to handle two cases: exam-style input (extract all questions verbatim) and study material (generate 10–25 MCQs covering the text, 4 options each). The extraction-only prompt was causing empty results (~50% of the time) for notes-style input. Also renamed "OCR Text:" label to "Text:" since this mode is used for documents, not just OCR.
- `src/app/ai-parse/page.tsx` — added defensive error handling in `generateCards`: empty results from any of the three branches (MCQ, OCR cards, document cards) now throw a user-facing error and stay on the upload step, preventing the blank preview page.

### Change 2: Flashcard coverage expansion
- `src/app/api/gemini/parse/route.ts` — prompt changed from asking for "the most important terms" (which produced highlights reel, ~20 cards) to asking for complete deck coverage: work section by section in order without skipping, one card for every defined term / keyword / named component / key fact, one card per item of enumerated lists, roughly one card per 100–150 words, no upper limit. Short text stays short; backs kept short for quiz readability.
- `src/app/api/gemini/parse-ocr/route.ts` — same coverage rules added to the `cards` mode prompt (in addition to the MCQ fix above).

## Decisions and rationale
- Fixed MCQ empty results at the prompt source (root cause) rather than only guarding the UI, ensuring future consistency across the API surface. Kept the client-side guard as well (defense-in-depth).
- For coverage expansion, chose prompt-only change. Deliberately deferred chunking long documents into multiple model calls until a real long document still comes up short (would add parallel un-rate-limited Gemini calls and require duplicate merging).
- No other refactoring applied.

## Verification
- **MCQ fix** — Custom repro script (scratchpad, not committed) tested against `docs/sample_docs/100-ACCLFO-20-EN-M01SG.md` (lecture notes markdown): before the fix, 3 of 6 runs returned 0 questions, others returned only 5. After: 6 of 6 runs returned 13–16 questions with valid options (~4.5s each). Exam-style input (2 MCQ + 1 T/F + 1 identification question) still extracts verbatim with correct question types, confirming no regression.
- **Coverage expansion** — 5 runs across both routes (`parse` and `parse-ocr` cards mode) returned 35–47 cards (parse: 47/36/37/38, parse-ocr: 41/35) on the same 21 KB sample document. Baseline was 15–22 cards. Spot checks: all six AWS CAF perspectives got individual cards, final sections (HA, fault tolerance, scalability, elasticity) covered, no back longer than 8 words, a two-sentence input yielded 3 cards (no padding).
- `npx tsc --noEmit` produces 17 errors before and after (pre-existing, see CLAUDE.md caveat ERR-01); none in the touched files.

## Open items
- Changes not yet committed; `docs/sample_docs/` remains untracked (user-provided sample document).
- A 120-question exam took ~34s to grade on the route locally; no `maxDuration` is exported on Gemini routes, so Vercel's function timeout could cause a 504 on very large documents. Not addressed.
- Browser-based reproduction via Claude was abandoned due to environment mismatch (Chrome tab saw "Hello Lumpia" while terminal reached gokards); API testing via repro script was used instead.
- Unknown `type` values from the model are passed through unsanitized by the route—pre-existing issue not addressed.
- Long-document splitting and duplicate merging deferred until a real long document still comes up short on coverage.
