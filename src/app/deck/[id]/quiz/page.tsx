"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards, saveQuiz, updateQuizResults } from '@/lib/supabase';
import { generateQuizFromCards } from '@/lib/quizGenerator';
import { CheckIcon, XIcon } from '@/components/Icons';

const QUESTION_TYPES = [
    { id: 'multiple_choice', label: 'Multiple Choice' },
    { id: 'true_false', label: 'True / False' },
    { id: 'identification', label: 'Identification' },
    { id: 'enumeration', label: 'Enumeration' },
    { id: 'situational', label: 'Situational' },
];

function checkAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === '') return false;
    if (typeof question.answer === 'string' && typeof userAnswer === 'string') {
        return userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    }
    if (typeof question.answer === 'boolean') {
        return userAnswer === question.answer;
    }
    return false;
}

export default function Quiz() {
    const { id } = useParams();
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Setup state
    const [typeCounts, setTypeCounts] = useState({
        multiple_choice: 2,
        true_false: 2,
        identification: 1,
        enumeration: 0,
        situational: 0,
    });
    const [creatorName, setCreatorName] = useState('');
    const [generating, setGenerating] = useState(false);

    // Quiz state
    const [quizId, setQuizId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [currentInput, setCurrentInput] = useState('');

    // Feedback state
    const [feedback, setFeedback] = useState(null); // { userAnswer, isCorrect } or null

    // Results
    const [showResults, setShowResults] = useState(false);
    const [saving, setSaving] = useState(false);

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
            const otherTotal = Object.entries(prev).reduce((sum, [k, v]) => k === typeId ? sum : sum + v, 0);
            if (otherTotal + newVal > TOTAL_LIMIT) return prev;
            return { ...prev, [typeId]: newVal };
        });
    };

    const startGenerating = async () => {
        if (totalQuestions === 0) {
            setError('Add at least one question.');
            return;
        }
        setError(null);
        setGenerating(true);

        try {
            const qs = await generateQuizFromCards(cards, typeCounts);
            setQuestions(qs);
            setCurrentQ(0);
            setAnswers({});
            setShowResults(false);
            setFeedback(null);

            try {
                const saved = await saveQuiz(id, creatorName.trim() || 'Anonymous', qs, activeTypes, deck?.subject || '');
                setQuizId(saved.id);
            } catch (saveErr) {
                console.error('Failed to save quiz:', saveErr);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    // Step 1: Submit answer → show feedback
    const submitAnswer = (overrideAnswer = null) => {
        if (feedback) return; // already showing feedback
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const q = questions[currentQ];
        const isCorrect = checkAnswer(q, finalAnswer);

        setAnswers(prev => ({ ...prev, [currentQ]: finalAnswer }));
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
    };

    // Step 2: Dismiss feedback → go to next question or results
    const goNext = async () => {
        setFeedback(null);
        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
        } else {
            setShowResults(true);

            // Save results
            if (quizId) {
                setSaving(true);
                const finalAnswers = { ...answers };
                let score = 0;
                questions.forEach((q, i) => {
                    if (checkAnswer(q, finalAnswers[i])) score++;
                });
                try {
                    await updateQuizResults(quizId, finalAnswers, score);
                } catch (err) {
                    console.error('Failed to save quiz results:', err);
                }
                setSaving(false);
            }
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

    if (error && !generating && questions.length === 0)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error}</div>
                    <Link href={`/deck/${id}`} className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    // ── Phase 1: Setup ──
    if (questions.length === 0) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <div className="mb-md">
                        <Link href={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                            ← Back to Deck
                        </Link>
                    </div>
                    <h1 className="mb-sm">Quiz: {deck.title}</h1>
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
                            <label className="label">Your Name</label>
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

    // ── Phase 3: Results ──
    if (showResults) {
        let score = 0;

        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '720px' }}>
                    <div className="text-center mb-lg">
                        <h1>Quiz Completed</h1>
                        <p className="text-muted mt-sm">
                            {saving ? 'Saving results...' : 'Your answers have been saved.'}
                        </p>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                        {questions.map((q, i) => {
                            const userAnswer = answers[i];
                            const exactMatch = checkAnswer(q, userAnswer);
                            if (exactMatch) score++;

                            return (
                                <div key={i} className="card" style={{ borderLeftWidth: exactMatch ? 1.5 : 4, borderLeftColor: exactMatch ? 'var(--border)' : 'var(--warning)' }}>
                                    <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{q.type.replace('_', ' ')}</div>
                                    {q.scenario && <p className="mb-sm light" style={{ fontStyle: 'italic' }}>{q.scenario}</p>}
                                    <p className="bold mb-md" style={{ fontSize: '1.1rem' }}>{q.question}</p>
                                    <div className="flex gap-md mb-sm" style={{ flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Your Answer:</span>
                                            <p>{Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer !== undefined && userAnswer !== '' ? String(userAnswer) : 'Skipped')}</p>
                                        </div>
                                        <div style={{ flex: 1, background: exactMatch ? 'var(--success-light)' : 'var(--warning-light)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Expected Answer:</span>
                                            <p className="bold">{Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-lg mb-md">
                        <p className="text-sm text-muted">Auto-graded score (exact match only)</p>
                        <p style={{ fontSize: '2rem', fontWeight: 800 }}>{score} / {questions.length}</p>
                    </div>

                    <div className="mt-md flex-center gap-md" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => { setQuestions([]); setQuizId(null); }}>
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

    // ── Phase 2: Taking Quiz ──
    const q = questions[currentQ];

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                <div className="mb-lg flex-between">
                    <button className="btn btn-ghost btn-sm" onClick={() => setQuestions([])} style={{ marginLeft: '-16px' }}>
                        Quit
                    </button>
                    <span className="text-sm bold">Question {currentQ + 1} of {questions.length}</span>
                </div>

                {/* Progress bar */}
                <div className="mb-lg" style={{ height: '3px', background: 'var(--border)', borderRadius: '100px' }}>
                    <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'var(--primary)', borderRadius: '100px', transition: 'width 0.3s ease' }}></div>
                </div>

                <div className="card mb-lg" style={{ padding: '32px' }}>
                    <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {q.type.replace('_', ' ')}
                    </div>

                    {q.scenario && <p className="mb-md light" style={{ fontSize: '1.05rem', fontStyle: 'italic', paddingLeft: '12px', borderLeft: '2px solid var(--border-hover)' }}>{q.scenario}</p>}

                    <h2 className="mb-lg" style={{ fontSize: '1.4rem' }}>{q.question}</h2>

                    <div style={{ marginTop: '24px' }}>
                        {q.type === 'multiple_choice' && (
                            <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                                {q.options.map((opt, i) => {
                                    let optStyle = { justifyContent: 'flex-start', textAlign: 'left', padding: '16px', fontWeight: 400 };

                                    if (feedback) {
                                        if (opt === q.answer) {
                                            optStyle = { ...optStyle, background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)', fontWeight: 600 };
                                        } else if (opt === feedback.userAnswer && !feedback.isCorrect) {
                                            optStyle = { ...optStyle, background: 'var(--error-light)', borderColor: 'var(--error)', color: 'var(--error-dark)' };
                                        } else {
                                            optStyle = { ...optStyle, opacity: 0.4 };
                                        }
                                    }

                                    return (
                                        <button
                                            key={`${currentQ}-${i}`}
                                            className="btn btn-secondary"
                                            style={optStyle}
                                            onClick={() => submitAnswer(opt)}
                                            disabled={!!feedback}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {q.type === 'true_false' && (
                            <div className="flex gap-md">
                                {[true, false].map(val => {
                                    let btnStyle = { flex: 1, padding: '24px' };

                                    if (feedback) {
                                        if (val === q.answer) {
                                            btnStyle = { ...btnStyle, background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)', fontWeight: 700 };
                                        } else if (val === feedback.userAnswer && !feedback.isCorrect) {
                                            btnStyle = { ...btnStyle, background: 'var(--error-light)', borderColor: 'var(--error)', color: 'var(--error-dark)' };
                                        } else {
                                            btnStyle = { ...btnStyle, opacity: 0.4 };
                                        }
                                    }

                                    return (
                                        <button
                                            key={`${currentQ}-${String(val)}`}
                                            className="btn btn-secondary"
                                            style={btnStyle}
                                            onClick={() => submitAnswer(val)}
                                            disabled={!!feedback}
                                        >
                                            {val ? 'True' : 'False'}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {(q.type === 'identification' || q.type === 'situational') && (
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

                        {q.type === 'enumeration' && (
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
                                {!feedback && (
                                    <div className="mt-md text-right">
                                        <button className="btn btn-primary" onClick={() => {
                                            const ansArray = currentInput.split(',').map(s => s.trim()).filter(s => s);
                                            submitAnswer(ansArray.length ? ansArray : '');
                                        }}>Submit</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Instant Feedback Banner ── */}
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

                            {!feedback.isCorrect && (
                                <div style={{ marginTop: '4px' }}>
                                    <span className="text-sm text-muted">Correct answer: </span>
                                    <span style={{ fontWeight: 700 }}>
                                        {Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}
                                    </span>
                                </div>
                            )}

                            <button
                                className="btn btn-primary mt-md"
                                style={{ width: '100%' }}
                                onClick={goNext}
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
