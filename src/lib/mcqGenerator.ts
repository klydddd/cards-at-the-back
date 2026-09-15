/**
 * Generate quiz questions directly from deck cards.
 * No AI needed — uses card data to build questions.
 */

function pickRandom(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Same normalization as quizGrading, so "distinct" here means "graded differently" there.
function normalizeTerm(term) {
    return String(term ?? '').trim().toLowerCase();
}

function countDistinctTerms(cards) {
    return new Set(cards.map(c => normalizeTerm(c.back)).filter(Boolean)).size;
}

// Terms that are safe wrong answers for this card. Decks may reuse a term across
// definitions ("use case" twice) or a definition across terms ("node" / "vertex"),
// so skip every term that matches this card's term or shares its definition.
function getDistinctOtherTerms(card, allCards) {
    const ownDefinition = normalizeTerm(card.front);
    const seen = new Set([normalizeTerm(card.back)]);
    for (const c of allCards) {
        if (normalizeTerm(c.front) === ownDefinition) seen.add(normalizeTerm(c.back));
    }
    const terms: string[] = [];
    for (const c of allCards) {
        const normalized = normalizeTerm(c.back);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        terms.push(c.back);
    }
    return terms;
}

function generateMCQ(card, allCards) {
    const distractors = pickRandom(getDistinctOtherTerms(card, allCards), 3);
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
        const otherTerms = getDistinctOtherTerms(card, allCards);
        if (otherTerms.length === 0) {
            return { type: 'true_false', question: `"${card.back}" is described as: ${card.front}`, answer: true };
        }
        const wrongTerm = pickRandom(otherTerms, 1)[0];
        return {
            type: 'true_false',
            question: `"${wrongTerm}" is described as: ${card.front}`,
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
    const distinctTerms = countDistinctTerms(cards);
    if (questionType === 'multiple_choice' && cards.some(c => getDistinctOtherTerms(c, cards).length < 3)) {
        throw new Error('Need at least 4 kards with different terms for multiple choice.');
    }
    if (questionType === 'true_false' && distinctTerms < 2) {
        throw new Error('Need at least 2 kards with different terms for true/false.');
    }
    if (cards.length < 1) {
        throw new Error('Need at least 1 kard to generate a quiz.');
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
