"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchQuiz, fetchDeck, fetchQuizAttempts, submitQuizAttempt, type SubmittedQuizAttempt } from '@/lib/supabase';
import { gradeQuizAttempt, isAnswerCorrect } from '@/lib/quizGrading';
import { CheckIcon, XIcon } from '@/components/Icons';
import type { Deck, Quiz, QuizAttempt, QuizQuestion } from '@/types';

function formatElapsed(elapsedMs: number) {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function TakeQuiz() {
    const { quizId } = useParams<{ quizId: string }>();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [deck, setDeck] = useState<Deck | null>(null);
    const [leaderboard, setLeaderboard] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [started, setStarted] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | boolean | string[]>>({});
    const [currentInput, setCurrentInput] = useState('');
    const [feedback, setFeedback] = useState<{ userAnswer: string | boolean | string[]; isCorrect: boolean } | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
    const [submission, setSubmission] = useState<SubmittedQuizAttempt | null>(null);

    useEffect(() => {
        async function loadChallenge() {
            try {
                const challenge = await fetchQuiz(quizId);
                const [deckRecord, attempts] = await Promise.all([
                    fetchDeck(challenge.deck_id),
                    fetchQuizAttempts(quizId),
                ]);

                setQuiz(challenge);
                setDeck(deckRecord);
                setQuestions(challenge.questions || []);
                setLeaderboard(attempts);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadChallenge();
    }, [quizId]);

    const startQuiz = () => {
        if (!playerName.trim()) {
            setError('Enter your name to join the leaderboard.');
            return;
        }

        setError(null);
        setStarted(true);
        setAttemptStartedAt(new Date().toISOString());
        setFeedback(null);
    };

    const goNext = async () => {
        setFeedback(null);

        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const result = await submitQuizAttempt(
                quizId,
                playerName.trim(),
                { ...answers },
                attemptStartedAt || new Date().toISOString(),
                new Date().toISOString()
            );

            setSubmission(result);
            setLeaderboard(result.leaderboard || []);
            setShowResults(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const submitAnswer = (overrideAnswer = null) => {
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const isCorrect = isAnswerCorrect(question, finalAnswer);
        const nextAnswers = { ...answers, [currentQ]: finalAnswer };
        setAnswers(nextAnswers);
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
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
                    <Link href="/" className="btn btn-secondary">Go Home</Link>
                </div>
            </div>
        );

    if (!started) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <Link href={`/deck/${quiz?.deck_id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px', marginBottom: '16px' }}>
                        ← Deck
                    </Link>
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <h1 className="mb-sm" style={{ fontSize: '1.8rem' }}>{deck?.title}</h1>
                        <p className="text-muted mb-md">Challenge by {quiz?.creator_name}</p>

                        <div className="flex-center gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
                            <span className="badge">{questions.length} questions</span>
                            <span className="badge badge-purple">
                                {quiz?.source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'}
                            </span>
                            {(quiz?.question_types || []).map(type => (
                                <span key={type} className="badge">{type.replace('_', ' ')}</span>
                            ))}
                        </div>

                        {error && <div className="error-box mb-md">{error}</div>}

                        <div className="field">
                            <label className="label">Your Name</label>
                            <input
                                className="input"
                                placeholder="Required for the leaderboard"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                style={{ textAlign: 'center' }}
                            />
                        </div>

                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startQuiz}>
                            Start Challenge
                        </button>
                    </div>

                    <div className="card mt-lg" style={{ padding: '24px' }}>
                        <div className="flex-between mb-md">
                            <h2 style={{ marginBottom: 0 }}>Leaderboard</h2>
                            <span className="text-sm text-muted">Score, then fastest time</span>
                        </div>

                        {leaderboard.length === 0 ? (
                            <p className="text-muted">No attempts yet. Be the first score on the board.</p>
                        ) : (
                            <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                                {leaderboard.map((attempt, index) => (
                                    <div key={attempt.id} className="flex-between" style={{ padding: '12px 0', borderBottom: index === leaderboard.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                        <div>
                                            <p className="bold" style={{ marginBottom: '2px' }}>#{index + 1} {attempt.player_name}</p>
                                            <p className="text-sm text-muted">Completed in {formatElapsed(attempt.elapsed_ms)}</p>
                                        </div>
                                        <p style={{ fontWeight: 800 }}>{attempt.score}/{attempt.question_count}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                        <h1>Challenge Complete</h1>
                        {submission && (
                            <p className="text-muted mt-sm">
                                {playerName.trim()} placed #{submission.rank} with {submission.score}/{submission.questionCount} in {formatElapsed(submission.elapsedMs)}.
                            </p>
                        )}
                    </div>

                    {error && <div className="error-box mb-md">{error}</div>}

                    <div className="card mb-lg" style={{ padding: '24px' }}>
                        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <p className="text-sm text-muted">Your Score</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800 }}>{score} / {questionCount}</p>
                            </div>
                            {submission && (
                                <div style={{ textAlign: 'right' }}>
                                    <p className="text-sm text-muted">Official Time</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatElapsed(submission.elapsedMs)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card mb-lg" style={{ padding: '24px' }}>
                        <div className="flex-between mb-md">
                            <h2 style={{ marginBottom: 0 }}>Leaderboard</h2>
                            <span className="text-sm text-muted">Top 10</span>
                        </div>
                        <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                            {leaderboard.map((attempt, index) => (
                                <div key={attempt.id} className="flex-between" style={{ padding: '12px 0', borderBottom: index === leaderboard.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <div>
                                        <p className="bold" style={{ marginBottom: '2px' }}>#{index + 1} {attempt.player_name}</p>
                                        <p className="text-sm text-muted">{formatElapsed(attempt.elapsed_ms)}</p>
                                    </div>
                                    <p style={{ fontWeight: 800 }}>{attempt.score}/{attempt.question_count}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                        {questions.map((question, index) => {
                            const userAnswer = answers[index];
                            const correct = isAnswerCorrect(question, userAnswer);

                            return (
                                <div key={index} className="card" style={{ borderLeftWidth: correct ? 1.5 : 4, borderLeftColor: correct ? 'var(--border)' : 'var(--warning)' }}>
                                    <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{question.type.replace('_', ' ')}</div>
                                    {question.scenario && <p className="mb-sm light" style={{ fontStyle: 'italic' }}>{question.scenario}</p>}
                                    <p className="bold mb-md" style={{ fontSize: '1.1rem' }}>{question.question}</p>
                                    <div className="flex gap-md mb-sm" style={{ flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Your Answer:</span>
                                            <p>{Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer !== undefined && userAnswer !== '' ? String(userAnswer) : 'Skipped')}</p>
                                        </div>
                                        <div style={{ flex: 1, background: correct ? 'var(--success-light)' : 'var(--warning-light)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Correct Answer:</span>
                                            <p className="bold">{Array.isArray(question.answer) ? question.answer.join(', ') : String(question.answer)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-md flex-center gap-md" style={{ flexWrap: 'wrap' }}>
                        <Link href={`/take/${quizId}`} className="btn btn-secondary">
                            Play Again
                        </Link>
                        <Link href={`/deck/${quiz.deck_id}`} className="btn btn-primary">
                            View Deck
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (submitting) {
        return (
            <div className="page">
                <div className="loading-center" style={{ flexDirection: 'column', gap: '12px' }}>
                    <div className="spinner spinner-lg"></div>
                    <p className="text-muted">Submitting your score…</p>
                </div>
            </div>
        );
    }

    const question = questions[currentQ];

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '640px' }}>
                {error && <div className="error-box mb-md">{error}</div>}

                <div className="mb-lg flex-between">
                    <Link href={`/take/${quizId}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        Quit
                    </Link>
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
                                {question.options.map((option, index) => (
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
                            <button className="btn btn-primary mt-md" style={{ width: '100%' }} onClick={() => void goNext()} autoFocus>
                                {currentQ < questions.length - 1 ? 'Next Question' : 'See Results'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
