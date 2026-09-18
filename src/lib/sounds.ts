// Sound effects for quiz answers and flashcard ratings.
// Files live in public/sounds/ and are served by URL — no bundler config.
// The mute preference mirrors the theme pattern in theme.ts: the blocking
// script in app/layout.tsx stamps data-sound before first paint, CSS picks
// the navbar icon off that attribute, and localStorage is only written on
// toggle (never on mount) so the default stays implicit.

export const SOUND_KEY = 'cards_sound'; // 'off' when muted; absent or 'on' = enabled

export type SoundName = 'correct' | 'wrong';

const SOUND_SRC: Record<SoundName, string> = {
    correct: '/sounds/correct_answer.mp3',
    wrong: '/sounds/wrong_answer.mp3',
};

const cache = new Map<SoundName, HTMLAudioElement>();

export function isSoundEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function setSoundEnabled(enabled: boolean) {
    if (typeof window === 'undefined') return;
    const value = enabled ? 'on' : 'off';
    try {
        localStorage.setItem(SOUND_KEY, value);
    } catch {
        // Storage blocked (private mode etc.) — the attribute still applies for this page.
    }
    document.documentElement.setAttribute('data-sound', value);
}

export function toggleSound(): boolean {
    const current = document.documentElement.getAttribute('data-sound') || 'on';
    const next = current !== 'off';
    setSoundEnabled(!next);
    return !next;
}

function getAudio(name: SoundName): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    let audio = cache.get(name);
    if (!audio) {
        audio = new Audio(SOUND_SRC[name]);
        audio.preload = 'auto';
        cache.set(name, audio);
    }
    return audio;
}

// Call on mount of a page that plays sounds so the first play isn't delayed
// by the fetch (the files are ~60 KB each).
export function preloadSounds() {
    (Object.keys(SOUND_SRC) as SoundName[]).forEach(getAudio);
}

export function playSound(name: SoundName) {
    if (!isSoundEnabled()) return;
    const audio = getAudio(name);
    if (!audio) return;
    audio.currentTime = 0;
    // Autoplay policy can reject play() before the first user gesture; that
    // must never surface as an unhandled rejection.
    audio.play().catch(() => {});
}
