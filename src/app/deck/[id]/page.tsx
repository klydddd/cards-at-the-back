import DeckViewClient from './DeckViewClient';
import { fetchDeck } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const deck = await fetchDeck(id);
        return {
            title: `${deck.title} · Cards at the Back`,
            openGraph: {
                title: `${deck.title} · Cards at the Back`,
                description: deck.description || `${deck.title} flashcard deck`,
            },
        };
    } catch {
        return { title: 'Cards at the Back' };
    }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DeckViewClient id={id} />;
}
