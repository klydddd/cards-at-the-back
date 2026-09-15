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
            aria-label={flipped ? `Kard back: ${back}` : `Kard front: ${front}. Press space to flip.`}
            onKeyDown={(e) => e.key === ' ' && setFlipped(!flipped)}
        >
            <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
                <div className="flip-card-face flip-card-front">
                    <div className="index-card-head">
                        <span>Description</span>
                        <span>Tap to flip</span>
                    </div>
                    <div className="flip-card-body">
                        <p className="flip-card-text">{front}</p>
                    </div>
                </div>
                <div className="flip-card-face flip-card-back">
                    <div className="index-card-head">
                        <span>Term</span>
                    </div>
                    <div className="flip-card-body">
                        <p className="flip-card-text">{back}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default FlipCard;
