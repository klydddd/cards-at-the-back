"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveQuiz } from '@/lib/supabase';
import {
    MAX_QUESTIONS,
    MIN_QUESTIONS,
    emptyMcqDraft,
    validateManualQuiz,
    type QuestionDraft,
} from '@/lib/manualQuiz';
import McqQuestionForm from '@/components/McqQuestionForm';
import { ArrowLeftIcon } from '@/components/Icons';

// Hand-written challenge with no deck behind it. Multiple choice only for
// now; other question types are a new draft kind in manualQuiz.ts plus a new
// branch in renderQuestion below.

export default function CreateChallenge() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [questions, setQuestions] = useState<QuestionDraft[]>([emptyMcqDraft(), emptyMcqDraft()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateQuestion = (index: number, next: QuestionDraft) => {
        setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)));
    };

    const removeQuestion = (index: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const addQuestion = () => {
        setQuestions((prev) => (prev.length >= MAX_QUESTIONS ? prev : [...prev, emptyMcqDraft()]));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const result = validateManualQuiz({ title, questions });
        if (!result.ok) {
            setError(result.error);
            return;
        }

        setSaving(true);
        try {
            const quiz = await saveQuiz({
                deckId: null,
                title: title.trim(),
                creatorName: creatorName.trim() || 'Anonymous',
                questions: result.questions,
                questionTypes: result.questionTypes,
                subject: subject.trim(),
                sourceKind: 'manual',
            });
            router.push(`/take/${quiz.id}`);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    const renderQuestion = (draft: QuestionDraft, index: number) => {
        switch (draft.type) {
            case 'multiple_choice':
                return (
                    <McqQuestionForm
                        key={index}
                        index={index}
                        draft={draft}
                        onChange={(next) => updateQuestion(index, next)}
                        onRemove={() => removeQuestion(index)}
                        canRemove={questions.length > 1}
                        disabled={saving}
                    />
                );
        }
    };

    return (
        <div className="page">
            <div className="container container-md">
                <Link href="/create" className="session-back" style={{ marginBottom: 'var(--space-md)' }}>
                    <ArrowLeftIcon size={16} /> Create
                </Link>

                <span className="eyebrow eyebrow-purple" style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>New challenge</span>
                <h1 className="deck-title mb-sm">Create a challenge</h1>
                <p className="mb-lg">
                    Write your own multiple-choice questions. No deck needed — publish it and share the link.
                </p>

                {error && <div className="error-box">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label className="label" htmlFor="challenge-title">Title</label>
                        <input
                            id="challenge-title"
                            className="input"
                            placeholder="e.g. Philippine History speedrun"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="challenge-subject">Subject</label>
                        <input
                            id="challenge-subject"
                            className="input"
                            placeholder="e.g. OPS1, Biology, History"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="challenge-creator">Your Name</label>
                        <input
                            id="challenge-creator"
                            className="input"
                            placeholder="Anonymous"
                            value={creatorName}
                            onChange={(e) => setCreatorName(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div className="mt-lg">
                        <div className="section-head" style={{ alignItems: 'center' }}>
                            <h2>Questions</h2>
                            {questions.length < MAX_QUESTIONS && (
                                <button type="button" className="btn btn-secondary btn-sm" onClick={addQuestion} disabled={saving}>
                                    + Add question
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex" style={{ flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {questions.map(renderQuestion)}
                    </div>

                    <p className="text-sm text-muted" style={{ marginTop: 'var(--space-md)' }}>
                        At least {MIN_QUESTIONS} questions, up to {MAX_QUESTIONS}. Each needs one correct answer marked.
                    </p>

                    <div className="mt-lg">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%' }}>
                            {saving ? 'Publishing...' : 'Publish Challenge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
