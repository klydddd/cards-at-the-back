// Client-side wrapper — calls the server API route so the Gemini key stays hidden

/**
 * @param {Array} cards - flashcard objects with front/back
 * @param {Object} questionTypeCounts - e.g. { multiple_choice: 3, true_false: 2 }
 */
export async function generateQuizFromCards(cards: any[], questionTypeCounts: Record<string, number>) {
    const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards, questionTypeCounts }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz.');
    }
    return data.questions;
}
