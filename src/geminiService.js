/**
 * Gemini AI Integration for Video Vault
 * Uses Google's Gemini 1.5 Flash model for intelligent video categorization.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Analyze video metadata using Gemini AI
 * @param {string} apiKey - User's Gemini API Key
 * @param {Object} metadata - Extracted metadata (title, channel, description, duration)
 * @returns {Promise<Object>} Categorization result
 */
export async function analyzeWithGemini(apiKey, metadata) {
    try {
        const { title, channelName, description, duration, platform } = metadata;

        const prompt = `
      You are an intelligent video organizer. Analyze the following video metadata and categorize it precisely.
      
      METADATA:
      - Title: "${title}"
      - Channel: "${channelName}"
      - Platform: "${platform}"
      - Duration: ${duration} minutes
      - Description Snippet: "${description?.substring(0, 300) || ''}"

      RULES FOR CATEGORIZATION:
      1. LANGUAGE: Detect the primary language (Hindi, Kannada, English, Tamil, Telugu, Malayalam, etc.). Look for context clues (e.g., "Sandalwood" = Kannada, "Bollywood" = Hindi).
      2. TYPE: Identify if it is a "Movie", "Podcast", "Song", "Funny/Comedy", "Sports", "Tech", "News", or "Vlog".
         - "Movie": Must be a full movie (usually > 50 mins) or explicitly stated.
         - "Podcast": Interviews, talking heads, "Episode", "Show".
         - "Funny": Standup, pranks, memes, comedy skits.
      3. OUTPUT CATEGORY: match one of these EXACT formats:
         - "{Language} Movies" (e.g., "Hindi Movies", "Kannada Movies")
         - "Podcasts" (All podcasts go here)
         - "Funny ({Language})" (e.g., "Funny (Hindi)", "Funny (English)")
         - "Sports"
         - "Music"
         - "YouTube Shorts" (if it's a short/reel)
         - "Instagram Reels"
         - "{Language} Content" (General fallback)
      
      Return ONLY a JSON object with this format (no markdown):
      {
        "category": "The specific category name from above",
        "emoji": "An emoji matching the category (e.g. 🎬, 🎙️, 😂)",
        "explanation": "Brief 5 word reason"
      }
    `;

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract the text response
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) throw new Error('No response from Gemini');

        // Clean markdown code blocks if present ( ```json ... ``` )
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanJson);

    } catch (error) {
        console.error('Gemini Analysis Failed:', error);
        return null; // Fallback to local logic if it fails
    }
}
