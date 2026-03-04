import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isConfigured = apiKey && apiKey !== 'your_gemini_api_key';

let genAI = null;
if (isConfigured) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export function isGeminiReady() {
    return !!genAI;
}

export async function parseMarkdownToCards(markdownContent) {
    if (!genAI) {
        throw new Error('Gemini API key is not configured. Please add your key to the .env file.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a flashcard generator. Analyze the following content and extract the most important terms, concepts, and key information. Create flashcards where:
- The "front" is the DESCRIPTION or DEFINITION of the concept
- The "back" is the TERM, KEYWORD, or short answer

Return ONLY a valid JSON array of objects with "front" and "back" keys. Do not include any markdown formatting, code fences, or extra text. Just the raw JSON array.

Example output format:
[{"front": "The process of converting source code into machine code", "back": "Compilation"}, {"front": "A data structure that follows Last-In-First-Out principle", "back": "Stack"}]

Content to analyze:
${markdownContent}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean the response - strip code fences if present
    let cleaned = text;
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
        const cards = JSON.parse(cleaned);
        if (!Array.isArray(cards)) throw new Error('Response is not an array');
        return cards.map((c) => ({
            front: c.front || '',
            back: c.back || '',
        }));
    } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('AI returned an invalid response. Please try again.');
    }
}
