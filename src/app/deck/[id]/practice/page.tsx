"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchDeck, fetchCards } from '@/lib/supabase';
import FlipCard from '@/components/FlipCard';
import { getLearnedCardIds, markCardAsLearned, markCardAsLearning, rateCard, loadSRSProgress } from '@/lib/tracking';
import { Rating } from '@/lib/srs';
import { playSound, preloadSounds } from '@/lib/sounds';
import { ShuffleIcon, SparklesIcon, CheckIcon, XIcon, ArrowLeftIcon } from '@/components/Icons';
import type { Deck, Card } from '@/types';

const CHECK_IN_INTERVAL = 15;
const REVIEW_INSERT_COUNT = 3; // how many review cards to slip in after check-in

// `hue` names a token in globals.css (see src/lib/subjectHue.ts for the same
// pattern). The old `color` field held raw hex that nothing ever read.
const FEELINGS = [
    { label: 'Great', hue: 'mint' },
    { label: 'Okay', hue: 'yellow' },
    { label: 'Struggling', hue: 'coral' },
];

export default function Practice() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const isReplayMode = searchParams ? searchParams.get('filter') === 'not-learned' : false;

    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<(Card & { _isReview?: boolean })[]>([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shuffled, setShuffled] = useState(false);
    const [flipKey, setFlipKey] = useState(0);
    const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeAction, setSwipeAction] = useState<'learned' | 'learning' | null>(null);
    const [finished, setFinished] = useState(false);
    const [srsProgress, setSrsProgress] = useState<Record<string, any>>({});
    const [sessionLearned, setSessionLearned] = useState(0);
    const [sessionLearning, setSessionLearning] = useState(0);

    // Animation states
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);

    // Check-in state
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [cardsSeenSinceCheckIn, setCardsSeenSinceCheckIn] = useState(0);
    const [checkInCount, setCheckInCount] = useState(0);
    const [lastFeeling, setLastFeeling] = useState<string | null>(null);
    const reviewInsertedRef = useRef<Set<number>>(new Set()); // track which check-in rounds already inserted reviews

    const flipCardRef = useRef<{ toggle: () => void } | null>(null);
    const swipeAreaRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const isHorizontalSwipe = useRef<boolean | null>(null);

    useEffect(() => {
        preloadSounds();
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const [d, c] = await Promise.all([fetchDeck(id), fetchCards(id)]);
                setDeck(d);
                const learned = getLearnedCardIds(id);
                setLearnedIds(learned);

                const progress = await loadSRSProgress(id);
                setSrsProgress(progress);

                if (isReplayMode) {
                    const unlearned = c.filter(card => !learned.has(card.id));
                    setCards(unlearned);
                } else {
                    setCards(c);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id, isReplayMode]);

    const goTo = useCallback(
        (index) => {
            // Jump to center instantly, prepare for fade-in
            setSwipeOffset(0);
            setSwipeAction(null);
            setIsAnimatingOut(false);
            setIsAnimatingIn(true);
            setCurrent(index);
            setFlipKey((k) => k + 1);

            // clear fade-in flag after mount
            setTimeout(() => {
                setIsAnimatingIn(false);
            }, 50);
        },
        []
    );

    const advanceCard = useCallback(() => {
        const nextSeen = cardsSeenSinceCheckIn + 1;
        setCardsSeenSinceCheckIn(nextSeen);

        if (current < cards.length - 1) {
            // Check if we've hit 15 cards since last check-in
            if (nextSeen >= CHECK_IN_INTERVAL) {
                setTimeout(() => setShowCheckIn(true), 300);
            } else {
                setTimeout(() => goTo(current + 1), 300);
            }
        } else {
            setTimeout(() => setFinished(true), 300);
        }
    }, [cards.length, current, cardsSeenSinceCheckIn, goTo]);

    const handleMarkLearned = useCallback(() => {
        if (cards.length === 0 || showCheckIn) return;
        setIsAnimatingOut(true);
        setSwipeAction('learned');
        setSwipeOffset(500); // swipe right
        setSessionLearned((n) => n + 1);
        playSound('correct');

        const newLearned = markCardAsLearned(id, cards[current].id);
        setLearnedIds(new Set(newLearned));
        // Also record SRS rating (Good) in background
        rateCard(id, cards[current].id, Rating.GOOD).then(updated => {
            setSrsProgress(prev => ({ ...prev, [cards[current].id]: updated }));
        });
        advanceCard();
    }, [cards, current, id, advanceCard, showCheckIn]);

    const handleMarkLearning = useCallback(() => {
        if (cards.length === 0 || showCheckIn) return;
        setIsAnimatingOut(true);
        setSwipeAction('learning');
        setSwipeOffset(-500); // swipe left
        setSessionLearning((n) => n + 1);
        playSound('wrong');

        const newLearned = markCardAsLearning(id, cards[current].id);
        setLearnedIds(new Set(newLearned));
        // Also record SRS rating (Again) in background
        rateCard(id, cards[current].id, Rating.AGAIN).then(updated => {
            setSrsProgress(prev => ({ ...prev, [cards[current].id]: updated }));
        });
        advanceCard();
    }, [cards, current, id, advanceCard, showCheckIn]);

    const handleCheckInContinue = (feeling) => {
        setLastFeeling(feeling);
        const round = checkInCount;
        setCheckInCount(round + 1);
        setCardsSeenSinceCheckIn(0);
        setShowCheckIn(false);

        if (!reviewInsertedRef.current.has(round)) {
            reviewInsertedRef.current.add(round);
            const batchStart = Math.max(0, current + 1 - CHECK_IN_INTERVAL);
            const previousBatch = cards.slice(batchStart, current + 1);

            if (previousBatch.length > 0) {
                const shuffledBatch = [...previousBatch].sort(() => Math.random() - 0.5);
                const reviewCards = shuffledBatch.slice(0, Math.min(REVIEW_INSERT_COUNT, shuffledBatch.length));
                const taggedReview = reviewCards.map(c => ({ ...c, _isReview: true }));
                const insertPos = current + 1;
                const newCards = [
                    ...cards.slice(0, insertPos),
                    ...taggedReview,
                    ...cards.slice(insertPos),
                ];
                setCards(newCards);
            }
        }
        goTo(current + 1);
    };

    const shuffle = () => {
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        setCards(shuffledCards);
        setShuffled(true);
        setFinished(false);
        setCardsSeenSinceCheckIn(0);
        setCheckInCount(0);
        setShowCheckIn(false);
        setSessionLearned(0);
        setSessionLearning(0);
        reviewInsertedRef.current = new Set();
        goTo(0);
    };

    const restartPractice = () => {
        setFinished(false);
        setCardsSeenSinceCheckIn(0);
        setCheckInCount(0);
        setShowCheckIn(false);
        setSessionLearned(0);
        setSessionLearning(0);
        reviewInsertedRef.current = new Set();
        goTo(0);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (finished || showCheckIn) return;
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                flipCardRef.current?.toggle();
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handleMarkLearning();
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleMarkLearned();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleMarkLearned, handleMarkLearning, finished, showCheckIn]);

    // Touch swipe
    useEffect(() => {
        const el = swipeAreaRef.current;
        if (!el) return;

        const onTouchStart = (e) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
            isHorizontalSwipe.current = null;
        };

        const onTouchMove = (e) => {
            if (touchStartX.current === null) return;
            const deltaX = e.touches[0].clientX - touchStartX.current;
            const deltaY = e.touches[0].clientY - touchStartY.current;

            if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
                isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
            }

            if (isHorizontalSwipe.current) {
                e.preventDefault();
                setSwipeOffset(deltaX);
                if (deltaX < -50) setSwipeAction('learning');
                else if (deltaX > 50) setSwipeAction('learned');
                else setSwipeAction(null);
            }
        };

        const onTouchEnd = () => {
            if (swipeAction === 'learning') {
                handleMarkLearning();
            } else if (swipeAction === 'learned') {
                handleMarkLearned();
            } else {
                setSwipeOffset(0);
                setSwipeAction(null);
            }
            touchStartX.current = null;
            touchStartY.current = null;
            isHorizontalSwipe.current = null;
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [swipeAction, handleMarkLearned, handleMarkLearning]);

    if (loading)
        return (
            <div className="page">
                <div className="loading-center">
                    <div className="spinner spinner-lg"></div>
                </div>
            </div>
        );

    if (error)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error}</div>
                </div>
            </div>
        );

    if (cards.length === 0)
        return (
            <div className="page">
                <div className="container text-center">
                    <SparklesIcon size={32} style={{ marginBottom: 'var(--space-sm)', opacity: 0.5 }} />
                    <h2 className="mb-md">You're all caught up!</h2>
                    <p className="mb-lg">There are no more kards to learn in this mode.</p>
                    <div className="flex-center gap-md">
                        <Link href={`/deck/${id}`} className="btn btn-secondary">
                            Go back
                        </Link>
                        {isReplayMode && (
                            <Link href={`/deck/${id}/practice`} className="btn btn-primary" onClick={() => {
                                setLoading(true);
                            }}>
                                Practice All Instead
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );

    if (showCheckIn) {
        return (
            <div className="page">
                <div className="container container-sm text-center" style={{ paddingTop: 'var(--space-2xl)' }}>
                    <span className="eyebrow">Quick check-in</span>
                    <h2 className="mb-sm mt-sm" style={{ fontSize: '2.5rem' }}>How's it going?</h2>
                    <p className="text-muted mb-lg">
                        You've gone through {CHECK_IN_INTERVAL} kards.
                    </p>

                    <div className="flex" style={{ flexDirection: 'column', gap: 'var(--space-xs)' }}>
                        {FEELINGS.map(f => (
                            <button
                                key={f.label}
                                className="btn btn-lg checkin-btn"
                                data-hue={f.hue}
                                onClick={() => handleCheckInContinue(f.label)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <p className="text-sm text-muted mt-lg" style={{ opacity: 0.5 }}>
                        We'll slip in a few review kards from earlier to help you remember.
                    </p>
                </div>
            </div>
        );
    }

    if (finished) {
        const learnedCount = cards.filter(c => learnedIds.has(c.id)).length;
        const notLearnedCount = cards.length - learnedCount;

        return (
            <div className="page">
                <div className="container">
                    <div className="session-done">
                        <span className="eyebrow">Session complete</span>
                        <h2>That&apos;s the stack.</h2>
                        <p>You went through all {cards.length} kards.</p>

                        <div className="stat-tiles">
                            <div className="stat-tile stat-tile-success">
                                <span className="stat-tile-value">{learnedCount}</span>
                                <span className="stat-tile-label">Learned</span>
                            </div>
                            <div className="stat-tile stat-tile-warning">
                                <span className="stat-tile-value">{notLearnedCount}</span>
                                <span className="stat-tile-label">Still learning</span>
                            </div>
                        </div>

                        <div className="stack-actions">
                            <button className="btn btn-primary btn-lg" onClick={restartPractice}>
                                Practice Again
                            </button>
                            {notLearnedCount > 0 && (
                                <Link
                                    href={`/deck/${id}/practice?filter=not-learned`}
                                    className="btn btn-secondary btn-lg"
                                    onClick={() => {
                                        setFinished(false);
                                        setLoading(true);
                                    }}
                                >
                                    Practice Not Learned ({notLearnedCount})
                                </Link>
                            )}
                            <Link href={`/deck/${id}`} className="btn btn-secondary btn-lg">
                                Back to Deck
                            </Link>
                        </div>
                        <Link href="/" className="btn btn-ghost btn-sm">
                            Browse other decks
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const card = cards[current];
    const isLearned = learnedIds.has(card.id);
    const isReviewCard = card._isReview;

    // Calculate animation styles
    let transformStyle = `translateX(${swipeOffset * 0.4}px) rotate(${swipeOffset * 0.02}deg)`;
    let transitionStyle = 'none';
    let opacityStyle = 1;

    if (isAnimatingOut) {
        // Animating completely off screen and fading out over 0.25s
        transitionStyle = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        opacityStyle = 0;
    } else if (isAnimatingIn) {
        // Just mounted new card, start invisible and centered but not transitioned
        transitionStyle = 'none';
        opacityStyle = 0;
    } else if (swipeOffset === 0) {
        // Sitting centered after fade-in, apply fade-in transition
        transitionStyle = 'opacity 0.25s ease-in';
        opacityStyle = 1;
    } else {
        // Dragging
        transitionStyle = 'none';
        opacityStyle = Math.max(0.7, 1 - Math.abs(swipeOffset) / 600);
    }

    return (
        <div className="page">
            <div className="container container-lg">
                <div className="session-bar">
                    <Link href={`/deck/${id}`} className="session-back">
                        <ArrowLeftIcon size={16} /> {deck.title}
                    </Link>
                    <div className="session-meta">
                        <span>Kard {current + 1} of {cards.length}</span>
                        <button className="btn btn-secondary btn-sm" onClick={shuffle}>
                            <ShuffleIcon size={15} /> {shuffled ? 'Reshuffled' : 'Shuffle'}
                        </button>
                    </div>
                </div>

                {(isReplayMode || isReviewCard) && (
                    <div className="flex-center gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                        {isReplayMode && (
                            <span className="badge badge-warning">
                                Replay not-learned mode
                            </span>
                        )}
                        {isReviewCard && (
                            <span className="badge badge-purple">
                                Review Kard
                            </span>
                        )}
                    </div>
                )}

                <div
                    ref={swipeAreaRef}
                    style={{
                        position: 'relative',
                        transform: transformStyle,
                        transition: transitionStyle,
                        opacity: opacityStyle,
                    }}
                >
                    {swipeAction && (
                        <div className={`swipe-verdict ${swipeAction === 'learned' ? 'is-learned' : ''}`}>
                            {swipeAction === 'learned' ? 'Know It →' : '← Still Learning'}
                        </div>
                    )}
                    <FlipCard key={flipKey} ref={flipCardRef} front={card.front} back={card.back} />
                    {isLearned && (
                        <div className="learned-tick">
                            <CheckIcon size={16} />
                        </div>
                    )}
                </div>

                <div className="session-actions">
                    <button className="btn btn-secondary" onClick={handleMarkLearning}>
                        <XIcon size={18} /> Still learning
                    </button>
                    <button className="btn btn-primary" onClick={handleMarkLearned}>
                        <CheckIcon size={18} /> Know it
                    </button>
                </div>

                <div className="progress-bar-track">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${((current + 1) / cards.length) * 100}%` }}
                    ></div>
                </div>
                <div className="session-foot">
                    <span>
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>{sessionLearned} learned</span>
                        {' · '}
                        <span style={{ color: 'var(--warning)', fontWeight: 500 }}>{sessionLearning} still learning</span>
                    </span>
                    <span className="session-foot-hint">Space to flip, ← → to rate</span>
                </div>
            </div>
        </div>
    );
}
