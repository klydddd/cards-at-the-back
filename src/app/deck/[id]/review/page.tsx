"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards } from '@/lib/supabase';
import FlipCard from '@/components/FlipCard';
import { loadSRSProgress, rateCard, getDueCardsList } from '@/lib/tracking';
import { Rating, formatInterval, previewIntervals } from '@/lib/srs';
import { CheckIcon, XIcon, ArrowLeftIcon } from '@/components/Icons';

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
                <div className="container">
                    <div className="session-done">
                        <span className="eyebrow">Review</span>
                        <h2>Nothing due.</h2>
                        <p>All caught up. Come back later when kards are due for review.</p>
                        <Link href={`/deck/${id}`} className="btn btn-primary btn-lg">
                            Back to Deck
                        </Link>
                    </div>
                </div>
            </div>
        );

    // Finished screen
    if (finished) {
        const total = sessionStats.again + sessionStats.good;
        return (
            <div className="page">
                <div className="container">
                    <div className="session-done">
                        <span className="eyebrow">Review complete</span>
                        <h2>That&apos;s the stack.</h2>
                        <p>You reviewed {total} kards this session.</p>

                        <div className="stat-tiles">
                            <div className="stat-tile stat-tile-success">
                                <span className="stat-tile-value">{sessionStats.good}</span>
                                <span className="stat-tile-label">Known</span>
                            </div>
                            <div className="stat-tile stat-tile-warning">
                                <span className="stat-tile-value">{sessionStats.again}</span>
                                <span className="stat-tile-label">Still learning</span>
                            </div>
                        </div>

                        <div className="stack-actions">
                            <Link href={`/deck/${id}`} className="btn btn-primary btn-lg">
                                Back to Deck
                            </Link>
                            <Link href={`/deck/${id}/practice`} className="btn btn-secondary btn-lg">
                                Practice All Kards
                            </Link>
                        </div>
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
            <div className="container" style={{ maxWidth: '768px' }}>
                {/* Header */}
                <div className="session-bar">
                    <Link href={`/deck/${id}`} className="session-back">
                        <ArrowLeftIcon size={16} /> {deck.title}
                    </Link>
                    <div className="session-meta">
                        <span className="eyebrow eyebrow-purple">Review</span>
                        <span>{remaining} remaining</span>
                    </div>
                </div>

                {/* Flip Card with swipe animation */}
                <div
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
                <div className="session-actions">
                    <button className="btn btn-secondary" onClick={() => handleRate(Rating.AGAIN)}>
                        <XIcon size={18} /> Still learning
                    </button>
                    <button className="btn btn-primary" onClick={() => handleRate(Rating.GOOD)}>
                        <CheckIcon size={18} /> Know it
                    </button>
                </div>

                {/* Progress bar */}
                <div className="progress-bar-track">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${(current / dueCards.length) * 100}%` }}
                    ></div>
                </div>
                <div className="session-foot">
                    <span>
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>{sessionStats.good} known</span>
                        {' · '}
                        <span style={{ color: 'var(--warning)', fontWeight: 500 }}>{sessionStats.again} still learning</span>
                    </span>
                    <span className="session-foot-hint">Space to flip, ← → to rate</span>
                </div>
            </div>
        </div>
    );
}
