"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchQuiz, fetchDeck, fetchQuizAttempts, submitQuizAttempt, type SubmittedQuizAttempt } from '@/lib/supabase';
import ShareButton from '@/components/ShareButton';
import { gradeQuizAttempt, isAnswerCorrect } from '@/lib/quizGrading';
import { ArrowLeftIcon } from '@/components/Icons';
import QuizQuestionView, { formatAnswer } from '@/components/QuizQuestionView';
import type { Deck, Quiz, QuizAttempt, QuizQuestion } from '@/types';

function formatElapsed(elapsedMs: number) {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function TakeQuiz({ quizId }: { quizId: string }) {
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

    const submitAnswer = (overrideAnswer: string | boolean | string[] | null = null) => {
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        const isCorrect = isAnswerCorrect(question, finalAnswer);
        const nextAnswers = { ...answers, [currentQ]: finalAnswer };
        setAnswers(nextAnswers);
        setCurrentInput('');
        setFeedback({ userAnswer: finalAnswer, isCorrect });
    };

    const renderLeaderboard = (caption: string, highlightId?: string) => (
        <div className="board">
            <div className="board-head">
                <h2>Leaderboard</h2>
                <span className="text-sm text-muted">{caption}</span>
            </div>
            {leaderboard.length === 0 ? (
                <p className="board-empty">No attempts yet. Be the first score on the board.</p>
            ) : (
                leaderboard.map((attempt, index) => (
                    <div key={attempt.id} className={`board-row ${attempt.id === highlightId ? 'is-me' : ''}`}>
                        <span className="board-rank">{index + 1}</span>
                        <span className="board-name">{attempt.player_name}</span>
                        <span className="board-time">{formatElapsed(attempt.elapsed_ms)}</span>
                        <span className="board-score">{attempt.score}/{attempt.question_count}</span>
                    </div>
                ))
            )}
        </div>
    );

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
                <div className="container">
                    <div className="quiz-shell">
                        <div>
                            <Link href={`/deck/${quiz?.deck_id}`} className="session-back">
                                <ArrowLeftIcon size={16} /> Deck
                            </Link>
                        </div>

                        <div className="index-card">
                            <div className="index-card-head">
                                <span>{quiz?.source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'}</span>
                                <span>{questions.length} questions</span>
                            </div>
                            <div className="index-card-body" style={{ padding: '28px 32px 32px', gap: '16px' }}>
                                <span className="eyebrow eyebrow-purple">Challenge by {quiz?.creator_name}</span>
                                <h1 style={{ fontSize: '3rem' }}>{deck?.title}</h1>

                                {(quiz?.question_types || []).length > 0 && (
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        {(quiz?.question_types || []).map(type => (
                                            <span key={type} className="badge">{type.replace('_', ' ')}</span>
                                        ))}
                                    </div>
                                )}

                                {error && <div className="error-box" style={{ marginBottom: 0 }}>{error}</div>}

                                <div className="field" style={{ marginBottom: 0, marginTop: '8px' }}>
                                    <label className="label" htmlFor="player-name">Your Name</label>
                                    <input
                                        id="player-name"
                                        className="input"
                                        placeholder="Required for the leaderboard"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && startQuiz()}
                                    />
                                </div>

                                <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary btn-lg" onClick={startQuiz}>
                                        Start Challenge
                                    </button>
                                    <ShareButton url={`/take/${quizId}`} title={`${deck?.title || ''} Challenge`} />
                                </div>
                            </div>
                        </div>

                        {renderLeaderboard('Score, then fastest time')}
                    </div>
                </div>
            </div>
        );
    }

    if (showResults) {
        const { score, questionCount } = gradeQuizAttempt(questions, answers);

        return (
            <div className="page">
                <div className="container">
                    <div className="quiz-shell" style={{ gap: '32px' }}>
                        <div className="quiz-score">
                            <span className="eyebrow eyebrow-purple">Challenge complete</span>
                            <div className="quiz-score-value">
                                {score}<span>/{questionCount}</span>
                            </div>
                            {submission && (
                                <p>
                                    {playerName.trim()} placed #{submission.rank} in {formatElapsed(submission.elapsedMs)}.
                                </p>
                            )}
                        </div>

                        {error && <div className="error-box">{error}</div>}

                        {renderLeaderboard('Top 10', submission?.attempt?.id)}

                        <section className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                            <h2 style={{ fontSize: '1.5rem' }}>Your answers</h2>
                            {questions.map((question, index) => {
                                const userAnswer = answers[index];
                                const correct = isAnswerCorrect(question, userAnswer);

                                return (
                                    <div key={index} className="index-card">
                                        <div className="index-card-head">
                                            <span>{index + 1} · {question.type.replace('_', ' ')}</span>
                                            <span className={correct ? 'quiz-verdict-correct' : 'quiz-verdict-wrong'}>
                                                {correct ? 'Correct' : 'Missed'}
                                            </span>
                                        </div>
                                        <div className="index-card-body" style={{ gap: '12px' }}>
                                            {question.scenario && <p className="quiz-scenario">{question.scenario}</p>}
                                            <p style={{ color: 'var(--text)', fontSize: '1.0625rem' }}>{question.question}</p>
                                            <div className="answer-pair">
                                                <div className={`answer-cell ${correct ? 'is-correct' : 'is-wrong'}`}>
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
                        </section>

                        <div className="stack-actions">
                            <Link href={`/take/${quizId}`} className="btn btn-secondary btn-lg">
                                Play Again
                            </Link>
                            <Link href={`/deck/${quiz!.deck_id}`} className="btn btn-primary btn-lg">
                                Study this deck
                            </Link>
                        </div>
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
            <div className="container">
                <QuizQuestionView
                    questions={questions}
                    currentQ={currentQ}
                    answers={answers}
                    feedback={feedback}
                    currentInput={currentInput}
                    onInputChange={setCurrentInput}
                    onSubmit={(answer) => submitAnswer(answer ?? null)}
                    onNext={() => void goNext()}
                    eyebrow={`${deck?.title ?? ''} · Challenge`}
                    quit={<Link href={`/take/${quizId}`} className="session-back session-quit">Quit</Link>}
                    error={error}
                />
            </div>
        </div>
    );
}
