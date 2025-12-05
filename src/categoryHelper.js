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
        'music', 'song', 'audio', 'official', 'vevo', 'lyrics',
        'album', 'single', 'mv', 'music video', 'soundtrack',
        'remix', 'cover', 'acoustic', 'live performance', 'concert',
        'lofi', 'hip hop', 'rap', 'pop'
    ]

    const isMusicContent = musicKeywords.some(kw => text.includes(kw))

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

    const newsKeywords = ['news', 'breaking', 'headline', 'report', 'journalist', 'live coverage', 'aaj tak', 'ndtv', 'cnn', 'bbc']
    const isNews = newsKeywords.some(kw => text.includes(kw))

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
 * Main function: Analyze content with metadata
 * ENFORCES STRICT PLATFORM SEPARATION
 */
export function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const title = metadata?.title || ''
    const description = metadata?.description || ''
    const channelName = metadata?.channelName || ''
    const platform = metadata?.platform === 'youtube' ? 'YouTube' :
        metadata?.platform === 'instagram' ? 'Instagram' : 'Other'

    // ==========================================
    // YOUTUBE STRICT CATEGORIZATION
    // ==========================================
    if (platform === 'YouTube') {
        // 0. YouTube Shorts (Strict Check)
        if (url.includes('/shorts/')) {
            // Check for sports in shorts
            const sportsDetection = detectSportsContent(title, description)
            if (sportsDetection) {
                return {
                    fullCategory: 'YouTube Sports',
                    subcategory: 'Shorts',
                    emoji: '🏅'
                }
            }
            return {
                fullCategory: 'YouTube Shorts',
                subcategory: null,
                emoji: '⚡'
            }
        }

        // 1. Sports (Including Cricket)
        // User explicitly asked for "Youtube Sports"
        const sportsDetection = detectSportsContent(title, description)
        if (sportsDetection) {
            return {
                fullCategory: 'YouTube Sports',
                subcategory: sportsDetection.subcategory,
                emoji: '🏅'
            }
        }

        // 2. Music (Hindi vs English)
        const musicDetection = detectMusicGenre(title, description, channelName)
        if (musicDetection) {
            return {
                fullCategory: `YouTube Music - ${musicDetection.subcategory}`, // "YouTube Music - Hindi"
                subcategory: musicDetection.subcategory,
                emoji: '🎵'
            }
        }

        // 3. News
        const newsDetection = detectNewsType(title, description)
        if (newsDetection) {
            return {
                fullCategory: 'YouTube News',
                subcategory: 'General',
                emoji: '📰'
            }
        }

        // 4. Tech
        const techKeywords = ['tech', 'review', 'unboxing', 'phone', 'laptop', 'gadget']
        if (techKeywords.some(kw => `${title} ${description}`.toLowerCase().includes(kw))) {
            return {
                fullCategory: 'YouTube Tech',
                subcategory: 'Tech',
                emoji: '🔧'
            }
        }

        // 5. Default YouTube
        return {
            fullCategory: 'YouTube Videos',
            subcategory: null,
            emoji: '🎥'
        }
    }

    // ==========================================
    // INSTAGRAM STRICT CATEGORIZATION
    // ==========================================
    if (platform === 'Instagram') {
        // Reels
        if (url.includes('/reel/')) {
            const reelDetection = detectInstagramReelType(title, description)

            // Special case for Sports as requested
            if (reelDetection && reelDetection.subcategory === 'Sports') {
                return {
                    fullCategory: 'Instagram Sports',
                    subcategory: 'Reels',
                    emoji: '🏅'
                }
            }

            if (reelDetection) {
                return {
                    fullCategory: `Instagram Reels - ${reelDetection.subcategory}`,
                    subcategory: reelDetection.subcategory,
                    emoji: '🎬'
                }
            }
            return {
                fullCategory: 'Instagram Reels',
                subcategory: null,
                emoji: '🎬'
            }
        }

        // Posts
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
        { name: 'YouTube Sports', emoji: '🏅' },
        { name: 'Instagram Sports', emoji: '🏅' },
        { name: 'YouTube Music - Hindi', emoji: '🎵' },
        { name: 'YouTube Music - English', emoji: '🎵' },
        { name: 'YouTube News', emoji: '📰' },
        { name: 'YouTube Tech', emoji: '🔧' },
        { name: 'YouTube Videos', emoji: '🎥' },
        { name: 'Instagram Reels', emoji: '🎬' },
        { name: 'Instagram Posts', emoji: '📸' }
    ]
}
