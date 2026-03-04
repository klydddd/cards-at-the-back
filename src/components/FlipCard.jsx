import { useState } from 'react';

export default function FlipCard({ front, back }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div
            className="flip-card-container"
            onClick={() => setFlipped(!flipped)}
            role="button"
            tabIndex={0}
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
}
