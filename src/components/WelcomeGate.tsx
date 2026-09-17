"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Modal from '@/components/Modal';
import { GATE_CLOSED_EVENT, markAllAnnouncementsSeen } from '@/lib/announcements';
import { LEGAL_PATHS, acceptTerms, hasAcceptedTerms } from '@/lib/legal';
import {
    AGE_RANGES,
    GRADE_LEVEL_GROUPS,
    NAME_MAX,
    PROGRAM_MAX,
    PROGRAM_SUGGESTIONS,
    SHS_STRANDS,
    UNDER_13,
    hasOnboarded,
    markOnboarded,
    needsProgram,
    needsStrand,
    type AgeRange,
    type GradeLevel,
} from '@/lib/onboarding';

type Step = 'consent' | 'name' | 'age' | 'under-13' | 'education' | 'done';

const QUESTION_STEPS: Step[] = ['name', 'age', 'education'];

// Consent comes first, then a short, required onboarding. Visitors who already
// onboarded only see the consent step again when the policies change.
export default function WelcomeGate() {
    const pathname = usePathname();
    const [step, setStep] = useState<Step | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);

    const [name, setName] = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [ageRange, setAgeRange] = useState<AgeRange | ''>('');
    const [gradeLevel, setGradeLevel] = useState<GradeLevel | ''>('');
    const [strand, setStrand] = useState('');
    const [program, setProgram] = useState('');
    const [website, setWebsite] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // localStorage is only available after mount
    useEffect(() => {
        if (!hasAcceptedTerms()) setStep('consent');
        else if (!hasOnboarded()) setStep('name');
    }, []);

    const open = step !== null && !LEGAL_PATHS.includes(pathname);

    // Move focus to each new step's heading so screen readers announce it
    useEffect(() => {
        if (open) headingRef.current?.focus();
    }, [open, step]);

    if (!open) return null;

    const close = () => {
        setStep(null);
        window.dispatchEvent(new Event(GATE_CLOSED_EVENT));
    };

    const goTo = (next: Step) => {
        setError(null);
        setStep(next);
    };

    const handleAgree = () => {
        acceptTerms();
        if (hasOnboarded()) close();
        else goTo('name');
    };

    const handleAgeNext = () => {
        goTo(ageRange === UNDER_13 ? 'under-13' : 'education');
    };

    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, anonymous, ageRange, gradeLevel, strand, program, website }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.id) {
                throw new Error(data.error || 'Your answers could not be saved. Please try again.');
            }
            markOnboarded(data.id);
            // New visitors don't need to hear about updates from before they joined
            markAllAnnouncementsSeen();
            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Your answers could not be saved. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const questionIndex = step ? QUESTION_STEPS.indexOf(step) : -1;
    const headLabel =
        step === 'consent' ? 'Before you start'
            : step === 'done' ? 'All set'
                : step === 'under-13' ? 'Sorry'
                    : `A bit about you · ${questionIndex + 1} of ${QUESTION_STEPS.length}`;

    const nameValid = anonymous || name.trim().length > 0;
    const educationValid =
        gradeLevel !== '' &&
        (!needsStrand(gradeLevel) || strand !== '') &&
        (!needsProgram(gradeLevel) || program.trim().length > 0);

    return (
        <Modal open labelledBy="welcome-title" describedBy="welcome-desc" head={headLabel}>
            {step === 'consent' && (
                <div className="index-card-body consent-body">
                    <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>Welcome to gokards</h2>
                    <p id="welcome-desc">
                        Everything you save here, including decks, quizzes, and the names you enter on them, is
                        public. Text you send to AI features is processed by Google Gemini.
                    </p>
                    <p>
                        Next, we&apos;ll ask a few questions about you for our usage reports. Those answers stay
                        private.
                    </p>
                    <p>
                        By continuing, you agree to our{' '}
                        <Link href="/terms">Terms of Service</Link> and{' '}
                        <Link href="/privacy">Privacy Policy</Link>.
                    </p>
                    <button type="button" className="btn btn-primary consent-agree" onClick={handleAgree}>
                        I agree
                    </button>
                </div>
            )}

            {step === 'name' && (
                <form
                    className="index-card-body consent-body"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (nameValid) goTo('age');
                    }}
                >
                    <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>What should we call you?</h2>
                    <p id="welcome-desc">
                        Your answers are private and only used for our usage reports. See the{' '}
                        <Link href="/privacy#collect">Privacy Policy</Link>.
                    </p>
                    <div className="field onboarding-field">
                        <label className="label" htmlFor="onboarding-name">Name</label>
                        <input
                            id="onboarding-name"
                            className="input"
                            value={anonymous ? '' : name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={anonymous ? 'Anonymous' : 'Your name or a nickname'}
                            maxLength={NAME_MAX}
                            autoComplete="name"
                            disabled={anonymous}
                        />
                    </div>
                    <label className="onboarding-check">
                        <input
                            type="checkbox"
                            checked={anonymous}
                            onChange={(e) => setAnonymous(e.target.checked)}
                        />
                        Stay anonymous
                    </label>
                    <div className="onboarding-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => goTo('consent')}>
                            Back
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!nameValid}>
                            Next
                        </button>
                    </div>
                </form>
            )}

            {step === 'age' && (
                <form
                    className="index-card-body consent-body"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (ageRange) handleAgeNext();
                    }}
                >
                    <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>How old are you?</h2>
                    <p id="welcome-desc">Pick the range that fits.</p>
                    <div className="chip-row onboarding-chips" role="radiogroup" aria-labelledby="welcome-title">
                        {AGE_RANGES.map((age) => (
                            <button
                                key={age.value}
                                type="button"
                                role="radio"
                                aria-checked={ageRange === age.value}
                                className={`chip${ageRange === age.value ? ' is-active' : ''}`}
                                onClick={() => setAgeRange(age.value)}
                            >
                                {age.label}
                            </button>
                        ))}
                    </div>
                    <div className="onboarding-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => goTo('name')}>
                            Back
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!ageRange}>
                            Next
                        </button>
                    </div>
                </form>
            )}

            {step === 'under-13' && (
                <div className="index-card-body consent-body">
                    <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>gokards is for ages 13 and up</h2>
                    <p id="welcome-desc">
                        We can&apos;t let you continue yet, and we haven&apos;t saved any of your answers. If you picked
                        the wrong age range, go back and change it.
                    </p>
                    <div className="onboarding-actions">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                                setAgeRange('');
                                goTo('age');
                            }}
                        >
                            Back
                        </button>
                    </div>
                </div>
            )}

            {step === 'education' && (
                <form
                    className="index-card-body consent-body"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (educationValid && !submitting) handleSubmit();
                    }}
                >
                    <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>Where are you studying?</h2>
                    <p id="welcome-desc">This helps us understand who gokards is helping.</p>

                    <div className="field onboarding-field">
                        <label className="label" htmlFor="onboarding-grade">Grade level</label>
                        <div className="select-wrap">
                            <select
                                id="onboarding-grade"
                                className="input select"
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
                                required
                            >
                                <option value="" disabled>Choose one</option>
                                {GRADE_LEVEL_GROUPS.map((group) => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.levels.map((level) => (
                                            <option key={level.value} value={level.value}>
                                                {level.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>

                    {needsStrand(gradeLevel) && (
                        <div className="field onboarding-field">
                            <label className="label" htmlFor="onboarding-strand">Strand</label>
                            <div className="select-wrap">
                                <select
                                    id="onboarding-strand"
                                    className="input select"
                                    value={strand}
                                    onChange={(e) => setStrand(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Choose one</option>
                                    {SHS_STRANDS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {needsProgram(gradeLevel) && (
                        <div className="field onboarding-field">
                            <label className="label" htmlFor="onboarding-program">Program</label>
                            <input
                                id="onboarding-program"
                                className="input"
                                list="onboarding-programs"
                                value={program}
                                onChange={(e) => setProgram(e.target.value)}
                                placeholder="e.g. BS Computer Science"
                                maxLength={PROGRAM_MAX}
                                required
                            />
                            <datalist id="onboarding-programs">
                                {PROGRAM_SUGGESTIONS.map((p) => (
                                    <option key={p} value={p} />
                                ))}
                            </datalist>
                        </div>
                    )}

                    {/* Honeypot for bots, hidden from people and screen readers */}
                    <div className="contact-honeypot" aria-hidden="true">
                        <label htmlFor="onboarding-website">Website</label>
                        <input
                            id="onboarding-website"
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="error-box" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="onboarding-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => goTo('age')}>
                            Back
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!educationValid || submitting}>
                            {submitting ? 'Saving…' : 'Finish'}
                        </button>
                    </div>
                </form>
            )}

            {step === 'done' && (
                <div className="index-card-body consent-body">
                    <h2 id="welcome-title" ref={headingRef} tabIndex={-1}>
                        {anonymous ? 'Thanks!' : `Thanks, ${name.trim()}!`}
                    </h2>
                    <p id="welcome-desc">You&apos;re all set. Time to make some kards.</p>
                    <button type="button" className="btn btn-primary consent-agree" onClick={close}>
                        Start studying
                    </button>
                </div>
            )}
        </Modal>
    );
}
