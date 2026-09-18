"use client";

import { MAX_OPTIONS, MIN_OPTIONS, type McqDraft } from '@/lib/manualQuiz';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// One multiple-choice question in the challenge builder. Tapping an option's
// letter marks it as the correct answer.
export default function McqQuestionForm({
    index,
    draft,
    onChange,
    onRemove,
    canRemove,
    disabled = false,
}: {
    index: number;
    draft: McqDraft;
    onChange: (next: McqDraft) => void;
    onRemove: () => void;
    canRemove: boolean;
    disabled?: boolean;
}) {
    const setOption = (optionIndex: number, value: string) => {
        onChange({
            ...draft,
            options: draft.options.map((option, i) => (i === optionIndex ? value : option)),
        });
    };

    const addOption = () => {
        if (draft.options.length >= MAX_OPTIONS) return;
        onChange({ ...draft, options: [...draft.options, ''] });
    };

    const removeOption = (optionIndex: number) => {
        if (draft.options.length <= MIN_OPTIONS) return;

        let correctIndex = draft.correctIndex;
        if (correctIndex === optionIndex) correctIndex = null;
        else if (correctIndex !== null && correctIndex > optionIndex) correctIndex -= 1;

        onChange({
            ...draft,
            options: draft.options.filter((_, i) => i !== optionIndex),
            correctIndex,
        });
    };

    return (
        <div className="index-card">
            <div className="index-card-head">
                <span>Question {index + 1} · multiple choice</span>
                {canRemove && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm index-card-head-action"
                        onClick={onRemove}
                        tabIndex={-1}
                        disabled={disabled}
                    >
                        Remove
                    </button>
                )}
            </div>
            <div className="index-card-body" style={{ gap: 0, padding: '18px 22px 20px' }}>
                <div className="field">
                    <label className="label" htmlFor={`question-${index}`}>Question</label>
                    <textarea
                        id={`question-${index}`}
                        className="textarea"
                        placeholder="What do you want to ask?"
                        value={draft.question}
                        onChange={(e) => onChange({ ...draft, question: e.target.value })}
                        rows={2}
                        style={{ minHeight: '72px' }}
                        disabled={disabled}
                    />
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                    <span className="label">Options — tap a letter to mark the correct answer</span>
                    <div className="mcq-options">
                        {draft.options.map((option, optionIndex) => {
                            const isCorrect = draft.correctIndex === optionIndex;
                            return (
                                <div key={optionIndex} className={`mcq-option ${isCorrect ? 'is-correct' : ''}`}>
                                    <button
                                        type="button"
                                        className="option-letter mcq-option-pick"
                                        onClick={() => onChange({ ...draft, correctIndex: optionIndex })}
                                        aria-pressed={isCorrect}
                                        aria-label={`Mark option ${LETTERS[optionIndex]} as correct`}
                                        title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                                        disabled={disabled}
                                    >
                                        {LETTERS[optionIndex]}
                                    </button>
                                    <input
                                        className="input"
                                        placeholder={`Option ${LETTERS[optionIndex]}`}
                                        value={option}
                                        onChange={(e) => setOption(optionIndex, e.target.value)}
                                        aria-label={`Option ${LETTERS[optionIndex]}`}
                                        disabled={disabled}
                                    />
                                    {draft.options.length > MIN_OPTIONS && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeOption(optionIndex)}
                                            aria-label={`Remove option ${LETTERS[optionIndex]}`}
                                            tabIndex={-1}
                                            disabled={disabled}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {draft.options.length < MAX_OPTIONS && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={addOption}
                            style={{ marginTop: 'var(--space-sm)' }}
                            disabled={disabled}
                        >
                            + Add option
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
