# UI theme — Pop Quiz rollout

Tracks the re-theme of gokards to the **Pop Quiz** direction
(`docs/design/redesign-directions/Pop*.dc.html`, direction C of the three
explored in `canvas.json`).

Pass 1 covered the core study loop. This file records what is done, what is
deliberately left, and the traps found along the way.

---

## The design language

| | |
|---|---|
| Ground | `#FAF6EE` cream (light) · `#16130F` (dark) |
| Ink | `#1A1511` (light) · `#FAF6EE` (dark) |
| Borders | ink, `2px` / `3px` — never hairline |
| Shadows | hard offsets, no blur: `3px 3px 0`, `4px 4px 0`, `8px 8px 0` |
| Display | Bricolage Grotesque 500/700/800, tracking `-0.03em`…`-0.05em` |
| Body | Onest 400/500/600 |
| Hues | sky `#6FC8FF` · coral `#FFA282` · mint `#71D6A3` · yellow `#EFCE6F` · lilac `#CAACFF` · paper `#FFFFFF` |
| Radii | 12–28px; `100px` for pills |

### Two ink tokens, and why

`--ink` is borders and text. `--shadow-ink` is what hard shadows are cast in.
They are separate because they answer to different things:

- A tile filled with a subject hue overrides `--ink` to dark, so its outline
  stays visible against the bright fill — in **both** themes.
- That same tile casts its shadow onto the *page ground*, so the shadow must
  follow the ground. A dark shadow on a dark ground disappears.

This is why the hues are identical in light and dark. They carry dark ink at
9.3:1 or better, so in dark mode they read as bright cards on a dark board
rather than inverting into mud.

### The `var()` trap (read before touching tokens)

A custom property whose value contains `var()` is substituted **once, on the
element that declares it**, and descendants inherit the already-resolved
colour. `:root { --text: var(--ink) }` therefore does **not** re-resolve when a
child overrides `--ink`.

That is why the shared hue-tile block in `globals.css` restates `--text`,
`--border`, `--primary`, the semantic `-dark`/`-border` tokens and so on
explicitly. Adding a new hue-filled component means adding its selector to that
block — overriding `--ink` alone will silently leave its text the theme colour.

---

## Done in pass 1

**Global** — token block and dark override; Base/Typography; Buttons (`.btn`
is now an ink tile that presses); Inputs; Cards; `.index-card`; Badge; chips;
Navbar; Footer; Modal; Spinner; Empty State; File Upload; Error Box; Divider;
Progress Bar; Responsive.

**Core flow** — Home hero and deck grid, Deck detail, Flip Card, Study Session
(practice + review), Quiz, Leaderboard.

**Structural**

- `src/lib/subjectHue.ts` — subject → hue, wired into `DeckCard` via `data-hue`.
- Blocking `data-theme` script in `layout.tsx`. Previously the attribute was
  only set in a `useEffect`, so dark-mode users got a full-page light flash on
  every load — much worse against cream.
- `Navbar` no longer holds theme state. Its old `useEffect(() => setTheme(theme))`
  wrote `localStorage` on **every mount**, freezing an implicit OS preference
  into an explicit stored one: a user on OS-dark who never touched the toggle
  could no longer follow their OS back to light. The icon is now chosen in CSS
  off `data-theme`, so there is nothing to hydrate.
- Deleted ~97 lines of dead CSS (`.srs-rating-row`, `.srs-btn*`,
  `.srs-stats-grid`) with no consumer in any `.tsx`, and the dead
  `formatInterval` / `previewIntervals` import in `practice/page.tsx`.
- Extracted `.swipe-verdict` and `.learned-tick`, which were duplicated inline
  in both `practice/page.tsx` and `review/page.tsx`.

**Colour leaks closed** (all bypassed tokens; the last two were *actively*
broken by `--border` becoming ink)

| Site | Was |
|---|---|
| `practice/page.tsx:17-19` | `#10b981` / `#f59e0b` / `#ef4444` on a `color` field nothing read |
| `practice/page.tsx`, `review/page.tsx` | `color:'#fff'`, `boxShadow:'0 4px 12px rgba(0,0,0,0.15)'` |
| `DeckViewClient.tsx:247` | `background:'rgba(0,0,0,0.5)'` |
| `globals.css` `.modal-backdrop` | `rgba(17,17,16,0.45)` hardcoded in CSS |
| `globals.css` `.spinner` | `var(--border)` + `border-top: var(--primary)` — both now ink, so the ring had no leading edge |
| `ai-parse/page.tsx:573` | `var(--border)` used as a **fill** — would have rendered a solid black disc |

**Accessibility.** `--text-faint` (`#6A6058`) fails AA on every hue
(3.13–4.01:1), so muted text on a coloured card moved to `--on-hue-secondary`
(`#2E2823`, 7.44–9.51:1). Reduced-motion now cancels the press *transform*, not
just its duration — the old guard only zeroed `transition-duration`, which made
the movement snap rather than not happen.

---

## Not done — pass 2

### Screens not composed
Styled only by inherited primitives. Checked and coherent, but not designed:
`/create`, `/ai-parse` (both better than expected), `/challenges`, `/contact`,
`/privacy`, `/terms`, `/deck/[id]/edit`, the AI quiz builder, and the quiz
result review.

### CSS sections not rewritten
Pagination, Challenge browse, Dropdown Menu, Consent Prompt, Onboarding,
What's New, Contact Page, Legal Pages, Deck card stagger, Utilities.

### Specific follow-ups

- **Modals.** `Modal.tsx`, `WelcomeGate` and `WhatsNew` inherit `.index-card`
  and look right, but none got a composition pass. `WelcomeGate` is the first
  thing a new user sees — worth a look before any public share.
- **`ChallengeCard`** does not use `data-hue` yet, so `/challenges` is
  monochrome where the home grid is not.
- **The hand-rolled delete modal** in `DeckViewClient.tsx` duplicates
  `Modal.tsx`. Replacing it removes ~20 lines and one class of leak.
- **Obsolete tokens still aliased** for one pass so untouched rules keep
  working: `--rule` (5 consumers), `--border-hover`, `--primary-hover`. Delete
  and retarget when those sections are rewritten. `--accent`, `--accent-hover`,
  `--accent-light` and `--purple-hover` had **zero** consumers and are gone.
- **`--border-soft`** exists for low-emphasis separators but is only used by
  the spinner and `.quiz-feedback`. Dense stacked rules on the legal and
  contact pages are still full ink and may want it.
- **Spacing rhythm is unchanged.** There is no spacing or type-scale token
  layer — 404 raw `px` literals and 89 `font-size` declarations, against a
  single `max-width: 640px` breakpoint. This pass deliberately changed colour,
  type, border and shadow only. If the layout feels cramped against the heavier
  borders, retuning that is its own piece of work.
- **Mobile** was re-clamped but not walked on a device.

### Pre-existing, unrelated
- `public/` holds only `pdf.worker.min.mjs` — no favicon, OG image or manifest.
- No `not-found.tsx`, `error.tsx` or `loading.tsx`.
- 17 TypeScript errors predate this work (`next.config.mjs` sets
  `typescript.ignoreBuildErrors: true`). None are in files touched here; the
  count is identical before and after.
- `tsconfig.tsbuildinfo` is committed and churns on every build. It belongs in
  `.gitignore`.
