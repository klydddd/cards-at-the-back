export const TRACKING_KEY_PREFIX = 'cards_tracking_';

export function getLearnedCardIds(deckId) {
    if (typeof window === 'undefined') return new Set();

    const saved = localStorage.getItem(`${TRACKING_KEY_PREFIX}${deckId}`);
    if (!saved) return new Set();

    try {
        return new Set(JSON.parse(saved));
    } catch (e) {
        return new Set();
    }
}

export function saveLearnedCardIds(deckId, setOfIds) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${TRACKING_KEY_PREFIX}${deckId}`, JSON.stringify(Array.from(setOfIds)));
}

export function markCardAsLearned(deckId, cardId) {
    const learned = getLearnedCardIds(deckId);
    learned.add(cardId);
    saveLearnedCardIds(deckId, learned);
    return learned;
}

export function markCardAsLearning(deckId, cardId) {
    const learned = getLearnedCardIds(deckId);
    learned.delete(cardId);
    saveLearnedCardIds(deckId, learned);
    return learned;
}

export function resetDeckProgress(deckId) {
    saveLearnedCardIds(deckId, new Set());
}
