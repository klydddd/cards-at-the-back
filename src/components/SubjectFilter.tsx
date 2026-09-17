"use client";

import { useId, useRef, useState } from 'react';
import { ChevronDownIcon } from './Icons';
import { useDismiss } from '@/lib/useDismiss';

interface Props {
    subjects: string[];
    selected: string[];
    onChange: (next: string[]) => void;
}

const labelFor = (selected: string[]) => {
    if (selected.length === 0) return 'All subjects';
    if (selected.length === 1) return selected[0];
    return `${selected.length} subjects`;
};

export default function SubjectFilter({ subjects, selected, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    useDismiss(rootRef, open, () => setOpen(false));

    if (subjects.length === 0) return null;

    const toggle = (subject: string, checked: boolean) => {
        onChange(checked ? [...selected, subject] : selected.filter((s) => s !== subject));
    };

    return (
        <div className="menu subject-filter" ref={rootRef}>
            <button
                type="button"
                className="btn btn-secondary subject-filter-toggle"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((o) => !o)}
            >
                <span>{labelFor(selected)}</span>
                <ChevronDownIcon
                    size={16}
                    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition)' }}
                />
            </button>

            {open && (
                <div id={listId} className="menu-list subject-filter-list" role="group" aria-label="Filter by subject">
                    <div className="subject-filter-options">
                        {subjects.map((subject) => (
                            <label key={subject} className="menu-item subject-filter-option">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(subject)}
                                    onChange={(e) => toggle(subject, e.target.checked)}
                                />
                                <span>{subject}</span>
                            </label>
                        ))}
                    </div>
                    {selected.length > 0 && (
                        <div className="subject-filter-footer">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([])}>
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
