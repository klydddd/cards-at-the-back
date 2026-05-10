# Admin Edit Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-gated edit page at `/deck/[id]/edit` where the admin can modify deck metadata and manage cards, protected by the existing `ADMIN_PASSWORD` env var.

**Architecture:** A new Next.js page (`/deck/[id]/edit`) loads existing data, locks the form until a password is entered, then on save POSTs to a new `/api/admin/edit-deck` route that uses the service-role Supabase client to reconcile card changes and update deck metadata. Follows the same pattern as the existing `delete-deck` admin route.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase (service role key for writes), existing `CardForm` component.

**Note on testing:** No test suite is configured for this project (see CLAUDE.md). TDD steps are replaced with build/lint verification and manual browser checks.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `src/components/CardForm.tsx` | Add optional `disabled` prop to disable inputs in locked state |
| Create | `src/app/api/admin/edit-deck/route.ts` | Server POST route — validates password, reconciles cards, updates deck |
| Create | `src/app/deck/[id]/edit/page.tsx` | Edit page — locked form, unlock, save |
| Modify | `src/app/deck/[id]/page.tsx` | Add "Edit Deck" link in admin section |

---

### Task 1: Add `disabled` prop to CardForm

**Files:**
- Modify: `src/components/CardForm.tsx`

- [ ] **Step 1: Update CardForm to accept and apply a `disabled` prop**

Replace the entire file content of `src/components/CardForm.tsx`:

```tsx
"use client";

export default function CardForm({ index, front, back, onChange, onRemove, canRemove, disabled = false }: { index: number, front: string, back: string, onChange: (field: string, value: string) => void, onRemove: () => void, canRemove: boolean, disabled?: boolean }) {
    return (
        <div className="card" style={{ position: 'relative' }}>
            <div className="flex-between mb-sm">
                <span className="text-sm text-muted light">Card {index + 1}</span>
                {canRemove && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onRemove}
                        tabIndex={-1}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                        Remove
                    </button>
                )}
            </div>
            <div className="field">
                <label className="label">Term (Back)</label>
                <input
                    className="input"
                    placeholder="Enter the term or keyword..."
                    value={back}
                    onChange={(e) => onChange('back', e.target.value)}
                    disabled={disabled}
                />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Description (Front)</label>
                <textarea
                    className="textarea"
                    placeholder="Enter the description or definition..."
                    value={front}
                    onChange={(e) => onChange('front', e.target.value)}
                    rows={2}
                    style={{ minHeight: '72px' }}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify the create page still works (no regression)**

Run: `npm run lint`
Expected: no errors related to CardForm.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardForm.tsx
git commit -m "feat(CardForm): add optional disabled prop"
```

---

### Task 2: Create the admin edit-deck API route

**Files:**
- Create: `src/app/api/admin/edit-deck/route.ts`

- [ ] **Step 1: Create the file**

Create `src/app/api/admin/edit-deck/route.ts` with this content:

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type IncomingCard = {
    id?: string;
    front: string;
    back: string;
    position: number;
};

type RequestBody = {
    deckId?: string;
    password?: string;
    deck?: {
        title: string;
        description: string;
        subject: string;
        creatorName: string;
    };
    cards?: IncomingCard[];
};

