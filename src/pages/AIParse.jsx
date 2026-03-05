import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseMarkdownToCards } from '../lib/gemini';
import { extractTextFromPDF } from '../lib/pdfParser';
import { extractTextFromDOCX, extractTextFromPPTX } from '../lib/docParser';
import { createDeck, createCards } from '../lib/supabase';
import { FileTextIcon } from '../components/Icons';

export default function AIParse() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [parsedContent, setParsedContent] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('upload'); // upload | preview | save
    const [dragover, setDragover] = useState(false);

    // Deck meta
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subject, setSubject] = useState('');
    const [creatorName, setCreatorName] = useState('');

    const acceptedTypes = ['.md', '.pdf', '.docx', '.pptx', '.ppt'];

    const handleFile = async (selectedFile) => {
        if (!selectedFile) return;

        const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
        if (!acceptedTypes.includes(ext)) {
            setError('Only .md, .pdf, .docx, and .pptx files are accepted.');
            return;
        }

        setFile(selectedFile);
        setError(null);

        try {
            let textContent;
            if (ext === '.pdf') {
                textContent = await extractTextFromPDF(selectedFile);
            } else if (ext === '.docx') {
                textContent = await extractTextFromDOCX(selectedFile);
            } else if (ext === '.pptx' || ext === '.ppt') {
                textContent = await extractTextFromPPTX(selectedFile);
            } else {
                textContent = await selectedFile.text();
            }
            setParsedContent(textContent);
        } catch (err) {
            setError('Failed to read the file: ' + err.message);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragover(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFile(droppedFile);
    };

    const generateCards = async () => {
        if (!parsedContent.trim()) {
            setError('No content to parse.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const generated = await parseMarkdownToCards(parsedContent);
            setCards(generated);
            setStep('preview');
            // Auto-set title from filename
            if (!title && file) {
                const name = file.name.replace(/\.(md|pdf|docx|pptx|ppt)$/i, '').replace(/[-_]/g, ' ');
                setTitle(name);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateCard = (index, field, value) => {
        setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    };

    const removeCard = (index) => {
        setCards((prev) => prev.filter((_, i) => i !== index));
    };

    const saveDeck = async () => {
        if (!title.trim()) {
            setError('Please add a title.');
            return;
        }
        if (cards.length < 2) {
            setError('You need at least 2 cards.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const deck = await createDeck(title.trim(), description.trim(), creatorName.trim() || 'Anonymous', subject.trim());
            await createCards(deck.id, cards);
            navigate(`/deck/${deck.id}`);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '720px' }}>
                <h1 className="mb-sm">AI Parse</h1>
                <p className="mb-lg">
                    Upload a markdown or PDF file and let AI extract flashcards automatically.
                </p>

                {error && <div className="error-box">{error}</div>}

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <>
                        <div
                            className={`file-drop-zone ${dragover ? 'dragover' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragover(true);
                            }}
                            onDragLeave={() => setDragover(false)}
                            onDrop={handleDrop}
                            id="file-drop-zone"
                        >
                            <div style={{ marginBottom: '8px' }}>
                                <FileTextIcon size={32} style={{ opacity: 0.5 }} />
                            </div>
                            <p>
                                <strong>Drop your file here</strong> or click to browse
                            </p>
                            <p className="text-sm" style={{ marginTop: '4px' }}>
                                Accepts .md, .pdf, .docx, and .pptx files
                            </p>
                            {file && <p className="file-name">{file.name}</p>}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,.pdf,.docx,.pptx,.ppt"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files[0])}
                            id="file-input"
                        />

                        {parsedContent && (
                            <div className="mt-md">
                                <div className="card" style={{ maxHeight: '200px', overflow: 'auto' }}>
                                    <p className="text-sm text-muted mb-sm">
                                        Preview ({parsedContent.length} characters extracted)
                                    </p>
                                    <pre
                                        style={{
                                            fontFamily: 'var(--font)',
                                            fontSize: '0.82rem',
                                            whiteSpace: 'pre-wrap',
                                            color: 'var(--gray-600)',
                                            fontWeight: 300,
                                        }}
                                    >
                                        {parsedContent.slice(0, 1000)}
                                        {parsedContent.length > 1000 && '...'}
                                    </pre>
                                </div>

                                <button
                                    className="btn btn-primary btn-lg mt-md"
                                    style={{ width: '100%' }}
                                    onClick={generateCards}
                                    disabled={loading}
                                    id="generate-cards-btn"
                                >
                                    {loading ? (
                                        <span className="flex-center gap-sm">
                                            <span className="spinner"></span> Generating cards...
                                        </span>
                                    ) : (
                                        'Generate Cards with AI'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Preview & Edit Cards */}
                {step === 'preview' && (
                    <>
                        <div className="flex-between mb-md">
                            <h2>{cards.length} cards generated</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setStep('upload')}>
                                ← Re-upload
                            </button>
                        </div>

                        <div className="flex" style={{ flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            {cards.map((card, i) => (
                                <div key={i} className="card" style={{ padding: '16px 20px' }}>
                                    <div className="flex-between mb-sm">
                                        <span className="text-sm text-muted light">Card {i + 1}</span>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeCard(i)}
                                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="field">
                                        <label className="label">Description (Front)</label>
                                        <textarea
                                            className="textarea"
                                            value={card.front}
                                            onChange={(e) => updateCard(i, 'front', e.target.value)}
                                            rows={2}
                                            style={{ minHeight: '60px' }}
                                        />
                                    </div>
                                    <div className="field" style={{ marginBottom: 0 }}>
                                        <label className="label">Term (Back)</label>
                                        <input
                                            className="input"
                                            value={card.back}
                                            onChange={(e) => updateCard(i, 'back', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save section */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 className="mb-md">Save as Deck</h3>

                            <div className="field">
                                <label className="label">Title</label>
                                <input
                                    className="input"
                                    placeholder="e.g. Biology 101"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    id="ai-deck-title"
                                />
                            </div>

                            <div className="field">
                                <label className="label">Description (optional)</label>
                                <input
                                    className="input"
                                    placeholder="A brief description..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label className="label">Subject</label>
                                <input
                                    className="input"
                                    placeholder="e.g. OPS1, Biology, History"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label className="label">Your Name</label>
                                <input
                                    className="input"
                                    placeholder="Anonymous"
                                    value={creatorName}
                                    onChange={(e) => setCreatorName(e.target.value)}
                                />
                            </div>

                            <button
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                                onClick={saveDeck}
                                disabled={saving}
                                id="save-deck-btn"
                            >
                                {saving ? 'Saving...' : 'Save Deck'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
