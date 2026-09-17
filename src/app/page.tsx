"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { fetchDecks } from '@/lib/supabase';
import DeckCard from '@/components/DeckCard';
import SubjectFilter from '@/components/SubjectFilter';
import Pagination, { pageCount, paginate } from '@/components/Pagination';
import type { Deck } from '@/types';

export default function Home() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSubjects, setSelectedSubjectsRaw] = useState<string[]>([]);
    const [query, setQueryRaw] = useState('');
    const [page, setPage] = useState(1);
    const listRef = useRef<HTMLElement>(null);

    // Any change to what's shown starts back at page 1
    const setSelectedSubjects = (next: string[]) => {
        setSelectedSubjectsRaw(next);
        setPage(1);
    };
    const setQuery = (value: string) => {
        setQueryRaw(value);
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
        const set = new Set<string>();
        decks.forEach(d => {
            if (d.subject && d.subject.trim()) set.add(d.subject.trim());
        });
        return Array.from(set).sort();
    }, [decks]);

    const filteredDecks = useMemo(() => {
        const chosen = new Set(selectedSubjects);
        const needle = query.trim().toLowerCase();

        return decks.filter(d => {
            const subject = d.subject?.trim() || '';
            if (chosen.size > 0 && !chosen.has(subject)) return false;
            if (!needle) return true;

            // Card contents are deliberately not searched — this is a browse list
            const haystack = [d.title, d.description, d.creator_name, subject]
                .join(' ')
                .toLowerCase();
            return haystack.includes(needle);
        });
    }, [decks, selectedSubjects, query]);

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

    const clearFilters = () => {
        setSelectedSubjects([]);
        setQuery('');
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
                <section ref={listRef} style={{ marginTop: 'var(--space-lg)', scrollMarginTop: '96px' }}>
                    <div className="section-head">
                        <h2>Public decks</h2>
                    </div>

                    <div className="browse-toolbar">
                        <div className="browse-search">
                            <label className="sr-only" htmlFor="deck-search">
                                Search decks
                            </label>
                            <input
                                id="deck-search"
                                type="search"
                                className="input"
                                placeholder="Search by title, creator, or subject"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <div className="browse-filter">
                            <SubjectFilter
                                subjects={subjects}
                                selected={selectedSubjects}
                                onChange={setSelectedSubjects}
                            />
                        </div>
                    </div>

                    {loading && (
                        <div className="loading-center">
                            <div className="spinner spinner-lg"></div>
                        </div>
                    )}

                    {error && <div className="error-box">{error}</div>}

                    {!loading && !error && filteredDecks.length === 0 && (
                        <div className="empty-state">
                            {decks.length === 0 ? (
                                <>
                                    <h2>No decks yet</h2>
                                    <p>Be the first to create a deck and share it with the world.</p>
                                    <Link href="/create" className="btn btn-primary">
                                        Create your first deck
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <h2>No decks match</h2>
                                    <p>Nothing fits the current filters.</p>
                                    <button className="btn btn-secondary" onClick={clearFilters}>
                                        Clear filters
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
