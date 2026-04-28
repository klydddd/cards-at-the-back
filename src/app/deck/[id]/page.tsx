"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDeck, fetchCards, fetchQuizChallengesByDeck } from '@/lib/supabase';
import { getLearnedCardIds, loadSRSProgress, getDueCount } from '@/lib/tracking';
import { formatInterval } from '@/lib/srs';
import { WandIcon } from '@/components/Icons';
import type { Card, CardProgress, Deck, Quiz } from '@/types';

export default function DeckView() {
    const { id } = useParams<{ id: string }>();
    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [learnedCount, setLearnedCount] = useState(0);
    const [challenges, setChallenges] = useState<Quiz[]>([]);
    const [dueCount, setDueCount] = useState(0);
    const [srsProgress, setSrsProgress] = useState<Record<string, CardProgress>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedChallengeId, setCopiedChallengeId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [d, c, q] = await Promise.all([fetchDeck(id), fetchCards(id), fetchQuizChallengesByDeck(id)]);
                setDeck(d);
                setCards(c);
                setChallenges(q);

                const learned = getLearnedCardIds(id);
                const count = c.filter(card => learned.has(card.id)).length;
                setLearnedCount(count);

                const progress = await loadSRSProgress(id);
                setSrsProgress(progress);
                setDueCount(getDueCount(progress, c));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

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
                </div>
            </div>
        );

    const notLearnedCount = cards.length - learnedCount;

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const copyChallengeLink = async (quizId) => {
        const shareUrl = `${window.location.origin}/take/${quizId}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopiedChallengeId(quizId);
        window.setTimeout(() => {
            setCopiedChallengeId((current) => current === quizId ? null : current);
        }, 2000);
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '720px' }}>
                <div className="mb-lg">
                    <Link href="/" className="btn btn-ghost btn-sm" style={{ marginLeft: '-16px', marginBottom: '12px' }}>
                        ← Back
                    </Link>
                    <h1>{deck?.title}</h1>
                    {deck?.description && <p style={{ marginTop: '8px' }}>{deck.description}</p>}
                    <div className="flex gap-sm mt-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge">{cards.length} cards</span>
                        {cards.length > 0 && (
                            <span className="badge badge-success">
                                {learnedCount} learned · {notLearnedCount} learning
                            </span>
                        )}
                        {dueCount > 0 && (
                            <span className="badge badge-warning">
                                {dueCount} due for review
                            </span>
                        )}
                        <span className="text-sm text-muted light" style={{ marginLeft: '4px' }}>by {deck?.creator_name}</span>
                    </div>
                </div>

                <div className="mb-lg flex gap-md" style={{ flexWrap: 'wrap' }}>
                    {dueCount > 0 && (
                        <Link href={`/deck/${id}/review`} className="btn btn-primary btn-lg" style={{ background: 'var(--purple)', color: 'var(--surface)', borderColor: 'var(--purple)' }}>
                            Review Due Cards ({dueCount})
                        </Link>
                    )}
                    <Link href={`/deck/${id}/practice`} className={`btn ${dueCount > 0 ? 'btn-secondary' : 'btn-primary'} btn-lg`}>
                        Practice All
                    </Link>
                    {notLearnedCount > 0 && notLearnedCount < cards.length && (
                        <Link href={`/deck/${id}/practice?filter=not-learned`} className="btn btn-secondary btn-lg">
                            Practice Not Learned ({notLearnedCount})
                        </Link>
                    )}
                    <Link href={`/deck/${id}/quiz`} className="btn btn-secondary btn-lg" style={{ background: 'var(--purple-light)', color: 'var(--purple-dark)', borderColor: 'var(--purple-border)' }}>
                        <WandIcon size={16} /> AI Quiz
                    </Link>
                    {cards.length >= 4 && (
                        <Link href={`/deck/${id}/quick-quiz`} className="btn btn-secondary btn-lg">
                            Quick Quiz
                        </Link>
                    )}
                </div>

                <h2 className="mb-md">All Cards</h2>
                <div className="flex" style={{ flexDirection: 'column', gap: '8px' }}>
                    {cards.map((card) => {
                        const isLearned = getLearnedCardIds(id).has(card.id);
                        const progress = srsProgress[card.id];
                        const isDueNow = !progress || new Date(progress.due_date) <= new Date();
                        return (
                            <div key={card.id} className="card" style={{ padding: '16px 20px', borderLeft: isLearned ? `4px solid var(--success)` : isDueNow && progress ? `4px solid var(--warning)` : '1.5px solid var(--border)' }}>
                                <div className="flex-between gap-md">
                                    <div style={{ flex: 1 }}>
                                        <p className="text-sm text-muted light" style={{ marginBottom: '2px' }}>
                                            Description
                                        </p>
                                        <p style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>{card.front}</p>
                                    </div>
                                    <div className="divider" style={{ margin: '0 8px' }}></div>
                                    <div style={{ flex: 0, minWidth: '120px' }}>
                                        <p className="text-sm text-muted light" style={{ marginBottom: '2px' }}>
                                            Term
                                        </p>
                                        <p style={{ fontWeight: 700 }}>{card.back}</p>
                                        {progress && (
                                            <p className="text-sm light" style={{ marginTop: '4px', color: isDueNow ? 'var(--warning-dark)' : 'var(--text-faint)', fontSize: '0.7rem' }}>
                                                {isDueNow ? 'Due now' : `Next: ${formatInterval(progress.interval)}`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {challenges.length > 0 && (
                    <div style={{ marginTop: '48px' }}>
                        <h2 className="mb-md">Published Challenges</h2>
                        <div className="flex" style={{ flexDirection: 'column', gap: '10px' }}>
                            {challenges.map((quiz) => (
                                <div key={quiz.id} className="card" style={{ padding: '16px 20px' }}>
                                    <div className="flex-between gap-md" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                {quiz.questions?.length || 0} questions
                                            </p>
                                            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                                <span className="badge badge-purple">
                                                    {quiz.source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'}
                                                </span>
                                                {quiz.question_types.map((type) => (
                                                    <span key={type} className="badge" style={{ fontSize: '0.7rem' }}>
                                                        {type.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-sm text-muted light" style={{ marginTop: '8px' }}>
                                                {quiz.creator_name} · {formatDate(quiz.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <Link href={`/take/${quiz.id}`} className="btn btn-primary btn-sm">
                                                Open Challenge
                                            </Link>
                                            <Link href={`/deck/${id}/quiz/${quiz.id}`} className="btn btn-secondary btn-sm">
                                                Review Questions
                                            </Link>
                                            <button className="btn btn-ghost btn-sm" onClick={() => copyChallengeLink(quiz.id)}>
                                                {copiedChallengeId === quiz.id ? 'Copied' : 'Copy Link'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
