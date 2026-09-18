// Server-only Gemini helpers shared by the /api/gemini/parse* routes.
// Never import from client code: it needs GEMINI_API_KEY.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from '@/lib/aiModels';
import { DEFAULT_CHUNK_CHARS, splitIntoChunks } from '@/lib/chunking';

// Parallel model calls per request. The Gemini routes have no rate limit
// (audit SEC-03), so keep this small.
const CHUNK_CONCURRENCY = 3;

/**
 * Run `prompt` through the model fallback chain and return the parsed JSON
 * array. Throws the last model's error when every model fails, or the model
 * returns something that is not a JSON array.
 */
export async function generateJsonArray(genAI: GoogleGenerativeAI, prompt: string, tag: string): Promise<any[]> {
    let lastError: any = null;

    for (const modelName of AI_MODELS) {
        try {
            console.log(`[${tag}] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();

            let cleaned = text;
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed)) throw new Error('Response is not an array');

            console.log(`[${tag}] Success with model: ${modelName} (${parsed.length} items)`);
            return parsed;
        } catch (err: any) {
            console.warn(`[${tag}] Model ${modelName} failed:`, err.message);
            lastError = err;
        }
    }

    throw lastError ?? new Error('All AI models failed. Please try again.');
}

/**
 * Split `content` into chunks, run `promptFor(chunk)` through the model for
 * each (a few at a time, in document order) and concatenate the arrays.
 * Short inputs are a single chunk, so behaviour is unchanged for them.
 * Any chunk failing on every model fails the whole call: a deck with a
 * silent gap is worse than an error.
 */
export async function generateChunked(
    genAI: GoogleGenerativeAI,
    content: string,
    promptFor: (chunk: string) => string,
    tag: string,
    chunkChars: number = DEFAULT_CHUNK_CHARS,
): Promise<any[]> {
    const chunks = splitIntoChunks(content, chunkChars);
    if (chunks.length > 1) {
        console.log(`[${tag}] ${content.length} chars → ${chunks.length} chunks`);
    }

    const results: any[][] = new Array(chunks.length);
    let next = 0;

    async function worker() {
        while (next < chunks.length) {
            const index = next++;
            const chunkTag = chunks.length > 1 ? `${tag} ${index + 1}/${chunks.length}` : tag;
            results[index] = await generateJsonArray(genAI, promptFor(chunks[index]), chunkTag);
        }
    }

    await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, chunks.length) }, worker));

    return results.flat();
}
