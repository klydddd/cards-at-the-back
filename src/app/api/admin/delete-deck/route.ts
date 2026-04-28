import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    let body: { deckId?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { deckId, password } = body;

    if (!password || password !== adminPassword) {
        return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
    }

    if (!deckId) {
        return NextResponse.json({ error: 'Deck ID is required.' }, { status: 400 });
    }

    // Use the service role key for full delete access (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // Delete in order: card_progress → cards → quiz_attempts (via quizzes) → quizzes → deck

        // 1. Delete card progress for this deck
        await supabase.from('card_progress').delete().eq('deck_id', deckId);

        // 2. Delete cards
        await supabase.from('cards').delete().eq('deck_id', deckId);

        // 3. Get all quiz IDs for this deck, then delete their attempts
        const { data: quizzes } = await supabase.from('quizzes').select('id').eq('deck_id', deckId);
        if (quizzes && quizzes.length > 0) {
            const quizIds = quizzes.map((q) => q.id);
            await supabase.from('quiz_attempts').delete().in('quiz_id', quizIds);
        }

        // 4. Delete quizzes
        await supabase.from('quizzes').delete().eq('deck_id', deckId);

        // 5. Delete the deck itself
        const { error: deckError } = await supabase.from('decks').delete().eq('id', deckId);
        if (deckError) throw deckError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Failed to delete deck:', err);
        return NextResponse.json({ error: err.message || 'Failed to delete deck.' }, { status: 500 });
    }
}
