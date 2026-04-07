"use client";

import Link from 'next/link';

export default function DeckCard({ deck }: { deck: any }) {
    const cardCount = deck.cards?.[0]?.count ?? 0;

    return (
        <Link href={`/deck/${deck.id}`} className="card card-clickable" id={`deck-${deck.id}`}>
            <h3 style={{ marginBottom: '6px' }}>{deck.title}</h3>
            {deck.description && (
                <p className="text-sm" style={{ marginBottom: '12px', lineHeight: '1.4' }}>
                    {deck.description}
                </p>
            )}
            <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge">{cardCount} cards</span>
                {deck.subject && (
                    <span className="badge badge-purple">{deck.subject}</span>
                )}
                <span className="text-sm text-muted light">by {deck.creator_name}</span>
            </div>
        </Link>
    );
}
