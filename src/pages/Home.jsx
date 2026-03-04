import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchDecks } from '../lib/supabase';
import DeckCard from '../components/DeckCard';

export default function Home() {
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDecks()
            .then(setDecks)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

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
            </div>
        </div>
    );
}
