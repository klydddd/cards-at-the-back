"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { acceptTerms, hasAcceptedTerms } from '@/lib/legal';

// Pages the visitor must be able to use before agreeing
const LEGAL_PATHS = ['/privacy', '/terms', '/contact'];

export default function ConsentPrompt() {
    const pathname = usePathname();
    const [needsConsent, setNeedsConsent] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const agreeRef = useRef<HTMLButtonElement>(null);

    // localStorage is only available after mount
    useEffect(() => {
        setNeedsConsent(!hasAcceptedTerms());
    }, []);

    const open = needsConsent && !LEGAL_PATHS.includes(pathname);

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        agreeRef.current?.focus();

        // Keep keyboard focus inside the dialog
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !dialogRef.current) return;
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!open) return null;

    const handleAgree = () => {
        acceptTerms();
        setNeedsConsent(false);
    };

    return (
        <div className="consent-backdrop">
            <div
                ref={dialogRef}
                className="index-card consent-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="consent-title"
                aria-describedby="consent-desc"
            >
                <div className="index-card-head">Before you start</div>
                <div className="index-card-body consent-body">
                    <h2 id="consent-title">Welcome to gokards</h2>
                    <p id="consent-desc">
                        Everything you save here, including decks, quizzes, and the names you enter, is public. Text you
                        send to AI features is processed by Google Gemini.
                    </p>
                    <p>
                        By continuing, you agree to our{' '}
                        <Link href="/terms">Terms of Service</Link> and{' '}
                        <Link href="/privacy">Privacy Policy</Link>.
                    </p>
                    <button
                        ref={agreeRef}
                        type="button"
                        className="btn btn-primary consent-agree"
                        onClick={handleAgree}
                    >
                        I agree
                    </button>
                </div>
            </div>
        </div>
    );
}
