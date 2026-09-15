import type { NextRequest } from 'next/server';

// Best-effort per-IP throttle. Serverless instances don't share memory,
// so this slows down casual spam rather than guaranteeing a hard limit.
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
    const recentHits = new Map<string, number[]>();

    return function isRateLimited(key: string) {
        const now = Date.now();
        const recent = (recentHits.get(key) || []).filter((t) => now - t < windowMs);
        if (recent.length >= max) {
            recentHits.set(key, recent);
            return true;
        }
        recent.push(now);
        recentHits.set(key, recent);
        return false;
    };
}

export function getClientIp(request: NextRequest) {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}
