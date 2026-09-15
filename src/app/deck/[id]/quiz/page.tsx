"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards, saveQuiz } from '@/lib/supabase';
import { generateQuizFromCards } from '@/lib/quizGenerator';
import { gradeQuizAttempt, isAnswerCorrect } from '@/lib/quizGrading';
import { ArrowLeftIcon } from '@/components/Icons';
import QuizQuestionView, { formatAnswer } from '@/components/QuizQuestionView';
import type { Card, Deck, Quiz, QuizQuestion } from '@/types';

const QUESTION_TYPES = [
    { id: 'multiple_choice', label: 'Multiple Choice' },
    { id: 'true_false', label: 'True / False' },
    { id: 'identification', label: 'Identification' },
    { id: 'enumeration', label: 'Enumeration' },
    { id: 'situational', label: 'Situational' },
];

export default function Quiz() {
    const { id } = useParams<{ id: string }>();
    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [typeCounts, setTypeCounts] = useState({
        multiple_choice: 2,
        true_false: 2,
        identification: 1,
        enumeration: 0,
        situational: 0,
    });
    const [creatorName, setCreatorName] = useState('');
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishedQuiz, setPublishedQuiz] = useState<Quiz | null>(null);
    const [copiedShareLink, setCopiedShareLink] = useState(false);
    const [started, setStarted] = useState(false);

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | boolean | string[]>>({});
    const [currentInput, setCurrentInput] = useState('');
    const [feedback, setFeedback] = useState<{ userAnswer: string | boolean | string[]; isCorrect: boolean } | null>(null);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        Promise.all([fetchDeck(id), fetchCards(id)])
            .then(([d, c]) => {
                setDeck(d);
                setCards(c);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const TOTAL_LIMIT = 50;
    const totalQuestions = Object.values(typeCounts).reduce((sum, n) => sum + n, 0);
    const remaining = TOTAL_LIMIT - totalQuestions;
    const activeTypes = Object.entries(typeCounts).filter(([, count]) => count > 0).map(([type]) => type);

    const updateCount = (typeId, delta) => {
        setTypeCounts(prev => {
            const newVal = prev[typeId] + delta;
            if (newVal < 0) return prev;
            const otherTotal = Object.entries(prev).reduce((sum, [key, value]) => key === typeId ? sum : sum + value, 0);
            if (otherTotal + newVal > TOTAL_LIMIT) return prev;
            return { ...prev, [typeId]: newVal };
        });
    };

    const resetQuiz = () => {
        setQuestions([]);
        setCurrentQ(0);
        setAnswers({});
        setCurrentInput('');
        setFeedback(null);
        setShowResults(false);
        setStarted(false);
        setPublishedQuiz(null);
        setCopiedShareLink(false);
    };

    const startGenerating = async () => {
        if (totalQuestions === 0) {
            setError('Add at least one question.');
            return;
        }

        setError(null);
        setGenerating(true);

        try {
            const generatedQuestions = await generateQuizFromCards(cards, typeCounts);
            setQuestions(generatedQuestions);
            setCurrentQ(0);
            setAnswers({});
            setCurrentInput('');
            setFeedback(null);
            setStarted(false);
            setShowResults(false);
            setPublishedQuiz(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const goToNextQuestion = (nextAnswers) => {
        setFeedback(null);

        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
            setCurrentInput('');
            return;
        }

        setAnswers(nextAnswers);
        setCurrentInput('');
        setShowResults(true);
    };

    const submitAnswer = (overrideAnswer: string | boolean | string[] | null = null) => {
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const isCorrect = isAnswerCorrect(questions[currentQ], finalAnswer);
        const nextAnswers = { ...answers, [currentQ]: finalAnswer };
        setAnswers(nextAnswers);
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
    };

    const publishChallenge = async () => {
        if (publishedQuiz) return;

        setPublishing(true);
        setError(null);

        try {
            const savedQuiz = await saveQuiz(
                id,
                creatorName.trim() || 'Anonymous',
                questions,
                activeTypes,
                deck?.subject || '',
                'ai'
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

    const startQuiz = () => {
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

    if (error && !generating && questions.length === 0)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error}</div>
                    <Link href={`/deck/${id}`} className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    if (questions.length === 0) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <Link href={`/deck/${id}`} className="session-back" style={{ marginBottom: '20px' }}>
                        <ArrowLeftIcon size={16} /> {deck?.title}
                    </Link>
                    <span className="eyebrow eyebrow-purple" style={{ display: 'block', marginBottom: '10px' }}>AI quiz</span>
                    <h1 className="deck-title mb-sm">Build a quiz</h1>
                    <p className="mb-lg">Set how many questions you want per type.</p>

                    {error && <div className="error-box">{error}</div>}

                    <div className="card mb-lg">
                        <h3 className="mb-md">Questions per Type</h3>
                        <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
                            {QUESTION_TYPES.map(type => (
                                <div key={type.id} className="flex-between" style={{ padding: '8px 0' }}>
                                    <span style={{ fontWeight: 500 }}>{type.label}</span>
                                    <div className="flex-center gap-sm">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => updateCount(type.id, -1)}
                                            disabled={typeCounts[type.id] === 0}
                                            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', border: '1.5px solid var(--border)', fontWeight: 700, fontSize: '1.1rem' }}
                                        >
                                            −
                                        </button>
                                        <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                                            {typeCounts[type.id]}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => updateCount(type.id, 1)}
                                            disabled={typeCounts[type.id] >= 50 || totalQuestions >= TOTAL_LIMIT}
                                            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', border: '1.5px solid var(--border)', fontWeight: 700, fontSize: '1.1rem' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
                            <span className="text-sm text-muted">Total questions: </span>
                            <span className="bold">{totalQuestions}</span>
                            <span className="text-sm text-muted" style={{ marginLeft: '8px' }}>/ {TOTAL_LIMIT} max ({remaining} remaining)</span>
                        </div>
                    </div>

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

                    <button
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        onClick={startGenerating}
                        disabled={generating || totalQuestions === 0}
                    >
                        {generating ? (
                            <span className="flex-center gap-sm">
                                <span className="spinner"></span> Generating {totalQuestions} questions...
                            </span>
                        ) : (
                            `Generate Quiz (${totalQuestions} questions)`
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (showResults) {
        const { score, questionCount } = gradeQuizAttempt(questions, answers);

        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '720px' }}>
                    <div className="quiz-score mb-lg">
                        <span className="eyebrow eyebrow-purple">Quiz complete · {deck?.title}</span>
                        <div className="quiz-score-value">
                            {score}<span>/{questionCount}</span>
                        </div>
                        <p>Review your answers, then publish this exact question set if you want a public challenge.</p>
                    </div>

                    {error && <div className="error-box mb-md">{error}</div>}

                    {publishedQuiz ? (
                        <div className="card mb-lg" style={{ padding: '24px', background: 'var(--success-light)' }}>
                            <p className="bold mb-sm">Challenge published</p>
                            <p className="text-sm text-muted mb-md">Players can now compete for the best score on this fixed quiz.</p>
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
                            <p className="bold mb-sm">Publish this quiz as a challenge</p>
                            <p className="text-sm text-muted mb-md">Publishing creates a shareable link where other players can join the leaderboard on this exact question set.</p>
                            <button className="btn btn-primary" onClick={publishChallenge} disabled={publishing}>
                                {publishing ? 'Publishing...' : 'Publish Challenge'}
                            </button>
                        </div>
                    )}

                    <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                        {questions.map((question, index) => {
                            const userAnswer = answers[index];
                            const isCorrect = isAnswerCorrect(question, userAnswer);

                            return (
                                <div key={index} className="index-card">
                                    <div className="index-card-head">
                                        <span>{index + 1} · {question.type.replace('_', ' ')}</span>
                                        <span className={isCorrect ? 'quiz-verdict-correct' : 'quiz-verdict-wrong'}>{isCorrect ? 'Correct' : 'Missed'}</span>
                                    </div>
                                    <div className="index-card-body" style={{ gap: '12px' }}>
                                        {question.scenario && <p className="quiz-scenario">{question.scenario}</p>}
                                        <p style={{ color: 'var(--text)', fontSize: '1.0625rem' }}>{question.question}</p>
                                        <div className="answer-pair">
                                            <div className={`answer-cell ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                                                <span className="option-tag">Your answer</span>
                                                <span>{formatAnswer(userAnswer)}</span>
                                            </div>
                                            <div className="answer-cell">
                                                <span className="option-tag">Correct answer</span>
                                                <span style={{ fontWeight: 500 }}>{formatAnswer(question.answer)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-md flex-center gap-md" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={resetQuiz}>
                            New Quiz
                        </button>
                        <Link href={`/deck/${id}`} className="btn btn-primary">
                            Return to Deck
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!started) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '720px' }}>
                    <Link href={`/deck/${id}`} className="session-back" style={{ marginBottom: '20px' }}>
                        <ArrowLeftIcon size={16} /> {deck?.title}
                    </Link>
                    <span className="eyebrow eyebrow-purple" style={{ display: 'block', marginBottom: '10px' }}>AI quiz · {questions.length} questions</span>
                    <h1 className="deck-title mb-lg">Quiz ready</h1>

                    {error && <div className="error-box mb-md">{error}</div>}

                    {publishedQuiz ? (
                        <div className="card mb-lg" style={{ padding: '24px', background: 'var(--success-light)' }}>
                            <p className="bold mb-sm">Challenge published</p>
                            <p className="text-sm text-muted mb-md">This exact quiz is now shareable before you start taking it.</p>
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
                            <p className="bold mb-sm">Publish this quiz as a challenge</p>
                            <p className="text-sm text-muted mb-md">Publish the fixed question set now, then start taking the same quiz locally.</p>
                            <button className="btn btn-primary" onClick={publishChallenge} disabled={publishing}>
                                {publishing ? 'Publishing...' : 'Publish Challenge'}
                            </button>
                        </div>
                    )}

                    <div className="card mb-lg" style={{ padding: '24px' }}>
                        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <p className="text-sm text-muted">Question Count</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800 }}>{questions.length}</p>
                            </div>
                            <div className="flex gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {activeTypes.map((type) => (
                                    <span key={type} className="badge">
                                        {type.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startQuiz}>
                        Start Quiz
                    </button>
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
                    onNext={() => goToNextQuestion({ ...answers })}
                    eyebrow={`${deck?.title ?? ''} · ${question.type.replace('_', ' ')}`}
                    quit={<button className="session-back session-quit" onClick={resetQuiz}>Quit</button>}
                    error={error}
                />
            </div>
        </div>
    );
}
