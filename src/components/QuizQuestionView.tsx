"use client";

import type { ReactNode } from 'react';
import { isAnswerCorrect } from '@/lib/quizGrading';
import type { QuizQuestion } from '@/types';

type Answer = string | boolean | string[];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Drop repeated choices (AI or previously saved quizzes may contain them), keeping
// the exact answer string when it appears so the correct option still highlights.
function uniqueOptions(options: string[], answer: QuizQuestion['answer']) {
    const byKey = new Map<string, string>();
    for (const option of options) {
        const key = option.trim().toLowerCase();
        if (!byKey.has(key) || option === answer) byKey.set(key, option);
    }
    return [...byKey.values()];
}

export function formatAnswer(value: Answer | undefined) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    return value !== undefined && value !== '' ? String(value) : 'Skipped';
}

interface QuizQuestionViewProps {
    questions: QuizQuestion[];
    currentQ: number;
    answers: Record<number, Answer>;
    feedback: { userAnswer: Answer; isCorrect: boolean } | null;
    currentInput: string;
    onInputChange: (value: string) => void;
    /** Pass an answer for choice questions; omit it to submit the typed input. */
    onSubmit: (answer?: Answer) => void;
    onNext: () => void;
    eyebrow: ReactNode;
    quit: ReactNode;
    error?: string | null;
}

export default function QuizQuestionView({
    questions,
    currentQ,
    answers,
    feedback,
    currentInput,
    onInputChange,
    onSubmit,
    onNext,
    eyebrow,
    quit,
    error,
}: QuizQuestionViewProps) {
    const question = questions[currentQ];

    const optionState = (value: string | boolean) => {
        if (!feedback) return '';
        if (value === question.answer) return 'is-correct';
        if (value === feedback.userAnswer) return 'is-wrong';
        return 'is-dim';
    };

    const optionTag = (state: string) =>
        state === 'is-correct' ? 'Correct' : state === 'is-wrong' ? 'Your answer' : '';

    const segmentState = (index: number) => {
        if (index < currentQ) return isAnswerCorrect(questions[index], answers[index]) ? 'is-correct' : 'is-wrong';
        if (index === currentQ) return feedback ? (feedback.isCorrect ? 'is-correct' : 'is-wrong') : 'is-current';
        return '';
    };

    const renderOption = (value: string | boolean, letter: string, label: string, key: string) => {
        const state = optionState(value);
        return (
            <button
                key={key}
                className={`option-row ${state}`}
                onClick={() => onSubmit(value)}
                disabled={!!feedback}
            >
                <span className="option-letter">{letter}</span>
                <span className="option-label">{label}</span>
                <span className="option-tag">{optionTag(state)}</span>
            </button>
        );
    };

    return (
        <div className="quiz-shell">
            {error && <div className="error-box" style={{ marginBottom: 0 }}>{error}</div>}

            <div className="quiz-progress">
                <div className="quiz-progress-top">
                    <span className="eyebrow eyebrow-purple">{eyebrow}</span>
                    <span className="flex gap-md" style={{ alignItems: 'baseline' }}>
                        <span>Question {currentQ + 1} of {questions.length}</span>
                        {quit}
                    </span>
                </div>
                <div className="quiz-segments">
                    {questions.map((_, index) => (
                        <div key={index} className={`quiz-segment ${segmentState(index)}`}></div>
                    ))}
                </div>
            </div>

            {question.scenario && <p className="quiz-scenario">{question.scenario}</p>}

            <h2 className="quiz-question">{question.question}</h2>

            {question.type === 'multiple_choice' && (
                <div className="option-grid">
                    {uniqueOptions(question.options ?? [], question.answer).map((option, index) =>
                        renderOption(option, LETTERS[index], option, `${currentQ}-${index}`)
                    )}
                </div>
            )}

            {question.type === 'true_false' && (
                <div className="option-grid">
                    {[true, false].map((value) =>
                        renderOption(value, value ? 'T' : 'F', value ? 'True' : 'False', `${currentQ}-${String(value)}`)
                    )}
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
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !feedback && onSubmit()}
                        disabled={!!feedback}
                    />
                    {!feedback && <div className="mt-md text-right">
                        <button className="btn btn-primary" onClick={() => onSubmit()}>Submit</button>
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
                        onChange={(e) => onInputChange(e.target.value)}
                        rows={3}
                        disabled={!!feedback}
                    />
                    {!feedback && <div className="mt-md text-right">
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                const answerList = currentInput.split(',').map((item) => item.trim()).filter(Boolean);
                                onSubmit(answerList.length ? answerList : '');
                            }}
                        >
                            Submit
                        </button>
                    </div>}
                </div>
            )}

            {feedback && (
                <div className="quiz-feedback">
                    <p>
                        <span className={feedback.isCorrect ? 'quiz-verdict-correct' : 'quiz-verdict-wrong'}>
                            {feedback.isCorrect ? 'Correct.' : 'Not quite.'}
                        </span>{' '}
                        The answer is <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{formatAnswer(question.answer)}</strong>.
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={onNext} autoFocus>
                        {currentQ < questions.length - 1 ? 'Next question' : 'See results'}
                    </button>
                </div>
            )}
        </div>
    );
}
