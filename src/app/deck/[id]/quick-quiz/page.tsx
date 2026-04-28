"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards, saveQuiz } from '@/lib/supabase';
import { generateQuickQuiz } from '@/lib/mcqGenerator';
import { gradeQuizAttempt, isAnswerCorrect } from '@/lib/quizGrading';
import type { Card, Deck, Quiz, QuizQuestion } from '@/types';

const QUIZ_TYPES = [
    { id: 'multiple_choice' as const, label: 'Multiple Choice', minCards: 4 },
    { id: 'true_false' as const, label: 'True or False', minCards: 2 },
    { id: 'identification' as const, label: 'Identification', minCards: 1 },
];

export default function MCQuiz() {
    const { id } = useParams<{ id: string }>();
    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [started, setStarted] = useState(false);
    const [creatorName, setCreatorName] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [publishedQuiz, setPublishedQuiz] = useState<Quiz | null>(null);
    const [copiedShareLink, setCopiedShareLink] = useState(false);

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | boolean | string[]>>({});
    const [currentInput, setCurrentInput] = useState('');
    const [showResults, setShowResults] = useState(false);

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
            const generatedQuestions = generateQuickQuiz(cards, type);
            setQuestions(generatedQuestions);
            setSelectedType(type);
            setCurrentQ(0);
            setAnswers({});
            setCurrentInput('');
            setShowResults(false);
            setStarted(true);
            setPublishedQuiz(null);
            setCopiedShareLink(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const restart = () => {
        setStarted(false);
        setQuestions([]);
        setError(null);
        setPublishedQuiz(null);
        setCopiedShareLink(false);
    };

    const retryWithSameType = () => {
        if (selectedType) startQuiz(selectedType as any);
    };

    const submitAnswer = (overrideAnswer = null) => {
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const nextAnswers = { ...answers, [currentQ]: finalAnswer };
        setAnswers(nextAnswers);
        setCurrentInput('');

        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
            return;
        }

        setShowResults(true);
    };

    const publishChallenge = async () => {
        if (publishedQuiz || !selectedType) return;

        setPublishing(true);
        setError(null);

        try {
            const savedQuiz = await saveQuiz(
                id,
                creatorName.trim() || 'Anonymous',
                questions,
                [selectedType],
                deck?.subject || '',
                'quick'
            );
            setPublishedQuiz(savedQuiz);
        } catch (err) {
            setError(err.message);
        } finally {
            setPublishing(false);
        }
    };

    const copyShareLink = async () => {
        if (!publishedQuiz) return;

        await navigator.clipboard.writeText(`${window.location.origin}/take/${publishedQuiz.id}`);
        setCopiedShareLink(true);
        window.setTimeout(() => setCopiedShareLink(false), 2000);
    };

    if (loading)
        return (
            <div className="page">
                <div className="loading-center">
                    <div className="spinner spinner-lg"></div>
                </div>
            </div>
        );

    if (error && !started)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error}</div>
                    <Link href={`/deck/${id}`} className="btn btn-secondary mt-md">Go Back</Link>
                </div>
            </div>
        );

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

                    <div className="card mb-lg">
                        <div className="field" style={{ marginBottom: 0 }}>
                            <label className="label">Challenge Creator Name</label>
                            <input
                                className="input"
                                placeholder="Anonymous"
                                value={creatorName}
                                onChange={(e) => setCreatorName(e.target.value)}
                            />
                        </div>
                    </div>

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
                        Generate a fixed quick quiz, then publish it as a competitive challenge if you want to share it.
                    </p>
                </div>
            </div>
        );
    }

    if (showResults) {
        const { score, questionCount } = gradeQuizAttempt(questions, answers);

        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <div className="text-center mb-lg">
                        <h1 className="mb-sm">Quick Quiz Complete!</h1>
                        <p className="text-muted">{deck?.title}</p>
                    </div>

                    {error && <div className="error-box mb-md">{error}</div>}

                    {publishedQuiz ? (
                        <div className="card mb-lg" style={{ padding: '24px', background: 'var(--success-light)' }}>
                            <p className="bold mb-sm">Challenge published</p>
                            <p className="text-sm text-muted mb-md">Share this fixed quick quiz so other players can compete on the same question set.</p>
                            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                <Link href={`/take/${publishedQuiz.id}`} className="btn btn-primary">
                                    Open Challenge
                                </Link>
                                <button className="btn btn-secondary" onClick={copyShareLink}>
                                    {copiedShareLink ? 'Link Copied' : 'Copy Share Link'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="card mb-lg" style={{ padding: '24px' }}>
                            <p className="bold mb-sm">Publish this quick quiz as a challenge</p>
                            <p className="text-sm text-muted mb-md">Publishing saves this exact shuffled question set and creates a public competition link.</p>
                            <button className="btn btn-primary" onClick={publishChallenge} disabled={publishing}>
                                {publishing ? 'Publishing...' : 'Publish Challenge'}
                            </button>
                        </div>
                    )}

                    <div className="card text-center mb-lg" style={{ padding: '32px' }}>
                        <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Your Score</p>
                        <p style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1 }}>
                            {score}<span style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--text-faint)' }}>/{questionCount}</span>
                        </p>
                        <p className="text-sm text-muted mt-sm">
                            {score === questionCount ? 'Perfect!' : score >= questionCount * 0.7 ? 'Great job!' : 'Keep practicing!'}
                        </p>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                        {questions.map((question, index) => {
                            const userAnswer = answers[index];
                            const correct = isAnswerCorrect(question, userAnswer);
                            return (
                                <div key={index} className="card" style={{ padding: '16px 20px', borderLeftWidth: correct ? 1.5 : 4, borderLeftColor: correct ? 'var(--success)' : 'var(--warning)' }}>
                                    <p className="text-sm text-muted light mb-sm">{question.question}</p>
                                    <div className="flex gap-md">
                                        <div>
                                            <span className="text-sm text-muted">You: </span>
                                            <span style={{ fontWeight: correct ? 700 : 400, color: correct ? 'var(--success-dark)' : 'var(--error-dark)' }}>
                                                {typeof userAnswer === 'boolean' ? (userAnswer ? 'True' : 'False') : (userAnswer || 'Skipped')}
                                            </span>
                                        </div>
                                        {!correct && (
                                            <div>
                                                <span className="text-sm text-muted">Answer: </span>
                                                <span style={{ fontWeight: 700 }}>
                                                    {typeof question.answer === 'boolean' ? (question.answer ? 'True' : 'False') : question.answer}
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

    const question = questions[currentQ];

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

                <div className="card" style={{ padding: '32px' }}>
                    <p className="text-sm text-muted light mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {question.type === 'multiple_choice' ? 'What is the term?' : question.type === 'true_false' ? 'True or False?' : 'Identify the term'}
                    </p>
                    <h2 className="mb-lg" style={{ fontSize: '1.3rem', fontWeight: 400, lineHeight: 1.5 }}>{question.question}</h2>

                    <div style={{ marginTop: '24px' }}>
                        {question.type === 'multiple_choice' && (
                            <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                                {(question.options || []).map((option, index) => (
                                    <button key={index} className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '16px', fontWeight: 500 }} onClick={() => submitAnswer(option)}>
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}

                        {question.type === 'true_false' && (
                            <div className="flex gap-md">
                                {[true, false].map(value => (
                                    <button key={String(value)} className="btn btn-secondary" style={{ flex: 1, padding: '24px' }} onClick={() => submitAnswer(value)}>
                                        {value ? 'True' : 'False'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {question.type === 'identification' && (
                            <div>
                                <input
                                    type="text"
                                    className="input"
                                    autoFocus
                                    placeholder="Type your answer here..."
                                    value={currentInput}
                                    onChange={(e) => setCurrentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                                />
                                <div className="mt-md text-right">
                                    <button className="btn btn-primary" onClick={() => submitAnswer()}>Submit</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
