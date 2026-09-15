import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabaseAdmin';
import { createRateLimiter, getClientIp } from '@/lib/rateLimit';
import {
    NAME_MAX,
    PROGRAM_MAX,
    UNDER_13,
    isAgeRange,
    isGradeLevel,
    isShsStrand,
    needsProgram,
    needsStrand,
} from '@/lib/onboarding';

const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

function text(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function badRequest(error: string) {
    return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid request body.');
    }

    // Honeypot: real visitors never see or fill this field
    if (text(body.website)) {
        return NextResponse.json({ id: crypto.randomUUID() });
    }

    const anonymous = body.anonymous === true;
    const name = anonymous ? '' : text(body.name);
    const { ageRange, gradeLevel } = body;
    const strand = text(body.strand);
    const program = text(body.program);

    if (!anonymous && !name) {
        return badRequest('Enter a name, or choose to stay anonymous.');
    }
    if (name.length > NAME_MAX) {
        return badRequest(`Name must be ${NAME_MAX} characters or fewer.`);
    }
    if (!isAgeRange(ageRange)) {
        return badRequest('Please choose your age range.');
    }
    // Never store anything about children under 13
    if (ageRange === UNDER_13) {
        return badRequest('gokards is for ages 13 and up.');
    }
    if (!isGradeLevel(gradeLevel)) {
        return badRequest('Please choose your grade level.');
    }
    if (needsStrand(gradeLevel) && !isShsStrand(strand)) {
        return badRequest('Please choose your strand.');
    }
    if (needsProgram(gradeLevel) && !program) {
        return badRequest('Please enter your program.');
    }
    if (program.length > PROGRAM_MAX) {
        return badRequest(`Program must be ${PROGRAM_MAX} characters or fewer.`);
    }

    if (isRateLimited(getClientIp(request))) {
        return NextResponse.json(
            { error: 'Too many submissions. Please wait a few minutes and try again.' },
            { status: 429 }
        );
    }

    try {
        const supabase = createServiceRoleSupabaseClient();
        const { data, error } = await supabase
            .from('onboarding_responses')
            .insert({
                display_name: anonymous ? 'Anonymous' : name,
                is_anonymous: anonymous,
                age_range: ageRange,
                grade_level: gradeLevel,
                strand: needsStrand(gradeLevel) ? strand : null,
                program: needsProgram(gradeLevel) ? program : null,
            })
            .select('id')
            .single();
        if (error) throw error;
        return NextResponse.json({ id: data.id });
    } catch (error) {
        console.error('Failed to save onboarding response:', error);
        return NextResponse.json(
            { error: 'Your answers could not be saved. Please try again.' },
            { status: 500 }
        );
    }
}
