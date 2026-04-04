import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDeck, fetchCards } from '../lib/supabase';
import FlipCard from '../components/FlipCard';
import { loadSRSProgress, rateCard, getDueCardsList } from '../lib/tracking';
import { Rating, formatInterval, previewIntervals } from '../lib/srs';
import { SparklesIcon } from '../components/Icons';

export default function Review() {
    const { id } = useParams();

    const [deck, setDeck] = useState(null);
    const [dueCards, setDueCards] = useState([]);
    const [progressMap, setProgressMap] = useState({});
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [flipKey, setFlipKey] = useState(0);
    const [finished, setFinished] = useState(false);
    const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

    const flipCardRef = useRef(null);

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

        const card = dueCards[current];
        const statKey = ['again', 'hard', 'good', 'easy'][rating];
        setSessionStats(prev => ({ ...prev, [statKey]: prev[statKey] + 1 }));

        const updated = await rateCard(id, card.id, rating);
        setProgressMap(prev => ({ ...prev, [card.id]: updated }));

        // If "Again", re-queue this card at the end
        if (rating === Rating.AGAIN) {
            setDueCards(prev => [...prev, card]);
        }

        if (current < dueCards.length - 1 || rating === Rating.AGAIN) {
            setTimeout(() => {
                setCurrent(prev => prev + 1);
                setFlipKey(k => k + 1);
            }, 200);
        } else {
            setTimeout(() => setFinished(true), 200);
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
            if (e.key === '1') handleRate(Rating.AGAIN);
            if (e.key === '2') handleRate(Rating.HARD);
            if (e.key === '3') handleRate(Rating.GOOD);
            if (e.key === '4') handleRate(Rating.EASY);
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
                    <Link to={`/deck/${id}`} className="btn btn-primary">
                        Back to Deck
                    </Link>
                </div>
            </div>
        );

    // Finished screen
    if (finished) {
        const total = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
        return (
            <div className="page">
                <div className="container text-center" style={{ maxWidth: '520px' }}>
                    <SparklesIcon size={36} style={{ marginBottom: '16px', opacity: 0.6 }} />
                    <h2 className="mb-sm">Review Complete!</h2>
                    <p className="mb-lg">You reviewed {total} cards this session.</p>

                    <div className="srs-stats-grid mb-lg">
                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Again</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--error)' }}>{sessionStats.again}</p>
                        </div>
                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Hard</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{sessionStats.hard}</p>
                        </div>
                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Good</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{sessionStats.good}</p>
                        </div>
                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Easy</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{sessionStats.easy}</p>
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        <Link to={`/deck/${id}`} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                            Back to Deck
                        </Link>
                        <Link to={`/deck/${id}/practice`} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            Practice All Cards
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const card = dueCards[current];
    const cardProgress = progressMap[card.id] || { ease_factor: 2.5, interval: 0, repetitions: 0 };
    const intervals = previewIntervals(cardProgress);
    const remaining = dueCards.length - current;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                {/* Header */}
                <div className="flex-between mb-lg">
                    <Link to={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
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

                {/* Flip Card */}
                <div className="mb-md">
                    <FlipCard key={flipKey} ref={flipCardRef} front={card.front} back={card.back} />
                </div>

                {/* SRS Rating Buttons */}
                <div className="srs-rating-row mb-md">
                    <button className="srs-btn srs-again" onClick={() => handleRate(Rating.AGAIN)}>
                        <span className="srs-btn-label">Again</span>
                        <span className="srs-btn-interval">{formatInterval(intervals[Rating.AGAIN])}</span>
                    </button>
                    <button className="srs-btn srs-hard" onClick={() => handleRate(Rating.HARD)}>
                        <span className="srs-btn-label">Hard</span>
                        <span className="srs-btn-interval">{formatInterval(intervals[Rating.HARD])}</span>
                    </button>
                    <button className="srs-btn srs-good" onClick={() => handleRate(Rating.GOOD)}>
                        <span className="srs-btn-label">Good</span>
                        <span className="srs-btn-interval">{formatInterval(intervals[Rating.GOOD])}</span>
                    </button>
                    <button className="srs-btn srs-easy" onClick={() => handleRate(Rating.EASY)}>
                        <span className="srs-btn-label">Easy</span>
                        <span className="srs-btn-interval">{formatInterval(intervals[Rating.EASY])}</span>
                    </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-center text-sm text-muted" style={{ opacity: 0.5 }}>
                    Space = flip · 1 = Again · 2 = Hard · 3 = Good · 4 = Easy
                </p>

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
