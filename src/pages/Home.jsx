import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchDecks, fetchAllQuizzes } from '../lib/supabase';
import DeckCard from '../components/DeckCard';
import { WandIcon } from '../components/Icons';
import { Analytics } from "@vercel/analytics/react";

export default function Home() {
    const [decks, setDecks] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([fetchDecks(), fetchAllQuizzes(12)])
            .then(([d, q]) => {
                setDecks(d);
                setQuizzes(q);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

                    {loading && (
                        <div className="loading-center">
                            <div className="spinner spinner-lg"></div>
                        </div>
                    )}

                    {error && <div className="error-box">{error}</div>}

                    {!loading && !error && decks.length === 0 && (
                        <div className="empty-state">
                            <h2>No decks yet</h2>
                            <p>Be the first to create a deck and share it with the world.</p>
                            <Link to="/create" className="btn btn-primary">
                                Create your first deck
                            </Link>
                        </div>
                    )}

                    {!loading && !error && decks.length > 0 && (
                        <div className="deck-grid">
                            {decks.map((deck) => (
                                <DeckCard key={deck.id} deck={deck} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Public Quizzes */}
                {!loading && quizzes.length > 0 && (
                    <div style={{ marginTop: '56px' }}>
                        <div className="flex-between mb-md">
                            <h2>Public Quizzes</h2>
                        </div>
                        <div className="deck-grid">
                            {quizzes.map((quiz) => (
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
