import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker file correctly - using local import for Vite
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
    if (apiKey.includes("PLACE_YOUR_API_KEY")) throw new Error("Please replace the placeholder API Key in your .env file!");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`; // <--- MODEL and KEY USED HERE

    let response;
    try {
        response = await fetch(API_URL, {
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
    } catch (e) {
        console.error("Fetch failed:", e);
        throw new Error("Network error! Please check your internet connection.");
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Gemini API Error");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";
}
