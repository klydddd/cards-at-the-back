import DeckViewClient from './DeckViewClient';
import { fetchDeck } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const deck = await fetchDeck(id);
        return {
            title: `${deck.title} · gokards`,
            openGraph: {
                title: `${deck.title} · gokards`,
                description: deck.description || `${deck.title} flashkard deck`,
            },
        };
    } catch {
        return { title: 'gokards' };
    }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DeckViewClient id={id} />;
}
