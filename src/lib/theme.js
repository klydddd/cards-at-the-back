export const THEME_KEY = 'cards_theme';

export function getInitialTheme() {
    if (typeof window === 'undefined') return 'light';

    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
        return saved;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
}

export function setTheme(theme) {
    if (typeof window === 'undefined') return;

    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
    return next;
}
