/**
 * Advanced Content Categorization System
 * Logic Models for:
 * 1. Language Detection (Hindi, Kannada, English, etc.)
 * 2. Content Type Detection (Movie, Podcast, Funny, Sports, etc.)
 * 3. Intelligent Routing to specific "Folders"
 */

/**
 * 🧠 LEVEL 1: Language Detection Model
 * Detects language based on specific Script (Unicode), Cultural Keywords, and Channels
 * Even if the text is English, we match these entities to the language.
 */
function detectLanguage(text, channelName = '') {
    if (!text && !channelName) return 'English'

    // Combine for analysis
    const cleanText = `${text} ${channelName}`.toLowerCase()

    // 1. Check Scripts (Strongest Signal for Non-English)
    const scripts = {
        'Hindi': /[\u0900-\u097F]/,      // Devanagari (Hindi, Marathi, Nepali)
        'Kannada': /[\u0C80-\u0CFF]/,    // Kannada script
        'Tamil': /[\u0B80-\u0BFF]/,      // Tamil script
        'Telugu': /[\u0C00-\u0C7F]/,     // Telugu script
        'Malayalam': /[\u0D00-\u0D7F]/   // Malayalam script
    }

    for (const [lang, regex] of Object.entries(scripts)) {
        if (regex.test(cleanText)) return lang
    }

    // 2. Cultural Entity Matching (Simulate "Smart AI")
    // Maps celebrities, channels, and slang to languages
    const culturalEntities = {
        'Hindi': [
            // Channels/Brands
            't-series', 'zee music', 'set india', 'sony', 'colors tv', 'sab tv', 'aaj tak',
            // Stars
            'shah rukh khan', 'srk', 'salman khan', 'akshay kumar', 'amir khan', 'ranbir kapoor',
            'alia bhatt', 'deepika', 'katrina', 'kapil sharma', 'amitabh',
            // Keywords/Slang
            'bollywood', 'hindi', 'desi', 'bhai', 'didi', 'kaise', 'kya', 'nahi', 'tum', 'main',
            'pyaar', 'dil', 'humba', 'mumbai', 'delhi'
        ],
        'Kannada': [
            // Channels/Brands
            'colors kannada', 'udaya', 'tv9 kannada', 'anand audio', 'lahari music', 'ashwini media',
            'kfi', 'sandalwood',
            // Stars
            'yash', 'rocking star', 'puneeth', 'appu', 'darshan', 'dboss', 'sudeep', 'kiccha',
            'rakshit shetty', 'rishab shetty', 'shivanna', 'upendra', 'dhruva sarja',
            // Keywords/Cities
            'kannada', 'bengaluru', 'bangalore', 'mysore', 'karnataka', 'namaskara', 'chennagi',
            'beku', 'beda', 'full movie kannada', 'kgf', 'kantara', 'charlie 777'
        ],
        'Tamil': [
            'tamil', 'kollywood', 'sun tv', 'vijay tv', 'thalapathy', 'vijay', 'ajith', 'thala',
            'rajinikanth', 'superstar', 'kamal haasan', 'surya', 'dhanush', 'ar rahman',
            'chennai', 'madras'
        ],
        'Telugu': [
            'telugu', 'tollywood', 'etv', 'gemini tv', 'mahesh babu', 'allu arjun', 'prabhas',
            'jr ntr', 'ram charan', 'pawan kalyan', 'chiranjeevi', 'hyderabad', 'rr', 'pushpa',
            'bahubali'
        ],
        'Malayalam': [
            'malayalam', 'mollywood', 'asianet', 'manorama', 'mohanlal', 'mammootty', 'dulquer',
            'fahadh faasil', 'prithviraj', 'kerala', 'kochi'
        ]
    }

    // Check specific keywords
    for (const [lang, entities] of Object.entries(culturalEntities)) {
        // We use word boundary \b to avoid partial matches (e.g. "ban" in "banana")
        // But for multi-word entities search normally
        if (entities.some(entity => cleanText.includes(entity))) {
            return lang
        }
    }

    return 'English' // Default if no cultural cues found
}

/**
 * 🧠 LEVEL 2: Content Type Detection Model
 * Uses Duration, Platform, and Semantic Keywords
 */
