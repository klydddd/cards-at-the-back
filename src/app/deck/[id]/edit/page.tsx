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
