import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

const MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'gemma-3-27b-it',
];

export async function POST(request: NextRequest) {
    if (!apiKey || apiKey === 'your_gemini_api_key') {
        return NextResponse.json(
            { error: 'Gemini API key is not configured. Please add your key to the .env file.' },
            { status: 500 }
        );
    }

    try {
        const { content, mode } = await request.json();
        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Build the prompt based on mode
        let prompt: string;

        if (mode === 'mcq') {
            // Specifically designed to detect and extract MCQ structure from OCR text
            prompt = `You are an expert at reading OCR-scanned text from exam papers. The following text was extracted via OCR from a scanned document that contains **multiple choice questions**.

Your task:
1. Identify each question and its corresponding choices (A, B, C, D, etc.).
2. Determine the correct answer if it is indicated (e.g., circled, underlined, or marked in the text). If the correct answer is NOT indicated, use your knowledge to select the best answer.
3. Return ONLY a valid JSON array of objects.

Each object must have this exact structure:
{
  "type": "multiple_choice",
  "question": "The full question text",
  "options": ["Choice A text", "Choice B text", "Choice C text", "Choice D text"],
  "answer": "The exact string of the correct option from the options array"
}

Rules:
- Clean up any OCR artifacts (random characters, broken words, etc.) to produce readable text.
- If a question number is present (e.g. "1.", "Q1.", "#1"), DO NOT include it in the question text.
- Each option should be the clean text without the letter prefix (e.g., don't include "A.", "a)", etc.).
- If you find true/false questions mixed in, format them as:
  {"type": "true_false", "question": "...", "answer": true or false}
- If you find identification/short-answer questions, format them as:
  {"type": "identification", "question": "...", "answer": "..."}
- Do NOT include any markdown formatting, code fences, or extra text. Just the raw JSON array.

OCR Text:
${content}`;
        } else {
            // Default flashcard extraction (same as parse route)
            prompt = `You are a flashcard generator. The following text was extracted via OCR from a document. Analyze the content and extract the most important terms, concepts, and key information. Create flashcards where:
- The "front" is the DESCRIPTION or DEFINITION of the concept
- The "back" is the TERM, KEYWORD, or short answer

Clean up any OCR artifacts (random characters, broken words, etc.) to produce readable text.

Return ONLY a valid JSON array of objects with "front" and "back" keys. Do not include any markdown formatting, code fences, or extra text. Just the raw JSON array.

Example output format:
[{"front": "The process of converting source code into machine code", "back": "Compilation"}, {"front": "A data structure that follows Last-In-First-Out principle", "back": "Stack"}]

OCR Content:
${content}`;
        }

        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                console.log(`[parse-ocr] Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();

                let cleaned = text;
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                }

                const parsed = JSON.parse(cleaned);
                if (!Array.isArray(parsed)) throw new Error('Response is not an array');

                if (mode === 'mcq') {
                    // Sanitize MCQ output
                    const questions = parsed.map((q: any) => {
                        if (q.type === 'multiple_choice') {
                            return {
                                type: 'multiple_choice',
                                question: q.question || '',
                                options: Array.isArray(q.options) ? q.options : [],
                                answer: q.answer || '',
                            };
                        } else if (q.type === 'true_false') {
                            return {
                                type: 'true_false',
                                question: q.question || '',
                                answer: typeof q.answer === 'boolean' ? q.answer : q.answer === 'true',
                            };
                        } else if (q.type === 'identification') {
                            return {
                                type: 'identification',
                                question: q.question || '',
                                answer: q.answer || '',
                            };
                        }
                        return q;
                    });

                    console.log(`[parse-ocr] Success with model: ${modelName} (${questions.length} questions)`);
                    return NextResponse.json({ questions });
                } else {
                    // Sanitize flashcard output
                    const cards = parsed.map((c: any) => ({
                        front: c.front || '',
                        back: c.back || '',
                    }));

                    console.log(`[parse-ocr] Success with model: ${modelName} (${cards.length} cards)`);
                    return NextResponse.json({ cards });
                }
            } catch (err: any) {
                console.warn(`[parse-ocr] Model ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        // All models failed
        return NextResponse.json(
            { error: lastError?.message || 'All AI models failed. Please try again.' },
            { status: 500 }
        );
    } catch (e: any) {
        console.error('OCR parse error:', e);
        return NextResponse.json(
            { error: e.message || 'AI returned an invalid response. Please try again.' },
            { status: 500 }
        );
    }
}
