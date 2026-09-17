// Bump LEGAL_LAST_UPDATED whenever the Privacy Policy or Terms change.
// Visitors who accepted an older version are asked to agree again.
export const LEGAL_LAST_UPDATED = 'September 15, 2026';
export const CONTACT_EMAIL = 'apostol.eliciaklyde@gmail.com';

// Shared by the contact form and /api/contact. Link to a topic with /contact?topic=<value>
export const CONTACT_TOPICS = [
    { value: 'general', label: 'General question' },
    { value: 'feedback', label: 'Bug report or suggestion' },
    { value: 'removal', label: 'Content removal' },
    { value: 'abuse', label: 'Report abuse' },
    { value: 'privacy', label: 'Privacy request' },
    { value: 'other', label: 'Others' },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['value'];

export function isContactTopic(value: unknown): value is ContactTopic {
    return CONTACT_TOPICS.some((topic) => topic.value === value);
}

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

// Pages a visitor must be able to read without a modal in the way
export const LEGAL_PATHS = ['/privacy', '/terms', '/contact'];
