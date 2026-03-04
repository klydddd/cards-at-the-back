import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchDeck, fetchCards } from '../lib/supabase';
import FlipCard from '../components/FlipCard';
import { getLearnedCardIds, markCardAsLearned, markCardAsLearning } from '../lib/tracking';
import { ShuffleIcon, SparklesIcon, CheckIcon, XIcon } from '../components/Icons';

export default function Practice() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const isReplayMode = searchParams.get('filter') === 'not-learned';

    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shuffled, setShuffled] = useState(false);
    const [flipKey, setFlipKey] = useState(0);
    const [learnedIds, setLearnedIds] = useState(new Set());
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeAction, setSwipeAction] = useState(null); // 'learning' | 'learned' | null
    const [finished, setFinished] = useState(false);

    const flipCardRef = useRef(null);
    const swipeAreaRef = useRef(null);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    const isHorizontalSwipe = useRef(null);

    useEffect(() => {
        Promise.all([fetchDeck(id), fetchCards(id)])
            .then(([d, c]) => {
                setDeck(d);
                const learned = getLearnedCardIds(id);
                setLearnedIds(learned);

                if (isReplayMode) {
                    const unlearned = c.filter(card => !learned.has(card.id));
                    setCards(unlearned);
                } else {
                    setCards(c);
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id, isReplayMode]);

    const goTo = useCallback(
        (index) => {
            setCurrent(index);
            setFlipKey((k) => k + 1);
        },
        []
    );

    const handleMarkLearned = useCallback(() => {
        if (cards.length === 0) return;
        const newLearned = markCardAsLearned(id, cards[current].id);
        setLearnedIds(new Set(newLearned));
        if (current < cards.length - 1) {
            setTimeout(() => goTo(current + 1), 300);
        } else {
            setTimeout(() => setFinished(true), 300);
        }
    }, [cards, current, id, goTo]);

    const handleMarkLearning = useCallback(() => {
        if (cards.length === 0) return;
        const newLearned = markCardAsLearning(id, cards[current].id);
        setLearnedIds(new Set(newLearned));
        if (current < cards.length - 1) {
            setTimeout(() => goTo(current + 1), 300);
        } else {
            setTimeout(() => setFinished(true), 300);
        }
    }, [cards, current, id, goTo]);

    const shuffle = () => {
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        setCards(shuffledCards);
        setShuffled(true);
        setFinished(false);
        goTo(0);
    };

    const restartPractice = () => {
        setFinished(false);
        goTo(0);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (finished) return;
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
    }, [handleMarkLearned, handleMarkLearning, finished]);

    // Touch swipe — attached via addEventListener with { passive: false } to allow preventDefault
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

            // Determine swipe direction on first significant movement
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
            }
            setSwipeOffset(0);
            setSwipeAction(null);
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
                        <Link to={`/deck/${id}`} className="btn btn-secondary">
                            Go back
                        </Link>
                        {isReplayMode && (
                            <Link to={`/deck/${id}/practice`} className="btn btn-primary" onClick={() => {
                                setLoading(true);
                            }}>
                                Practice All Instead
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );

    // Finished screen — reached the last card
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
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{learnedCount}</p>
                        </div>
                        <div className="card" style={{ padding: '16px 24px', textAlign: 'center', flex: '1 1 120px' }}>
                            <p className="text-sm text-muted light" style={{ marginBottom: '4px' }}>Still Learning</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{notLearnedCount}</p>
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={restartPractice}>
                            Practice Again
                        </button>
                        {notLearnedCount > 0 && (
                            <Link
                                to={`/deck/${id}/practice?filter=not-learned`}
                                className="btn btn-secondary btn-lg"
                                style={{ width: '100%', borderColor: '#f59e0b', color: '#d97706' }}
                                onClick={() => {
                                    setFinished(false);
                                    setLoading(true);
                                }}
                            >
                                Practice Not Learned ({notLearnedCount})
                            </Link>
                        )}
                        <Link to={`/deck/${id}`} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            Back to Deck
                        </Link>
                        <Link to="/" className="btn btn-ghost" style={{ width: '100%' }}>
                            Browse Other Decks
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const card = cards[current];
    const isLearned = learnedIds.has(card.id);

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                {/* Header */}
                <div className="flex-between mb-lg">
                    <Link to={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
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
                        <span className="badge mt-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
                            Replay not-learned mode
                        </span>
                    )}
                </div>

                {/* Flip Card with swipe */}
                <div
                    ref={swipeAreaRef}
                    className="mb-md"
                    style={{
                        position: 'relative',
                        transform: `translateX(${swipeOffset * 0.4}px)`,
                        transition: swipeOffset === 0 ? 'transform 0.3s ease' : 'none',
                        opacity: swipeOffset === 0 ? 1 : Math.max(0.7, 1 - Math.abs(swipeOffset) / 600),
                    }}
                >
                    {/* Swipe hint label */}
                    {swipeAction && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
                                background: swipeAction === 'learned' ? '#10b981' : '#f59e0b',
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
                        <div style={{ position: 'absolute', top: -12, right: -12, background: '#10b981', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                            <CheckIcon size={16} />
                        </div>
                    )}
                </div>

                {/* Tracking Actions */}
                <div className="flex-center gap-sm mb-lg">
                    <button
                        className="btn btn-secondary"
                        onClick={handleMarkLearning}
                        style={{ borderColor: !isLearned ? '#f59e0b' : '', color: !isLearned ? '#d97706' : '' }}
                    >
                        <XIcon size={14} /> Still Learning <span className="text-muted text-sm ml-sm" style={{ opacity: 0.5 }}>←</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleMarkLearned}
                        style={{ borderColor: isLearned ? '#10b981' : '', color: isLearned ? '#059669' : '', backgroundColor: isLearned ? '#ecfdf5' : '' }}
                    >
                        <CheckIcon size={14} /> Know It <span className="text-muted text-sm ml-sm" style={{ opacity: 0.5 }}>→</span>
                    </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-center text-sm text-muted mb-lg" style={{ opacity: 0.5 }}>
                    Space = flip · ← = still learning · → = know it
                </p>

                {/* Progress bar */}
                <div
                    style={{
                        marginTop: '12px',
                        height: '3px',
                        background: 'var(--gray-200)',
                        borderRadius: '100px',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${((current + 1) / cards.length) * 100}%`,
                            background: 'var(--black)',
                            borderRadius: '100px',
                            transition: 'width 0.3s ease',
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
