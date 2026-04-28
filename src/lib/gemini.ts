// Client-side wrapper — calls the server API route so the Gemini key stays hidden

export function isGeminiReady() {
    // The key is now server-side only; we always return true
    // and let the server tell us if it's misconfigured.
    return true;
}

export async function parseMarkdownToCards(markdownContent: string) {
    const res = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdownContent }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to generate cards.');
    }
    return data.cards;
}

/**
 * Parse OCR-extracted text into multiple-choice questions using AI.
 */
export async function parseOCRToQuestions(ocrContent: string) {
    const res = await fetch('/api/gemini/parse-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ocrContent, mode: 'mcq' }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to extract questions.');
    }
    return data.questions;
}

/**
 * Parse OCR-extracted text into flashcards using AI.
 */
export async function parseOCRToCards(ocrContent: string) {
    const res = await fetch('/api/gemini/parse-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ocrContent, mode: 'cards' }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to generate cards from OCR.');
    }
    return data.cards;
}
