"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseMarkdownToCards, parseOCRToQuestions, parseOCRToCards } from '@/lib/gemini';
import { extractTextFromPDF } from '@/lib/pdfParser';
import { extractTextFromDOCX, extractTextFromPPTX } from '@/lib/docParser';
import { extractTextFromImage, parseMCQFromText } from '@/lib/ocrParser';
import { createDeck, createCards, saveQuiz } from '@/lib/supabase';
import { FileTextIcon } from '@/components/Icons';
import type { QuizQuestion } from '@/types';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'];
const DOC_EXTENSIONS = ['.md', '.pdf', '.docx', '.pptx', '.ppt'];
const ALL_EXTENSIONS = [...DOC_EXTENSIONS, ...IMAGE_EXTENSIONS];

interface CardData {
    front: string;
    back: string;
}

export default function AIParse() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [parsedContent, setParsedContent] = useState('');
    const [cards, setCards] = useState<CardData[]>([]);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState('upload'); // upload | preview | save
    const [dragover, setDragover] = useState(false);
    const [isImageFile, setIsImageFile] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrProcessing, setOcrProcessing] = useState(false);

    // Mode: 'cards' for flashcards, 'mcq' for multiple-choice questions
    const [parseMode, setParseMode] = useState('cards');

    // Deck meta
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subject, setSubject] = useState('');
    const [creatorName, setCreatorName] = useState('');

    const handleFile = async (selectedFile) => {
        if (!selectedFile) return;

        const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
        if (!ALL_EXTENSIONS.includes(ext)) {
            setError('Unsupported file type. Accepted: documents (.md, .pdf, .docx, .pptx) and images (.png, .jpg, .jpeg, .webp, .bmp, .tiff)');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setQuestions([]);
        setCards([]);

        const imageFile = IMAGE_EXTENSIONS.includes(ext);
        setIsImageFile(imageFile);

        if (imageFile) {
            // OCR path
            setOcrProcessing(true);
            setOcrProgress(0);
            try {
                const textContent = await extractTextFromImage(selectedFile, (percent) => {
                    setOcrProgress(percent);
                });
                setParsedContent(textContent);
            } catch (err) {
                setError('Failed to read image with OCR: ' + err.message);
            } finally {
                setOcrProcessing(false);
            }
        } else {
            // Document path
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
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragover(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFile(droppedFile);
    };

    const autoSetTitle = () => {
        if (!title && file) {
            const name = file.name.replace(/\.(md|pdf|docx|pptx|ppt|png|jpg|jpeg|webp|bmp|tiff|tif)$/i, '').replace(/[-_]/g, ' ');
            setTitle(name);
        }
    };

    const generateCards = async () => {
        if (!parsedContent.trim()) {
            setError('No content to parse.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (parseMode === 'mcq') {
                // Extract MCQ questions from text (works for both OCR and documents)
                const extracted = await parseOCRToQuestions(parsedContent);
                setQuestions(extracted);
                setCards([]);
            } else if (isImageFile) {
                // Extract flashcards from OCR text
                const generated = await parseOCRToCards(parsedContent);
                setCards(generated);
                setQuestions([]);
            } else {
                // Standard document flow — flashcards
                const generated = await parseMarkdownToCards(parsedContent);
                setCards(generated);
                setQuestions([]);
            }
            setStep('preview');
            autoSetTitle();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const extractWithTesseractOnly = () => {
        if (!parsedContent.trim()) {
            setError('No content to parse.');
            return;
        }

        setError(null);

        try {
            const extracted = parseMCQFromText(parsedContent);
            if (extracted.length === 0) {
                setError('Tesseract could not detect any MCQ patterns in the text. Try "Extract with AI" for better results, or check the OCR preview above.');
                return;
            }
            setQuestions(extracted);
            setCards([]);
            setStep('preview');
            autoSetTitle();
        } catch (err: any) {
            setError(err.message || 'Failed to parse questions from OCR text.');
        }
    };

    const updateCard = (index, field, value) => {
        setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    };

    const removeCard = (index) => {
        setCards((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuestion = (index, field, value) => {
        setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
    };

    const updateQuestionOption = (qIndex, optIndex, value) => {
        setQuestions((prev) => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const newOptions = [...(q.options || [])];
            newOptions[optIndex] = value;
            return { ...q, options: newOptions };
        }));
    };

    const removeQuestion = (index) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index));
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
            router.push(`/deck/${deck.id}`);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    const saveQuizDeck = async () => {
        if (!title.trim()) {
            setError('Please add a title.');
            return;
        }
        if (questions.length < 1) {
            setError('You need at least 1 question.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // First create a deck to associate the quiz with
            const deck = await createDeck(title.trim(), description.trim(), creatorName.trim() || 'Anonymous', subject.trim());

            // Also create cards from the questions (question→front, answer→back)
            const cardsFromQuestions = questions.map((q) => ({
                front: q.question || '',
                back: typeof q.answer === 'boolean' ? (q.answer ? 'True' : 'False') : String(q.answer),
            }));
            await createCards(deck.id, cardsFromQuestions);

            // Save the quiz itself
            const questionTypes = [...new Set(questions.map(q => q.type))];
            await saveQuiz(
                deck.id,
                creatorName.trim() || 'Anonymous',
                questions,
                questionTypes,
                subject.trim(),
                'quick'
            );

            router.push(`/deck/${deck.id}`);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    const isMCQMode = parseMode === 'mcq';
    const hasResults = isMCQMode ? questions.length > 0 : cards.length > 0;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '720px' }}>
                <h1 className="mb-sm">AI Parse</h1>
                <p className="mb-lg">
                    Upload a document or image file and let AI extract flashcards or quiz questions automatically.
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
                                Documents: .md, .pdf, .docx, .pptx
                            </p>
                            <p className="text-sm" style={{ marginTop: '2px', opacity: 0.7 }}>
                                Images (OCR): .png, .jpg, .jpeg, .webp, .bmp, .tiff
                            </p>
                            {file && <p className="file-name">{file.name}</p>}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ALL_EXTENSIONS.join(',')}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files?.[0])}
                            id="file-input"
                        />

                        {/* OCR Progress Indicator */}
                        {ocrProcessing && (
                            <div className="card mt-md" style={{ padding: '20px' }}>
                                <div className="flex-center gap-sm mb-sm">
                                    <span className="spinner"></span>
                                    <span className="text-sm bold">Performing OCR... {ocrProgress}%</span>
                                </div>
                                <div className="progress-bar-track">
                                    <div className="progress-bar-fill" style={{ width: `${ocrProgress}%` }}></div>
                                </div>
                                <p className="text-sm text-muted mt-sm" style={{ textAlign: 'center' }}>
                                    Extracting text from image using Tesseract OCR
                                </p>
                            </div>
                        )}

                        {parsedContent && !ocrProcessing && (
                            <div className="mt-md">
                                {/* Mode toggle — shown for all file types */}
                                <div className="card mb-md" style={{ padding: '16px 20px' }}>
                                    <p className="text-sm bold mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                                        What would you like to extract?
                                    </p>
                                    <div className="flex gap-sm">
                                        <button
                                            className={`btn ${parseMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setParseMode('cards')}
                                            style={{ flex: 1 }}
                                            id="mode-cards-btn"
                                        >
                                            📇 Flashcards
                                        </button>
                                        <button
                                            className={`btn ${parseMode === 'mcq' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setParseMode('mcq')}
                                            style={{ flex: 1 }}
                                            id="mode-mcq-btn"
                                        >
                                            ✅ Multiple Choice Quiz
                                        </button>
                                    </div>
                                </div>

                                <div className="card" style={{ maxHeight: '200px', overflow: 'auto' }}>
                                    <div className="flex-between mb-sm">
                                        <p className="text-sm text-muted">
                                            {isImageFile ? 'OCR' : 'Preview'} ({parsedContent.length} characters extracted)
                                        </p>
                                        {isImageFile && (
                                            <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                                                Tesseract OCR
                                            </span>
                                        )}
                                    </div>
                                    <pre
                                        style={{
                                            fontFamily: 'var(--font)',
                                            fontSize: '0.82rem',
                                            whiteSpace: 'pre-wrap',
                                            color: 'var(--text-secondary)',
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
                                            <span className="spinner"></span>
                                            {isMCQMode ? 'Extracting questions...' : 'Generating cards...'}
                                        </span>
                                    ) : (
                                        parseMode === 'mcq'
                                            ? '🤖 Extract MCQ with AI'
                                            : (isImageFile ? 'Generate Cards from OCR' : 'Generate Cards with AI')
                                    )}
                                </button>

                                {/* Tesseract-only button — no AI, pure regex parsing */}
                                {isImageFile && parseMode === 'mcq' && (
                                    <button
                                        className="btn btn-secondary btn-lg mt-sm"
                                        style={{ width: '100%' }}
                                        onClick={extractWithTesseractOnly}
                                        disabled={loading}
                                        id="tesseract-only-btn"
                                    >
                                        🔍 Extract with Tesseract Only (No AI)
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Preview & Edit — Cards mode */}
                {step === 'preview' && !isMCQMode && cards.length > 0 && (
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

                {/* Step 2: Preview & Edit — MCQ mode */}
                {step === 'preview' && isMCQMode && questions.length > 0 && (
                    <>
                        <div className="flex-between mb-md">
                            <h2>{questions.length} questions extracted</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setStep('upload')}>
                                ← Re-upload
                            </button>
                        </div>

                        <div className="flex" style={{ flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                            {questions.map((q, i) => (
                                <div key={i} className="card" style={{ padding: '16px 20px' }}>
                                    <div className="flex-between mb-sm">
                                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                            <span className="text-sm text-muted light">Question {i + 1}</span>
                                            <span className="badge" style={{ fontSize: '0.65rem' }}>
                                                {q.type === 'multiple_choice' ? 'MCQ' : q.type === 'true_false' ? 'T/F' : 'ID'}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeQuestion(i)}
                                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <div className="field">
                                        <label className="label">Question</label>
                                        <textarea
                                            className="textarea"
                                            value={q.question}
                                            onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                                            rows={2}
                                            style={{ minHeight: '60px' }}
                                        />
                                    </div>

                                    {q.type === 'multiple_choice' && q.options && (
                                        <div className="field">
                                            <label className="label">Options</label>
                                            {q.options.map((opt, oi) => (
                                                <div key={oi} className="flex gap-sm mb-sm" style={{ alignItems: 'center' }}>
                                                    <span
                                                        className="text-sm bold"
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            fontSize: '0.7rem',
                                                            background: opt === q.answer ? 'var(--success)' : 'var(--border)',
                                                            color: opt === q.answer ? '#fff' : 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        {String.fromCharCode(65 + oi)}
                                                    </span>
                                                    <input
                                                        className="input"
                                                        value={opt}
                                                        onChange={(e) => updateQuestionOption(i, oi, e.target.value)}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <button
                                                        className={`btn btn-sm ${opt === q.answer ? 'btn-primary' : 'btn-ghost'}`}
                                                        onClick={() => updateQuestion(i, 'answer', opt)}
                                                        title="Mark as correct answer"
                                                        style={{ fontSize: '0.7rem', padding: '4px 8px', minHeight: '28px' }}
                                                    >
                                                        ✓
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'true_false' && (
                                        <div className="field" style={{ marginBottom: 0 }}>
                                            <label className="label">Correct Answer</label>
                                            <div className="flex gap-sm">
                                                <button
                                                    className={`btn ${q.answer === true ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => updateQuestion(i, 'answer', true)}
                                                    style={{ flex: 1 }}
                                                >
                                                    True
                                                </button>
                                                <button
                                                    className={`btn ${q.answer === false ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => updateQuestion(i, 'answer', false)}
                                                    style={{ flex: 1 }}
                                                >
                                                    False
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {q.type === 'identification' && (
                                        <div className="field" style={{ marginBottom: 0 }}>
                                            <label className="label">Answer</label>
                                            <input
                                                className="input"
                                                value={q.answer as string}
                                                onChange={(e) => updateQuestion(i, 'answer', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Save section for quiz */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 className="mb-md">Save as Deck + Quiz</h3>
                            <p className="text-sm text-muted mb-md">
                                This will create a deck with flashcards derived from the questions, plus save the quiz so it can be taken.
                            </p>

                            <div className="field">
                                <label className="label">Title</label>
                                <input
                                    className="input"
                                    placeholder="e.g. Biology Midterm MCQ"
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
                                onClick={saveQuizDeck}
                                disabled={saving}
                                id="save-quiz-btn"
                            >
                                {saving ? 'Saving...' : `Save Deck & ${questions.length} Questions`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
