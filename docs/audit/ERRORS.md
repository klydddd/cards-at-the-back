# Errors: Build, Type, Lint & Runtime Error Handling

**Audit date:** 2026-09-15 · **How this was checked:** `npm ci`, `npx tsc --noEmit`, `npx eslint . --debug`, `npm run build`, `npm audit --omit=dev`, plus a code read of every error path.

| Check | Result |
|---|---|
| `npm run build` | ✅ Passes, but only because type checking is skipped ("Skipping validation of types") |
| `npx tsc --noEmit` | ❌ **19 errors** in 6 files |
| `npm run lint` | ⚠️ "Passes" while linting **zero** source files |
| `npm audit --omit=dev` | ❌ 7 vulnerabilities (1 critical, 5 high, 1 moderate); see `SECURITY.md` SEC-10 |
| Tests | None configured |

---

## ERR-01 🟠 19 TypeScript errors hidden by `ignoreBuildErrors: true` *(DEBT-01)*

**Where:** `next.config.mjs:4-6`.

This is a small backlog: `tsconfig.json` has `strict: false` (with only `strictNullChecks`), so the whole project has just 19 errors. Several of them point at real bugs.

| File:line | Error | What it's telling you |
|---|---|---|
| `src/app/create/page.tsx:59, 61` | `string` not assignable to `SetStateAction<null>` | `useState(null)` should be `useState<string \| null>(null)` |
| `src/app/deck/[id]/DeckViewClient.tsx:173` | `undefined` used as index | `Card.id` is optional in `types/index.ts:2`; fetched cards always have an id, so split `Card` from `NewCard` |
| `src/app/deck/[id]/practice/page.tsx:63, 124, 139` | `Set<unknown>` → `Set<string>` | `tracking.ts` is untyped JS-in-TS |
| `practice/page.tsx:127, 142` | computed property must be string | Same `Card.id?` issue |
| `practice/page.tsx:231` | `touchStartY.current` possibly null | — |
| `practice/page.tsx:344, 397` | `string \| undefined` → `string` | Same `Card.id?` issue |
| `practice/page.tsx:438` | `deck` possibly null | Renders `deck.title` without a guard |
| `src/app/deck/[id]/quick-quiz/page.tsx:54` | generated questions not `QuizQuestion[]` | `mcqGenerator.ts` returns `type: string`; type it as `QuizQuestion` |
| `quick-quiz/page.tsx:403, 425` | `string`/`boolean` → `null \| undefined` | `submitAnswer(overrideAnswer = null)` infers type `null` |
| `src/lib/docParser.ts:26-27` | object possibly null | `a.match(...)[1]` without a check |
| `src/lib/tracking.ts:139` | arithmetic on `Date` | Use `.getTime()` |

**Fix:** Fix these 19 (about an hour of work), delete `typescript.ignoreBuildErrors`, and let `next build` gate deploys. Then turn on `strict: true` one directory at a time, starting with `src/lib` (see IMP-03).

---

## ERR-02 🟠 ESLint doesn't lint any application code

**Where:** `eslint.config.js`.

- `files: ['**/*.{js,jsx}']` matches no `.ts`/`.tsx` file. With `--debug`, ESLint reports exactly **4 files linted**: `eslint.config.js`, `next.config.mjs`, `add_swipe.cjs` and `public/pdf.worker.min.mjs` (a minified vendor bundle).
- It uses `reactRefresh.configs.vite`, left over from the Vite migration.
- No `typescript-eslint`, no `eslint-config-next`, no `jsx-a11y`.

As a result, `react-hooks/exhaustive-deps`, `@next/next/no-html-link-for-pages`, unused-variable checks and similar have never run on the codebase. Several unused imports and stale closures would have been caught.

**Fix:**
```js
// eslint.config.js  (npm i -D eslint-config-next typescript-eslint)
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'node_modules/**', 'public/**', 'add_swipe.cjs']),
]);
```
Check the exact import paths against the `eslint-config-next` version you install; Next 16 ships flat-config entry points and no longer has `next lint`. Remove `eslint-plugin-react-refresh`. Expect a first pass with many warnings; fix `react-hooks` errors first.

---

## ERR-03 🟡 Non-JSON error responses crash the client with a confusing message

**Where:** `src/lib/gemini.ts:16, 33, 50`; `src/lib/quizGenerator.ts:14`; `src/lib/supabase.ts:177`; `DeckViewClient.tsx:105`; `edit/page.tsx:143`.

