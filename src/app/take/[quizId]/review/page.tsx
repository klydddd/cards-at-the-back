"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchQuiz } from '@/lib/supabase';
import QuizReviewView from '@/components/QuizReviewView';
import type { Quiz } from '@/types';

// Answer key reachable without knowing the deck — the route ChallengeCard
// links to. Deck-based quizzes get sent back to their deck; manual ones to
// the browse page.
export default function TakeQuizReview() {
    const { quizId } = useParams<{ quizId: string }>();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchQuiz(quizId)
            .then(setQuiz)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [quizId]);

    if (loading)
        return (
            <div className="page">
                <div className="loading-center">
                    <div className="spinner spinner-lg"></div>
                </div>
            </div>
        );

    if (error || !quiz)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error || 'Challenge not found.'}</div>
                    <Link href="/challenges" className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    const backHref = quiz.deck_id ? `/deck/${quiz.deck_id}` : '/challenges';
    const backLabel = quiz.deck_id ? 'Deck' : 'Challenges';

    return <QuizReviewView quiz={quiz} backHref={backHref} backLabel={backLabel} />;
}
