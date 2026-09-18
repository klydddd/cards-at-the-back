# Server-side chunking for long documents in AI Parse

**Date:** 2026-09-18 · **Branch:** main · **Type:** feature

## Goal
Implement server-side document chunking so that AI Parse coverage scales with document length. Previously, long documents (50+ pages) produced the same ~40 cards and ~16 MCQs regardless of size, because a single Gemini call plateaus; chunking divides content and processes pieces in parallel, concatenating results.

## What changed
- `src/lib/chunking.ts` (new) — pure chunking helpers: `splitIntoChunks(text, maxChars=12000)` splits on paragraph and page boundaries (blank lines), falls back to newlines then sentence ends for oversized blocks, and folds trailing chunks under 1,500 chars into the previous one; `normalizeKey` and `dedupeBy` for result merging (first occurrence wins).
- `src/lib/geminiServer.ts` (new, server-only) — `generateJsonArray(genAI, prompt, tag)` abstracts the model-fallback loop (AI_MODELS chain, code-fence stripping, JSON validation) that both parse routes had duplicated; `generateChunked(genAI, content, promptFor, tag)` runs it per chunk with `CHUNK_CONCURRENCY = 3`, preserves document order, concatenates results, and fails fast if any chunk fails on all models.
- `src/app/api/gemini/parse/route.ts` — prompt refactored to `promptFor(chunk)`, uses `generateChunked`, dedupes results by normalised card `back`, exports `maxDuration = 60` for Vercel.
- `src/app/api/gemini/parse-ocr/route.ts` — same for both OCR modes (cards and MCQ); dedupes MCQ results by normalised `question` and cards by `back`; `maxDuration = 60`. Sanitisers unchanged.
- No client changes: the page makes one request regardless of chunk count. Short inputs remain a single chunk, so behaviour is identical for them.

## Decisions and rationale
- **Server-side over client-side:** single request from the page, no UI complexity, chunking logic reusable by other routes; trades latency (parallel requests) for coverage.
- **Fail fast on chunk failure:** a deck with a silent gap (no results from a skipped chunk) is worse than an error; users can retry.
- **Don't strip per-page boilerplate:** copyright, headers, slide titles are publisher-specific and would require heuristics; the model ignores them well enough in practice.
- **Parallel concurrency = 3:** keeps simultaneous Gemini calls small because the routes have no rate limit (audit SEC-03); three chunks at ~12 KB each takes ~7–8 s in parallel vs ~20+ s serial.
- **No ceiling on card count:** the user did not request output limits; scaling with document size was the goal.

## Verification
Comprehensive testing (scratchpad Node scripts, not committed):

**Unit tests for `chunking.ts`:**
- Short text remains one chunk; multi-paragraph text splits cleanly on blank lines; reconstructed input matches original (join with `\n\n` is lossless).
- Tiny tail (< 1,500 chars) merges into previous chunk; giant single paragraph splits on sentences without loss.
- Sample PDF (50 pages, 50,632 chars) → 5 chunks (10384, 11377, 11076, 11236, 6551 chars). Normalisation deduping works correctly.

**End-to-end against dev server (before vs. after chunking):**
- Baseline (single call): 37–42 cards, 15–17 MCQs.
- After chunking: `/parse` 56–74 cards, `/parse-ocr` cards 62 / MCQ 48–56 questions (typically ~7.4 s; fallback runs ~31 s).
- Assertion thresholds: ≥45 cards, ≥40 MCQs (based on 1 card per 100–150 content words; actual PDF had ~6,000 words after removing 10 KB boilerplate).
- Zero duplicate backs/questions; every MCQ answer present in options; no empty fronts/backs.

**Regression checks:**
- Two-sentence input: 3 cards (same as before).
- Exam-style text: 4 questions extracted verbatim, correct types.
- 21 KB markdown (2 chunks): 50–77 cards in 3–4.6 s; one outlier (98 cards, 27 s) from model variance.

**Type safety:** `npx tsc --noEmit` still reports 17 pre-existing errors; none in new or modified files.

## Open items
- Not yet committed; working tree also contains user-made `.gitignore` change (ignoring `/docs/sample_docs`).
- Gemini latency is variable; fallback to a slower model can push multi-chunk requests to ~30 s. `maxDuration = 60` covers Vercel but the client shows no progress UI.
- Model output per chunk varies run to run (e.g. 50 vs. 77 cards for identical markdown), reflected in assertion thresholds.
- `api/gemini/quiz` route still has its own copy of the fallback loop; refactoring was out of scope.
