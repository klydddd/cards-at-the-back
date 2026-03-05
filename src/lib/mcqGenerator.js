/**
 * Generate quiz questions directly from deck cards.
 * No AI needed — uses card data to build questions.
 */

function pickRandom(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function generateMCQ(card, allCards) {
    const otherCards = allCards.filter(c => c.id !== card.id);
    const distractors = pickRandom(otherCards, 3).map(c => c.back);
    const options = [...distractors, card.back].sort(() => Math.random() - 0.5);

    return {
        type: 'multiple_choice',
        question: card.front,
        options,
        answer: card.back,
    };
}

function generateTrueFalse(card, allCards) {
    const isTrue = Math.random() > 0.5;

    if (isTrue) {
        return {
            type: 'true_false',
            question: `"${card.back}" is described as: ${card.front}`,
            answer: true,
        };
    } else {
        // Pick a wrong term
        const otherCards = allCards.filter(c => c.id !== card.id);
        if (otherCards.length === 0) {
            return { type: 'true_false', question: `"${card.back}" is described as: ${card.front}`, answer: true };
        }
        const wrongCard = pickRandom(otherCards, 1)[0];
        return {
            type: 'true_false',
            question: `"${wrongCard.back}" is described as: ${card.front}`,
            answer: false,
        };
    }
}

function generateIdentification(card) {
    return {
        type: 'identification',
        question: card.front,
        answer: card.back,
    };
}

/**
 * @param {Array} cards - deck cards
 * @param {'multiple_choice' | 'true_false' | 'identification'} questionType
 * @param {number|null} count - how many questions, null = all cards
 */
export function generateQuickQuiz(cards, questionType = 'multiple_choice', count = null) {
    if (questionType === 'multiple_choice' && cards.length < 4) {
        throw new Error('Need at least 4 cards for multiple choice.');
    }
    if (cards.length < 2 && questionType === 'true_false') {
        throw new Error('Need at least 2 cards for true/false.');
    }
    if (cards.length < 1) {
        throw new Error('Need at least 1 card to generate a quiz.');
    }

    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const quizCards = count ? shuffled.slice(0, Math.min(count, shuffled.length)) : shuffled;

    return quizCards.map(card => {
        switch (questionType) {
            case 'true_false':
                return generateTrueFalse(card, cards);
            case 'identification':
                return generateIdentification(card);
            case 'multiple_choice':
            default:
                return generateMCQ(card, cards);
        }
    });
}
