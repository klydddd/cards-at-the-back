import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchDecks, fetchAllQuizzes } from '../lib/supabase';
import DeckCard from '../components/DeckCard';
import { WandIcon } from '../components/Icons';

export default function Home() {
    const [decks, setDecks] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSubject, setActiveSubject] = useState('All');
    const [quizSubject, setQuizSubject] = useState('All');
    const [quizType, setQuizType] = useState('All');

    useEffect(() => {
        Promise.all([fetchDecks(), fetchAllQuizzes(20)])
            .then(([d, q]) => {
                setDecks(d);
                setQuizzes(q);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Unique subjects from decks
    const subjects = useMemo(() => {
        const set = new Set();
        decks.forEach(d => {
            if (d.subject && d.subject.trim()) set.add(d.subject.trim());
        });
        return ['All', ...Array.from(set).sort()];
    }, [decks]);

    // Unique subjects from quizzes
    const quizSubjects = useMemo(() => {
        const set = new Set();
        quizzes.forEach(q => {
            if (q.subject && q.subject.trim()) set.add(q.subject.trim());
        });
        return ['All', ...Array.from(set).sort()];
    }, [quizzes]);

    const quizTypes = useMemo(() => {
        const set = new Set();
        quizzes.forEach(q => {
            q.question_types?.forEach(t => set.add(t));
        });
        return ['All', ...Array.from(set).sort()];
    }, [quizzes]);

    const filteredDecks = useMemo(() => {
        if (activeSubject === 'All') return decks;
        return decks.filter(d => d.subject && d.subject.trim() === activeSubject);
    }, [decks, activeSubject]);

    const filteredQuizzes = useMemo(() => {
        let filtered = quizzes;
        if (quizSubject !== 'All') {
            filtered = filtered.filter(q => q.subject && q.subject.trim() === quizSubject);
        }
        if (quizType !== 'All') {
            filtered = filtered.filter(q => q.question_types?.includes(quizType));
        }
        return filtered;
    }, [quizzes, quizSubject, quizType]);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderFilterTabs = (items, active, setActive) => {
        if (items.length <= 1) return null;
        return (
            <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                {items.map(s => (
                    <button
                        key={s}
                        className={`btn btn-sm ${active === s ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActive(s)}
                        style={{
                            borderRadius: '100px',
                            padding: '6px 16px',
                            fontSize: '0.82rem',
                            ...(active !== s ? { border: '1.5px solid var(--gray-200)' } : {}),
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="page">
            <div className="container">
                {/* Hero */}
                <div className="text-center mb-lg" style={{ padding: '40px 0 20px' }}>
                    <h1>
                        cards at <span className="light">the back</span>
                    </h1>
                    <p style={{ fontSize: '1.1rem', marginTop: '12px', maxWidth: '480px', margin: '12px auto 0' }}>
                        Create, share, and practice flashcards. Upload a file and let AI do the rest.
                    </p>
                    <div className="flex-center gap-sm mt-md">
                        <Link to="/create" className="btn btn-primary btn-lg">
                            Create Deck
                        </Link>
                        <Link to="/ai-parse" className="btn btn-secondary btn-lg">
                            AI Parse
                        </Link>
                    </div>
                </div>

                {/* Deck List */}
                <div style={{ marginTop: '48px' }}>
                    <h2 className="mb-md">Public Decks</h2>
                    {renderFilterTabs(subjects, activeSubject, setActiveSubject)}

                    {loading && (
                        <div className="loading-center">
                            <div className="spinner spinner-lg"></div>
                        </div>
                    )}

                    {error && <div className="error-box">{error}</div>}

                    {!loading && !error && filteredDecks.length === 0 && (
                        <div className="empty-state">
                            {activeSubject === 'All' ? (
                                <>
                                    <h2>No decks yet</h2>
                                    <p>Be the first to create a deck and share it with the world.</p>
                                    <Link to="/create" className="btn btn-primary">
                                        Create your first deck
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <h2>No decks in "{activeSubject}"</h2>
                                    <p>No decks match this subject filter.</p>
                                    <button className="btn btn-secondary" onClick={() => setActiveSubject('All')}>
                                        Show All
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {!loading && !error && filteredDecks.length > 0 && (
                        <div className="deck-grid">
                            {filteredDecks.map((deck) => (
                                <DeckCard key={deck.id} deck={deck} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Public Quizzes */}
                {!loading && quizzes.length > 0 && (
                    <div style={{ marginTop: '56px' }}>
                        <h2 className="mb-md">Public Quizzes</h2>
                        {renderFilterTabs(quizSubjects, quizSubject, setQuizSubject)}
                        {renderFilterTabs(
                            quizTypes.map(t => t === 'All' ? 'All' : t.replace(/_/g, ' ')),
                            quizType === 'All' ? 'All' : quizType.replace(/_/g, ' '),
                            (label) => setQuizType(label === 'All' ? 'All' : quizTypes.find(t => t.replace(/_/g, ' ') === label) || label)
                        )}
                        <div className="deck-grid">
                            {filteredQuizzes.map((quiz) => (
                                <Link
                                    key={quiz.id}
                                    to={`/take/${quiz.id}`}
                                    className="card card-clickable"
                                    style={{ padding: '20px' }}
                                >
                                    <div className="flex gap-sm mb-sm" style={{ alignItems: 'center' }}>
                                        <WandIcon size={16} style={{ opacity: 0.5 }} />
                                        <h3 style={{ fontSize: '1rem', marginBottom: 0 }}>
                                            {quiz.decks?.title || 'Untitled Deck'}
                                        </h3>
                                    </div>
                                    <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
                                        <span className="badge">{quiz.questions?.length || 0} questions</span>
                                        {quiz.subject && (
                                            <span className="badge" style={{ background: '#ede9fe', color: '#6b21a8' }}>{quiz.subject}</span>
                                        )}
                                        {quiz.question_types?.map(t => (
                                            <span key={t} className="badge" style={{ fontSize: '0.68rem' }}>
                                                {t.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex-between">
                                        <span className="text-sm text-muted light">by {quiz.creator_name}</span>
                                        <span className="text-sm text-muted light">{formatDate(quiz.created_at)}</span>
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
