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
