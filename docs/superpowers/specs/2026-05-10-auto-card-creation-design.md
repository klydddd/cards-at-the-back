# Auto-Card Creation on Second-to-Last Card Complete

**Date:** 2026-05-10  
**Feature:** Automatically create a new blank card when the second-to-last card is filled in  
**Location:** `src/app/create/page.tsx`

## Overview

When creating a flashcard deck manually, users click "Add Card" after completing each card. This is repetitive. The new feature auto-creates a blank card when the second-to-last card is complete, so there's always an empty card ready to fill.

## User Experience

1. User starts with 3 empty cards (current behavior)
2. As they fill in cards, when they finish filling the second-to-last card (both front and back have content), a new blank card silently appears at the end
3. They continue typing in the new card without interruption
4. This repeats as they add more cards
5. The "Add Card" button remains available for explicit additions (e.g., if they want to insert a card mid-flow)

No visual notification, no scroll jump—just a seamless flow.

## Implementation Details

### Debounce Mechanism

- **Trigger:** Every call to `updateCard(index, field, value)`
- **Debounce Duration:** 300ms
- **Storage:** Use `useRef` to maintain a timer ID across renders
- **Logic Flow:**
  1. Clear any existing debounce timer
  2. Set a new timer that will fire in 300ms
  3. Timer callback checks if auto-add is needed
  4. If needed, call `addCard()`

### Check Logic

After the debounce fires, determine if a new card should be added:

```
secondLastIndex = cards.length - 2

if (cards.length < 2):
  // Not enough cards to have a "second-to-last"
  return (do nothing)

secondLastCard = cards[secondLastIndex]

if (secondLastCard.front.trim() && secondLastCard.back.trim()):
  // Second-to-last card is complete
  lastCard = cards[cards.length - 1]
  
  if (lastCard.front.trim() || lastCard.back.trim()):
    // Last card already has content (not blank)
    return (do nothing)
  else:
    // Last card is blank, no need to add
    return (do nothing)
else:
  // Second-to-last card is not complete
  return (do nothing)
```

**Simplified:** Only add a new card if the second-to-last card is complete AND the last card is entirely blank.

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| User has 1 card | No check (need at least 2 cards to have a "second-to-last") |
| Second-to-last card complete, last card blank | Do nothing (blank card already exists) |
| Second-to-last card complete, last card has content | Do nothing (blank card doesn't exist, but user may still be editing the last card) |
| User deletes the last card, second-to-last becomes last | Debounce check will trigger on next keystroke; if the new last card is blank, a new card will be auto-created |

### Code Changes

**File:** `src/app/create/page.tsx`

**Changes:**
1. Add `const debounceTimerRef = useRef(null)` to store the debounce timer
2. Modify `updateCard()` to:
   - Clear the existing debounce timer
   - Set a new timer that calls a new helper function `checkAndAddCard()`
3. Add new helper function `checkAndAddCard()`:
   - Validates the second-to-last card is complete
   - Validates the last card is blank
   - Calls `addCard()` if conditions are met
4. Clean up the timer in a `useEffect` return on unmount (optional but good practice)

## Testing Scenarios

1. **Happy path:** Start with 3 cards, fill in front/back of card 1, 2, and 3 → verify card 4 appears
2. **Slow typing:** Type one character at a time and pause → verify debounce doesn't create multiple cards
3. **Rapid typing:** Type quickly → verify only one new card is created after debounce fires
4. **Delete then complete:** Create 5 cards, delete cards 3-5, complete card 2 → verify a new card is created
5. **Button still works:** Verify "Add Card" button still adds a card even without triggering auto-add
6. **Edge case - 1 card:** Have only 1 card, complete it → verify no auto-add (not enough cards)

## No Changes Required

- No changes to `CardForm` component
- No changes to `createDeck()` or `createCards()` functions
- No UI changes, no new buttons/labels
- No database schema changes
