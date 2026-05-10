# Admin Edit Deck — Design Spec

**Date:** 2026-05-10  
**Status:** Approved

## Overview

Add an admin-gated edit function for each deck, allowing the admin to modify deck metadata (title, description, subject, creator name) and manage individual cards (add, edit, remove). Access is protected by the existing `ADMIN_PASSWORD` environment variable, following the same pattern as the existing delete-deck feature.

## Scope

**In scope:**
- Edit deck metadata: title, description, subject, creator name
- Add new cards to an existing deck
- Edit existing cards (front/back)
- Remove existing cards
- Card positions re-indexed on save

**Out of scope:**
- Drag-to-reorder cards
- Editing quizzes or quiz attempts
- Any user-facing (non-admin) edit capability

## New Files

| Path | Purpose |
|---|---|
| `src/app/deck/[id]/edit/page.tsx` | Edit page (locked form, unlock with password, save) |
| `src/app/api/admin/edit-deck/route.ts` | Server route — validates password, uses service role key to write changes |

## Changed Files

| Path | Change |
|---|---|
| `src/app/deck/[id]/page.tsx` | Add "Edit Deck" link in the existing admin section (next to Delete Deck button) |

No changes to `src/lib/supabase.ts` — the edit page reads via existing `fetchDeck`/`fetchCards`, and writes go exclusively through the admin API route.

## Edit Page (`/deck/[id]/edit`)

### Locked state (on load)
- Fetches deck and cards using `fetchDeck(id)` and `fetchCards(id)`.
- Renders the full form pre-populated with existing data, all fields **disabled**.
- Password input + "Unlock" button at the top of the page.

### Unlocked state (after correct password)
All fields become editable. The user can:
- Edit title, description, subject, creator name
- Edit any card's front/back inline
- Remove a card with a × button (requires at least 1 card remains)
- Add new cards (auto-grow pattern: when the second-to-last card is complete and the last is blank, a new blank row is appended)

### Save
- "Save Changes" button (only visible when unlocked) POSTs to `/api/admin/edit-deck`:
  ```json
  {
    "deckId": "<id>",
    "password": "<admin password>",
    "deck": { "title": "", "description": "", "subject": "", "creatorName": "" },
    "cards": [
      { "id": "<existing-id>", "front": "", "back": "", "position": 0 },
      { "front": "", "back": "", "position": 1 }
    ]
  }
  ```
- Cards with an `id` field are existing cards to update; cards without `id` are new.
- Password is re-sent with every save (server always re-validates; no trusted client state).
- On success: redirect to `/deck/<id>`.
- On error: display error inline.

### Validation (client-side)
- Title must not be empty.
- At least 2 complete cards (both front and back non-empty) must exist.

## API Route (`POST /api/admin/edit-deck`)

### Authentication
Validates `ADMIN_PASSWORD` env var. Returns `401` if missing or wrong.

### Database operations
Uses a service-role Supabase client (same pattern as `delete-deck`) to bypass RLS.

**Card reconciliation:**
1. Fetch existing card IDs for the deck from `cards` table.
2. Cards in request **with `id`** → `UPDATE cards SET front, back, position WHERE id = ?`
3. Cards in request **without `id`** → `INSERT INTO cards (deck_id, front, back, position)`
4. Existing IDs **not present** in request → `DELETE FROM card_progress WHERE card_id IN (...)`, then `DELETE FROM cards WHERE id IN (...)`
5. `UPDATE decks SET title, description, subject, creator_name WHERE id = ?`

Positions are taken from the `position` field as sent (client re-indexes them 0, 1, 2… by array order before sending).

### Response
- `200 { success: true }` on success
- `400` for missing/invalid body fields
- `401` for wrong password
- `500` for Supabase errors

## Deck Detail Page Changes

In the existing admin section at the bottom of `/deck/[id]/page.tsx`, add a link:

```
[Edit Deck]  [Delete Deck]
```

"Edit Deck" is a standard `<Link>` to `/deck/${id}/edit`.

## Error Handling

- Network or Supabase errors surface as inline error messages (no unhandled throws).
- If a card that was being edited is removed server-side between load and save, the upsert will fail gracefully (the server returns an error and the client shows it).

## Security Notes

- Password is never stored client-side beyond the current page session (React state only).
- All writes use the service role key on the server; the anon key is never used for writes.
- Password validation happens server-side on every POST — the unlock step is purely a UX gate, not a security gate.
