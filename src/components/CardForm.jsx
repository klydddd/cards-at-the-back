export default function CardForm({ index, front, back, onChange, onRemove, canRemove }) {
    return (
        <div className="card" style={{ position: 'relative' }}>
            <div className="flex-between mb-sm">
                <span className="text-sm text-muted light">Card {index + 1}</span>
                {canRemove && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onRemove}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                        Remove
                    </button>
                )}
            </div>
            <div className="field">
                <label className="label">Description (Front)</label>
                <textarea
                    className="textarea"
                    placeholder="Enter the description or definition..."
                    value={front}
                    onChange={(e) => onChange('front', e.target.value)}
                    rows={2}
                    style={{ minHeight: '72px' }}
                />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Term (Back)</label>
                <input
                    className="input"
                    placeholder="Enter the term or keyword..."
                    value={back}
                    onChange={(e) => onChange('back', e.target.value)}
                />
            </div>
        </div>
    );
}
