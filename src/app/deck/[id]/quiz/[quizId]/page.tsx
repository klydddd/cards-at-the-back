"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchQuiz, fetchDeck } from '@/lib/supabase';
import { ArrowLeftIcon } from '@/components/Icons';
import { formatAnswer } from '@/components/QuizQuestionView';
import type { Deck, Quiz } from '@/types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

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
            <div className="container container-lg">
                <Link href={`/deck/${deckId}`} className="session-back" style={{ marginBottom: 'var(--space-md)' }}>
                    <ArrowLeftIcon size={16} /> {deck?.title}
                </Link>

                <div className="mb-lg">
                    <span className="eyebrow eyebrow-purple" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>
                        {quiz?.source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'} · by {quiz?.creator_name}
                    </span>
                    <h1 className="deck-title">Challenge review</h1>
                    <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginTop: 'var(--space-md)' }}>
                        <span className="badge">{questions.length} questions</span>
                        {(quiz?.question_types || []).map((type) => (
                            <span key={type} className="badge">
                                {type.replace('_', ' ')}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex" style={{ flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {questions.map((question, index) => (
                        <div key={index} className="index-card">
                            <div className="index-card-head">
                                <span>{index + 1} · {question.type.replace('_', ' ')}</span>
                            </div>
                            <div className="index-card-body" style={{ gap: 'var(--space-sm)' }}>
                                {question.scenario && <p className="quiz-scenario">{question.scenario}</p>}
                                <p className="quiz-question-text">{question.question}</p>

                                {question.type === 'multiple_choice' && question.options ? (
                                    <div className="option-list" style={{ gap: 'var(--space-xs)' }}>
                                        {question.options.map((option, optionIndex) => {
                                            const correct = option === question.answer;
                                            return (
                                                <div
                                                    key={optionIndex}
                                                    className={`option-row is-static ${correct ? 'is-correct' : ''}`}
                                                    
                                                >
                                                    <span className="option-letter">{LETTERS[optionIndex]}</span>
                                                    <span className="option-label">{option}</span>
                                                    <span className="option-tag">{correct ? 'Answer' : ''}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="answer-cell is-correct">
                                        <span className="option-tag">Correct answer</span>
                                        <span style={{ fontWeight: 500 }}>{formatAnswer(question.answer)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="stack-actions mt-lg">
                    <Link href={`/take/${quizId}`} className="btn btn-primary btn-lg">
                        Take Challenge
                    </Link>
                    <Link href={`/deck/${deckId}`} className="btn btn-secondary btn-lg">
                        Back to Deck
                    </Link>
                </div>
            </div>
        </div>
    );
}
