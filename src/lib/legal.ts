// Bump LEGAL_LAST_UPDATED whenever the Privacy Policy or Terms change.
// Visitors who accepted an older version are asked to agree again.
export const LEGAL_LAST_UPDATED = 'September 15, 2026';
export const CONTACT_URL = 'https://github.com/klydddd/cards-at-the-back/issues';

const CONSENT_KEY = 'gokards_terms_accepted';

export function hasAcceptedTerms() {
    try {
        return localStorage.getItem(CONSENT_KEY) === LEGAL_LAST_UPDATED;
    } catch {
        return false;
    }
}

export function acceptTerms() {
    try {
        localStorage.setItem(CONSENT_KEY, LEGAL_LAST_UPDATED);
    } catch {
        // Storage blocked (private mode, etc.) — the prompt will show again next visit
    }
}
