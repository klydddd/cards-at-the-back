"use client";

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
    open: boolean;
    // Omit to make the modal mandatory: Esc and backdrop clicks do nothing
    onClose?: () => void;
    labelledBy: string;
    describedBy?: string;
    // Small uppercase label in the index card header strip
    head: ReactNode;
    headAction?: ReactNode;
    className?: string;
    children: ReactNode;
}

const FOCUSABLE = 'a[href], button, input, select, textarea';

// Index-card dialog with scroll lock, focus trap, and focus restore on close
export default function Modal({
    open,
    onClose,
    labelledBy,
    describedBy,
    head,
    headAction,
    className,
    children,
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onCloseRef.current) {
                e.preventDefault();
                onCloseRef.current();
                return;
            }

            // Keep keyboard focus inside the dialog
            if (e.key !== 'Tab' || !dialogRef.current) return;
            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
            ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
            if (focusable.length === 0) return;
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
            if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                ref={dialogRef}
                className={`index-card modal-dialog${className ? ` ${className}` : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
            >
                <div className="index-card-head">
                    <span>{head}</span>
                    {headAction}
                </div>
                {children}
            </div>
        </div>
    );
}