Every client fetch does `const data = await res.json()` **before** checking `res.ok`. When the hosting platform rather than the route answers, the body is HTML or plain text and `res.json()` throws. The user then sees `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` instead of a real message. That happens for:
- a function timeout (the 3-model fallback chain can run long),
- a request-body size limit (large PDFs),
- a 502 or a cold-start failure.

**Fix:** One helper:
```ts
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.error ?? (res.status === 413 ? 'File is too large.' : res.status === 504 ? 'The AI took too long. Try a shorter document.' : 'Something went wrong.'));
  return data as T;
}
```

---

## ERR-04 🟡 Gemini calls have no timeout, a hard-coded preview model, and a deprecated SDK

**Where:** `src/app/api/gemini/*/route.ts`.

- `generateContent` has no `AbortSignal` or timeout, and the routes don't export `maxDuration`. Three slow attempts in a row can exceed the platform limit, which leads to ERR-03.
- `gemini-3.1-flash-lite-preview` is a **preview** model ID. When Google retires it, every request pays for a failed first attempt, and the logs only show a warning.
- The route falls back to the next model on **any** error, including `JSON.parse` failures and 400s that will fail the same way on every model.
- Output is parsed by stripping code fences by hand. Gemini supports structured JSON output (`responseMimeType: 'application/json'` + `responseSchema`), which removes the whole class of parse errors.
- Google has deprecated `@google/generative-ai` in favor of `@google/genai`.
- The model list and prompt-calling code are copied into three routes.

**Fix:**
- Move the calling logic into `src/lib/server/ai.ts`: `generateJSON({ system, user, schema, timeoutMs })`, with retry-on-429/5xx only and the model list read from an environment variable.
- Migrate to `@google/genai`.
- Add `export const maxDuration = 60` to each route.

---

## ERR-05 🟡 No error boundaries, `not-found` or loading routes

**Where:** `src/app/` has no `error.tsx`, `global-error.tsx`, `not-found.tsx` or `loading.tsx`.

Any render exception leaves a blank page with nothing to click, e.g. BUG-04 (`cards[current]` undefined) or BUG-13 (malformed question JSON). Unknown URLs get the default Next 404.

**Fix:** Add `src/app/error.tsx` (client component with a "Try again" `reset()` button and a link home), `src/app/not-found.tsx`, and optionally `src/app/deck/[id]/error.tsx`.

---

## ERR-06 🟡 Failed progress saves are hidden from the user

**Where:** `src/lib/tracking.ts:72-74` (`loadSRSProgress` swallows all errors), `105-109` (`rateCard` → `console.warn`), `150-154`.

If Supabase is down or RLS changes, reviews quietly go to localStorage only. The user believes their progress synced across devices and has no way to tell otherwise.

**Fix:** Return a `{ synced: boolean }` flag and show a subtle "Offline, saved on this device" indicator. Queue failed upserts and retry them on the next load.

---

## ERR-07 🔵 The PDF worker is a manual copy that will break on a pdfjs upgrade

**Where:** `src/lib/pdfParser.ts:5` points at `/pdf.worker.min.mjs`; `public/pdf.worker.min.mjs` was committed in `7f58956`.

Both are version `5.5.207` today, but `package.json` allows `^5.5.207`. The next minor bump of `pdfjs-dist` will throw `The API version "5.x" does not match the Worker version "5.5.207"`, and every PDF upload will fail.

**Fix:** Pin the exact version, **or** copy the worker in a `postinstall` script, **or** use
`GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`.

---

## ERR-08 🔵 Server logging can't be used to monitor cost or failures

**Where:** Gemini routes use `console.log` / `console.warn` per model attempt; admin and attempt routes use `console.error` inconsistently.

Nothing records which model answered, latency, token usage, request size or IP. You can't spot abuse (SEC-03) or cost spikes.

**Fix:** Log one structured line per request, e.g. `{ route, model, ms, promptChars, outputItems, ok, status }`. Add error tracking (Sentry or Vercel Observability).

---

## ERR-09 🔵 `useSearchParams` is used without a Suspense boundary

**Where:** `src/app/deck/[id]/practice/page.tsx:24`.

The route is dynamic today, so the build passes. If the page is ever made static, or a parent layout changes rendering mode, `next build` fails with "useSearchParams() should be wrapped in a suspense boundary".

**Fix:** Wrap the page body in `<Suspense>`, or read `searchParams` in a server `page.tsx` and pass it down as a prop, matching how `deck/[id]/page.tsx` already passes `id`.
