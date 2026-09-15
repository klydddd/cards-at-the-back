import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabaseAdmin';
import { isContactTopic } from '@/lib/legal';
import { createRateLimiter, getClientIp } from '@/lib/rateLimit';

const LIMITS = { name: 100, email: 254, link: 500, messageMin: 10, messageMax: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

function text(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // Honeypot: real visitors never see or fill this field
    if (text(body.website)) {
        return NextResponse.json({ ok: true });
    }

    const topic = body.topic;
    const name = text(body.name);
    const email = text(body.email);
    const link = text(body.link);
    const message = text(body.message);

    if (!isContactTopic(topic)) {
        return NextResponse.json({ error: 'Please choose a topic.' }, { status: 400 });
    }
    if (!email || email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (name.length > LIMITS.name) {
        return NextResponse.json({ error: `Name must be ${LIMITS.name} characters or fewer.` }, { status: 400 });
    }
    if (link.length > LIMITS.link) {
        return NextResponse.json({ error: `Link must be ${LIMITS.link} characters or fewer.` }, { status: 400 });
    }
    if (message.length < LIMITS.messageMin || message.length > LIMITS.messageMax) {
        return NextResponse.json(
            { error: `Message must be between ${LIMITS.messageMin} and ${LIMITS.messageMax} characters.` },
            { status: 400 }
        );
    }

    if (isRateLimited(getClientIp(request))) {
        return NextResponse.json(
            { error: 'Too many messages. Please wait a few minutes and try again.' },
            { status: 429 }
        );
    }

    try {
        const supabase = createServiceRoleSupabaseClient();
        const { error } = await supabase.from('contact_messages').insert({ topic, name, email, link, message });
        if (error) throw error;
    } catch (error) {
        console.error('Failed to save contact message:', error);
        return NextResponse.json(
            { error: 'Your message could not be sent. Please email us instead.' },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true });
}
