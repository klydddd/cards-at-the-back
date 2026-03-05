/**
 * Generate multiple choice questions directly from deck cards.
 * No AI needed — uses card terms as answers and other terms as distractors.
 */
export function generateMCQFromCards(cards, count = null) {
    if (cards.length < 4) {
        throw new Error('Need at least 4 cards to generate a multiple choice quiz.');
    }

    // Shuffle cards and pick how many to quiz on
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const quizCards = count ? shuffled.slice(0, Math.min(count, shuffled.length)) : shuffled;

    return quizCards.map(card => {
        // Pick 3 random distractor terms (from other cards)
        const otherCards = cards.filter(c => c.id !== card.id);
        const distractors = [];
        const used = new Set();

        while (distractors.length < 3 && distractors.length < otherCards.length) {
            const idx = Math.floor(Math.random() * otherCards.length);
            if (!used.has(idx)) {
                used.add(idx);
                distractors.push(otherCards[idx].back);
            }
        }

        // Build options and shuffle them
        const options = [...distractors, card.back].sort(() => Math.random() - 0.5);

        return {
            type: 'multiple_choice',
            question: card.front,
            options,
            answer: card.back,
        };
    });
}
