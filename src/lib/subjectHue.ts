/**
 * Maps a deck's subject to one of the six Pop Quiz hues.
 *
 * `subject` is free text typed by whoever created the deck (see the Deck type
 * in src/types/index.ts and the input at /create), so a lookup table alone
 * cannot cover it. Two tiers:
 *
 *   1. A curated map, so the subjects people actually type feel designed —
 *      Computer Science is always sky, Biology is always mint.
 *   2. A content hash for everything else, so the long tail is still stable.
 *
 * The hash is over the subject STRING, deliberately not the deck's position in
 * a list: /  filters by subject and paginates, so a positional colour would
 * make the same deck change hue when you turn the page or click a chip.
 *
 * Returns a hue name, never a colour. The name goes out as a `data-hue`
 * attribute and globals.css turns it into `--card-hue`; that indirection is
 * what lets the palette respond to `data-theme` at all, which a hex written
 * into JSX could never do.
 */

export type Hue = 'sky' | 'coral' | 'mint' | 'yellow' | 'lilac' | 'paper';

const ORDER: Hue[] = ['sky', 'coral', 'mint', 'yellow', 'lilac', 'paper'];

const KNOWN: Record<string, Hue> = {
    'computer science': 'sky',
    cs: 'sky',
    programming: 'sky',
    math: 'sky',
    mathematics: 'sky',

    biology: 'mint',
    bio: 'mint',
    science: 'mint',
    medicine: 'mint',
    nursing: 'mint',

    chemistry: 'coral',
    physics: 'coral',
    engineering: 'coral',

    economics: 'yellow',
    business: 'yellow',
    accounting: 'yellow',
    law: 'yellow',

    languages: 'lilac',
    language: 'lilac',
    english: 'lilac',
    spanish: 'lilac',
    filipino: 'lilac',

    history: 'paper',
    philosophy: 'paper',
    general: 'paper',
};

export function subjectHue(subject?: string | null): Hue {
    const key = (subject ?? '').trim().toLowerCase();

    // An unlabelled deck should look plain, not randomly coloured.
    if (!key) return 'paper';
    if (KNOWN[key]) return KNOWN[key];

    // FNV-1a — small, stable across runs and machines.
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ORDER[Math.abs(h) % ORDER.length];
}
