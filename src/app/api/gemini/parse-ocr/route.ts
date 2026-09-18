import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from '@/lib/aiModels';

const apiKey = process.env.GEMINI_API_KEY;

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
            // The text is either an exam/worksheet that already contains questions
            // (extract them) or study material such as notes, slides or a chapter
            // (generate questions from it). The mode is used for documents as well
            // as OCR output, so the prompt must never return [] for notes.
            prompt = `You are an expert at turning study material into multiple choice quizzes. The following text was extracted from a document (possibly via OCR, so it may contain artifacts). It is EITHER an exam / worksheet that already contains questions, OR study material such as lecture notes, slides, a chapter or a summary.

Your task:
1. First decide which kind of text it is.
2. If it ALREADY CONTAINS questions: extract every question with its choices (A, B, C, D, etc.). Determine the correct answer if it is indicated (e.g., circled, underlined, or marked in the text). If the correct answer is NOT indicated, use your knowledge to select the best answer.
3. If it is STUDY MATERIAL with no questions: GENERATE multiple choice questions that test the key facts, definitions and concepts in the material. Cover the whole text, not just the beginning. Write 10 to 25 questions depending on how much content there is. Each question needs exactly 4 options: one correct answer and three plausible, clearly wrong distractors (prefer other terms from the same material). Do not add facts that are not supported by the text.
4. Return ONLY a valid JSON array of objects. Never return an empty array unless the text has no usable content at all.

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
- When generating, keep the "answer" as the exact string of one of the options.
- Do NOT include any markdown formatting, code fences, or extra text. Just the raw JSON array.

Text:
${content}`;
        } else {
            // Default flashcard extraction (same as parse route)
            prompt = `You are a flashcard generator. The following text was extracted via OCR from a document. Analyze the content and turn it into a COMPLETE study deck that covers the whole text. Create flashcards where:
- The "front" is the DESCRIPTION or DEFINITION of the concept
- The "back" is the TERM, KEYWORD, or short answer

Coverage rules:
- Work through the text section by section, in order. Do not skip any section, including the later ones.
- Make a card for EVERY defined term, keyword, named service, component, or person, and for every key fact, number or rule.
- For an enumerated list (e.g. "six advantages", "three service models"), make one card per item, not a single card for the whole list.
- Aim for roughly one card per 100 to 150 words of content. There is no upper limit: a long text should produce a long deck. A short text should produce a short deck; do not pad with trivial or repeated cards.
- Keep the "back" short (a term or a few words) so it can be used as a quiz answer.

Clean up any OCR artifacts (random characters, broken words, etc.) to produce readable text.

Return ONLY a valid JSON array of objects with "front" and "back" keys. Do not include any markdown formatting, code fences, or extra text. Just the raw JSON array.

Example output format:
[{"front": "The process of converting source code into machine code", "back": "Compilation"}, {"front": "A data structure that follows Last-In-First-Out principle", "back": "Stack"}]

OCR Content:
${content}`;
        }

        let lastError: any = null;

        for (const modelName of AI_MODELS) {
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
