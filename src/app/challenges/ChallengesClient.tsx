"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { fetchQuizChallenges, fetchChallengeStats } from '@/lib/supabase';
import { getCompletedChallengeSet } from '@/lib/challengeHistory';
import ChallengeCard from '@/components/ChallengeCard';
import Pagination, { pageCount, paginate } from '@/components/Pagination';
import type { ChallengeListItem, ChallengeSort, ChallengeStats } from '@/types';

const SORT_LABELS: { value: ChallengeSort; label: string }[] = [
    { value: 'recent', label: 'Newest' },
    { value: 'played', label: 'Most played' },
    { value: 'questions', label: 'Most questions' },
];

export default function ChallengesClient() {
    const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
    const [stats, setStats] = useState<Record<string, ChallengeStats>>({});
    const [completed, setCompleted] = useState<Set<string>>(() => new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeSubject, setActiveSubjectRaw] = useState('All');
    const [query, setQueryRaw] = useState('');
    const [sort, setSortRaw] = useState<ChallengeSort>('recent');
    const [page, setPage] = useState(1);
    const listRef = useRef<HTMLDivElement>(null);

    // Any change to what's shown starts back at page 1
    const setActiveSubject = (subject: string) => {
        setActiveSubjectRaw(subject);
        setPage(1);
    };
    const setQuery = (value: string) => {
        setQueryRaw(value);
        setPage(1);
    };
    const setSort = (value: ChallengeSort) => {
        setSortRaw(value);
        setPage(1);
    };

    useEffect(() => {
        fetchQuizChallenges()
            .then(async (rows) => {
                setChallenges(rows);
                try {
                    setStats(await fetchChallengeStats());
                } catch {
                    // Stats are decorative — a failure here shouldn't hide the list
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Read localStorage only after mount: reading it during render would make the
    // server HTML disagree with the first client render and trip hydration.
    useEffect(() => {
        setCompleted(getCompletedChallengeSet());
    }, []);

    const subjectOf = (c: ChallengeListItem) =>
        c.subject?.trim() || c.decks?.subject?.trim() || '';

    // Quizzes rarely carry their own subject, so the deck's is what actually
    // populates these chips.
    const subjects = useMemo(() => {
        const set = new Set<string>();
        challenges.forEach((c) => {
            const subject = subjectOf(c);
            if (subject) set.add(subject);
        });
        return ['All', ...Array.from(set).sort()];
    }, [challenges]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return challenges.filter((c) => {
            if (activeSubject !== 'All' && subjectOf(c) !== activeSubject) return false;
            if (!needle) return true;

            // Deliberately not searching question text — surfacing answer-adjacent
            // content in a browse list undercuts the point of the page.
            const haystack = [
                c.decks?.title || '',
                c.creator_name || '',
                subjectOf(c),
                (c.question_types || []).join(' ').replace(/_/g, ' '),
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(needle);
        });
    }, [challenges, activeSubject, query]);

    const sorted = useMemo(() => {
        const byNewest = (a: ChallengeListItem, b: ChallengeListItem) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        return [...visible].sort((a, b) => {
            if (sort === 'played') {
                const diff = (stats[b.id]?.players ?? 0) - (stats[a.id]?.players ?? 0);
                return diff !== 0 ? diff : byNewest(a, b);
            }
            if (sort === 'questions') {
                const diff = (b.questions?.length ?? 0) - (a.questions?.length ?? 0);
                return diff !== 0 ? diff : byNewest(a, b);
            }
            return byNewest(a, b);
        });
    }, [visible, sort, stats]);

    // Clamp so a shrinking list never leaves us on an empty page
    const currentPage = Math.min(page, pageCount(sorted.length));
    const paged = useMemo(() => paginate(sorted, currentPage), [sorted, currentPage]);

    const goToPage = (next: number) => {
        setPage(next);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const clearFilters = () => {
        setActiveSubject('All');
        setQuery('');
        setSort('recent');
    };

    const renderFilterTabs = (items, active, setActive) => {
        if (items.length <= 1) return null;
        return (
            <div className="chip-row">
                {items.map((s) => (
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
                <div className="section-head" ref={listRef} style={{ scrollMarginTop: '96px' }}>
                    <h2>Challenges</h2>
                    {renderFilterTabs(subjects, activeSubject, setActiveSubject)}
                </div>

                <p className="text-muted" style={{ marginTop: '-12px', marginBottom: 'var(--space-lg)' }}>
                    Published quizzes from every deck. Pick one and test what you know.
                </p>

                <div className="browse-toolbar">
                    <div className="browse-search">
                        <label className="sr-only" htmlFor="challenge-search">
                            Search challenges
                        </label>
                        <input
                            id="challenge-search"
                            type="search"
                            className="input"
                            placeholder="Search by deck, creator, or type"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <div className="browse-sort select-wrap">
                        <label className="sr-only" htmlFor="challenge-sort">
                            Sort challenges
                        </label>
                        <select
                            id="challenge-sort"
                            className="input select"
                            value={sort}
                            onChange={(e) => setSort(e.target.value as ChallengeSort)}
                        >
                            {SORT_LABELS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading && (
                    <div className="loading-center">
                        <div className="spinner spinner-lg"></div>
                    </div>
                )}

                {error && <div className="error-box">{error}</div>}

                {!loading && !error && sorted.length === 0 && (
                    <div className="empty-state">
                        {challenges.length === 0 ? (
                            <>
                                <h2>No challenges yet</h2>
                                <p>
                                    Challenges are quizzes published from a deck. Open a deck and
                                    publish one to see it here.
                                </p>
                                <Link href="/" className="btn btn-primary">
                                    Browse decks
                                </Link>
                            </>
                        ) : (
                            <>
                                <h2>No challenges match</h2>
                                <p>Nothing fits the current filters.</p>
                                <button className="btn btn-secondary" onClick={clearFilters}>
                                    Clear filters
                                </button>
                            </>
                        )}
                    </div>
                )}

                {!loading && !error && sorted.length > 0 && (
                    <>
                        <div className="deck-grid">
                            {paged.map((challenge) => (
                                <ChallengeCard
                                    key={challenge.id}
                                    challenge={challenge}
                                    stats={stats[challenge.id]}
                                    completed={completed.has(challenge.id)}
                                />
                            ))}
                        </div>
                        <Pagination
                            page={currentPage}
                            totalItems={sorted.length}
                            onPageChange={goToPage}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
