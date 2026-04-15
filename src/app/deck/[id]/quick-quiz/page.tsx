"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards } from '@/lib/supabase';
import { generateQuickQuiz } from '@/lib/mcqGenerator';
import { CheckIcon, XIcon } from '@/components/Icons';
import { Deck, Card } from '@/types';

interface Question {
    type: 'multiple_choice' | 'true_false' | 'identification';
    question: string;
    answer: string | boolean;
    options?: string[];
}

interface QuizFeedback {
    userAnswer: string | boolean;
    isCorrect: boolean;
}

const QUIZ_TYPES = [
    { id: 'multiple_choice' as const, label: 'Multiple Choice', minCards: 4 },
    { id: 'true_false' as const, label: 'True or False', minCards: 2 },
    { id: 'identification' as const, label: 'Identification', minCards: 1 },
];

export default function MCQuiz() {
    const params = useParams();
    const id = params.id as string;
    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Setup
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [started, setStarted] = useState(false);

    // Quiz state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | boolean>>({});
    const [currentInput, setCurrentInput] = useState('');
    const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([fetchDeck(id), fetchCards(id)])
            .then(([d, c]) => {
                setDeck(d);
                setCards(c);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const startQuiz = (type: 'multiple_choice' | 'true_false' | 'identification') => {
        try {
            const qs = generateQuickQuiz(cards, type) as Question[];
            setQuestions(qs);
            setSelectedType(type);
            setCurrentQ(0);
            setAnswers({});
            setCurrentInput('');
            setFeedback(null);
            setShowResults(false);
            setScore(0);
            setStarted(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const restart = () => {
        setStarted(false);
        setQuestions([]);
        setError(null);
    };

    const retryWithSameType = () => {
        if (selectedType) startQuiz(selectedType as any);
    };

    const checkAnswer = (q: Question, userAnswer: string | boolean) => {
        if (userAnswer === undefined || (typeof userAnswer === 'string' && userAnswer === '')) return false;
        if (typeof q.answer === 'string' && typeof userAnswer === 'string') {
            return userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
        }
        if (typeof q.answer === 'boolean') return userAnswer === q.answer;
        return false;
    };

    const submitAnswer = (overrideAnswer: string | boolean | null = null) => {
        if (feedback) return;
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const q = questions[currentQ];
        const isCorrect = checkAnswer(q, finalAnswer);

        setAnswers(prev => ({ ...prev, [currentQ]: finalAnswer }));
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
        if (isCorrect) setScore(s => s + 1);
    };

    const goNext = () => {
        setFeedback(null);
        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
        } else {
            setShowResults(true);
        }
    };

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
                    <Link href={`/deck/${id}`} className="btn btn-secondary mt-md">Go Back</Link>
                </div>
            </div>
        );

    // ── Setup: pick question type ──
    if (!started) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '520px' }}>
                    <div className="mb-md">
                        <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                            ← Back to Deck
                        </Link>
                    </div>

                    <h1 className="mb-sm">Quick Quiz</h1>
                    <p className="text-muted mb-lg">{deck?.title} — {cards.length} cards</p>

                    <h3 className="mb-md">Choose a question type</h3>
                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        {QUIZ_TYPES.map(type => {
                            const disabled = cards.length < type.minCards;
                            return (
                                <button
                                    key={type.id}
                                    className="btn btn-secondary btn-lg"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'space-between',
                                        opacity: disabled ? 0.4 : 1,
                                    }}
                                    onClick={() => startQuiz(type.id)}
                                    disabled={disabled}
                                >
                                    <span>{type.label}</span>
                                    {disabled && <span className="text-sm text-muted">Need {type.minCards}+ cards</span>}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-sm text-muted mt-lg" style={{ opacity: 0.5 }}>
                        Questions are generated instantly from your cards — no AI needed.
                    </p>
                </div>
            </div>
        );
    }

    // ── Results ──
    if (showResults) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <div className="text-center mb-lg">
                        <h1 className="mb-sm">Quick Quiz Complete!</h1>
                        <p className="text-muted">{deck?.title}</p>
                    </div>

                    <div className="card text-center mb-lg" style={{ padding: '32px' }}>
                        <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Your Score</p>
                        <p style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1 }}>
                            {score}<span style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--text-faint)' }}>/{questions.length}</span>
                        </p>
                        <p className="text-sm text-muted mt-sm">
                            {score === questions.length ? 'Perfect!' : score >= questions.length * 0.7 ? 'Great job!' : 'Keep practicing!'}
                        </p>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                        {questions.map((q, i) => {
                            const userAnswer = answers[i];
                            const isCorrect = checkAnswer(q, userAnswer);
                            return (
                                <div key={i} className="card" style={{ padding: '16px 20px', borderLeftWidth: isCorrect ? 1.5 : 4, borderLeftColor: isCorrect ? 'var(--success)' : 'var(--warning)' }}>
                                    <p className="text-sm text-muted light mb-sm">{q.question}</p>
                                    <div className="flex gap-md">
                                        <div>
                                            <span className="text-sm text-muted">You: </span>
                                            <span style={{ fontWeight: isCorrect ? 700 : 400, color: isCorrect ? 'var(--success-dark)' : 'var(--error-dark)' }}>
                                                {typeof userAnswer === 'boolean' ? (userAnswer ? 'True' : 'False') : (userAnswer || 'Skipped')}
                                            </span>
                                        </div>
                                        {!isCorrect && (
                                            <div>
                                                <span className="text-sm text-muted">Answer: </span>
                                                <span style={{ fontWeight: 700 }}>
                                                    {typeof q.answer === 'boolean' ? (q.answer ? 'True' : 'False') : q.answer}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={retryWithSameType}>
                            Try Again (Reshuffled)
                        </button>
                        <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={restart}>
                            Change Question Type
                        </button>
                        <Link href={`/deck/${id}`} className="btn btn-ghost" style={{ width: '100%' }}>
                            Back to Deck
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Taking quiz ──
    const q = questions[currentQ];

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                <div className="mb-lg flex-between">
                    <button className="btn btn-ghost btn-sm" onClick={restart} style={{ marginLeft: '-16px' }}>
                        ← Back
                    </button>
                    <span className="text-sm bold">{currentQ + 1} / {questions.length}</span>
                </div>

                <div className="mb-md" style={{ height: '3px', background: 'var(--border)', borderRadius: '100px' }}>
                    <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'var(--primary)', borderRadius: '100px', transition: 'width 0.3s ease' }}></div>
                </div>

                <div className="flex-between mb-lg">
                    <span className="text-sm text-muted">{deck?.title}</span>
                    <span className="text-sm bold" style={{ color: 'var(--success-dark)' }}>{score} correct</span>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                    <p className="text-sm text-muted light mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {q.type === 'multiple_choice' ? 'What is the term?' : q.type === 'true_false' ? 'True or False?' : 'Identify the term'}
                    </p>
                    <h2 className="mb-lg" style={{ fontSize: '1.3rem', fontWeight: 400, lineHeight: 1.5 }}>{q.question}</h2>

                    <div style={{ marginTop: '24px' }}>
                        {/* Multiple Choice */}
                        {q.type === 'multiple_choice' && (
                            <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                                {q.options?.map((opt, i) => {
                                    let style: any = { justifyContent: 'flex-start', textAlign: 'left', padding: '16px', fontWeight: 500 };
                                    if (feedback) {
                                        if (opt === q.answer) {
                                            style = { ...style, backgroundColor: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)', fontWeight: 700 };
                                        } else if (opt === feedback.userAnswer && !feedback.isCorrect) {
                                            style = { ...style, backgroundColor: 'var(--error-light)', borderColor: 'var(--error)', color: 'var(--error-dark)' };
                                        } else {
                                            style = { ...style, opacity: 0.35 };
                                        }
                                    }
                                    return (
                                        <button key={`${currentQ}-${i}`} className="btn btn-secondary" style={style} onClick={() => submitAnswer(opt)} disabled={!!feedback}>
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* True / False */}
                        {q.type === 'true_false' && (
                            <div className="flex gap-md">
                                {[true, false].map(val => {
                                    let btnStyle: any = { flex: 1, padding: '24px' };
                                    if (feedback) {
                                        if (val === q.answer) {
                                            btnStyle = { ...btnStyle, backgroundColor: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)', fontWeight: 700 };
                                        } else if (val === feedback.userAnswer && !feedback.isCorrect) {
                                            btnStyle = { ...btnStyle, backgroundColor: 'var(--error-light)', borderColor: 'var(--error)', color: 'var(--error-dark)' };
                                        } else {
                                            btnStyle = { ...btnStyle, opacity: 0.35 };
                                        }
                                    }
                                    return (
                                        <button key={`${currentQ}-${String(val)}`} className="btn btn-secondary" style={btnStyle} onClick={() => submitAnswer(val)} disabled={!!feedback}>
                                            {val ? 'True' : 'False'}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Identification */}
                        {q.type === 'identification' && (
                            <div>
                                <input
                                    type="text"
                                    className="input"
                                    autoFocus
                                    placeholder="Type your answer here..."
                                    value={currentInput}
                                    onChange={(e) => setCurrentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !feedback && submitAnswer()}
                                    disabled={!!feedback}
                                />
                                {!feedback && (
                                    <div className="mt-md text-right">
                                        <button className="btn btn-primary" onClick={() => submitAnswer()}>Submit</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Instant Feedback */}
                    {feedback && (
                        <div style={{
                            marginTop: '20px',
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-md)',
                            background: feedback.isCorrect ? 'var(--success-light)' : 'var(--error-light)',
                            border: `1.5px solid ${feedback.isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`,
                        }}>
                            <div className="flex gap-sm" style={{ alignItems: 'center', marginBottom: feedback.isCorrect ? 0 : '8px' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: feedback.isCorrect ? 'var(--success)' : 'var(--error)',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {feedback.isCorrect ? <CheckIcon size={14} /> : <XIcon size={14} />}
                                </div>
                                <span style={{ fontWeight: 700, color: feedback.isCorrect ? 'var(--success-dark)' : 'var(--error-dark)' }}>
                                    {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                                </span>
                            </div>
                            {!feedback.isCorrect && (
                                <p style={{ marginTop: '4px' }}>
                                    <span className="text-sm text-muted">Answer: </span>
                                    <span style={{ fontWeight: 700 }}>{typeof q.answer === 'boolean' ? (q.answer ? 'True' : 'False') : q.answer}</span>
                                </p>
                            )}
                            <button className="btn btn-primary mt-md" style={{ width: '100%' }} onClick={goNext} autoFocus>
                                {currentQ < questions.length - 1 ? 'Next' : 'See Results'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
