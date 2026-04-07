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
        const { content } = await request.json();
        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemma-3-27b-it' });

        const prompt = `You are a flashcard generator. Analyze the following content and extract the most important terms, concepts, and key information. Create flashcards where:
- The "front" is the DESCRIPTION or DEFINITION of the concept
- The "back" is the TERM, KEYWORD, or short answer

Return ONLY a valid JSON array of objects with "front" and "back" keys. Do not include any markdown formatting, code fences, or extra text. Just the raw JSON array.

Example output format:
[{"front": "The process of converting source code into machine code", "back": "Compilation"}, {"front": "A data structure that follows Last-In-First-Out principle", "back": "Stack"}]

Content to analyze:
${content}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        let cleaned = text;
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const cards = JSON.parse(cleaned);
        if (!Array.isArray(cards)) throw new Error('Response is not an array');

        const sanitized = cards.map((c: any) => ({
            front: c.front || '',
            back: c.back || '',
        }));

        return NextResponse.json({ cards: sanitized });
    } catch (e: any) {
        console.error('Gemini parse error:', e);
        return NextResponse.json(
            { error: e.message || 'AI returned an invalid response. Please try again.' },
            { status: 500 }
        );
    }
}
