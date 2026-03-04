import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDeck, createCards } from '../lib/supabase';
import CardForm from '../components/CardForm';

const emptyCard = () => ({ front: '', back: '' });

export default function CreateDeck() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [cards, setCards] = useState([emptyCard(), emptyCard(), emptyCard()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const updateCard = (index, field, value) => {
        setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    };

    const removeCard = (index) => {
        setCards((prev) => prev.filter((_, i) => i !== index));
    };

    const addCard = () => {
        setCards((prev) => [...prev, emptyCard()]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) return setError('Please add a title for your deck.');
        const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
        if (validCards.length < 2) return setError('Add at least 2 complete cards.');

        setSaving(true);
        try {
            const deck = await createDeck(title.trim(), description.trim(), creatorName.trim() || 'Anonymous');
            await createCards(deck.id, validCards);
            navigate(`/deck/${deck.id}`);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                <h1 className="mb-sm">Create Deck</h1>
                <p className="mb-lg">Build your flashcard deck manually. Add as many cards as you need.</p>

                {error && <div className="error-box">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label className="label">Title</label>
                        <input
                            className="input"
                            placeholder="e.g. Biology 101"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            id="deck-title"
                        />
                    </div>

                    <div className="field">
                        <label className="label">Description (optional)</label>
                        <input
                            className="input"
                            placeholder="A brief description of this deck..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            id="deck-description"
                        />
                    </div>

                    <div className="field">
                        <label className="label">Your Name</label>
                        <input
                            className="input"
                            placeholder="Anonymous"
                            value={creatorName}
                            onChange={(e) => setCreatorName(e.target.value)}
                            id="deck-creator"
                        />
                    </div>

                    <div className="mt-lg mb-md">
                        <div className="flex-between">
                            <h2>Cards</h2>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addCard}>
                                + Add Card
                            </button>
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
                        {cards.map((card, i) => (
                            <CardForm
                                key={i}
                                index={i}
                                front={card.front}
                                back={card.back}
                                onChange={(field, value) => updateCard(i, field, value)}
                                onRemove={() => removeCard(i)}
                                canRemove={cards.length > 1}
                            />
                        ))}
                    </div>

                    <div className="mt-lg">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%' }}>
                            {saving ? 'Creating...' : 'Create Deck'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
