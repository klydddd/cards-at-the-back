// Gemini fallback chain shared by the /api/gemini/* routes, tried in order.
// Verify with `npm run test:models -- --all` before changing.
export const AI_MODELS = [
    'gemini-3.5-flash-lite', // fastest, free-tier
    'gemini-2.5-flash',      // most consistently available in testing
    'gemini-3.5-flash',      // slower and often overloaded; last resort
];
