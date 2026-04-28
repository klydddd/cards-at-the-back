"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards, saveQuiz } from '@/lib/supabase';
import { generateQuizFromCards } from '@/lib/quizGenerator';
import { gradeQuizAttempt, isAnswerCorrect } from '@/lib/quizGrading';
import { CheckIcon, XIcon } from '@/components/Icons';
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
                    <div className="mb-md">
                        <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                            ← Back to Deck
                        </Link>
                    </div>
                    <h1 className="mb-sm">Quiz: {deck?.title}</h1>
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
                    <div className="text-center mb-lg">
                        <h1>Quiz Completed</h1>
                        <p className="text-muted mt-sm">Review your answers, then publish this exact question set if you want a public challenge.</p>
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
                                <div key={index} className="card" style={{ borderLeftWidth: isCorrect ? 1.5 : 4, borderLeftColor: isCorrect ? 'var(--border)' : 'var(--warning)' }}>
                                    <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{question.type.replace('_', ' ')}</div>
                                    {question.scenario && <p className="mb-sm light" style={{ fontStyle: 'italic' }}>{question.scenario}</p>}
                                    <p className="bold mb-md" style={{ fontSize: '1.1rem' }}>{question.question}</p>
                                    <div className="flex gap-md mb-sm" style={{ flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Your Answer:</span>
                                            <p>{Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer !== undefined && userAnswer !== '' ? String(userAnswer) : 'Skipped')}</p>
                                        </div>
                                        <div style={{ flex: 1, background: isCorrect ? 'var(--success-light)' : 'var(--warning-light)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Correct Answer:</span>
                                            <p className="bold">{Array.isArray(question.answer) ? question.answer.join(', ') : String(question.answer)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-lg mb-md">
                        <p className="text-sm text-muted">Score</p>
                        <p style={{ fontSize: '2rem', fontWeight: 800 }}>{score} / {questionCount}</p>
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
                    <div className="mb-md">
                        <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                            ← Back to Deck
                        </Link>
                    </div>

                    <div className="text-center mb-lg">
                        <h1 className="mb-sm">Quiz Ready</h1>
                        <p className="text-muted">{deck?.title}</p>
                    </div>

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
            <div className="container" style={{ maxWidth: '640px' }}>
                <div className="mb-lg flex-between">
                    <button className="btn btn-ghost btn-sm" onClick={resetQuiz} style={{ marginLeft: '-16px' }}>
                        Quit
                    </button>
                    <span className="text-sm bold">Question {currentQ + 1} of {questions.length}</span>
                </div>

                <div className="mb-lg" style={{ height: '3px', background: 'var(--border)', borderRadius: '100px' }}>
                    <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'var(--primary)', borderRadius: '100px', transition: 'width 0.3s ease' }}></div>
                </div>

                <div className="card mb-lg" style={{ padding: '32px' }}>
                    <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {question.type.replace('_', ' ')}
                    </div>

                    {question.scenario && <p className="mb-md light" style={{ fontSize: '1.05rem', fontStyle: 'italic', paddingLeft: '12px', borderLeft: '2px solid var(--border-hover)' }}>{question.scenario}</p>}

                    <h2 className="mb-lg" style={{ fontSize: '1.4rem' }}>{question.question}</h2>

                    <div style={{ marginTop: '24px' }}>
                        {question.type === 'multiple_choice' && (
                            <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                                {(question.options || []).map((option, index) => (
                                    <button
                                        key={`${currentQ}-${index}`}
                                        className="btn btn-secondary"
                                        style={{
                                            justifyContent: 'flex-start',
                                            textAlign: 'left',
                                            padding: '16px',
                                            fontWeight: 400,
                                            ...(feedback && option === question.answer ? { background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)', fontWeight: 600 } : {}),
                                            ...(feedback && option === feedback.userAnswer && !feedback.isCorrect ? { background: 'var(--error-light)', borderColor: 'var(--error)', color: 'var(--error-dark)' } : {}),
                                            ...(feedback && option !== question.answer && option !== feedback.userAnswer ? { opacity: 0.4 } : {}),
                                        }}
                                        onClick={() => submitAnswer(option)}
                                        disabled={!!feedback}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}

                        {question.type === 'true_false' && (
                            <div className="flex gap-md">
                                {[true, false].map((value) => (
                                    <button
                                        key={`${currentQ}-${String(value)}`}
                                        className="btn btn-secondary"
                                        style={{
                                            flex: 1,
                                            padding: '24px',
                                            ...(feedback && value === question.answer ? { background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)', fontWeight: 700 } : {}),
                                            ...(feedback && value === feedback.userAnswer && !feedback.isCorrect ? { background: 'var(--error-light)', borderColor: 'var(--error)', color: 'var(--error-dark)' } : {}),
                                            ...(feedback && value !== question.answer && value !== feedback.userAnswer ? { opacity: 0.4 } : {}),
                                        }}
                                        onClick={() => submitAnswer(value)}
                                        disabled={!!feedback}
                                    >
                                        {value ? 'True' : 'False'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {(question.type === 'identification' || question.type === 'situational') && (
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
                                {!feedback && <div className="mt-md text-right">
                                    <button className="btn btn-primary" onClick={() => submitAnswer()}>Submit</button>
                                </div>}
                            </div>
                        )}

                        {question.type === 'enumeration' && (
                            <div>
                                <p className="text-sm text-muted mb-sm">Separate your answers with commas.</p>
                                <textarea
                                    className="textarea"
                                    autoFocus
                                    placeholder="Item 1, Item 2, Item 3..."
                                    value={currentInput}
                                    onChange={(e) => setCurrentInput(e.target.value)}
                                    rows={3}
                                    disabled={!!feedback}
                                />
                                {!feedback && <div className="mt-md text-right">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            const answerList = currentInput.split(',').map((item) => item.trim()).filter(Boolean);
                                            submitAnswer(answerList.length ? answerList : '');
                                        }}
                                    >
                                        Submit
                                    </button>
                                </div>}
                            </div>
                        )}
                    </div>

                    {feedback && (
                        <div style={{
                            marginTop: '24px',
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-md)',
                            background: feedback.isCorrect ? 'var(--success-light)' : 'var(--error-light)',
                            border: `1.5px solid ${feedback.isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`,
                        }}>
                            <div className="flex gap-sm" style={{ alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: feedback.isCorrect ? 'var(--success)' : 'var(--error)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {feedback.isCorrect ? <CheckIcon size={14} /> : <XIcon size={14} />}
                                </div>
                                <span style={{ fontWeight: 700, color: feedback.isCorrect ? 'var(--success-dark)' : 'var(--error-dark)' }}>
                                    {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-muted">Correct answer: </span>
                                <span style={{ fontWeight: 700 }}>
                                    {Array.isArray(question.answer) ? question.answer.join(', ') : String(question.answer)}
                                </span>
                            </div>
                            <button
                                className="btn btn-primary mt-md"
                                style={{ width: '100%' }}
                                onClick={() => goToNextQuestion({ ...answers })}
                                autoFocus
                            >
                                {currentQ < questions.length - 1 ? 'Next Question' : 'See Results'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
