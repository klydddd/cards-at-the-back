"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards } from '@/lib/supabase';
import FlipCard from '@/components/FlipCard';
import { loadSRSProgress, rateCard, getDueCardsList } from '@/lib/tracking';
import { Rating, formatInterval, previewIntervals } from '@/lib/srs';
import { SparklesIcon } from '@/components/Icons';

export default function Review() {
    const { id } = useParams();

    const [deck, setDeck] = useState<any>(null);
    const [dueCards, setDueCards] = useState<any[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, any>>({});
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [flipKey, setFlipKey] = useState(0);
    const [finished, setFinished] = useState(false);
    const [sessionStats, setSessionStats] = useState({ again: 0, good: 0 });

    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeAction, setSwipeAction] = useState<string | null>(null);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);

    const flipCardRef = useRef<any>(null);

    useEffect(() => {
        async function load() {
            try {
                const [d, c] = await Promise.all([fetchDeck(id), fetchCards(id)]);
                setDeck(d);
                const progress = await loadSRSProgress(id);
                setProgressMap(progress);
                const due = getDueCardsList(progress, c);
                setDueCards(due);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const handleRate = useCallback(async (rating) => {
        if (dueCards.length === 0 || finished) return;

        setIsAnimatingOut(true);
        if (rating === Rating.AGAIN) {
            setSwipeAction('learning');
            setSwipeOffset(-500);
        } else {
            setSwipeAction('learned');
            setSwipeOffset(500);
        }

        const card = dueCards[current];
        const statKey = rating === Rating.AGAIN ? 'again' : 'good';
        setSessionStats(prev => ({ ...prev, [statKey]: prev[statKey] + 1 }));

        const updated = await rateCard(id, card.id, rating);
        setProgressMap(prev => ({ ...prev, [card.id]: updated }));

        // If "Again", re-queue this card at the end
        if (rating === Rating.AGAIN) {
            setDueCards(prev => [...prev, card]);
        }

        if (current < dueCards.length - 1 || rating === Rating.AGAIN) {
            setTimeout(() => {
                setSwipeOffset(0);
                setSwipeAction(null);
                setIsAnimatingOut(false);
                setIsAnimatingIn(true);
                setCurrent(prev => prev + 1);
                setFlipKey(k => k + 1);
                setTimeout(() => setIsAnimatingIn(false), 50);
            }, 300);
        } else {
            setTimeout(() => setFinished(true), 300);
        }
    }, [dueCards, current, finished, id]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (finished) return;
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                flipCardRef.current?.toggle();
            }
            if (e.key === 'ArrowLeft') handleRate(Rating.AGAIN);
            if (e.key === 'ArrowRight') handleRate(Rating.GOOD);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleRate, finished]);

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

    if (dueCards.length === 0)
        return (
            <div className="page">
                <div className="container text-center">
                    <SparklesIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <h2 className="mb-md">No cards due!</h2>
                    <p className="mb-lg">All caught up. Come back later when cards are due for review.</p>
                    <Link href={`/deck/${id}`} className="btn btn-primary">
                        Back to Deck
                    </Link>
                </div>
            </div>
        );

    // Finished screen
    if (finished) {
        const total = sessionStats.again + sessionStats.good;
        return (
            <div className="page">
                <div className="container text-center" style={{ maxWidth: '520px' }}>
                    <SparklesIcon size={36} style={{ marginBottom: '16px', opacity: 0.6 }} />
                    <h2 className="mb-sm">Review Complete!</h2>
                    <p className="mb-lg">You reviewed {total} cards this session.</p>

                    <div className="flex-center gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
                        <div className="card" style={{ padding: '16px 24px', textAlign: 'center', flex: '1 1 120px' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Still Learning</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{sessionStats.again}</p>
                        </div>
                        <div className="card" style={{ padding: '16px 24px', textAlign: 'center', flex: '1 1 120px' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Known</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{sessionStats.good}</p>
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        <Link href={`/deck/${id}`} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                            Back to Deck
                        </Link>
                        <Link href={`/deck/${id}/practice`} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            Practice All Cards
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const card = dueCards[current];
    const cardProgress = progressMap[card.id] || { ease_factor: 2.5, interval: 0, repetitions: 0 };
    const remaining = dueCards.length - current;

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
    }

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                {/* Header */}
                <div className="flex-between mb-lg">
                    <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        ← Back
                    </Link>
                    <span className="badge">{remaining} remaining</span>
                </div>

                <div className="text-center mb-md">
                    <h2>{deck.title}</h2>
                    <p className="text-sm text-muted mt-sm light">
                        Spaced Repetition Review — flip card, then rate your recall
                    </p>
                </div>

                {/* Flip Card with swipe animation */}
                <div
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
                </div>

                {/* Main Action Buttons */}
                <div className="flex-center gap-md mb-lg">
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={() => handleRate(Rating.AGAIN)}
                        style={{ flex: 1, borderColor: 'var(--warning-border)', color: 'var(--warning-dark)' }}
                    >
                        Still Learning <span className="text-muted text-sm" style={{ opacity: 0.5, marginLeft: 8 }}>←</span>
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => handleRate(Rating.GOOD)}
                        style={{ flex: 1, background: 'var(--success)', borderColor: 'var(--success)' }}
                    >
                        Know It <span className="text-muted text-sm" style={{ opacity: 0.5, marginLeft: 8 }}>→</span>
                    </button>
                </div>

                {/* Keyboard hint */}
                {/* <p className="text-center text-sm text-muted" style={{ opacity: 0.5 }}>
                    Space = flip · ← = learning · → = know it
                </p> */}

                {/* Progress bar */}
                <div className="progress-bar-track" style={{ marginTop: '24px' }}>
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${(current / dueCards.length) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
