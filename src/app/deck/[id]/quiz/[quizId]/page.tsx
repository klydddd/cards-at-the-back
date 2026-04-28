"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchQuiz, fetchDeck } from '@/lib/supabase';
import type { Deck, Quiz } from '@/types';

export default function QuizReview() {
    const { id: deckId, quizId } = useParams<{ id: string; quizId: string }>();
    const [deck, setDeck] = useState<Deck | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchDeck(deckId), fetchQuiz(quizId)])
            .then(([d, q]) => {
                setDeck(d);
                setQuiz(q);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [deckId, quizId]);

    if (loading)
        return (
            <div className="page">
                <div className="loading-center">
                    <div className="spinner spinner-lg"></div>
                </div>
            </div>
        );

    if (error)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error}</div>
                    <Link href={`/deck/${deckId}`} className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    const questions = quiz?.questions || [];

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '720px' }}>
                <div className="mb-md">
                    <Link href={`/deck/${deckId}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        ← Back to Deck
                    </Link>
                </div>

                <div className="mb-lg">
                    <h1 className="mb-sm">Challenge Review</h1>
                    <p className="text-muted">
                        {deck?.title} — by {quiz?.creator_name}
                    </p>
                    <div className="flex gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
                        <span className="badge">{questions.length} questions</span>
                        <span className="badge badge-purple">
                            {quiz?.source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'}
                        </span>
                        {(quiz?.question_types || []).map((type) => (
                            <span key={type} className="badge" style={{ background: 'var(--bg)' }}>
                                {type.replace('_', ' ')}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                    {questions.map((question, index) => (
                        <div key={index} className="card">
                            <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {question.type.replace('_', ' ')}
                            </div>
                            {question.scenario && <p className="mb-sm light" style={{ fontStyle: 'italic' }}>{question.scenario}</p>}
                            <p className="bold mb-md" style={{ fontSize: '1.1rem' }}>{question.question}</p>

                            {question.type === 'multiple_choice' && question.options && (
                                <div className="flex" style={{ flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                    {question.options.map((option, optionIndex) => (
                                        <div
                                            key={optionIndex}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                background: option === question.answer ? 'var(--success-light)' : 'var(--bg)',
                                                fontWeight: option === question.answer ? 700 : 400,
                                            }}
                                        >
                                            {option}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ background: 'var(--success-light)', padding: '12px', borderRadius: '8px' }}>
                                <span className="text-sm text-muted block mb-sm">Correct Answer:</span>
                                <p className="bold">
                                    {Array.isArray(question.answer) ? question.answer.join(', ') : String(question.answer)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-lg flex-center gap-md">
                    <Link href={`/take/${quizId}`} className="btn btn-primary">
                        Take Challenge
                    </Link>
                    <Link href={`/deck/${deckId}`} className="btn btn-secondary">
                        Back to Deck
                    </Link>
                </div>
            </div>
        </div>
    );
}
