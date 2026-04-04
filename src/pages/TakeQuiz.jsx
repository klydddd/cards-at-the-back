import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQuiz, fetchDeck, saveQuiz, updateQuizResults } from '../lib/supabase';
import { CheckIcon, XIcon } from '../components/Icons';

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

export default function TakeQuiz() {
    const { quizId } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [deck, setDeck] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Quiz-taking state
    const [started, setStarted] = useState(false);
    const [creatorName, setCreatorName] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [currentInput, setCurrentInput] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newQuizId, setNewQuizId] = useState(null);

    useEffect(() => {
        fetchQuiz(quizId)
            .then(async (q) => {
                setQuiz(q);
                setQuestions(q.questions || []);
                const d = await fetchDeck(q.deck_id);
                setDeck(d);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [quizId]);

    const startQuiz = () => setStarted(true);

    const submitAnswer = (overrideAnswer = null) => {
        if (feedback) return;
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const q = questions[currentQ];
        const isCorrect = checkAnswer(q, finalAnswer);

        setAnswers(prev => ({ ...prev, [currentQ]: finalAnswer }));
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
    };

    const goNext = async () => {
        setFeedback(null);
        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
        } else {
            setShowResults(true);

            // Save this attempt as a new quiz
            setSaving(true);
            const finalAnswers = { ...answers };
            let score = 0;
            questions.forEach((q, i) => {
                if (checkAnswer(q, finalAnswers[i])) score++;
            });

            try {
                const saved = await saveQuiz(
                    quiz.deck_id,
                    creatorName.trim() || 'Anonymous',
                    questions,
                    quiz.question_types,
                    quiz.subject || deck?.subject || ''
                );
                setNewQuizId(saved.id);
                await updateQuizResults(saved.id, finalAnswers, score);
            } catch (err) {
                console.error('Failed to save attempt:', err);
            }
            setSaving(false);
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
                    <Link to="/" className="btn btn-secondary">Go Home</Link>
                </div>
            </div>
        );

    // ── Pre-start screen ──
    if (!started) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '560px' }}>
                    <Link to="/" className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px', marginBottom: '16px' }}>
                        ← Home
                    </Link>
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <h1 className="mb-sm" style={{ fontSize: '1.8rem' }}>{deck?.title}</h1>
                        <p className="text-muted mb-md">Quiz by {quiz.creator_name}</p>

                        <div className="flex-center gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
                            <span className="badge">{questions.length} questions</span>
                            {quiz.question_types.map(t => (
                                <span key={t} className="badge">{t.replace('_', ' ')}</span>
                            ))}
                        </div>

                        <div className="field">
                            <label className="label">Your Name</label>
                            <input
                                className="input"
                                placeholder="Anonymous"
                                value={creatorName}
                                onChange={(e) => setCreatorName(e.target.value)}
                                style={{ textAlign: 'center' }}
                            />
                        </div>

                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startQuiz}>
                            Start Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Results ──
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
                                            <span className="text-sm text-muted block mb-sm">Correct Answer:</span>
                                            <p className="bold">{Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-lg mb-md">
                        <p className="text-sm text-muted">Score</p>
                        <p style={{ fontSize: '2rem', fontWeight: 800 }}>{score} / {questions.length}</p>
                    </div>

                    <div className="mt-md flex-center gap-md" style={{ flexWrap: 'wrap' }}>
                        <Link to={`/deck/${quiz.deck_id}`} className="btn btn-secondary">
                            View Deck
                        </Link>
                        <Link to="/" className="btn btn-primary">
                            Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Taking the quiz ──
    const q = questions[currentQ];

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                <div className="mb-lg flex-between">
                    <Link to="/" className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        Quit
                    </Link>
                    <span className="text-sm bold">Question {currentQ + 1} of {questions.length}</span>
                </div>

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
                                        <button key={i} className="btn btn-secondary" style={optStyle} onClick={() => submitAnswer(opt)} disabled={!!feedback}>
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
                                        <button key={String(val)} className="btn btn-secondary" style={btnStyle} onClick={() => submitAnswer(val)} disabled={!!feedback}>
                                            {val ? 'True' : 'False'}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {(q.type === 'identification' || q.type === 'situational') && (
                            <div>
                                <input type="text" className="input" autoFocus placeholder="Type your answer here..." value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !feedback && submitAnswer()} disabled={!!feedback} />
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
                                <textarea className="textarea" autoFocus placeholder="Item 1, Item 2, Item 3..." value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} rows={3} disabled={!!feedback} />
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

                    {/* Instant Feedback */}
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
                                <div style={{ marginTop: '4px' }}>
                                    <span className="text-sm text-muted">Correct answer: </span>
                                    <span style={{ fontWeight: 700 }}>{Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}</span>
                                </div>
                            )}
                            <button className="btn btn-primary mt-md" style={{ width: '100%' }} onClick={goNext} autoFocus>
                                {currentQ < questions.length - 1 ? 'Next Question' : 'See Results'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
