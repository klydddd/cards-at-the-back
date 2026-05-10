# Auto-Card Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-create a blank card when the second-to-last card is completely filled, with 300ms debounce to prevent excessive re-renders.

**Architecture:** When `updateCard()` is called, clear any existing debounce timer and set a new one. After 300ms of inactivity, `checkAndAddCard()` checks if the second-to-last card is complete (both front and back have non-whitespace content) and the last card is blank. If both conditions are met, a new blank card is added. A `useEffect` cleanup ensures the timer is cleared on unmount.

**Tech Stack:** React 19, Next.js 15 (App Router), TypeScript

---

### Task 1: Add imports for useRef and useEffect

**Files:**
- Modify: `src/app/create/page.tsx`

- [ ] **Step 1: Update imports**

Replace the existing React import line with:
```typescript
import { useState, useRef, useEffect } from 'react';
```

- [ ] **Step 2: Verify the change**

Confirm line 1 now reads:
```typescript
import { useState, useRef, useEffect } from 'react';
```

---

### Task 2: Add debounce timer ref

**Files:**
- Modify: `src/app/create/page.tsx`

- [ ] **Step 1: Add debounce ref declaration**

After `const [error, setError] = useState(null);`, add:
```typescript
const debounceTimerRef = useRef(null);
```

---

### Task 3: Add checkAndAddCard helper function

**Files:**
- Modify: `src/app/create/page.tsx`

- [ ] **Step 1: Add the helper function**

Insert this function right before the `updateCard` function:

```typescript
const checkAndAddCard = (currentCards) => {
    if (currentCards.length < 2) return;

    const secondLastCard = currentCards[currentCards.length - 2];
    const lastCard = currentCards[currentCards.length - 1];

    const secondLastIsComplete = secondLastCard.front.trim() && secondLastCard.back.trim();
    const lastIsBlank = !lastCard.front.trim() && !lastCard.back.trim();

    if (secondLastIsComplete && lastIsBlank) {
        setCards((prev) => [...prev, { front: '', back: '' }]);
    }
};
```

Note: Takes `currentCards` as a parameter to avoid stale closure issues from the debounce.

---

### Task 4: Update updateCard to trigger debounced check

**Files:**
- Modify: `src/app/create/page.tsx`

- [ ] **Step 1: Replace the updateCard function**

Replace the entire `updateCard` function with:

```typescript
const updateCard = (index, field, value) => {
    setCards((prev) => {
        const updated = prev.map((c, i) => (i === index ? { ...c, [field]: value } : c));

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            checkAndAddCard(updated);
        }, 300);

        return updated;
    });
};
```

Note: `updated` is computed inside the `setCards` updater so `checkAndAddCard` always receives the latest cards state, avoiding stale closure issues.

---

### Task 5: Add useEffect cleanup

**Files:**
- Modify: `src/app/create/page.tsx`

- [ ] **Step 1: Add cleanup effect**

Add this `useEffect` hook right after the `updateCard` function:

```typescript
useEffect(() => {
    return () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    };
}, []);
```

---

### Task 6: Verify and commit

**Files:**
- Modify: `src/app/create/page.tsx`

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 2: Commit**

```bash
git add src/app/create/page.tsx
git commit -m "feat: auto-create blank card when second-to-last card is complete

- Add debounce timer ref (300ms debounce)
- Add checkAndAddCard helper to validate conditions
- Update updateCard to trigger debounced check
- Add useEffect cleanup on unmount"
```
