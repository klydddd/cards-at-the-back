import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
    if (!apiKey || apiKey === 'your_gemini_api_key') {
        return NextResponse.json(
            { error: 'Gemini API key is not configured. Please add your key to the .env file.' },
            { status: 500 }
        );
    }

    try {
        const { cards, questionTypeCounts } = await request.json();

        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            return NextResponse.json({ error: 'No cards provided.' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemma-3-27b-it' });

        const typeInstructions = Object.entries(questionTypeCounts)
            .filter(([, count]) => (count as number) > 0)
            .map(([type, count]) => `- ${type}: exactly ${count} question(s)`)
            .join('\n');

        const totalCount = Object.values(questionTypeCounts).reduce((sum: number, n: any) => sum + n, 0);

        const prompt = `You are a quiz generator. I will provide you with a list of flashcards (front=description, back=term).
Generate exactly ${totalCount} questions in total, based ONLY on the provided flashcards.

Generate the following number of questions per type:
${typeInstructions}

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

        const questions = JSON.parse(cleaned);
        if (!Array.isArray(questions)) throw new Error('Response is not an array');

        return NextResponse.json({ questions });
    } catch (e: any) {
        console.error('Gemini quiz error:', e);
        return NextResponse.json(
            { error: e.message || 'AI returned an invalid format. Please try again.' },
            { status: 500 }
        );
    }
}
