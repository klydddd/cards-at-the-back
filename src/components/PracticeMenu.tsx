"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDownIcon } from './Icons';

export default function PracticeMenu({ deckId, dueCount }: { deckId: string, dueCount: number }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handlePointer = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    return (
        <div className="menu" ref={rootRef}>
            <button
                type="button"
                className="btn btn-primary btn-lg"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                Practice
                {dueCount > 0 && <span className="menu-count">{dueCount} due</span>}
                <ChevronDownIcon size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }} />
            </button>

            {open && (
                <div className="menu-list" role="menu">
                    {dueCount > 0 ? (
                        <Link href={`/deck/${deckId}/review`} className="menu-item" role="menuitem">
                            <span>Practice due kards</span>
                            <span className="menu-item-meta">{dueCount}</span>
                        </Link>
                    ) : (
                        <span className="menu-item is-disabled" role="menuitem" aria-disabled="true">
                            <span>Practice due kards</span>
                            <span className="menu-item-meta">None due</span>
                        </span>
                    )}
                    <Link href={`/deck/${deckId}/practice`} className="menu-item" role="menuitem">
                        <span>Practice all</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
