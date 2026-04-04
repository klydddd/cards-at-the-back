import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQuiz, fetchDeck } from '../lib/supabase';

export default function QuizReview() {
    const { id: deckId, quizId } = useParams();
    const [deck, setDeck] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([fetchDeck(deckId), fetchQuiz(quizId)])
            .then(([d, q]) => {
                setDeck(d);
                setQuiz(q);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [deckId, quizId]);

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
                    <Link to={`/deck/${deckId}`} className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    const questions = quiz.questions || [];
    const answers = quiz.answers || {};
    const hasAnswers = Object.keys(answers).length > 0;

    let score = 0;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '720px' }}>
                <div className="mb-md">
                    <Link to={`/deck/${deckId}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        ← Back to Deck
                    </Link>
                </div>

                <div className="mb-lg">
                    <h1 className="mb-sm">Quiz Review</h1>
                    <p className="text-muted">
                        {deck.title} — by {quiz.creator_name}
                    </p>
                    <div className="flex gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
                        <span className="badge">{questions.length} questions</span>
                        {quiz.question_types.map(t => (
                            <span key={t} className="badge" style={{ background: 'var(--bg)' }}>
                                {t.replace('_', ' ')}
                            </span>
                        ))}
                        {quiz.score !== null && (
                            <span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success-dark)' }}>
                                Score: {quiz.score}/{questions.length}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                    {questions.map((q, i) => {
                        const userAnswer = answers[i];
                        const hasThisAnswer = userAnswer !== undefined && userAnswer !== '';

                        let exactMatch = false;
                        if (hasAnswers && hasThisAnswer) {
                            const isCorrectString = typeof q.answer === 'string' && typeof userAnswer === 'string' &&
                                userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
                            const isCorrectBool = typeof q.answer === 'boolean' && userAnswer === q.answer;
                            exactMatch = isCorrectString || isCorrectBool;
                            if (exactMatch) score++;
                        }

                        return (
                            <div key={i} className="card" style={{
                                borderLeftWidth: hasAnswers ? (exactMatch ? 1.5 : 4) : 1.5,
                                borderLeftColor: hasAnswers ? (exactMatch ? 'var(--border)' : 'var(--warning)') : 'var(--border)',
                            }}>
                                <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {q.type.replace('_', ' ')}
                                </div>
                                {q.scenario && <p className="mb-sm light" style={{ fontStyle: 'italic' }}>{q.scenario}</p>}
                                <p className="bold mb-md" style={{ fontSize: '1.1rem' }}>{q.question}</p>

                                {q.type === 'multiple_choice' && q.options && (
                                    <div className="flex" style={{ flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                        {q.options.map((opt, j) => (
                                            <div key={j} style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                background: opt === q.answer ? 'var(--success-light)' : (hasAnswers && opt === userAnswer && !exactMatch) ? 'var(--warning-light)' : 'var(--bg)',
                                                fontWeight: opt === q.answer ? 700 : 400,
                                            }}>
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {hasAnswers && (
                                    <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Answer Given:</span>
                                            <p>{Array.isArray(userAnswer) ? userAnswer.join(', ') : (hasThisAnswer ? String(userAnswer) : 'Skipped')}</p>
                                        </div>
                                        <div style={{ flex: 1, background: exactMatch ? 'var(--success-light)' : 'var(--warning-light)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Correct Answer:</span>
                                            <p className="bold">{Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}</p>
                                        </div>
                                    </div>
                                )}

                                {!hasAnswers && (
                                    <div style={{ background: 'var(--success-light)', padding: '12px', borderRadius: '8px' }}>
                                        <span className="text-sm text-muted block mb-sm">Answer:</span>
                                        <p className="bold">{Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-lg flex-center gap-md">
                    <Link to={`/deck/${deckId}/quiz`} className="btn btn-secondary">
                        Take New Quiz
                    </Link>
                    <Link to={`/deck/${deckId}`} className="btn btn-primary">
                        Back to Deck
                    </Link>
                </div>
            </div>
        </div>
    );
}
