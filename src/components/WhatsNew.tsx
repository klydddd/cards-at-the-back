"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Modal from '@/components/Modal';
import { XIcon } from '@/components/Icons';
import {
    GATE_CLOSED_EVENT,
    getUnseenAnnouncements,
    markAnnouncementsSeen,
    type Announcement,
} from '@/lib/announcements';
import { LEGAL_PATHS, hasAcceptedTerms } from '@/lib/legal';
import { hasOnboarded } from '@/lib/onboarding';

function formatDay(iso: string) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

// Shows announcements this browser hasn't seen yet, once WelcomeGate is done
export default function WhatsNew() {
    const pathname = usePathname();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const headingRef = useRef<HTMLHeadingElement>(null);

    // localStorage is only available after mount
    useEffect(() => {
        const check = () => {
            if (LEGAL_PATHS.includes(pathname)) return;
            if (!hasAcceptedTerms() || !hasOnboarded()) return;
            setAnnouncements(getUnseenAnnouncements(pathname));
        };
        check();
        window.addEventListener(GATE_CLOSED_EVENT, check);
        return () => window.removeEventListener(GATE_CLOSED_EVENT, check);
    }, [pathname]);

    const open = announcements.length > 0 && !LEGAL_PATHS.includes(pathname);

    useEffect(() => {
        if (open) headingRef.current?.focus();
    }, [open]);

    const dismiss = useCallback(() => {
        markAnnouncementsSeen(announcements.map((a) => a.id));
        setAnnouncements([]);
    }, [announcements]);

    if (!open) return null;

    const [latest] = announcements;

    return (
        <Modal
            open
            onClose={dismiss}
            className="whats-new-dialog"
            labelledBy="whats-new-title"
            describedBy="whats-new-desc"
            head="What's new"
            headAction={
                <button
                    type="button"
                    className="btn btn-ghost btn-sm index-card-head-action whats-new-close"
                    onClick={dismiss}
                    aria-label="Close"
                >
                    <XIcon size={16} />
                </button>
            }
        >
            <div className="index-card-body consent-body">
                {announcements.map((a, i) => (
                    <section key={a.id} className="whats-new-group">
                        {i === 0 ? (
                            <h2 id="whats-new-title" ref={headingRef} tabIndex={-1}>{a.title}</h2>
                        ) : (
                            <h3>{a.title}</h3>
                        )}
                        <p id={i === 0 ? 'whats-new-desc' : undefined} className="whats-new-date">
                            {formatDay(a.date)}
                        </p>
                        <ul className="whats-new-list">
                            {a.items.map((item) => (
                                <li key={item.title}>
                                    <strong>{item.title}</strong>
                                    <span>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                {latest.cta ? (
                    <div className="onboarding-actions">
                        <button type="button" className="btn btn-ghost" onClick={dismiss}>
                            Maybe later
                        </button>
                        <Link href={latest.cta.href} className="btn btn-primary" onClick={dismiss}>
                            {latest.cta.label}
                        </Link>
                    </div>
                ) : (
                    <button type="button" className="btn btn-primary consent-agree" onClick={dismiss}>
                        Got it
                    </button>
                )}
            </div>
        </Modal>
    );
}
