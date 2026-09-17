"use client";

export const PAGE_SIZE = 21;

export function pageCount(totalItems: number) {
    return Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
}

export function paginate<T>(items: T[], page: number): T[] {
    return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

// First, last, and the current page's neighbours; gaps collapse to an ellipsis.
function pageNumbers(page: number, total: number): (number | 'gap')[] {
    const keep = new Set([1, total, page - 1, page, page + 1]);
    const result: (number | 'gap')[] = [];
    for (let n = 1; n <= total; n++) {
        if (keep.has(n)) result.push(n);
        else if (result[result.length - 1] !== 'gap') result.push('gap');
    }
    return result;
}

interface PaginationProps {
    page: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalItems, onPageChange }: PaginationProps) {
    if (totalItems <= PAGE_SIZE) return null;

    const total = pageCount(totalItems);
    const first = (page - 1) * PAGE_SIZE + 1;
    const last = Math.min(page * PAGE_SIZE, totalItems);

    return (
        <nav className="pagination" aria-label="Pagination">
            <div className="pagination-controls">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Prev
                </button>
                {pageNumbers(page, total).map((n, i) =>
                    n === 'gap' ? (
                        <span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">
                            …
                        </span>
                    ) : (
                        <button
                            key={n}
                            type="button"
                            className={`chip ${n === page ? 'is-active' : ''}`}
                            aria-current={n === page ? 'page' : undefined}
                            aria-label={`Page ${n}`}
                            onClick={() => onPageChange(n)}
                        >
                            {n}
                        </button>
                    )
                )}
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page >= total}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </button>
            </div>
            <p className="text-muted pagination-summary">
                Showing {first}–{last} of {totalItems}
            </p>
        </nav>
    );
}
