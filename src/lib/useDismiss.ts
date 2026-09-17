import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes a popover on outside click or Escape. Only listens while `open`
 * is true so idle menus cost nothing. `onClose` is read through a ref so
 * callers can pass an inline arrow without re-binding listeners each render.
 */
export function useDismiss(
    ref: RefObject<HTMLElement | null>,
    open: boolean,
    onClose: () => void
) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;

        const handlePointer = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) onCloseRef.current();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseRef.current();
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [ref, open]);
}
