import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchDeck, fetchCards } from '../lib/supabase';
import FlipCard from '../components/FlipCard';
import { getLearnedCardIds, markCardAsLearned, markCardAsLearning } from '../lib/tracking';

export default function Practice() {
    const { id } = useParams();
    const navigate = useNavigate();
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
            setFlipKey((k) => k + 1); // reset flip state
        },
        []
    );

    const prev = () => goTo(Math.max(0, current - 1));
    const next = () => goTo(Math.min(cards.length - 1, current + 1));

    const shuffle = () => {
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        setCards(shuffledCards);
        setShuffled(true);
        goTo(0);
    };

    const handleMarkLearned = () => {
        if (cards.length === 0) return;
        const newLearned = markCardAsLearned(id, cards[current].id);
        setLearnedIds(newLearned);
        if (current < cards.length - 1) {
            setTimeout(next, 300);
        }
    };

    const handleMarkLearning = () => {
        if (cards.length === 0) return;
        const newLearned = markCardAsLearning(id, cards[current].id);
        setLearnedIds(newLearned);
        if (current < cards.length - 1) {
            setTimeout(next, 300);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === '1') handleMarkLearning();
            if (e.key === '2') handleMarkLearned();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [current, cards.length, handleMarkLearned, handleMarkLearning]);

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
                    <h2 className="mb-md">You're all caught up! ✨</h2>
                    <p className="mb-lg">There are no more cards to learn in this mode.</p>
                    <div className="flex-center gap-md">
                        <Link to={`/deck/${id}`} className="btn btn-secondary">
                            Go back
                        </Link>
                        {isReplayMode && (
                            <Link to={`/deck/${id}/practice`} className="btn btn-primary" onClick={() => {
                                setLoading(true); // force reload effect by unmounting
                            }}>
                                Practice All Instead
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );

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
                            {shuffled ? '🔀 Reshuffled' : '🔀 Shuffle'}
                        </button>
                    </div>
                </div>

                <div className="text-center mb-md">
                    <h2>{deck.title}</h2>
                    <p className="text-sm text-muted mt-sm light">
                        Card {current + 1} of {cards.length} — click to flip
                    </p>
                    {isReplayMode && (
                        <span className="badge mt-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
                            Replay not-learned mode
                        </span>
                    )}
                </div>

                {/* Flip Card */}
                <div className="mb-md" style={{ position: 'relative' }}>
                    <FlipCard key={flipKey} front={card.front} back={card.back} />
                    {isLearned && (
                        <div style={{ position: 'absolute', top: -12, right: -12, background: '#10b981', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'var(--shadow-sm)' }}>
                            ✓
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
                        ✗ Still Learning <span className="text-muted text-sm ml-sm" style={{ opacity: 0.5 }}>(1)</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleMarkLearned}
                        style={{ borderColor: isLearned ? '#10b981' : '', color: isLearned ? '#059669' : '', backgroundColor: isLearned ? '#ecfdf5' : '' }}
                    >
                        ✓ Know It <span className="text-muted text-sm ml-sm" style={{ opacity: 0.5 }}>(2)</span>
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-center gap-md">
                    <button className="btn btn-secondary" onClick={prev} disabled={current === 0}>
                        ← Previous
                    </button>
                    <span
                        className="text-sm bold"
                        style={{
                            minWidth: '60px',
                            textAlign: 'center',
                        }}
                    >
                        {current + 1} / {cards.length}
                    </span>
                    <button className="btn btn-primary" onClick={next} disabled={current === cards.length - 1}>
                        Next →
                    </button>
                </div>

                {/* Progress bar */}
                <div
                    style={{
                        marginTop: '24px',
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
