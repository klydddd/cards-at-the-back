import TakeQuizClient from './TakeQuizClient';
import { fetchQuiz, fetchDeck } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: Promise<{ quizId: string }> }) {
    const { quizId } = await params;
    try {
        const quiz = await fetchQuiz(quizId);
        const deck = await fetchDeck(quiz.deck_id);
        return {
            title: `${deck.title} Challenge · gokards`,
            openGraph: {
                title: `${deck.title} Challenge · gokards`,
                description: `${quiz.questions?.length || 0}-question ${quiz.source_kind === 'quick' ? 'quick' : 'AI'} challenge`,
            },
        };
    } catch {
        return { title: 'gokards' };
    }
}

export default async function Page({ params }: { params: Promise<{ quizId: string }> }) {
    const { quizId } = await params;
    return <TakeQuizClient quizId={quizId} />;
}
