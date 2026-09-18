import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateChunked } from '@/lib/geminiServer';
import { dedupeBy } from '@/lib/chunking';

const apiKey = process.env.GEMINI_API_KEY;

// Long documents are processed in several model calls (see geminiServer.ts).
export const maxDuration = 60;

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

        const promptFor = (chunk: string) => `You are a flashcard generator. Analyze the following content and turn it into a COMPLETE study deck that covers the whole document. Create flashcards where:
- The "front" is the DESCRIPTION or DEFINITION of the concept
- The "back" is the TERM, KEYWORD, or short answer

Coverage rules:
- Work through the document section by section, in order. Do not skip any section, including the later ones.
- Make a card for EVERY defined term, bolded keyword, named service, component, or person, and for every key fact, number or rule.
- For an enumerated list (e.g. "six advantages", "three service models"), make one card per item, not a single card for the whole list.
- Aim for roughly one card per 100 to 150 words of content. There is no upper limit: a long document should produce a long deck. A short text should produce a short deck; do not pad with trivial or repeated cards.
- Keep the "back" short (a term or a few words) so it can be used as a quiz answer.

Return ONLY a valid JSON array of objects with "front" and "back" keys. Do not include any markdown formatting, code fences, or extra text. Just the raw JSON array.

Example output format:
[{"front": "The process of converting source code into machine code", "back": "Compilation"}, {"front": "A data structure that follows Last-In-First-Out principle", "back": "Stack"}]

Content to analyze:
${chunk}`;

        const cards = await generateChunked(genAI, content, promptFor, 'parse');

        // The same term can be defined in two chunks; keep the first card.
        const sanitized = dedupeBy(
            cards.map((c: any) => ({
                front: c.front || '',
                back: c.back || '',
            })),
            (c) => c.back,
        );

        console.log(`[parse] Done (${sanitized.length} cards)`);
        return NextResponse.json({ cards: sanitized });
    } catch (e: any) {
        console.error('Gemini parse error:', e);
        return NextResponse.json(
            { error: e.message || 'AI returned an invalid response. Please try again.' },
            { status: 500 }
        );
    }
}
