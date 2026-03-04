import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDeck, fetchCards } from '../lib/supabase';
import { generateQuizFromCards } from '../lib/quizGenerator';

const QUESTION_TYPES = [
    { id: 'multiple_choice', label: 'Multiple Choice' },
    { id: 'true_false', label: 'True / False' },
    { id: 'identification', label: 'Identification (Short Answer)' },
    { id: 'enumeration', label: 'Enumeration (List)' },
    { id: 'situational', label: 'Situational' },
];

export default function Quiz() {
    const { id } = useParams();
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Setup state
    const [selectedTypes, setSelectedTypes] = useState(['multiple_choice', 'true_false', 'identification']);
    const [generating, setGenerating] = useState(false);

    // Quiz state
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [currentInput, setCurrentInput] = useState('');

    // Results
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

    const toggleType = (typeId) => {
        setSelectedTypes((prev) =>
            prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
        );
    };

    const startGenerating = async () => {
        if (selectedTypes.length === 0) {
            setError('Select at least one question type.');
            return;
        }
        setError(null);
        setGenerating(true);

        try {
            const qs = await generateQuizFromCards(cards, selectedTypes);
            setQuestions(qs);
            setCurrentQ(0);
            setAnswers({});
            setShowResults(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const saveAnswerAndNext = (overrideAnswer = null) => {
        const finalAnswer = overrideAnswer !== null ? overrideAnswer : currentInput;
        setAnswers(prev => ({ ...prev, [currentQ]: finalAnswer }));
        setCurrentInput('');

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

    if (error && !generating && questions.length === 0)
        return (
            <div className="page">
                <div className="container">
                    <div className="error-box">{error}</div>
                    <Link to={`/deck/${id}`} className="btn btn-secondary">Go Back</Link>
                </div>
            </div>
        );

    // Phase 1: Setup
    if (questions.length === 0) {
        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '640px' }}>
                    <div className="mb-md">
                        <Link to={`/deck/${id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px' }}>
                            ← Back to Deck
                        </Link>
                    </div>
                    <h1 className="mb-sm">Quiz: {deck.title}</h1>
                    <p className="mb-lg">Customize the types of AI-generated questions for this practice session.</p>

                    <div className="card mb-lg">
                        <h3 className="mb-md">Question Types</h3>
                        {error && <div className="error-box">{error}</div>}

                        <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
                            {QUESTION_TYPES.map(type => (
                                <label key={type.id} className="flex gap-sm" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTypes.includes(type.id)}
                                        onChange={() => toggleType(type.id)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: 500 }}>{type.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="mt-lg">
                            <button
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                                onClick={startGenerating}
                                disabled={generating}
                            >
                                {generating ? 'Generating Quiz...' : 'Start Quiz'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Phase 3: Results
    if (showResults) {
        let score = 0;

        return (
            <div className="page">
                <div className="container" style={{ maxWidth: '720px' }}>
                    <div className="text-center mb-lg">
                        <h1>Quiz Completed</h1>
                        <p className="text-muted mt-sm">Review your custom AI generated questions.</p>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
                        {questions.map((q, i) => {
                            const userAnswer = answers[i];
                            const isCorrectStringMatch = typeof q.answer === 'string' && typeof userAnswer === 'string' &&
                                userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
                            const isCorrectBoolean = typeof q.answer === 'boolean' && userAnswer === q.answer;

                            // For arrays (enumeration) or vague matching, we'll let the user self-grade visually
                            const exactMatch = isCorrectStringMatch || isCorrectBoolean;
                            if (exactMatch) score++;

                            return (
                                <div key={i} className={`card ${exactMatch ? '' : 'border-left-orange'}`} style={{ borderLeftWidth: exactMatch ? 1.5 : 4, borderLeftColor: exactMatch ? 'var(--gray-200)' : '#f59e0b' }}>
                                    <div className="text-sm light text-muted mb-sm uppercase">{q.type.replace('_', ' ')}</div>
                                    {q.scenario && <p className="mb-sm light" style={{ fontStyle: 'italic' }}>{q.scenario}</p>}
                                    <p className="bold mb-md" style={{ fontSize: '1.1rem' }}>{q.question}</p>

                                    <div className="flex gap-md mb-sm" style={{ flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, background: 'var(--gray-100)', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Your Answer:</span>
                                            <p>{Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer !== undefined && userAnswer !== '' ? String(userAnswer) : 'Skipped')}</p>
                                        </div>
                                        <div style={{ flex: 1, background: exactMatch ? '#ecfdf5' : '#fef3c7', padding: '12px', borderRadius: '8px' }}>
                                            <span className="text-sm text-muted block mb-sm">Expected Answer:</span>
                                            <p className="bold">{Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-lg flex-center gap-md">
                        <button className="btn btn-secondary" onClick={() => { setQuestions([]); setSelectedTypes(['multiple_choice', 'true_false', 'identification']); }}>
                            Configure New Quiz
                        </button>
                        <Link to={`/deck/${id}`} className="btn btn-primary">
                            Return to Deck
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Phase 2: Taking Quiz
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
                <div className="mb-lg" style={{ height: '3px', background: 'var(--gray-200)', borderRadius: '100px' }}>
                    <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'var(--black)', borderRadius: '100px', transition: 'width 0.3s ease' }}></div>
                </div>

                <div className="card mb-lg" style={{ padding: '32px' }}>
                    <div className="text-sm light text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {q.type.replace('_', ' ')}
                    </div>

                    {q.scenario && <p className="mb-md light" style={{ fontSize: '1.05rem', fontStyle: 'italic', paddingLeft: '12px', borderLeft: '2px solid var(--gray-300)' }}>{q.scenario}</p>}

                    <h2 className="mb-lg" style={{ fontSize: '1.4rem' }}>{q.question}</h2>

                    <div style={{ marginTop: '24px' }}>
                        {q.type === 'multiple_choice' && (
                            <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                                {q.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        className="btn btn-secondary"
                                        style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '16px', fontWeight: 400 }}
                                        onClick={() => saveAnswerAndNext(opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {q.type === 'true_false' && (
                            <div className="flex gap-md">
                                <button className="btn btn-secondary" style={{ flex: 1, padding: '24px' }} onClick={() => saveAnswerAndNext(true)}>True</button>
                                <button className="btn btn-secondary" style={{ flex: 1, padding: '24px' }} onClick={() => saveAnswerAndNext(false)}>False</button>
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
                                    onKeyDown={(e) => e.key === 'Enter' && saveAnswerAndNext()}
                                />
                                <div className="mt-md text-right">
                                    <button className="btn btn-primary" onClick={() => saveAnswerAndNext()}>Submit</button>
                                </div>
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
                                />
                                <div className="mt-md text-right">
                                    <button className="btn btn-primary" onClick={() => {
                                        const ansArray = currentInput.split(',').map(s => s.trim()).filter(s => s);
                                        saveAnswerAndNext(ansArray.length ? ansArray : '');
                                    }}>Submit</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
