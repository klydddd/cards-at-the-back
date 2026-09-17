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

## Done in pass 2

**A spacing scale.** `--space-2xs` … `--space-3xl` on a 4px grid, ratifying the
rhythm the file already had (12/8/24/16 were its four most common values) rather
than imposing a new one. 200 declarations in `globals.css` and 65 inline styles
in TSX migrated; only 1–3px optical offsets stay literal. Off-grid strays
(14/18/22/26/30) snapped to the nearest step.

The large steps shrink at each breakpoint, so density follows the viewport
without per-rule overrides:

```css
@media (max-width: 1024px) { :root { --space-xl: 28px; --space-2xl: 36px; --space-3xl: 48px; } }
@media (max-width:  640px) { :root { --space-lg: 20px; --space-xl: 24px; --space-2xl: 28px; --space-3xl: 36px; } }
```

**A container scale.** `--container-sm/md/lg/xl` with matching `.container-*`
classes replaced 16 inline `maxWidth` overrides across nine files.

**Breakpoints.** The app had exactly one (`640px`), so 641–1167px rendered with
desktop rules. Added tiers at **1024px** (type scale, two-column gaps),
**860px** (smaller hero card stack, contact goes one-column) and **700px**
(hero goes one-column, stack hidden).

**Fixed a bug pass 1 introduced.** Pass 1 deleted `--rule` but left three
consumers. An undeclared `var()` makes the property invalid at computed-value
time, so `text-decoration-color` fell back to its initial `currentcolor` — every
consent, contact and legal link was drawing a **full-ink** underline. It read as
a deliberate hairline, which is why it survived review. The three byte-identical
rules are now one shared `.prose-link`-style selector using `--underline`
(`color-mix(in srgb, var(--ink) 45%, transparent)`, ~3.3:1 — `--border-soft`
would have been 1.33:1, too faint to signal a link).

**Zero strokes below 2px.** Of the nine that remained, five became 2px
`--border-soft` (the repeated `.legal-list dd` ladder and its cap,
`.whats-new-group`, `.contact-legal`, `.legal-crosslink`) and four became ink at
2–3px (`.menu-list`, which was carrying an `8px 8px 0` shadow off a **1px**
frame; the select caret; `.legal-header`).

**Other fixes**

| Site | Was |
|---|---|
| `.legal-body code` | `--primary-light` on cream = **1.16:1**, effectively invisible. Now an ink-framed yellow chip on the new `--radius-xs`. |
| `.onboarding-check input` | `accent-color: var(--primary)` flipped per theme. Pinned to a fixed hue. |
| `.pagination-controls .chip` | `min-width: 36px` against `.chip`'s 40px min-height → 36×40 page numbers. |
| `.menu-count` | The only pill in the app with no frame. |
| `.pagination-summary` | The only small meta line with no colour, so it inherited full ink. |
| `.challenge-card` | Had no base rule at all, and its comment described a hover pass 1 had already replaced. |
| 10 font sizes | `0.8/0.9/0.92/0.95rem` normalised onto the existing `0.75/0.8125/0.875/0.9375` ladder. |

**Components**

- `ChallengeCard` now carries `data-hue`, so `/challenges` varies like the home grid.
- The quiz builder's steppers were inline `borderRadius: 50%` + `1.5px` borders
  overriding `.btn-ghost`; now `.stepper-btn` / `.stepper-value` / `.stepper-total`
  (the total was an unclassed div with a fill and radius but no frame).
- `.quiz-question-text` replaces a style duplicated in two files, and
  `.option-row.is-static` replaces a `boxShadow: 'none'` that was killing the
  hard shadow on every answer-key row.
- `.btn-danger` replaces an inline `background`/`borderColor` pair that never
  picked up the press.
- `PracticeMenu`'s hardcoded `0.18s ease` → `var(--transition)`.

**The delete modal** in `DeckViewClient` now uses the shared `Modal`. It was
missing Esc, focus trap, focus restore, scroll lock and every ARIA attribute.
Verified in-browser: `role="dialog"`, `aria-modal`, labelling, `body` scroll
locked, focus lands on the password field and returns on close. Passing
`onClose={deleting ? undefined : …}` preserves the old "can't cancel mid-delete"
guard, because `Modal` treats a missing `onClose` as mandatory.

---

## Not done — pass 3

- **Type scale.** 88 `font-size` declarations, still literal. Sizes are now on a
  consistent ladder but there are no `--text-*` tokens. This is the obvious next
  foundation, and the same responsive-token trick would apply.
- **Composition.** Pass 2 was structural — spacing, strokes, tokens, classes.
  `/create`, `/ai-parse`, `/deck/:id/edit`, `/contact` and the legal pages are
  now consistent and correct, but none has been *designed* the way Home and
  Practice were against the artboards.
- **WelcomeGate** got its CSS tuned but was not walked step by step. It is the
  first thing a new user sees; worth a pass before any public share.
- **Artboards only cover three screens.** Home, Practice and Take-challenge.
  Everything else is extrapolation from the language.
- **Real devices.** Verified at 390px and 768px via iframes — `resize_window`
  does not take effect in this environment, so nothing was seen on actual
  hardware.

## Pre-existing, unrelated
- `public/` holds only `pdf.worker.min.mjs` — no favicon, OG image or manifest.
- No `not-found.tsx`, `error.tsx` or `loading.tsx`.
- 17 TypeScript errors predate this work (`next.config.mjs` sets
  `typescript.ignoreBuildErrors: true`). Count unchanged across both passes.
- `tsconfig.tsbuildinfo` is committed and churns on every build. It belongs in
  `.gitignore`.
