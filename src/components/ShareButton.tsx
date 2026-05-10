"use client";

import { useState } from 'react';

interface ShareButtonProps {
    url: string;
    title: string;
    text?: string;
}

export default function ShareButton({ url, title, text }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

        if (navigator.share) {
            try {
                await navigator.share({ url: fullUrl, title, text });
            } catch {
                // user dismissed — ignore
            }
        } else {
            try {
                await navigator.clipboard.writeText(fullUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // clipboard unavailable — ignore
            }
        }
    };

    return (
        <button className="btn btn-ghost btn-sm" onClick={handleShare}>
            {copied ? 'Copied!' : 'Share'}
        </button>
    );
}
