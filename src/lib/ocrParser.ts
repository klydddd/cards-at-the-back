import Tesseract from 'tesseract.js';
import type { QuizQuestion } from '@/types';

/**
 * Extract text from an image file using Tesseract.js OCR.
 * Supports PNG, JPG, JPEG, WEBP, BMP, TIFF.
 *
 * @param file - The image File object to process
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns The recognized text string
 */
export async function extractTextFromImage(
    file: File,
    onProgress?: (percent: number) => void
): Promise<string> {
    // Convert the File to an object URL for Tesseract
    const imageUrl = URL.createObjectURL(file);

    try {
        const result = await Tesseract.recognize(imageUrl, 'eng', {
            logger: (info: { status: string; progress: number }) => {
                if (info.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(info.progress * 100));
                }
            },
        });

        return result.data.text.trim();
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

/**
 * Extract text from multiple image files and concatenate them.
 * Useful for multi-page scanned documents.
 */
export async function extractTextFromImages(
    files: File[],
    onProgress?: (fileIndex: number, percent: number) => void
): Promise<string> {
    const texts: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const text = await extractTextFromImage(files[i], (percent) => {
            onProgress?.(i, percent);
        });
        texts.push(text);
    }

    return texts.join('\n\n---\n\n').trim();
}

// ─── Local MCQ Parser (No AI) ─────────────────────────────────────────

/**
 * Parse OCR text into MCQ questions using regex heuristics.
 * No AI is involved — purely pattern-matching.
 *
 * Detects common patterns:
 *   1. Question text       |   Q1. Question text
 *      A. option            |      a) option
 *      B. option            |      b) option
 *      C. option            |      c) option
 *      D. option            |      d) option
 */
export function parseMCQFromText(rawText: string): QuizQuestion[] {
    const lines = rawText.split('\n').map(l => l.trimEnd());
    const questions: QuizQuestion[] = [];

    // Patterns for detecting a question line (numbered)
    // Matches: "1.", "1)", "Q1.", "Q1)", "Q1:", "#1", "1 .", "1-", "Question 1", etc.
    const questionStartRegex = /^(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.):\-]\s*(.+)/i;

    // Patterns for detecting an option line
    // Matches: "A.", "A)", "a.", "a)", "A-", "A:", "(A)", "(a)" etc.
    const optionRegex = /^\s*(?:\(?([A-Da-d])\)?)\s*[.):\-]\s*(.+)/;
    // Also match uppercase letter at start without separator if followed by reasonable text
    const optionLooseRegex = /^\s*\(?([A-Da-d])\)?\s+(.{2,})/;

    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) { i++; continue; }

        // Try to match a question start
        const qMatch = line.match(questionStartRegex);
        if (!qMatch) { i++; continue; }

        let questionText = qMatch[2].trim();
        i++;

        // Collect continuation lines of the question (before options start)
        while (i < lines.length) {
            const nextLine = lines[i].trim();
            if (!nextLine) { i++; continue; }
            // Check if this line is an option
            if (optionRegex.test(nextLine) || optionLooseRegex.test(nextLine)) break;
            // Check if this line is a new question
            if (questionStartRegex.test(nextLine)) break;
            // It's a continuation of the question text
            questionText += ' ' + nextLine;
            i++;
        }

        // Now collect options
        const options: string[] = [];
        const expectedLetters = ['a', 'b', 'c', 'd'];

        while (i < lines.length && options.length < 6) {
            const nextLine = lines[i].trim();
            if (!nextLine) { i++; continue; }

            // Try strict option match first, then loose
            let optMatch = nextLine.match(optionRegex) || nextLine.match(optionLooseRegex);
            if (!optMatch) break;

            const letter = optMatch[1].toLowerCase();
            let optionText = optMatch[2].trim();
            i++;

            // Collect continuation lines of this option
            while (i < lines.length) {
                const contLine = lines[i].trim();
                if (!contLine) { i++; continue; }
                // Stop if next line is another option, a new question, or empty
                if (optionRegex.test(contLine) || optionLooseRegex.test(contLine)) break;
                if (questionStartRegex.test(contLine)) break;
                optionText += ' ' + contLine;
                i++;
            }

            options.push(optionText);
        }

        // Only add if we found at least 2 options (valid MCQ)
        if (options.length >= 2) {
            questions.push({
                type: 'multiple_choice',
                question: cleanOCRText(questionText),
                options: options.map(o => cleanOCRText(o)),
                answer: cleanOCRText(options[0]), // Default to first option; user can correct
            });
        }
    }

    // If no structured questions found, try a fallback: split by blank lines
    if (questions.length === 0) {
        return parseMCQFallback(rawText);
    }

    return questions;
}

/**
 * Fallback parser: tries to find questions by looking for lines with "?"
 * followed by lettered options.
 */
function parseMCQFallback(rawText: string): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const blocks = rawText.split(/\n\s*\n/).filter(b => b.trim());

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 3) continue; // Need at least question + 2 options

        // Check if any line has options pattern
        const optionLines: string[] = [];
        let questionLines: string[] = [];
        const optionRegex = /^\s*(?:\(?([A-Da-d])\)?)\s*[.):\-]\s*(.+)/;

        for (const line of lines) {
            const optMatch = line.match(optionRegex);
            if (optMatch) {
                optionLines.push(optMatch[2].trim());
            } else {
                // If we haven't found options yet, this is part of the question
                if (optionLines.length === 0) {
                    questionLines.push(line);
                }
            }
        }

        if (questionLines.length > 0 && optionLines.length >= 2) {
            // Strip leading question number if present
            let qText = questionLines.join(' ');
            qText = qText.replace(/^(?:Q(?:uestion)?\s*)?\d{1,3}\s*[.):\-]\s*/i, '');

            questions.push({
                type: 'multiple_choice',
                question: cleanOCRText(qText),
                options: optionLines.map(o => cleanOCRText(o)),
                answer: cleanOCRText(optionLines[0]),
            });
        }
    }

    return questions;
}

/**
 * Clean up common OCR artifacts from text.
 */
function cleanOCRText(text: string): string {
    return text
        // Fix common OCR substitutions
        .replace(/[|]/g, 'I')       // | → I
        .replace(/[`´]/g, "'")      // backtick → apostrophe
        .replace(/\s{2,}/g, ' ')    // collapse multiple spaces
        .replace(/\s+([.,;:?!])/g, '$1')  // remove space before punctuation
        .trim();
}

