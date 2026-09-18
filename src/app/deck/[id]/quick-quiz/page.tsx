"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards, saveQuiz } from '@/lib/supabase';
import { generateQuickQuiz } from '@/lib/mcqGenerator';
import { gradeQuizAttempt, isAnswerCorrect } from '@/lib/quizGrading';
import { playSound, preloadSounds } from '@/lib/sounds';
import { ArrowLeftIcon } from '@/components/Icons';
import QuizQuestionView from '@/components/QuizQuestionView';
import type { Card, Deck, Quiz, QuizQuestion, QuizQuestionType } from '@/types';

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
    const [feedback, setFeedback] = useState<{ userAnswer: string | boolean | string[]; isCorrect: boolean } | null>(null);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        preloadSounds();
    }, []);

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
            setFeedback(null);
            setShowResults(false);
            setStarted(false);
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
        setFeedback(null);
        setPublishedQuiz(null);
        setCopiedShareLink(false);
    };

    const retryWithSameType = () => {
        if (selectedType) startQuiz(selectedType as any);
    };

    const goNext = () => {
        setFeedback(null);

        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
            return;
        }

        setShowResults(true);
    };

    const submitAnswer = (overrideAnswer: string | boolean | string[] | null = null) => {
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const isCorrect = isAnswerCorrect(question, finalAnswer);
        playSound(isCorrect ? 'correct' : 'wrong');
        const nextAnswers = { ...answers, [currentQ]: finalAnswer };
        setAnswers(nextAnswers);
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
    };

    const publishChallenge = async () => {
        if (publishedQuiz || !selectedType) return;

        setPublishing(true);
        setError(null);

        try {
            const savedQuiz = await saveQuiz({
                deckId: id,
                creatorName: creatorName.trim() || 'Anonymous',
                questions,
                questionTypes: [selectedType as QuizQuestionType],
                subject: deck?.subject || '',
                sourceKind: 'quick',
            });
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

    const beginQuiz = () => {
        setStarted(true);
        setCurrentQ(0);
        setCurrentInput('');
        setFeedback(null);
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

    if (questions.length === 0) {
        return (
            <div className="page">
                <div className="container container-sm">
                    <Link href={`/deck/${id}`} className="session-back" style={{ marginBottom: 'var(--space-md)' }}>
                        <ArrowLeftIcon size={16} /> {deck?.title}
                    </Link>

                    <span className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>{cards.length} kards · no AI</span>
                    <h1 className="deck-title mb-lg">Quick quiz</h1>

                    <div className="index-card mb-lg" style={{ padding: '20px 22px' }}>
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
                    <div className="option-list">
                        {QUIZ_TYPES.map((type, index) => {
                            const disabled = cards.length < type.minCards;
                            return (
                                <button
                                    key={type.id}
                                    className={`option-row ${disabled ? 'is-dim' : ''}`}
                                    onClick={() => startQuiz(type.id)}
                                    disabled={disabled}
                                >
                                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                    <span className="option-label">{type.label}</span>
                                    {disabled && <span className="option-tag">Need {type.minCards}+ kards</span>}
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

    if (!started) {
        return (
            <div className="page">
                <div className="container container-md">
                    <Link href={`/deck/${id}`} className="session-back" style={{ marginBottom: 'var(--space-md)' }}>
                        <ArrowLeftIcon size={16} /> {deck?.title}
                    </Link>

                    <span className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>
                        {questions.length} questions · {(selectedType || 'quick quiz').replace('_', ' ')}
                    </span>
                    <h1 className="deck-title mb-lg">Quiz ready</h1>

                    {error && <div className="error-box mb-md">{error}</div>}

                    {publishedQuiz ? (
                        <div className="card mb-lg" style={{ padding: 'var(--space-lg)', background: 'var(--success-light)' }}>
                            <p className="bold mb-sm">Challenge published</p>
                            <p className="text-sm text-muted mb-md">This fixed quick quiz is now shareable before you start taking it.</p>
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
                        <div className="card mb-lg" style={{ padding: 'var(--space-lg)' }}>
                            <p className="bold mb-sm">Publish this quick quiz as a challenge</p>
                            <p className="text-sm text-muted mb-md">Publish the generated question set now, then start taking the same quiz locally.</p>
                            <button className="btn btn-primary" onClick={publishChallenge} disabled={publishing}>
                                {publishing ? 'Publishing...' : 'Publish Challenge'}
                            </button>
                        </div>
                    )}

                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={beginQuiz}>
                        Start Quiz
                    </button>
                </div>
            </div>
        );
    }

    if (showResults) {
        const { score, questionCount } = gradeQuizAttempt(questions, answers);

        return (
            <div className="page">
                <div className="container container-md">
                    <div className="quiz-score mb-lg">
                        <span className="eyebrow">Quiz complete · {deck?.title}</span>
                        <div className="quiz-score-value">
                            {score}<span>/{questionCount}</span>
                        </div>
                        <p>{score === questionCount ? 'Perfect score.' : score >= questionCount * 0.7 ? 'Nicely done.' : 'Keep practicing.'}</p>
                    </div>

                    {error && <div className="error-box mb-md">{error}</div>}

                    {publishedQuiz ? (
                        <div className="card mb-lg" style={{ padding: 'var(--space-lg)', background: 'var(--success-light)' }}>
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
                        <div className="card mb-lg" style={{ padding: 'var(--space-lg)' }}>
                            <p className="bold mb-sm">Publish this quick quiz as a challenge</p>
                            <p className="text-sm text-muted mb-md">Publishing saves this exact shuffled question set and creates a public competition link.</p>
                            <button className="btn btn-primary" onClick={publishChallenge} disabled={publishing}>
                                {publishing ? 'Publishing...' : 'Publish Challenge'}
                            </button>
                        </div>
                    )}

                    <div className="flex" style={{ flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' }}>
                        {questions.map((question, index) => {
                            const userAnswer = answers[index];
                            const correct = isAnswerCorrect(question, userAnswer);
                            return (
                                <div key={index} className="index-card">
                                    <div className="index-card-head">
                                        <span>Question {index + 1}</span>
                                        <span className={correct ? 'quiz-verdict-correct' : 'quiz-verdict-wrong'}>{correct ? 'Correct' : 'Missed'}</span>
                                    </div>
                                    <div className="index-card-body">
                                    <p style={{ color: 'var(--text)' }}>{question.question}</p>
                                    <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
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
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: 'var(--space-xs)' }}>
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
            <div className="container">
                <QuizQuestionView
                    questions={questions}
                    currentQ={currentQ}
                    answers={answers}
                    feedback={feedback}
                    currentInput={currentInput}
                    onInputChange={setCurrentInput}
                    onSubmit={(answer) => submitAnswer(answer ?? null)}
                    onNext={goNext}
                    eyebrow={question.type === 'multiple_choice' ? 'What is the term?' : question.type === 'true_false' ? 'True or false?' : 'Identify the term'}
                    quit={<button className="session-back session-quit" onClick={restart}>Quit</button>}
                />
            </div>
        </div>
    );
}
