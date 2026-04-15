"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchDeck, fetchCards } from '@/lib/supabase';
import FlipCard from '@/components/FlipCard';
import { getLearnedCardIds, markCardAsLearned, markCardAsLearning, rateCard, loadSRSProgress } from '@/lib/tracking';
import { Rating, formatInterval, previewIntervals } from '@/lib/srs';
import { ShuffleIcon, SparklesIcon, CheckIcon, XIcon } from '@/components/Icons';

const CHECK_IN_INTERVAL = 15;
const REVIEW_INSERT_COUNT = 3; // how many review cards to slip in after check-in

const FEELINGS = [
    { emoji: '😊', label: 'Great', color: '#10b981' },
    { emoji: '😐', label: 'Okay', color: '#f59e0b' },
    { emoji: '😵‍💫', label: 'Struggling', color: '#ef4444' },
];

export default function Practice() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const isReplayMode = searchParams ? searchParams.get('filter') === 'not-learned' : false;

    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shuffled, setShuffled] = useState(false);
    const [flipKey, setFlipKey] = useState(0);
    const [learnedIds, setLearnedIds] = useState(new Set());
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeAction, setSwipeAction] = useState(null);
    const [finished, setFinished] = useState(false);
    const [srsProgress, setSrsProgress] = useState({});

    // Animation states
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);

    // Check-in state
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [cardsSeenSinceCheckIn, setCardsSeenSinceCheckIn] = useState(0);
    const [checkInCount, setCheckInCount] = useState(0);
    const [lastFeeling, setLastFeeling] = useState(null);
    const reviewInsertedRef = useRef(new Set()); // track which check-in rounds already inserted reviews

    const flipCardRef = useRef(null);
    const swipeAreaRef = useRef(null);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    const isHorizontalSwipe = useRef(null);

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
        reviewInsertedRef.current = new Set();
        goTo(0);
    };

    const restartPractice = () => {
        setFinished(false);
        setCardsSeenSinceCheckIn(0);
        setCheckInCount(0);
        setShowCheckIn(false);
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
                    <SparklesIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <h2 className="mb-md">You're all caught up!</h2>
                    <p className="mb-lg">There are no more cards to learn in this mode.</p>
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
                <div className="container text-center" style={{ maxWidth: '480px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🧠</div>
                    <h2 className="mb-sm">Quick Check-In</h2>
                    <p className="text-muted mb-lg">
                        You've gone through {CHECK_IN_INTERVAL} cards. How are you feeling?
                    </p>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        {FEELINGS.map(f => (
                            <button
                                key={f.label}
                                className="btn btn-secondary btn-lg"
                                style={{ width: '100%', justifyContent: 'center', gap: '10px' }}
                                onClick={() => handleCheckInContinue(f.label)}
                            >
                                <span style={{ fontSize: '1.3rem' }}>{f.emoji}</span> {f.label}
                            </button>
                        ))}
                    </div>

                    <p className="text-sm text-muted mt-lg" style={{ opacity: 0.5 }}>
                        We'll slip in a few review cards from earlier to help you remember.
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
                <div className="container text-center" style={{ maxWidth: '520px' }}>
                    <SparklesIcon size={36} style={{ marginBottom: '16px', opacity: 0.6 }} />
                    <h2 className="mb-sm">Practice Complete!</h2>
                    <p className="mb-lg">
                        You went through all {cards.length} cards.
                    </p>

                    <div className="flex-center gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
                        <div className="card" style={{ padding: '16px 24px', textAlign: 'center', flex: '1 1 120px' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Learned</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{learnedCount}</p>
                        </div>
                        <div className="card" style={{ padding: '16px 24px', textAlign: 'center', flex: '1 1 120px' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Still Learning</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{notLearnedCount}</p>
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={restartPractice}>
                            Practice Again
                        </button>
                        {notLearnedCount > 0 && (
                            <Link
                                href={`/deck/${id}/practice?filter=not-learned`}
                                className="btn btn-secondary btn-lg"
                                style={{ width: '100%', borderColor: 'var(--warning-border)', color: 'var(--warning-dark)' }}
                                onClick={() => {
                                    setFinished(false);
                                    setLoading(true);
                                }}
                            >
                                Practice Not Learned ({notLearnedCount})
                            </Link>
                        )}
                        <Link href={`/deck/${id}`} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            Back to Deck
                        </Link>
                        <Link href="/" className="btn btn-ghost" style={{ width: '100%' }}>
                            Browse Other Decks
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
            <div className="container" style={{ maxWidth: '640px' }}>
                <div className="flex-between mb-lg">
                    <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        ← Back
                    </Link>
                    <div className="flex gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={shuffle}>
                            <ShuffleIcon size={16} /> {shuffled ? 'Reshuffled' : 'Shuffle'}
                        </button>
                    </div>
                </div>

                <div className="text-center mb-md">
                    <h2>{deck.title}</h2>
                    <p className="text-sm text-muted mt-sm light">
                        Card {current + 1} of {cards.length} — click or press space to flip
                    </p>
                    {isReplayMode && (
                        <span className="badge badge-warning mt-sm">
                            Replay not-learned mode
                        </span>
                    )}
                    {isReviewCard && (
                        <span className="badge badge-purple mt-sm">
                            Review Card
                        </span>
                    )}
                </div>

                <div
                    ref={swipeAreaRef}
                    className="mb-md"
                    style={{
                        position: 'relative',
                        transform: transformStyle,
                        transition: transitionStyle,
                        opacity: opacityStyle,
                    }}
                >
                    {swipeAction && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
                                background: swipeAction === 'learned' ? 'var(--success)' : 'var(--warning)',
                                color: '#fff',
                                padding: '8px 20px',
                                borderRadius: '100px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                pointerEvents: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                        >
                            {swipeAction === 'learned' ? 'Know It →' : '← Still Learning'}
                        </div>
                    )}
                    <FlipCard key={flipKey} ref={flipCardRef} front={card.front} back={card.back} />
                    {isLearned && (
                        <div style={{ position: 'absolute', top: -12, right: -12, background: 'var(--success)', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                            <CheckIcon size={16} />
                        </div>
                    )}
                </div>

                <div className="flex-center gap-md mb-lg">
                    <button
                        className={`btn ${!isLearned ? 'btn-secondary' : 'btn-ghost'} btn-lg`}
                        onClick={handleMarkLearning}
                        style={{ flex: 1, borderColor: !isLearned ? 'var(--warning-border)' : '', color: !isLearned ? 'var(--warning-dark)' : '' }}
                    >
                        <XIcon size={18} /> Still Learning <span className="text-muted text-sm" style={{ opacity: 0.5, marginLeft: 8 }}>←</span>
                    </button>
                    <button
                        className={`btn ${isLearned ? 'btn-primary' : 'btn-secondary'} btn-lg`}
                        onClick={handleMarkLearned}
                        style={{ flex: 1, color: isLearned ? '#fff' : 'var(--success-dark)', background: isLearned ? 'var(--success)' : '', borderColor: isLearned ? 'var(--success)' : '' }}
                    >
                        <CheckIcon size={18} /> Know It <span className="text-muted text-sm" style={{ opacity: 0.5, marginLeft: 8 }}>→</span>
                    </button>
                </div>

                {/* <p className="text-center text-sm text-muted mb-lg" style={{ opacity: 0.5 }}>
                    Space = flip · ← = learning · → = know it
                </p> */}

                <div className="progress-bar-track" style={{ marginTop: '12px' }}>
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${((current + 1) / cards.length) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
