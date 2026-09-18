// Splits long documents into model-sized pieces for the /api/gemini/* routes.
// A single Gemini call plateaus at roughly 40 cards or questions no matter how
// much text it is given, so long inputs are processed chunk by chunk and the
// results merged. Pure functions, no I/O.

// Characters per chunk. ~1,800 words: enough context for good cards, well
// under the point where the model starts summarising instead of covering.
export const DEFAULT_CHUNK_CHARS = 12000;

// A trailing chunk smaller than this is folded into the previous one rather
// than sent to the model on its own.
const MIN_TAIL_CHARS = 1500;

/**
 * Split `text` into chunks of at most `maxChars`, preferring blank-line
 * (paragraph / page) boundaries, then single newlines, then sentence ends.
 * Joining the result with '\n\n' reproduces the input when it was split on
 * paragraphs, so no content is ever lost.
 */
export function splitIntoChunks(text: string, maxChars: number = DEFAULT_CHUNK_CHARS): string[] {
    const trimmed = text.trim();
    if (trimmed.length <= maxChars) return [trimmed];

    const chunks: string[] = [];
    let current = '';

    for (const paragraph of trimmed.split(/\n\s*\n/)) {
        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
        if (candidate.length <= maxChars) {
            current = candidate;
            continue;
        }

        if (current) chunks.push(current);
        current = '';

        if (paragraph.length <= maxChars) {
            current = paragraph;
        } else {
            // A single paragraph longer than the limit (e.g. a PDF page with no
            // blank lines): fall back to finer separators.
            const pieces = splitLongParagraph(paragraph, maxChars);
            chunks.push(...pieces.slice(0, -1));
            current = pieces[pieces.length - 1];
        }
    }
    if (current) chunks.push(current);

    // Fold a tiny tail into the previous chunk when it fits.
    if (chunks.length > 1) {
        const tail = chunks[chunks.length - 1];
        const prev = chunks[chunks.length - 2];
        if (tail.length < MIN_TAIL_CHARS && prev.length + 2 + tail.length <= maxChars * 1.25) {
            chunks.splice(chunks.length - 2, 2, `${prev}\n\n${tail}`);
        }
    }

    return chunks;
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
    const units = paragraph.includes('\n')
        ? paragraph.split('\n')
        : paragraph.split(/(?<=[.!?])\s+/);
    const joiner = paragraph.includes('\n') ? '\n' : ' ';

    const out: string[] = [];
    let current = '';
    for (const unit of units) {
        const candidate = current ? `${current}${joiner}${unit}` : unit;
        if (candidate.length <= maxChars) {
            current = candidate;
        } else {
            if (current) out.push(current);
            // A single sentence longer than the limit: hard-cut it.
            if (unit.length > maxChars) {
                for (let i = 0; i < unit.length; i += maxChars) out.push(unit.slice(i, i + maxChars));
                current = '';
            } else {
                current = unit;
            }
        }
    }
    if (current) out.push(current);
    return out;
}

/** Lower-case, strip punctuation and collapse whitespace, for duplicate detection. */
export function normalizeKey(value: string): string {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Keep the first item for each normalised key. Items with an empty key are
 * kept as-is (the route's sanitiser decides what to do with them).
 */
export function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = normalizeKey(keyOf(item));
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
