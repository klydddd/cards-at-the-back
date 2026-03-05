import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDeck, fetchCards } from '../lib/supabase';
import { generateMCQFromCards } from '../lib/mcqGenerator';
import { CheckIcon, XIcon } from '../components/Icons';

export default function MCQuiz() {
    const { id } = useParams();
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Quiz state
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [feedback, setFeedback] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        Promise.all([fetchDeck(id), fetchCards(id)])
            .then(([d, c]) => {
                setDeck(d);
                setCards(c);
                try {
                    const qs = generateMCQFromCards(c);
                    setQuestions(qs);
                } catch (err) {
                    setError(err.message);
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const restart = () => {
        try {
            const qs = generateMCQFromCards(cards);
            setQuestions(qs);
            setCurrentQ(0);
            setAnswers({});
            setFeedback(null);
            setShowResults(false);
            setScore(0);
        } catch (err) {
            setError(err.message);
        }
    };

    const submitAnswer = (option) => {
        if (feedback) return;
        const q = questions[currentQ];
        const isCorrect = option === q.answer;

        setAnswers(prev => ({ ...prev, [currentQ]: option }));
        setFeedback({ userAnswer: option, isCorrect });
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
                    <Link to={`/deck/${id}`} className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    // ── Results ──
    if (showResults) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <div className="text-center mb-lg">
                        <h1 className="mb-sm">Quick Quiz Complete!</h1>
                        <p className="text-muted">{deck.title}</p>
                    </div>

                    <div className="card text-center mb-lg" style={{ padding: '32px' }}>
                        <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Your Score</p>
                        <p style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1 }}>
                            {score}<span style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--gray-400)' }}>/{questions.length}</span>
                        </p>
                        <p className="text-sm text-muted mt-sm">
                            {score === questions.length ? 'Perfect!' : score >= questions.length * 0.7 ? 'Great job!' : 'Keep practicing!'}
                        </p>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                        {questions.map((q, i) => {
                            const userAnswer = answers[i];
                            const isCorrect = userAnswer === q.answer;
                            return (
                                <div key={i} className="card" style={{ padding: '16px 20px', borderLeftWidth: isCorrect ? 1.5 : 4, borderLeftColor: isCorrect ? '#10b981' : '#f59e0b' }}>
                                    <p className="text-sm text-muted light mb-sm">{q.question}</p>
                                    <div className="flex gap-md">
                                        <div>
                                            <span className="text-sm text-muted">You: </span>
                                            <span style={{ fontWeight: isCorrect ? 700 : 400, color: isCorrect ? '#059669' : '#991b1b' }}>{userAnswer}</span>
                                        </div>
                                        {!isCorrect && (
                                            <div>
                                                <span className="text-sm text-muted">Answer: </span>
                                                <span style={{ fontWeight: 700 }}>{q.answer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={restart}>
                            Try Again (Reshuffled)
                        </button>
                        <Link to={`/deck/${id}/practice`} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                            Practice Flashcards
                        </Link>
                        <Link to={`/deck/${id}`} className="btn btn-ghost" style={{ width: '100%' }}>
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
                    <Link to={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                        ← Back
                    </Link>
                    <span className="text-sm bold">{currentQ + 1} / {questions.length}</span>
                </div>

                {/* Progress */}
                <div className="mb-md" style={{ height: '3px', background: 'var(--gray-200)', borderRadius: '100px' }}>
                    <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'var(--black)', borderRadius: '100px', transition: 'width 0.3s ease' }}></div>
                </div>

                {/* Score tracker */}
                <div className="flex-between mb-lg">
                    <span className="text-sm text-muted">{deck.title}</span>
                    <span className="text-sm bold" style={{ color: '#059669' }}>{score} correct</span>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                    <p className="text-sm text-muted light mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        What is the term?
                    </p>
                    <h2 className="mb-lg" style={{ fontSize: '1.3rem', fontWeight: 400, lineHeight: 1.5 }}>{q.question}</h2>

                    <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                        {q.options.map((opt, i) => {
                            let style = { justifyContent: 'flex-start', textAlign: 'left', padding: '16px', fontWeight: 500 };

                            if (feedback) {
                                if (opt === q.answer) {
                                    style = { ...style, background: '#ecfdf5', borderColor: '#10b981', color: '#059669', fontWeight: 700 };
                                } else if (opt === feedback.userAnswer && !feedback.isCorrect) {
                                    style = { ...style, background: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' };
                                } else {
                                    style = { ...style, opacity: 0.35 };
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    className="btn btn-secondary"
                                    style={style}
                                    onClick={() => submitAnswer(opt)}
                                    disabled={!!feedback}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>

                    {/* Instant Feedback */}
                    {feedback && (
                        <div style={{
                            marginTop: '20px',
                            padding: '16px 20px',
                            borderRadius: 'var(--radius-md)',
                            background: feedback.isCorrect ? '#ecfdf5' : '#fef2f2',
                            border: `1.5px solid ${feedback.isCorrect ? '#a7f3d0' : '#fecaca'}`,
                        }}>
                            <div className="flex gap-sm" style={{ alignItems: 'center', marginBottom: feedback.isCorrect ? 0 : '8px' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: feedback.isCorrect ? '#10b981' : '#ef4444',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {feedback.isCorrect ? <CheckIcon size={14} /> : <XIcon size={14} />}
                                </div>
                                <span style={{ fontWeight: 700, color: feedback.isCorrect ? '#059669' : '#991b1b' }}>
                                    {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                                </span>
                            </div>
                            {!feedback.isCorrect && (
                                <p style={{ marginTop: '4px' }}>
                                    <span className="text-sm text-muted">Answer: </span>
                                    <span style={{ fontWeight: 700 }}>{q.answer}</span>
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