export async function POST(request: NextRequest) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    let body: RequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { deckId, password, deck, cards } = body;

    if (!password || password !== adminPassword) {
        return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
    }

    if (!deckId || !deck || !cards) {
        return NextResponse.json({ error: 'deckId, deck, and cards are required.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Fetch existing card IDs for this deck
        const { data: existingCards, error: fetchError } = await supabase
            .from('cards')
            .select('id')
            .eq('deck_id', deckId);
        if (fetchError) throw fetchError;

        const existingIds = new Set((existingCards ?? []).map((c: { id: string }) => c.id));
        const incomingIds = new Set(cards.filter(c => c.id).map(c => c.id as string));

        // 2. Delete removed cards (and their SRS progress)
        const deletedIds = [...existingIds].filter(id => !incomingIds.has(id));
        if (deletedIds.length > 0) {
            await supabase.from('card_progress').delete().in('card_id', deletedIds);
            const { error } = await supabase.from('cards').delete().in('id', deletedIds);
            if (error) throw error;
        }

        // 3. Update existing cards
        for (const card of cards.filter(c => c.id)) {
            const { error } = await supabase
                .from('cards')
                .update({ front: card.front, back: card.back, position: card.position })
                .eq('id', card.id);
            if (error) throw error;
        }

        // 4. Insert new cards
        const newCards = cards
            .filter(c => !c.id)
            .map(c => ({ deck_id: deckId, front: c.front, back: c.back, position: c.position }));
        if (newCards.length > 0) {
            const { error } = await supabase.from('cards').insert(newCards);
            if (error) throw error;
        }

        // 5. Update deck metadata
        const { error: deckError } = await supabase
            .from('decks')
            .update({
                title: deck.title,
                description: deck.description,
                subject: deck.subject,
                creator_name: deck.creatorName,
            })
            .eq('id', deckId);
        if (deckError) throw deckError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Failed to edit deck:', err);
        return NextResponse.json({ error: err.message || 'Failed to edit deck.' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/edit-deck/route.ts
git commit -m "feat(api): add admin edit-deck route"
```

---

### Task 3: Create the edit page

**Files:**
- Create: `src/app/deck/[id]/edit/page.tsx`

- [ ] **Step 1: Create the edit page**

Create `src/app/deck/[id]/edit/page.tsx` with this content:

```tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchDeck, fetchCards } from '@/lib/supabase';
import CardForm from '@/components/CardForm';
import type { Card, Deck } from '@/types';

type EditCard = {
    id?: string;
    front: string;
    back: string;
};

const emptyCard = (): EditCard => ({ front: '', back: '' });

export default function EditDeck() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subject, setSubject] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [cards, setCards] = useState<EditCard[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [unlocked, setUnlocked] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [d, c] = await Promise.all([fetchDeck(id), fetchCards(id)]);
                setDeck(d);
                setTitle(d.title);
                setDescription(d.description || '');
                setSubject(d.subject || '');
                setCreatorName(d.creator_name);
                setCards(c.map((card: Card) => ({ id: card.id, front: card.front, back: card.back })));
            } catch (err: any) {
                setLoadError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const handleUnlock = () => {
        if (!password.trim()) {
            setUnlockError('Password is required.');
            return;
        }
        setUnlocked(true);
        setUnlockError(null);
    };

    const updateCard = (index: number, field: string, value: string) => {
        setCards(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            setCards(latest => {
                if (latest.length < 2) return latest;
                const secondLast = latest[latest.length - 2];
                const last = latest[latest.length - 1];
                const secondLastComplete = secondLast.front.trim() && secondLast.back.trim();
                const lastBlank = !last.front.trim() && !last.back.trim();
                return secondLastComplete && lastBlank ? [...latest, emptyCard()] : latest;
            });
        }, 300);
    };

    const removeCard = (index: number) => {
        setCards(prev => prev.filter((_, i) => i !== index));
    };

    const addCard = () => {
        setCards(prev => [...prev, emptyCard()]);
    };

    const handleSave = async () => {
        setSaveError(null);

        if (!title.trim()) {
            setSaveError('Title is required.');
            return;
        }
        const validCards = cards.filter(c => c.front.trim() && c.back.trim());
        if (validCards.length < 2) {
            setSaveError('At least 2 complete cards are required.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                deckId: id,
                password,
                deck: {
                    title: title.trim(),
                    description: description.trim(),
                    subject: subject.trim(),
                    creatorName: creatorName.trim() || 'Anonymous',
                },
                cards: validCards.map((c, i) => ({
                    ...(c.id ? { id: c.id } : {}),
                    front: c.front.trim(),
                    back: c.back.trim(),
                    position: i,
                })),
            };

            const response = await fetch('/api/admin/edit-deck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    setUnlocked(false);
                    setPassword('');
                    setUnlockError('Incorrect password. Please unlock again.');
                    setSaving(false);
                    return;
                }
                throw new Error(data.error || 'Failed to save changes.');
            }

            router.push(`/deck/${id}`);
        } catch (err: any) {
            setSaveError(err.message);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-center">
                    <div className="spinner spinner-lg"></div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{loadError}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px', marginBottom: '12px' }}>
                    ← Back
                </Link>
                <h1 className="mb-lg">Edit Deck</h1>

                {/* Admin unlock */}
                <div className="card mb-lg" style={{ padding: '20px' }}>
                    <p className="text-sm text-muted mb-sm">Admin access required to edit this deck.</p>
                    {unlockError && <div className="error-box mb-sm">{unlockError}</div>}
                    <div className="flex gap-sm" style={{ alignItems: 'flex-end' }}>
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="label">Admin Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Enter admin password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !unlocked && handleUnlock()}
                                disabled={unlocked}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleUnlock}
                            disabled={unlocked}
                        >
                            {unlocked ? 'Unlocked' : 'Unlock'}
                        </button>
                    </div>
                </div>

                {/* Deck metadata */}
                <div className="field">
                    <label className="label">Title</label>
                    <input
                        className="input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        disabled={!unlocked}
                    />
                </div>
                <div className="field">
                    <label className="label">Description (optional)</label>
                    <input
                        className="input"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={!unlocked}
                    />
                </div>
                <div className="field">
                    <label className="label">Subject</label>
                    <input
                        className="input"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        disabled={!unlocked}
                    />
                </div>
                <div className="field">
                    <label className="label">Creator Name</label>
                    <input
                        className="input"
                        value={creatorName}
                        onChange={e => setCreatorName(e.target.value)}
                        disabled={!unlocked}
                    />
                </div>

                <div className="mt-lg mb-md">
                    <div className="flex-between">
                        <h2>Cards ({cards.filter(c => c.front.trim() && c.back.trim()).length} complete)</h2>
                        {unlocked && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addCard}>
                                + Add Card
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
                    {cards.map((card, i) => (
                        <CardForm
                            key={card.id ?? `new-${i}`}
                            index={i}
                            front={card.front}
                            back={card.back}
                            onChange={(field, value) => updateCard(i, field, value)}
                            onRemove={() => removeCard(i)}
                            canRemove={unlocked && cards.length > 1}
                            disabled={!unlocked}
                        />
                    ))}
                </div>

                {unlocked && (
                    <div className="mt-lg">
                        {saveError && <div className="error-box mb-md">{saveError}</div>}
                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/deck/[id]/edit/page.tsx
git commit -m "feat(deck): add admin edit deck page"
```

---

### Task 4: Add "Edit Deck" link to deck detail page

**Files:**
- Modify: `src/app/deck/[id]/page.tsx:242-251`

- [ ] **Step 1: Add the Edit Deck link**

In `src/app/deck/[id]/page.tsx`, find the admin section at the bottom (around line 242):

```tsx
                {/* Admin: Delete Deck */}
                <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--error)', opacity: 0.7 }}
                        onClick={() => { setShowDeleteModal(true); setDeleteError(null); setAdminPassword(''); }}
                    >
                        Delete Deck
                    </button>
                </div>
```

Replace with:

```tsx
                {/* Admin: Edit / Delete Deck */}
                <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '24px' }} className="flex gap-sm">
                    <Link href={`/deck/${id}/edit`} className="btn btn-ghost btn-sm">
                        Edit Deck
                    </Link>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--error)', opacity: 0.7 }}
                        onClick={() => { setShowDeleteModal(true); setDeleteError(null); setAdminPassword(''); }}
                    >
                        Delete Deck
                    </button>
                </div>
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/deck/[id]/page.tsx
git commit -m "feat(deck): add Edit Deck link in admin section"
```

---

### Task 5: Build verification and manual testing

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build completes with no errors. (Warnings about `any` types are acceptable.)

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Navigate to any deck detail page.

- [ ] **Step 3: Verify Edit Deck link appears**

At the bottom of the deck detail page, confirm you see both "Edit Deck" and "Delete Deck" buttons side by side.

- [ ] **Step 4: Verify locked state**

Click "Edit Deck". Confirm:
- The form loads with all deck data pre-filled
- All inputs and card fields are disabled (greyed out, not interactive)
- No "Save Changes" button is visible

- [ ] **Step 5: Verify wrong-password rejection**

Enter a wrong password and click "Unlock". Confirm the form becomes editable (the unlock step is a UX gate; actual password validation happens on save). Then click "Save Changes" and confirm an "Incorrect password" error appears and the form re-locks.

- [ ] **Step 6: Verify full edit flow**

Enter the correct admin password, click "Unlock". Make changes:
- Edit the deck title
- Change a card's front/back text
- Remove one card
- Add a new card

Click "Save Changes". Confirm you are redirected to the deck detail page and all changes are reflected.

- [ ] **Step 7: Verify card deletion cleans up SRS progress**

If there's a deck with cards that have SRS progress records, remove one of those cards via edit and save. Verify (via Supabase dashboard or SQL) that the corresponding `card_progress` row was deleted.
