"use client";

export default function CardForm({ index, front, back, onChange, onRemove, canRemove, disabled = false }: { index: number, front: string, back: string, onChange: (field: string, value: string) => void, onRemove: () => void, canRemove: boolean, disabled?: boolean }) {
    return (
        <div className="index-card">
            <div className="index-card-head">
                <span>Kard {index + 1}</span>
                {canRemove && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm index-card-head-action"
                        onClick={onRemove}
                        tabIndex={-1}
                    >
                        Remove
                    </button>
                )}
            </div>
            <div className="index-card-body" style={{ gap: 0, padding: '18px 22px 20px' }}>
                <div className="field">
                    <label className="label">Term (Back)</label>
                    <input
                        className="input"
                        placeholder="Enter the term or keyword..."
                        value={back}
                        onChange={(e) => onChange('back', e.target.value)}
                        disabled={disabled}
                    />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label">Description (Front)</label>
                    <textarea
                        className="textarea"
                        placeholder="Enter the description or definition..."
                        value={front}
                        onChange={(e) => onChange('front', e.target.value)}
                        rows={2}
                        style={{ minHeight: '72px' }}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
