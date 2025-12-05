/**
 * Smart Content Categorization Helper
 * Analyzes video titles and descriptions to detect:
 * - Sports (Cricket, Football, NBA, etc.)
 * - Music genres (Bollywood, Hip Hop, Pop, etc.)
 * - News types (Breaking, Politics, Sports, etc.)
 * - Instagram content types (Comedy, Dance, Food, etc.)
 */

/**
 * Detect Sports content (General)
 */
export function detectSportsContent(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    const sportsKeywords = [
        'sports', 'football', 'soccer', 'tennis', 'basketball', 'nba', 'fifa',
        'badminton', 'hockey', 'volleyball', 'athlete', 'championship',
        'tournament', 'olympics', 'wwe', 'ufc', 'boxing', 'wrestling',
        'cricket', 'ipl', 'test match', 'odi', 't20', 'wicket', 'century',
        'messi', 'ronaldo', 'virat kohli', 'dhoni', 'rohit sharma', 'neymar'
    ]

    if (sportsKeywords.some(kw => text.includes(kw))) {
        return {
            category: 'Sports',
            subcategory: 'General',
            confidence: 'high',
            emoji: '🏅'
        }
    }

    return null
}

/**
 * Detect Cricket content and subcategory (Specialized)
 */
export function detectCricketContent(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    const cricketKeywords = [
        'cricket', 'ipl', 'test match', 'odi', 't20', 't20i',
        'wicket', 'century', 'bowler', 'batsman', 'batting', 'bowling',
        'india vs', 'pakistan vs', 'australia vs', 'england vs',
        'world cup cricket', 'bcci', 'icc', 'csk', 'mi', 'rcb',
        'mumbai indians', 'chennai super kings', 'royal challengers',
        'runs', 'over', 'innings', 'match highlights', 'live cricket'
    ]

    const matchCount = cricketKeywords.filter(kw => text.includes(kw)).length

    if (matchCount >= 2) {
        // Detect subcategory
        let subcategory = 'Cricket'

        if (text.includes('ipl') || text.includes('csk') || text.includes('mi') || text.includes('rcb')) {
            subcategory = 'IPL'
        } else if (text.includes('world cup')) {
            subcategory = 'World Cup'
        } else if (text.includes('test match') || text.includes('test cricket')) {
            subcategory = 'Test Match'
        } else if (text.includes('t20') || text.includes('t20i')) {
            subcategory = 'T20'
        } else if (text.includes('odi')) {
            subcategory = 'ODI'
        } else if (text.includes('highlights')) {
            subcategory = 'Highlights'
        } else if (text.includes('live')) {
            subcategory = 'Live Match'
        }

        return {
            category: 'Cricket',
            subcategory: subcategory,
            confidence: 'high',
            emoji: '🏏'
        }
    }

    return null
}

/**
 * Detect Music genre and Language
 */
export function detectMusicGenre(title, description = '', channelName = '') {
    const text = `${title} ${description} ${channelName}`.toLowerCase()

    // First check if it's music
    const musicKeywords = [
        'music', 'song', 'audio', 'official', 'vevo', 'lyrics', 'lyrical',
        'album', 'single', 'mv', 'music video', 'video song', 'full song',
        'soundtrack', 'ost', 'bgm', 'remix', 'cover', 'acoustic',
        'live performance', 'concert', 'lofi', 'hip hop', 'rap', 'pop',
        'jukebox', 'playlist'
    ]

    // Known Music Labels (to catch songs without "song" in title)
    const musicLabels = [
        't-series', 'zee music', 'sony music', 'anand audio', 'lahari music',
        'aditya music', 'saregama', 'speed records', 'bangla music',
        'think music', 'tips official', 'yrf', 'hybe', 'jyp', 'sm town'
    ]

    const isMusicContent = musicKeywords.some(kw => text.includes(kw)) ||
        musicLabels.some(label => text.includes(label))

    if (!isMusicContent) return null

    // Detect Language (Hindi vs English/Other)
    // Check for Devanagari script (Hindi/Sanskrit/Marathi/etc)
    const hasDevanagari = /[\u0900-\u097F]/.test(title) || /[\u0900-\u097F]/.test(description)

    const hindiKeywords = [
        'hindi', 'bollywood', 't-series', 'zee', 'desi', 'punjabi',
        'india', 'saregama', 'tips official', 'yyrf', 'badshah', 'arijit',
        'jubin', 'neha kakkar', 'shreya ghoshal', 'kumar sanu', 'udit narayan',
        'alka yagnik', 'sonu nigam', 'kishore kumar', 'lata mangeshkar'
    ]

    const isHindi = hasDevanagari || hindiKeywords.some(kw => text.includes(kw))
    const language = isHindi ? 'Hindi' : 'English'

    return {
        category: 'Music',
        subcategory: language, // 'Hindi' or 'English'
        confidence: 'high',
        emoji: '🎵'
    }
}

/**
 * Detect News type
 */
