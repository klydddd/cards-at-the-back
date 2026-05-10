# Share Button Design

**Date:** 2026-05-11

## Summary

Add a share button to the deck detail page and the challenge landing page so users can share links via the native OS share sheet (mobile) or clipboard copy (desktop).

## Component: ShareButton

File: `src/components/ShareButton.tsx`

A reusable client component with the following interface:

```ts
interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
}
```

Behavior:
- If `navigator.share` is available (mobile/modern browsers), call it with `{ url, title, text }`.
- Otherwise, copy `url` to clipboard and show a "Copied!" label for 2 seconds before reverting to "Share".
- Button label: "Share" (default) / "Copied!" (after clipboard copy).

## Placement

### Deck page (`/deck/[id]` → `DeckViewClient.tsx`)
- Inline next to the `<h1>` deck title at the top of the page.
- Shares: `${origin}/deck/${id}` with the deck title as the share title.

### Challenge page (`/take/[quizId]` → `TakeQuizClient.tsx`)
- Inside the lobby card (the pre-start view with the player name input), placed below the deck title / badge row and above the name input field.
- Shares: the current URL (`${origin}/take/${quizId}`) with the deck title as the share title.

## What Stays Unchanged

- Per-challenge "Copy Link" buttons on the deck page (they share individual quiz URLs, not the deck page).
- "Copy Share Link" button in the quiz publish flow (`/deck/[id]/quiz`).

## Error Handling

- If `navigator.share` throws (e.g. user dismisses the share sheet), silently ignore — no error shown.
- If clipboard write fails, silently ignore.
