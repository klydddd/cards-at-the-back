import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isConfigured = apiKey && apiKey !== 'your_gemini_api_key';

let genAI = null;
if (isConfigured) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export async function generateQuizFromCards(cards, questionTypes) {
    if (!genAI) {
        throw new Error('Gemini API key is not configured. Please add your key to the .env file.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prompt engineering for specific formats
    const prompt = `You are a quiz generator. I will provide you with a list of flashcards (front=description, back=term).
Generate exactly 5-10 questions in total, based ONLY on the provided flashcards.

The user wants the following question types included: ${questionTypes.join(', ')}. Try to distribute the questions among these requested types.

Respond ONLY with a valid JSON array of question objects. 
Do not include code fences or markdown formatting. Just the raw JSON.

Use the following schema for the objects in the array based on their "type":

1. Multiple Choice:
{"type": "multiple_choice", "question": "...", "options": ["A", "B", "C", "D"], "answer": "The exact string from options"}

2. True/False:
{"type": "true_false", "question": "...", "answer": true or false}

3. Identification (Fill in the blank or short answer):
{"type": "identification", "question": "...", "answer": "The exact term"}

4. Enumeration (Provide a list):
{"type": "enumeration", "question": "List the 3 types of...", "answer": ["item1", "item2", "item3"]}

5. Situational (Applied knowledge):
{"type": "situational", "scenario": "...", "question": "What should be used?", "answer": "The correct term"}

Flashcards Data:
${JSON.stringify(cards, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    let cleaned = text;
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
        const questions = JSON.parse(cleaned);
        if (!Array.isArray(questions)) throw new Error('Response is not an array');
        return questions;
    } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('AI returned an invalid format. Please try again.');
    }
}