export function detectNewsType(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    // Use Regex for stricter word boundary matching on common words
    const strictNewsKeywords = [
        /\bnews\b/, /\bbreaking\b/, /\bheadline\b/, /\bheadlines\b/,
        /\breport\b/, /\breporter\b/, /\bjournalist\b/, /\blive coverage\b/
    ]

    // Specific channels or unique phrases can remain as string includes
    const newsChannels = ['aaj tak', 'ndtv', 'cnn', 'bbc', 'fox news', 'al jazeera', 'india today', 'republic world']

    const isNews = strictNewsKeywords.some(regex => regex.test(text)) ||
        newsChannels.some(kw => text.includes(kw))

    if (!isNews) return null

    return {
        category: 'News',
        subcategory: 'General',
        confidence: 'high',
        emoji: '📰'
    }
}

/**
 * Detect Instagram Reel content type
 */
export function detectInstagramReelType(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    const contentTypes = {
        'Sports': ['sports', 'football', 'cricket', 'messi', 'ronaldo', 'ipl', 'nba', 'goal', 'match', 'athlete'],
        'Comedy': ['comedy', 'funny', 'humor', 'laugh', 'joke', 'meme', 'hilarious'],
        'Dance': ['dance', 'dancing', 'choreography', 'dancer', 'moves'],
        'Food': ['food', 'recipe', 'cooking', 'chef', 'foodie', 'delicious', 'tasty'],
        'Politics': ['politics', 'election', 'vote', 'minister', 'modi', 'bjp', 'congress', 'news', 'speech', 'rally'],
        'Travel': ['travel', 'vacation', 'explore', 'adventure', 'destination', 'tourism', 'trip'],
        'Fashion': ['fashion', 'style', 'outfit', 'ootd', 'clothing', 'trendy'],
        'Fitness': ['fitness', 'workout', 'gym', 'exercise', 'health', 'training']
    }

    for (const [type, keywords] of Object.entries(contentTypes)) {
        if (keywords.some(kw => text.includes(kw))) {
            return {
                category: 'Instagram Reels',
                subcategory: type,
                confidence: 'medium',
                emoji: '🎬'
            }
        }
    }

    return null
}

/**
 * Detect Language (English vs Hindi)
 */
export function detectLanguage(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    // Check for Devanagari script (Strongest signal for Hindi)
    if (/[\u0900-\u097F]/.test(text)) return 'Hindi'

    // Hindi Keywords
    const hindiKeywords = [
        'hindi', 'bollywood', 't-series', 'zee', 'desi', 'punjabi',
        'india', 'saregama', 'tips official', 'yyrf', 'badshah', 'arijit',
        'kapil sharma', 'taarak mehta', 'bhajan', 'aarti', 'mantra'
    ]
    if (hindiKeywords.some(kw => text.includes(kw))) return 'Hindi'

    // English Keywords (Common words)
    const englishKeywords = [
        'how to', 'tutorial', 'review', 'unboxing', 'official video',
        'trailer', 'teaser', 'movie', 'scene', 'best of', 'funny',
        'comedy', 'vlog', 'gameplay', 'walkthrough', 'highlights',
        'english', 'hollywood', 'marvel', 'dc', 'netflix'
    ]
    if (englishKeywords.some(kw => text.includes(kw))) return 'English'

    // Default to English if no strong Hindi signal (most web content is English)
    return 'English'
}

/**
 * Main function: Analyze content with metadata
 * SIMPLIFIED: 4 Main Buckets Only
 */
export function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const title = metadata?.title || ''
    const description = metadata?.description || ''
    const channelName = metadata?.channelName || ''

    const platform = metadata?.platform === 'youtube' ? 'YouTube' :
        metadata?.platform === 'instagram' ? 'Instagram' : 'Other'

    // ==========================================
    // SIMPLIFIED CATEGORIZATION (4 Buckets Only)
    // ==========================================

    if (platform === 'YouTube') {
        if (url.includes('/shorts/')) {
            return {
                fullCategory: 'YouTube Shorts',
                subcategory: null,
                emoji: '⚡'
            }
        }
        return {
            fullCategory: 'YouTube Videos',
            subcategory: null,
            emoji: '🎥'
        }
    }

    if (platform === 'Instagram') {
        if (url.includes('/reel/')) {
            return {
                fullCategory: 'Instagram Reels',
                subcategory: null,
                emoji: '🎬'
            }
        }
        return {
            fullCategory: 'Instagram Posts',
            subcategory: null,
            emoji: '📸'
        }
    }

    // Fallback
    return {
        fullCategory: urlAnalysis?.suggestedCategory || 'Videos',
        subcategory: null,
        emoji: urlAnalysis?.emoji || '🔗'
    }
}

/**
 * Get all possible categories with subcategories
 */
export function getAllCategories() {
    return [
        { name: 'YouTube Videos', emoji: '🎥' },
        { name: 'YouTube Shorts', emoji: '⚡' },
        { name: 'Instagram Reels', emoji: '🎬' },
        { name: 'Instagram Posts', emoji: '📸' }
    ]
}
