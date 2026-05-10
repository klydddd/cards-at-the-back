import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type IncomingCard = {
    id?: string;
    front: string;
    back: string;
    position: number;
};

type RequestBody = {
    deckId?: string;
    password?: string;
    deck?: {
        title: string;
        description: string;
        subject: string;
        creatorName: string;
    };
    cards?: IncomingCard[];
};

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

    let body: RequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { deckId, password, deck, cards } = body;

    if (!password || password !== adminPassword) {
        return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
    }

    if (!deckId || !deck || !cards) {
        return NextResponse.json({ error: 'deckId, deck, and cards are required.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Fetch existing card IDs for this deck
        const { data: existingCards, error: fetchError } = await supabase
            .from('cards')
            .select('id')
            .eq('deck_id', deckId);
        if (fetchError) throw fetchError;

        const existingIds = new Set((existingCards ?? []).map((c: { id: string }) => c.id));
        const incomingIds = new Set(cards.filter(c => c.id).map(c => c.id as string));

        // 2. Delete removed cards (and their SRS progress)
        const deletedIds = [...existingIds].filter(id => !incomingIds.has(id));
        if (deletedIds.length > 0) {
            await supabase.from('card_progress').delete().in('card_id', deletedIds);
            const { error } = await supabase.from('cards').delete().in('id', deletedIds);
            if (error) throw error;
        }

        // 3. Update existing cards
        for (const card of cards.filter(c => c.id)) {
            const { error } = await supabase
                .from('cards')
                .update({ front: card.front, back: card.back, position: card.position })
                .eq('id', card.id);
            if (error) throw error;
        }

        // 4. Insert new cards
        const newCards = cards
            .filter(c => !c.id)
            .map(c => ({ deck_id: deckId, front: c.front, back: c.back, position: c.position }));
        if (newCards.length > 0) {
            const { error } = await supabase.from('cards').insert(newCards);
            if (error) throw error;
        }

        // 5. Update deck metadata
        const { error: deckError } = await supabase
            .from('decks')
            .update({
                title: deck.title,
                description: deck.description,
                subject: deck.subject,
                creator_name: deck.creatorName,
            })
            .eq('id', deckId);
        if (deckError) throw deckError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Failed to edit deck:', err);
        return NextResponse.json({ error: err.message || 'Failed to edit deck.' }, { status: 500 });
    }
}
