"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { fetchDecks } from '@/lib/supabase';
import DeckCard from '@/components/DeckCard';
import Pagination, { pageCount, paginate } from '@/components/Pagination';
import type { Deck } from '@/types';

export default function Home() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSubject, setActiveSubjectRaw] = useState('All');
    const [page, setPage] = useState(1);
    const listRef = useRef<HTMLElement>(null);

    const setActiveSubject = (subject: string) => {
        setActiveSubjectRaw(subject);
        setPage(1);
    };

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

    // Clamp so a shrinking list never leaves us on an empty page
    const currentPage = Math.min(page, pageCount(filteredDecks.length));
    const pagedDecks = useMemo(
        () => paginate(filteredDecks, currentPage),
        [filteredDecks, currentPage]
    );

    const goToPage = (next: number) => {
        setPage(next);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const renderFilterTabs = (items, active, setActive) => {
        if (items.length <= 1) return null;
        return (
            <div className="chip-row">
                {items.map(s => (
                    <button
                        key={s}
                        type="button"
                        className={`chip ${active === s ? 'is-active' : ''}`}
                        aria-pressed={active === s}
                        onClick={() => setActive(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="page">
            <div className="container container-wide">
                {/* Hero */}
                <header className="hero">
                    <div className="hero-copy">
                        <span className="eyebrow">Flashkards, kept properly</span>
                        <h1 className="hero-title">
                            go<em>kards</em>
                        </h1>
                        <p className="hero-lede">
                            Create, share, and practice flashkards. Drop in your notes and let AI write the deck for you.
                        </p>
                        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                            <Link href="/create" className="btn btn-primary btn-lg">
                                Create Deck
                            </Link>
                            <Link href="/ai-parse" className="btn btn-secondary btn-lg">
                                AI Parse
                            </Link>
                        </div>
                    </div>
                    <div className="hero-stack" aria-hidden="true">
                        <div className="hero-stack-card"></div>
                        <div className="hero-stack-card"></div>
                        <div className="hero-stack-card">
                            <div className="index-card-head"><span>Term</span></div>
                            <div className="hero-stack-term">Hash table</div>
                        </div>
                    </div>
                </header>

                {/* Deck List */}
                <section ref={listRef} style={{ marginTop: '24px', scrollMarginTop: '96px' }}>
                    <div className="section-head">
                        <h2>Public decks</h2>
                        {renderFilterTabs(subjects, activeSubject, setActiveSubject)}
                    </div>

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
                        <>
                            <div className="deck-grid">
                                {pagedDecks.map((deck) => (
                                    <DeckCard key={deck.id} deck={deck} />
                                ))}
                            </div>
                            <Pagination
                                page={currentPage}
                                totalItems={filteredDecks.length}
                                onPageChange={goToPage}
                            />
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
