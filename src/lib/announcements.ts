// "What's new" announcements shown to returning visitors.
// To post one, add an entry to the TOP of ANNOUNCEMENTS with a new, unique id.
// Never reuse or rename an id: this browser's seen list is keyed by it.
// New visitors have every current announcement marked seen when they finish
// onboarding, so they only see updates published after they joined.

export interface Announcement {
    id: string;
    date: string; // ISO date, shown in the modal
    title: string;
    items: { title: string; text: string }[];
    cta?: { label: string; href: string };
    // Only show on these routes (exact match). Omit to show anywhere.
    paths?: string[];
    // ISO dates bounding when the announcement can appear
    startsAt?: string;
    endsAt?: string;
}

// Newest first
export const ANNOUNCEMENTS: Announcement[] = [
    {
        id: '2026-09-whats-new',
        date: '2026-09-17',
        title: 'Challenges, smarter quizzes, and an iOS fix',
        items: [
            {
                title: 'Challenges tab',
                text: 'Take quizzes shared by other students and see how you score.',
            },
            {
                title: 'Better AI quiz creation',
                text: 'Answer choices are now shuffled and questions are reworded, so quizzes test what you know instead of repeating your kards.',
            },
            {
                title: 'PDF uploads on iPhone and iPad',
                text: 'Uploading a PDF from Safari and other iOS browsers works again.',
            },
        ],
        cta: { label: 'Try a challenge', href: '/challenges' },
    },
];

// WelcomeGate dispatches this when it closes so WhatsNew can open right after
export const GATE_CLOSED_EVENT = 'gokards:gate-closed';

const SEEN_KEY = 'gokards_seen_announcements';
const MAX_TRACKED = 50;

function getSeenIds(): string[] {
    try {
        const saved = localStorage.getItem(SEEN_KEY);
        if (!saved) return [];

        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
        // Corrupted value or storage blocked — treat everything as unseen
        return [];
    }
}

export function getUnseenAnnouncements(pathname: string, now = new Date()): Announcement[] {
    const seen = new Set(getSeenIds());
    return ANNOUNCEMENTS.filter((a) => {
        if (seen.has(a.id)) return false;
        if (a.paths && !a.paths.includes(pathname)) return false;
        if (a.startsAt && now < new Date(a.startsAt)) return false;
        if (a.endsAt && now > new Date(a.endsAt)) return false;
        return true;
    });
}

export function markAnnouncementsSeen(ids: string[]) {
    try {
        const seen = getSeenIds().filter((id) => !ids.includes(id));
        seen.push(...ids);
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-MAX_TRACKED)));
    } catch {
        // Storage blocked (private mode, etc.) — the announcement will show again next visit
    }
}

export function markAllAnnouncementsSeen() {
    markAnnouncementsSeen(ANNOUNCEMENTS.map((a) => a.id));
}
