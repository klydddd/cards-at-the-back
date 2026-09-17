import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

const MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'gemma-3-27b-it',
];

function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

// Models tend to list the correct answer first, so randomize option order here
// and make sure the answer matches one of the options exactly.
function shuffleMultipleChoice(question: any) {
    if (question?.type !== 'multiple_choice' || !Array.isArray(question.options) || question.options.length === 0) {
        return question;
    }

    const options: string[] = question.options.map((option: unknown) => String(option));
    const match = options.find((option) => normalize(option) === normalize(question.answer));

    if (match !== undefined) {
        return { ...question, options: shuffle(options), answer: match };
    }

    const answer = String(question.answer ?? '').trim();
    if (!answer) return { ...question, options: shuffle(options) };

    options[Math.floor(Math.random() * options.length)] = answer;
    return { ...question, options: shuffle(options), answer };
}

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
            return NextResponse.json({ error: 'No kards provided.' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const typeInstructions = Object.entries(questionTypeCounts)
            .filter(([, count]) => (count as number) > 0)
            .map(([type, count]) => `- ${type}: exactly ${count} question(s)`)
            .join('\n');

        const totalCount = Object.values(questionTypeCounts).reduce((sum: number, n: any) => sum + n, 0);

        const prompt = `You are a quiz generator. I will provide you with a list of flashcards (front=description, back=term).
Generate exactly ${totalCount} questions in total, based ONLY on the provided flashcards.

Generate the following number of questions per type:
${typeInstructions}

How to write the questions:
- NEVER copy a flashcard's description word for word. Paraphrase it in your own words, using different vocabulary and sentence structure, while keeping the meaning accurate.
- Vary the angle of the questions instead of always asking "What is <description>?". For example: ask about a characteristic, purpose, example, cause/effect, or how the concept differs from a related one.
- A student who only memorized the exact wording of the flashcards should still have to understand the concept to answer.
- Do not add facts that are not supported by the flashcards.
- For multiple choice, use other terms from the flashcards as plausible wrong options when possible.
- Pick flashcards from across the whole list, not just the first ones, and do not follow the list order.

Respond ONLY with a valid JSON array of question objects. 
Do not include code fences or markdown formatting. Just the raw JSON.

Use the following schema for the objects in the array based on their "type":

1. Multiple Choice:
{"type": "multiple_choice", "question": "...", "options": ["<option>", "<option>", "<option>", "<option>"], "answer": "The exact string of the correct option"}
Place the correct option at a random position; do not always put it first.

2. True/False:
{"type": "true_false", "question": "...", "answer": true or false}

3. Identification (Fill in the blank or short answer):
{"type": "identification", "question": "...", "answer": "The exact term"}

4. Enumeration (Provide a list):
{"type": "enumeration", "question": "List the 3 types of...", "answer": ["item1", "item2", "item3"]}

5. Situational (Applied knowledge):
{"type": "situational", "scenario": "...", "question": "What should be used?", "answer": "The correct term"}

Flashcards Data:
${JSON.stringify(shuffle(cards), null, 2)}`;

        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                console.log(`[quiz] Trying model: ${modelName}`);
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
                // Mix question types and card order so the quiz doesn't mirror the deck.
                const questions = shuffle(parsed.map(shuffleMultipleChoice));

                console.log(`[quiz] Success with model: ${modelName} (${questions.length} questions)`);
                return NextResponse.json({ questions });
            } catch (err: any) {
                console.warn(`[quiz] Model ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        // All models failed
        return NextResponse.json(
            { error: lastError?.message || 'All AI models failed. Please try again.' },
            { status: 500 }
        );
    } catch (e: any) {
        console.error('Gemini quiz error:', e);
        return NextResponse.json(
            { error: e.message || 'AI returned an invalid format. Please try again.' },
            { status: 500 }
        );
    }
}
