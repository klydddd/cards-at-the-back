"use client";

import { useState } from 'react';
import { CONTACT_EMAIL, CONTACT_TOPICS, type ContactTopic } from '@/lib/legal';

const PLACEHOLDERS: Record<ContactTopic, string> = {
    general: 'What would you like to ask?',
    feedback: 'What happened, or what would you like to see? For bugs, include the steps and the page it happened on.',
    removal: 'Tell us which deck, quiz, or leaderboard name should be removed and why.',
    abuse: 'Describe what breaks the Terms and where you saw it.',
    privacy: 'Tell us what you would like to access, correct, or delete, and the name used on gokards.',
};

const NEEDS_LINK: ContactTopic[] = ['removal', 'abuse', 'privacy', 'feedback'];

export default function ContactForm({ initialTopic }: { initialTopic: ContactTopic }) {
    const [topic, setTopic] = useState<ContactTopic>(initialTopic);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [link, setLink] = useState('');
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatus('sending');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, name, email, link, message, website }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Your message could not be sent.');
            }
            setStatus('sent');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Your message could not be sent.');
            setStatus('idle');
        }
    };

    if (status === 'sent') {
        return (
            <div className="index-card contact-card" role="status">
                <div className="index-card-head">Message sent</div>
                <div className="index-card-body contact-sent">
                    <h2>Thanks, we got it.</h2>
                    <p>
                        We&apos;ll reply to <strong>{email}</strong>, usually within a few days.
                    </p>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setMessage('');
                            setLink('');
                            setStatus('idle');
                        }}
                    >
                        Send another message
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form className="index-card contact-card" onSubmit={handleSubmit}>
            <div className="index-card-head">Send a message</div>
            <div className="index-card-body contact-form">
                <fieldset className="field">
                    <legend className="label">Topic</legend>
                    <div className="chip-row">
                        {CONTACT_TOPICS.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                className={`chip ${topic === t.value ? 'is-active' : ''}`}
                                aria-pressed={topic === t.value}
                                onClick={() => setTopic(t.value)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <div className="contact-row">
                    <div className="field">
                        <label className="label" htmlFor="contact-name">Name <span className="contact-optional">(optional)</span></label>
                        <input
                            id="contact-name"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                            autoComplete="name"
                        />
                    </div>
                    <div className="field">
                        <label className="label" htmlFor="contact-email">Email</label>
                        <input
                            id="contact-email"
                            className="input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={254}
                            autoComplete="email"
                            required
                        />
                    </div>
                </div>

                {NEEDS_LINK.includes(topic) && (
                    <div className="field">
                        <label className="label" htmlFor="contact-link">Link to the deck, quiz, or page <span className="contact-optional">(optional)</span></label>
                        <input
                            id="contact-link"
                            className="input"
                            type="url"
                            placeholder="https://"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            maxLength={500}
                        />
                    </div>
                )}

                <div className="field">
                    <label className="label" htmlFor="contact-message">Message</label>
                    <textarea
                        id="contact-message"
                        className="textarea"
                        placeholder={PLACEHOLDERS[topic]}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        minLength={10}
                        maxLength={5000}
                        rows={6}
                        required
                    />
                </div>

                {/* Honeypot for bots, hidden from people and screen readers */}
                <div className="contact-honeypot" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                        id="contact-website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="error-box" role="alert">
                        {error} You can also email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                    </div>
                )}

                <button type="submit" className="btn btn-primary contact-submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
            </div>
        </form>
    );
}
