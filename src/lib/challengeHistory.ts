// Which challenges this browser has finished. Used only to unlock the answer-key
// link on /challenges — there is no auth, so this is a UI convenience and not
// access control. /deck/[id]/quiz/[quizId] stays reachable by URL.

const COMPLETED_KEY = 'gokards_completed_challenges';
const MAX_TRACKED = 500;

export function getCompletedChallengeIds(): string[] {
    if (typeof window === 'undefined') return [];

    try {
        const saved = localStorage.getItem(COMPLETED_KEY);
        if (!saved) return [];

        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
        // Corrupted value or storage blocked — behave as if nothing is completed
        return [];
    }
}

export function getCompletedChallengeSet(): Set<string> {
    return new Set(getCompletedChallengeIds());
}

export function markChallengeCompleted(quizId: string) {
    if (typeof window === 'undefined' || !quizId) return;

    try {
        const ids = getCompletedChallengeIds();
        if (ids.includes(quizId)) return;

        ids.push(quizId);
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(ids.slice(-MAX_TRACKED)));
    } catch {
        // Storage blocked (private mode) — the answer key just stays locked
    }
}
