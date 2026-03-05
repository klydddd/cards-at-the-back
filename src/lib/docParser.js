import mammoth from 'mammoth';

/**
 * Extract text from a .docx file and return it as markdown-like text.
 */
export async function extractTextFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
}

/**
 * Extract text from a .pptx file by reading the XML inside the zip.
 * PPTX files are ZIP archives containing XML slide files.
 */
export async function extractTextFromPPTX(file) {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)[1]);
            const numB = parseInt(b.match(/slide(\d+)/)[1]);
            return numA - numB;
        });

    let fullText = '';

    for (const slidePath of slideFiles) {
        const xml = await zip.files[slidePath].async('text');
        // Extract text content from XML tags like <a:t>text</a:t>
        const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
        if (textMatches) {
            const slideText = textMatches
                .map(match => match.replace(/<\/?a:t[^>]*>/g, ''))
                .join(' ');
            fullText += slideText + '\n\n';
        }
    }

    return fullText.trim() || 'No text content found in the presentation.';
}