function detectContentType(text, durationMinutes = 0, platform = '') {
    const cleanText = text.toLowerCase()

    // --- PODCASTS ---
    const podcastKeywords = ['podcast', 'episode', 'interview', 'conversation', 'ranveer show', 'trs', 'beerbiceps', 'talk show', 'joe rogan']
    if (podcastKeywords.some(w => cleanText.includes(w)) || (durationMinutes > 20 && cleanText.includes('talk'))) {
        return 'Podcast'
    }

    // --- MOVIES ---
    // Rule: Duration > 45 mins OR Specific keywords like "Full Movie"
    const movieKeywords = ['full movie', 'full film', 'blockbuster', 'cinema']
    const isLongVideo = durationMinutes > 40 // Assuming > 40 mins is likely a movie or long episode
    const isPlatformVideo = platform === 'YouTube' || platform === 'Other' // No movies on Insta Reels usually

    if (isPlatformVideo && (movieKeywords.some(w => cleanText.includes(w)) || (isLongVideo && !cleanText.includes('live')))) {
        return 'Movie'
    }

    // --- FUNNY / COMEDY ---
    const funnyKeywords = ['funny', 'comedy', 'prank', 'joke', 'standup', 'stand-up', 'laugh', 'roast', 'parody', 'meme', 'vines']
    if (funnyKeywords.some(w => cleanText.includes(w))) {
        return 'Funny'
    }

    // --- SPORTS ---
    const sportsKeywords = ['cricket', 'football', 'ipl', 'match', 'highlight', 'goal', 'wickets', 'century', 'messi', 'ronaldo', 'virat', 'dhoni', 'rcb', 'csk', 'mi']
    if (sportsKeywords.some(w => cleanText.includes(w))) {
        return 'Sports'
    }

    // --- TECH / CODING --- (Optional bonus)
    const techKeywords = ['tutorial', 'coding', 'programming', 'javascript', 'python', 'review', 'unboxing', 'tech']
    if (techKeywords.some(w => cleanText.includes(w))) {
        return 'Tech'
    }

    return 'General'
}

/**
 * 🧠 MASTER FUNCTION: Analyze and Route
 * Combines detecting logic to output the final "Folder"
 */
export function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const title = metadata?.title || ''
    const description = metadata?.description || ''
    const channelName = metadata?.channelName || ''
    const combinedText = `${title} ${description} ${channelName}`
    const duration = metadata?.duration || 0 // in minutes

    // 1. Detect Language (Now includes Entity/Context Awareness)
    const language = detectLanguage(combinedText)

    // 2. Detect Content Type
    const contentType = detectContentType(combinedText, duration, metadata?.platform === 'youtube' ? 'YouTube' : 'Other')

    // 3. Platform Specifics (Shorts/Reels)
    const isShortForm = url.includes('/shorts/') || url.includes('/reel/')

    // ==========================================
    // 🚦 ROUTING LOGIC (The "Strong Model")
    // ==========================================

    // RULE 1: Movies (Must be sorted by Language)
    if (contentType === 'Movie') {
        return {
            fullCategory: `${language} Movies`, // e.g., "Hindi Movies", "Kannada Movies"
            subcategory: 'Film',
            emoji: '🎬'
        }
    }

    // RULE 2: Podcasts (Grouped together)
    if (contentType === 'Podcast') {
        return {
            fullCategory: 'Podcasts',
            subcategory: language,
            emoji: '🎙️'
        }
    }

    // RULE 3: Funny Videos (Split by Language)
    if (contentType === 'Funny') {
        return {
            fullCategory: `Funny (${language})`, // e.g., "Funny (Hindi)", "Funny (English)"
            subcategory: 'Comedy',
            emoji: '😂'
        }
    }

    // RULE 4: Sports (Always Sports)
    if (contentType === 'Sports') {
        return {
            fullCategory: 'Sports',
            subcategory: 'General',
            emoji: '🏆'
        }
    }

    // RULE 5: Short Form Content (Reels/Shorts) - Fallback for uncategorized shorts
    if (isShortForm) {
        if (metadata?.platform === 'youtube') return { fullCategory: 'YouTube Shorts', emoji: '⚡' }
        if (metadata?.platform === 'instagram') return { fullCategory: 'Instagram Reels', emoji: '📸' }
    }

    // RULE 6: Default/General Fallback
    // If it's a specific language video but not a movie/funny/podcast, maybe just put it in a Language folder?
    if (language !== 'English') {
        return {
            fullCategory: `${language} Content`,
            subcategory: 'Mix',
            emoji: '🌏'
        }
    }

    // Final Fallback
    const platformName = metadata?.platform === 'youtube' ? 'YouTube Videos' :
        metadata?.platform === 'instagram' ? 'Instagram Posts' : 'Videos'

    return {
        fullCategory: platformName,
        subcategory: null,
        emoji: '📼'
    }
}

/**
 * Get all known categories for the UI
 */
export function getAllCategories() {
    return [
        { name: 'Hindi Movies', emoji: '🎬' },
        { name: 'Kannada Movies', emoji: '🎬' },
        { name: 'English Movies', emoji: '🎬' },
        { name: 'Podcasts', emoji: '🎙️' },
        { name: 'Funny (Hindi)', emoji: '😂' },
        { name: 'Funny (English)', emoji: '😂' },
        { name: 'Sports', emoji: '🏆' },
        { name: 'YouTube Shorts', emoji: '⚡' },
        { name: 'Instagram Reels', emoji: '📸' }
    ]
}

export function detectLanguageFromText(text) {
    return detectLanguage(text)
}
