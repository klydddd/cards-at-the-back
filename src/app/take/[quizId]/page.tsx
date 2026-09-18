import TakeQuizClient from './TakeQuizClient';
import { fetchQuiz, fetchDeck } from '@/lib/supabase';
import { challengeKindLabel, challengeTitle } from '@/lib/challenges';

export async function generateMetadata({ params }: { params: Promise<{ quizId: string }> }) {
    const { quizId } = await params;
    try {
        const quiz = await fetchQuiz(quizId);
        // Manual challenges have no deck; they carry their own title
        const deck = quiz.deck_id ? await fetchDeck(quiz.deck_id) : null;
        const title = `${challengeTitle(quiz, deck?.title)} Challenge · gokards`;
        return {
            title,
            openGraph: {
                title,
                description: `${quiz.questions?.length || 0} questions · ${challengeKindLabel(quiz.source_kind)}`,
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
