import Link from 'next/link';

// Chooser behind the navbar's "Create". The deck form itself lives at
// /create/deck; the hand-written challenge builder at /create/challenge.

export const metadata = {
    title: 'Create · gokards',
};

export default function CreateChooser() {
    return (
        <div className="page">
            <div className="container container-md">
                <span className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>New</span>
                <h1 className="deck-title mb-sm">What do you want to make?</h1>
                <p className="mb-lg">A deck of flashkards to study, or a challenge for others to take.</p>

                <div className="deck-grid">
                    <Link href="/create/deck" className="index-card deck-card" data-hue="sky">
                        <div className="index-card-head">
                            <span>Deck</span>
                            <span>Flashkards</span>
                        </div>
                        <div className="index-card-body">
                            <h3>Create a deck</h3>
                            <p>Write kards by hand, then practice, review with spaced repetition, and publish quizzes from it.</p>
                            <span className="deck-card-by">Open the deck form →</span>
                        </div>
                    </Link>

                    <Link href="/create/challenge" className="index-card deck-card" data-hue="lilac">
                        <div className="index-card-head">
                            <span>Challenge</span>
                            <span>Multiple choice</span>
                        </div>
                        <div className="index-card-body">
                            <h3>Create a challenge</h3>
                            <p>Write your own questions with no deck needed. Share the link and see who tops the leaderboard.</p>
                            <span className="deck-card-by">Open the challenge builder →</span>
                        </div>
                    </Link>
                </div>


            </div>
        </div>
    );
}
