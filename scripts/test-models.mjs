// Smoke test: checks Gemini models respond with JSON the API routes can parse.
// Usage: npm run test:models                        (the fallback chain in src/lib/aiModels.ts)
//        npm run test:models -- --all               (every text model available to the key)
//        npm run test:models -- gemini-2.5-flash    (specific models only)

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from '../src/lib/aiModels.ts';

const TIMEOUT_MS = 60_000;

// Model ids containing any of these are not general text-generation models (or aren't free-tier)
const NON_TEXT_MODELS = [
    'tts', 'image', 'nano-banana', 'lyria', 'robotics', 'computer-use', 'antigravity',
    'deep-research', 'transcribe', 'omni', 'customtools', 'pro',
];

const PROMPT = `Create exactly 1 flashcard about photosynthesis.
Return ONLY a valid JSON array of objects with "front" and "back" keys. Do not include any markdown formatting, code fences, or extra text.`;

async function listTextModels(apiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${apiKey}`);
    if (!res.ok) throw new Error(`ListModels failed: ${res.status} ${await res.text()}`);
    const { models = [] } = await res.json();
    return models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        .filter((name) => !NON_TEXT_MODELS.some((word) => name.includes(word)));
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)),
    ]);
}

async function testModel(genAI, modelName) {
    const started = Date.now();
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await withTimeout(model.generateContent(PROMPT), TIMEOUT_MS);

        // Mirrors the routes: strip a code fence, then parse strictly
        let cleaned = result.response.text().trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const cards = JSON.parse(cleaned);
        if (!Array.isArray(cards) || !cards[0]?.front || !cards[0]?.back) {
            throw new Error(`unexpected shape: ${cleaned.slice(0, 120)}`);
        }

        return { modelName, status: 'PASS', ms: Date.now() - started };
    } catch (err) {
        const status = /\b429\b/.test(err.message) ? 'QUOTA' : 'FAIL';
        return { modelName, status, ms: Date.now() - started, error: err.message };
    }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key') {
    console.error('GEMINI_API_KEY is not set. Add it to .env.');
    process.exit(1);
}

const args = process.argv.slice(2);
const models = args.includes('--all') ? await listTextModels(apiKey) : args.length ? args : AI_MODELS;
const genAI = new GoogleGenerativeAI(apiKey);

console.log(`Testing ${models.length} model(s)...\n`);
const results = await Promise.all(models.map((m) => testModel(genAI, m)));

for (const r of results) {
    const time = `${(r.ms / 1000).toFixed(1)}s`.padStart(6);
    console.log(`${r.status.padEnd(5)} ${time}  ${r.modelName}${r.error ? `\n              ${r.error.slice(0, 300)}` : ''}`);
}

const passed = results.filter((r) => r.status === 'PASS').length;
console.log(`\n${passed}/${results.length} models working`);
process.exit(passed === results.length ? 0 : 1);
