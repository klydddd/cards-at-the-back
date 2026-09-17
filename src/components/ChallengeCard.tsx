"use client";

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/formatDate';
import { subjectHue } from '@/lib/subjectHue';
import type { ChallengeListItem, ChallengeStats } from '@/types';

export default function ChallengeCard({
    challenge,
    stats,
    completed,
}: {
    challenge: ChallengeListItem;
    stats?: ChallengeStats;
    completed: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const questionCount = challenge.questions?.length || 0;
    const subject =
        challenge.subject?.trim() || challenge.decks?.subject?.trim() || 'General';
    const deckTitle = challenge.decks?.title || 'Untitled deck';

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/take/${challenge.id}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable (insecure origin, denied permission) — leave the label alone
        }
    };

    const renderStats = () => {
        if (!stats || stats.players === 0) return 'No attempts yet';

        const players = `${stats.players} ${stats.players === 1 ? 'player' : 'players'}`;
        return stats.topPercent === null ? players : `${players} · top ${stats.topPercent}%`;
    };

    return (
        <div
            className="index-card challenge-card"
            data-hue={subjectHue(subject === 'General' ? deckTitle : subject)}
        >
            <div className="index-card-head">
                <span>{subject}</span>
                <span>{questionCount} questions</span>
            </div>
            <div className="index-card-body">
                <h3>{deckTitle}</h3>

                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <span className="badge badge-purple">
                        {challenge.source_kind === 'quick' ? 'Quick challenge' : 'AI challenge'}
                    </span>
                    {completed && <span className="badge badge-success">Completed</span>}
                    {(challenge.question_types || []).map((type) => (
                        <span key={type} className="badge" style={{ fontSize: '0.7rem' }}>
                            {type.replace('_', ' ')}
                        </span>
                    ))}
                </div>

                <p className="text-sm text-muted" style={{ margin: 0 }}>{renderStats()}</p>

                <p className="text-sm text-muted light" style={{ margin: 0 }}>
                    {challenge.creator_name} · {formatDate(challenge.created_at)}
                </p>

                <div className="challenge-card-actions">
                    <Link href={`/take/${challenge.id}`} className="btn btn-primary btn-sm">
                        Open Challenge
                    </Link>
                    {/* The answer key is only offered once this browser has finished the challenge */}
                    {completed && (
                        <Link
                            href={`/deck/${challenge.deck_id}/quiz/${challenge.id}`}
                            className="btn btn-secondary btn-sm"
                        >
                            Review Questions
                        </Link>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
                        {copied ? 'Copied' : 'Copy Link'}
                    </button>
                </div>
            </div>
        </div>
    );
}
