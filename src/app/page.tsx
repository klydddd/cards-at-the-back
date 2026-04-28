"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fetchDecks } from '@/lib/supabase';
import DeckCard from '@/components/DeckCard';
import type { Deck } from '@/types';

export default function Home() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSubject, setActiveSubject] = useState('All');

    useEffect(() => {
        fetchDecks()
            .then((d) => {
                setDecks(d);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Unique subjects from decks
    const subjects = useMemo(() => {
        const set = new Set();
        decks.forEach(d => {
            if (d.subject && d.subject.trim()) set.add(d.subject.trim());
        });
        return ['All', ...Array.from(set).sort()];
    }, [decks]);

    const filteredDecks = useMemo(() => {
        if (activeSubject === 'All') return decks;
        return decks.filter(d => d.subject && d.subject.trim() === activeSubject);
    }, [decks, activeSubject]);

    const renderFilterTabs = (items, active, setActive) => {
        if (items.length <= 1) return null;
        return (
            <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                {items.map(s => (
                    <button
                        key={s}
                        className={`btn btn-sm ${active === s ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActive(s)}
                        style={{
                            borderRadius: '100px',
                            padding: '6px 16px',
                            fontSize: '0.82rem',
                            ...(active !== s ? { border: '1.5px solid var(--border)' } : {}),
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="page">
            <div className="container">
                {/* Hero */}
                <div className="text-center mb-lg" style={{ padding: '40px 0 20px' }}>
                    <h1>
                        cards at <span className="light">the back</span>
                    </h1>
                    <p style={{ fontSize: '1.1rem', marginTop: '12px', maxWidth: '480px', margin: '12px auto 0' }}>
                        Create, share, and practice flashcards. Upload a file and let AI do the rest.
                    </p>
                    <div className="flex-center gap-sm mt-md">
                        <Link href="/create" className="btn btn-primary btn-lg">
                            Create Deck
                        </Link>
                        <Link href="/ai-parse" className="btn btn-secondary btn-lg">
                            AI Parse
                        </Link>
                    </div>
                </div>

                {/* Deck List */}
                <div style={{ marginTop: '48px' }}>
                    <h2 className="mb-md">Public Decks</h2>
                    {renderFilterTabs(subjects, activeSubject, setActiveSubject)}

                    {loading && (
                        <div className="loading-center">
                            <div className="spinner spinner-lg"></div>
                        </div>
                    )}

                    {error && <div className="error-box">{error}</div>}

                    {!loading && !error && filteredDecks.length === 0 && (
                        <div className="empty-state">
                            {activeSubject === 'All' ? (
                                <>
                                    <h2>No decks yet</h2>
                                    <p>Be the first to create a deck and share it with the world.</p>
                                    <Link href="/create" className="btn btn-primary">
                                        Create your first deck
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <h2>No decks in "{activeSubject}"</h2>
                                    <p>No decks match this subject filter.</p>
                                    <button className="btn btn-secondary" onClick={() => setActiveSubject('All')}>
                                        Show All
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {!loading && !error && filteredDecks.length > 0 && (
                        <div className="deck-grid">
                            {filteredDecks.map((deck) => (
                                <DeckCard key={deck.id} deck={deck} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
