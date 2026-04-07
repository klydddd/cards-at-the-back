import { fetchCardProgress, upsertCardProgress, isSupabaseReady } from './supabase';
import { createDefaultProgress, calculateNextReview, isDue, Rating } from './srs';

export const TRACKING_KEY_PREFIX = 'cards_tracking_';
const SRS_KEY_PREFIX = 'srs_progress_';

// ─── Legacy localStorage tracking (backward compat) ───

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

// ─── SRS Progress (Supabase with localStorage fallback) ───

function getLocalSRSProgress(deckId) {
    try {
        const saved = localStorage.getItem(`${SRS_KEY_PREFIX}${deckId}`);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function saveLocalSRSProgress(deckId, progressMap) {
    localStorage.setItem(`${SRS_KEY_PREFIX}${deckId}`, JSON.stringify(progressMap));
}

// Load all SRS progress for a deck — tries Supabase first, falls back to localStorage
export async function loadSRSProgress(deckId) {
    if (isSupabaseReady()) {
        try {
            const rows = await fetchCardProgress(deckId);
            const map = {};
            for (const row of rows) {
                map[row.card_id] = row;
            }
            // Sync to localStorage as cache
            saveLocalSRSProgress(deckId, map);
            return map;
        } catch {
            // Fall through to localStorage
        }
    }
    return getLocalSRSProgress(deckId);
}

// Rate a card and persist the updated progress
export async function rateCard(deckId, cardId, rating) {
    // Load current progress or create default
    let progressMap = getLocalSRSProgress(deckId);
    let current = progressMap[cardId] || createDefaultProgress(cardId, deckId);

    const updated = {
        ...current,
        card_id: cardId,
        deck_id: deckId,
        ...calculateNextReview(current, rating),
    };

    // Save locally immediately
    progressMap[cardId] = updated;
    saveLocalSRSProgress(deckId, progressMap);

    // Also update legacy tracking for backward compat
    if (rating >= Rating.GOOD) {
        markCardAsLearned(deckId, cardId);
    } else {
        markCardAsLearning(deckId, cardId);
    }

    // Persist to Supabase in background
    if (isSupabaseReady()) {
        try {
            await upsertCardProgress(updated);
        } catch (err) {
            console.warn('Failed to sync SRS progress to Supabase:', err);
        }
    }

    return updated;
}

// Get count of due cards for a deck
export function getDueCount(progressMap, cards) {
    let dueCount = 0;
    for (const card of cards) {
        const progress = progressMap[card.id];
        if (!progress || isDue(progress)) {
            dueCount++;
        }
    }
    return dueCount;
}

// Get cards that are due for review, ordered by due date (most overdue first)
export function getDueCardsList(progressMap, cards) {
    return cards.filter(card => {
        const progress = progressMap[card.id];
        return !progress || isDue(progress);
    }).sort((a, b) => {
        const pa = progressMap[a.id];
        const pb = progressMap[b.id];
        // New cards (no progress) come after overdue cards
        if (!pa && !pb) return 0;
        if (!pa) return 1;
        if (!pb) return -1;
        return new Date(pa.due_date) - new Date(pb.due_date);
    });
}

// Reset all SRS progress for a deck
export async function resetSRSProgress(deckId) {
    localStorage.removeItem(`${SRS_KEY_PREFIX}${deckId}`);
    resetDeckProgress(deckId);

    if (isSupabaseReady()) {
        const { resetDeckSRS } = await import('./supabase');
        try {
            await resetDeckSRS(deckId);
        } catch (err) {
            console.warn('Failed to reset SRS progress in Supabase:', err);
        }
    }
}
