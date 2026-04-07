"use client";

import { useState, useImperativeHandle, forwardRef } from 'react';

const FlipCard = forwardRef(function FlipCard({ front, back }: { front: string, back: string }, ref: any) {
    const [flipped, setFlipped] = useState(false);

    useImperativeHandle(ref, () => ({
        toggle() {
            setFlipped((f) => !f);
        },
    }));

    return (
        <div
            className="flip-card-container"
            onClick={() => setFlipped(!flipped)}
            role="button"
            tabIndex={0}
            aria-label={flipped ? `Card back: ${back}` : `Card front: ${front}. Press space to flip.`}
            onKeyDown={(e) => e.key === ' ' && setFlipped(!flipped)}
        >
            <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
                <div className="flip-card-face flip-card-front">
                    <span className="flip-card-label">Description</span>
                    <p className="flip-card-text">{front}</p>
                </div>
                <div className="flip-card-face flip-card-back">
                    <span className="flip-card-label">Term</span>
                    <p className="flip-card-text">{back}</p>
                </div>
            </div>
        </div>
    );
});

export default FlipCard;
