import { Link } from 'react-router-dom';

export default function DeckCard({ deck }) {
    const cardCount = deck.cards?.[0]?.count ?? 0;

    return (
        <Link to={`/deck/${deck.id}`} className="card card-clickable" id={`deck-${deck.id}`}>
            <h3 style={{ marginBottom: '6px' }}>{deck.title}</h3>
            {deck.description && (
                <p className="text-sm" style={{ marginBottom: '12px', lineHeight: '1.4' }}>
                    {deck.description}
                </p>
            )}
            <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                <span className="badge">{cardCount} cards</span>
                <span className="text-sm text-muted light">by {deck.creator_name}</span>
            </div>
        </Link>
    );
}
