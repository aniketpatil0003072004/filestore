import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker file correctly - using CDN for simplicity in Vite apps without complex config
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPdf(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';

        // Limit to first 10 pages to avoid huge payloads
        const maxPages = Math.min(pdf.numPages, 10);

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error("Error extracting PDF text:", error);
        throw new Error("Failed to read PDF file.");
    }
}

export async function summarizeTextWithGemini(text, apiKey) {
    if (!apiKey) throw new Error("API Key is missing");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`; // <--- MODEL and KEY USED HERE

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `Summarize the following PDF content in a concise, structured way (max 200 words). Highlight key points:\n\n${text.substring(0, 30000)}`
                }]
            }]
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Gemini API Error");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";
}
