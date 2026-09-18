"use client";

import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/Icons';
import { formatAnswer } from '@/components/QuizQuestionView';
import { challengeKindLabel } from '@/lib/challenges';
import type { Quiz } from '@/types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// The answer key for a published challenge. Rendered by both
// /deck/[id]/quiz/[quizId] (deck-scoped) and /take/[quizId]/review
// (deck-less); the caller decides where "back" leads.
export default function QuizReviewView({
    quiz,
    backHref,
    backLabel,
}: {
    quiz: Quiz;
    backHref: string;
    backLabel: string;
}) {
    const questions = quiz.questions || [];

    return (
        <div className="page">
            <div className="container container-lg">
                <Link href={backHref} className="session-back" style={{ marginBottom: 'var(--space-md)' }}>
                    <ArrowLeftIcon size={16} /> {backLabel}
                </Link>

                <div className="mb-lg">
                    <span className="eyebrow eyebrow-purple" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>
                        {challengeKindLabel(quiz.source_kind)} · by {quiz.creator_name}
                    </span>
                    <h1 className="deck-title">Challenge review</h1>
                    <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginTop: 'var(--space-md)' }}>
                        <span className="badge">{questions.length} questions</span>
                        {(quiz.question_types || []).map((type) => (
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
                                    <div className="option-grid">
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
                    <Link href={`/take/${quiz.id}`} className="btn btn-primary btn-lg">
                        Take Challenge
                    </Link>
                    <Link href={backHref} className="btn btn-secondary btn-lg">
                        Back to {backLabel}
                    </Link>
                </div>
            </div>
        </div>
    );
}
