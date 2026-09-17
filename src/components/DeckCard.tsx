"use client";

import Link from 'next/link';
import { subjectHue } from '@/lib/subjectHue';

export default function DeckCard({ deck }: { deck: any }) {
    const cardCount = deck.cards?.[0]?.count ?? 0;

    return (
        <Link
            href={`/deck/${deck.id}`}
            className="index-card deck-card"
            id={`deck-${deck.id}`}
            // Most decks in practice carry no subject; seeding off the title
            // keeps the grid as varied as the artboards instead of all-white,
            // and is still stable per deck.
            data-hue={subjectHue(deck.subject || deck.title)}
        >
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
