"use client";

import Link from 'next/link';

export default function DeckCard({ deck }: { deck: any }) {
    const cardCount = deck.cards?.[0]?.count ?? 0;

    return (
        <Link href={`/deck/${deck.id}`} className="index-card deck-card" id={`deck-${deck.id}`}>
            <div className="index-card-head">
                <span>{deck.subject || 'General'}</span>
                <span>{cardCount} kards</span>
            </div>
            <div className="index-card-body">
                <h3>{deck.title}</h3>
                {deck.description && <p>{deck.description}</p>}
                <span className="deck-card-by">by {deck.creator_name}</span>
            </div>
        </Link>
    );
}
