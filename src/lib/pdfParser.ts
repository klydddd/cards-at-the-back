export async function extractTextFromPDF(file: any) {
    const pdfjsLib = await import('pdfjs-dist');

    // Use local worker from public/ to avoid "fake worker" warning
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Read the stream manually: getTextContent() uses `for await` over a
        // ReadableStream, which older iOS Safari doesn't support.
        const reader = page.streamTextContent().getReader();
        const items: any[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            items.push(...value.items);
        }
        const pageText = items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText.trim();
}
