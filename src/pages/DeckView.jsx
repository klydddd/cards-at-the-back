import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDeck, fetchCards, fetchQuizzesByDeck } from '../lib/supabase';
import { getLearnedCardIds } from '../lib/tracking';
import { WandIcon } from '../components/Icons';

export default function DeckView() {
    const { id } = useParams();
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [learnedCount, setLearnedCount] = useState(0);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([fetchDeck(id), fetchCards(id), fetchQuizzesByDeck(id)])
            .then(([d, c, q]) => {
                setDeck(d);
                setCards(c);
                setQuizzes(q);

                const learned = getLearnedCardIds(id);
                const count = c.filter(card => learned.has(card.id)).length;
                setLearnedCount(count);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

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

    const notLearnedCount = cards.length - learnedCount;

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '720px' }}>
                {/* Header */}
                <div className="mb-lg">
                    <Link to="/" className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px', marginBottom: '12px' }}>
                        ← Back
                    </Link>
                    <h1>{deck.title}</h1>
                    {deck.description && <p style={{ marginTop: '8px' }}>{deck.description}</p>}
                    <div className="flex gap-sm mt-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge">{cards.length} cards</span>
                        {cards.length > 0 && (
                            <span className="badge" style={{ background: 'var(--gray-800)', color: 'var(--white)' }}>
                                {learnedCount} learned · {notLearnedCount} learning
                            </span>
                        )}
                        <span className="text-sm text-muted light" style={{ marginLeft: '4px' }}>by {deck.creator_name}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="mb-lg flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <Link to={`/deck/${id}/practice`} className="btn btn-primary btn-lg">
                        Practice All
                    </Link>
                    {notLearnedCount > 0 && notLearnedCount < cards.length && (
                        <Link to={`/deck/${id}/practice?filter=not-learned`} className="btn btn-secondary btn-lg">
                            Practice Not Learned ({notLearnedCount})
                        </Link>
                    )}
                    <Link to={`/deck/${id}/quiz`} className="btn btn-secondary btn-lg" style={{ background: '#f3e8ff', color: '#6b21a8', borderColor: '#d8b4fe' }}>
                        <WandIcon size={16} /> AI Quiz
                    </Link>
                    {cards.length >= 4 && (
                        <Link to={`/deck/${id}/quick-quiz`} className="btn btn-secondary btn-lg">
                            Quick Quiz
                        </Link>
                    )}
                </div>

                {/* Card List */}
                <h2 className="mb-md">All Cards</h2>
                <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                    {cards.map((card) => {
                        const isLearned = getLearnedCardIds(id).has(card.id);
                        return (
                            <div key={card.id} className="card" style={{ padding: '16px 20px', borderLeft: isLearned ? '4px solid #10b981' : '1.5px solid var(--gray-200)' }}>
                                <div className="flex-between gap-md">
                                    <div style={{ flex: 1 }}>
                                        <p className="text-sm text-muted light" style={{ marginBottom: '2px' }}>
                                            Description
                                        </p>
                                        <p style={{ color: 'var(--gray-700)', fontWeight: 300 }}>{card.front}</p>
                                    </div>
                                    <div
                                        style={{
                                            width: '1px',
                                            background: 'var(--gray-200)',
                                            alignSelf: 'stretch',
                                            margin: '0 8px',
                                        }}
                                    ></div>
                                    <div style={{ flex: 0, minWidth: '120px' }}>
                                        <p className="text-sm text-muted light" style={{ marginBottom: '2px' }}>
                                            Term
                                        </p>
                                        <p style={{ fontWeight: 700 }}>{card.back}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Past Quizzes */}
                {quizzes.length > 0 && (
                    <div style={{ marginTop: '48px' }}>
                        <h2 className="mb-md">Past Quizzes</h2>
                        <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                            {quizzes.map((quiz) => (
                                <Link
                                    key={quiz.id}
                                    to={`/deck/${id}/quiz/${quiz.id}`}
                                    className="card card-clickable"
                                    style={{ padding: '16px 20px' }}
                                >
                                    <div className="flex-between">
                                        <div>
                                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                {quiz.questions?.length || 0} questions
                                            </p>
                                            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                                {quiz.question_types.map(t => (
                                                    <span key={t} className="badge" style={{ fontSize: '0.7rem' }}>
                                                        {t.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            {quiz.score !== null ? (
                                                <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>
                                                    {quiz.score}/{quiz.questions?.length || 0}
                                                </p>
                                            ) : (
                                                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                                    Not taken
                                                </span>
                                            )}
                                            <p className="text-sm text-muted light" style={{ marginTop: '4px' }}>
                                                {quiz.creator_name} · {formatDate(quiz.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
