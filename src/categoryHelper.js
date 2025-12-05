/**
 * Smart Content Categorization Helper
 * Analyzes video titles and descriptions to detect:
 * - Cricket (IPL, World Cup, Test Match, etc.)
 * - Music genres (Bollywood, Hip Hop, Pop, etc.)
 * - News types (Breaking, Politics, Sports, etc.)
 * - Instagram content types (Comedy, Dance, Food, etc.)
 */

/**
 * Detect Cricket content and subcategory
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
            fullCategory: subcategory === 'Cricket' ? 'Cricket' : `Cricket - ${subcategory}`,
            confidence: 'high',
            emoji: '🏏'
        }
    }

    return null
}

/**
 * Detect Music genre
 */
export function detectMusicGenre(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    // First check if it's music
    const musicKeywords = [
        'music', 'song', 'audio', 'official', 'vevo', 'lyrics',
        'album', 'single', 'mv', 'music video', 'soundtrack',
        'remix', 'cover', 'acoustic', 'live performance', 'concert'
    ]

    const isMusicContent = musicKeywords.some(kw => text.includes(kw))

    if (!isMusicContent) return null

    // Detect genre
    const genres = {
        'Bollywood': ['bollywood', 'hindi song', 'indian music', 't-series', 'zee music', 'tips music'],
        'Hip Hop': ['rap', 'hip hop', 'hiphop', 'rapper', 'trap', 'drill'],
        'Pop': ['pop music', 'pop song', 'mainstream pop'],
        'Rock': ['rock', 'metal', 'punk', 'alternative rock'],
        'Classical': ['classical', 'orchestra', 'symphony', 'instrumental'],
        'EDM': ['edm', 'electronic', 'dubstep', 'house music', 'techno', 'trance'],
        'Devotional': ['bhajan', 'devotional', 'spiritual', 'prayer', 'aarti', 'mantra'],
        'Punjabi': ['punjabi song', 'punjabi music', 'bhangra'],
        'Tamil': ['tamil song', 'tamil music', 'kollywood'],
        'Telugu': ['telugu song', 'telugu music', 'tollywood']
    }

    for (const [genre, keywords] of Object.entries(genres)) {
        if (keywords.some(kw => text.includes(kw))) {
            return {
                category: 'Music',
                subcategory: genre,
                fullCategory: `Music - ${genre}`,
                confidence: 'high',
                emoji: '🎵'
            }
        }
    }

    // Default music category
    return {
        category: 'Music',
        subcategory: 'General',
        fullCategory: 'Music',
        confidence: 'medium',
        emoji: '🎵'
    }
}

/**
 * Detect News type
 */
export function detectNewsType(title, description = '') {
    const text = `${title} ${description}`.toLowerCase()

    const newsKeywords = ['news', 'breaking', 'headline', 'report', 'journalist', 'live coverage']
    const isNews = newsKeywords.some(kw => text.includes(kw))

    if (!isNews) return null

    // Detect news type
    let subcategory = 'General'

    if (text.includes('breaking') || text.includes('urgent') || text.includes('alert')) {
        subcategory = 'Breaking News'
    } else if (text.includes('politics') || text.includes('election') || text.includes('government')) {
        subcategory = 'Politics'
    } else if (text.includes('sports news') || text.includes('cricket news')) {
        subcategory = 'Sports News'
    } else if (text.includes('tech news') || text.includes('technology news')) {
        subcategory = 'Tech News'
    } else if (text.includes('business') || text.includes('economy') || text.includes('market')) {
        subcategory = 'Business'
    } else if (text.includes('weather')) {
        subcategory = 'Weather'
    }

    return {
        category: 'News',
        subcategory: subcategory,
        fullCategory: subcategory === 'General' ? 'News' : `News - ${subcategory}`,
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
        'Comedy': ['comedy', 'funny', 'humor', 'laugh', 'joke', 'meme', 'hilarious'],
        'Dance': ['dance', 'dancing', 'choreography', 'dancer', 'moves'],
        'Food': ['food', 'recipe', 'cooking', 'chef', 'foodie', 'delicious', 'tasty'],
        'Travel': ['travel', 'trip', 'vacation', 'explore', 'adventure', 'destination'],
        'Fashion': ['fashion', 'style', 'outfit', 'ootd', 'clothing', 'trendy'],
        'Fitness': ['fitness', 'workout', 'gym', 'exercise', 'health', 'training'],
        'Beauty': ['makeup', 'beauty', 'skincare', 'cosmetics', 'tutorial'],
        'Tech': ['tech', 'technology', 'gadget', 'review', 'unboxing'],
        'Motivation': ['motivation', 'inspiration', 'motivational', 'success', 'quotes']
    }

    for (const [type, keywords] of Object.entries(contentTypes)) {
        if (keywords.some(kw => text.includes(kw))) {
            return {
                category: 'Instagram Reels',
                subcategory: type,
                fullCategory: `Instagram Reels - ${type}`,
                confidence: 'medium',
                emoji: '🎬'
            }
        }
    }

    return null
}

/**
 * Main function: Analyze content with metadata
 * Combines URL analysis with title/description analysis
 */
export function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const title = metadata?.title || ''
    const description = metadata?.description || ''

    // Try specific content detection
    const cricketDetection = detectCricketContent(title, description)
    if (cricketDetection) return cricketDetection

    const musicDetection = detectMusicGenre(title, description)
    if (musicDetection) return musicDetection

    const newsDetection = detectNewsType(title, description)
    if (newsDetection) return newsDetection

    // For Instagram, detect reel type
    if (url.includes('instagram.com/reel/')) {
        const reelDetection = detectInstagramReelType(title, description)
        if (reelDetection) return reelDetection
    }

    // Fallback to URL-based analysis
    return {
        category: urlAnalysis?.suggestedCategory || 'Videos',
        subcategory: null,
        fullCategory: urlAnalysis?.suggestedCategory || 'Videos',
        confidence: urlAnalysis?.confidence || 'low',
        emoji: urlAnalysis?.emoji || '🎥'
    }
}

/**
 * Get all possible categories with subcategories
 */
export function getAllCategories() {
    return [
        { name: 'Cricket', emoji: '🏏', subcategories: ['IPL', 'World Cup', 'Test Match', 'T20', 'ODI', 'Highlights'] },
        { name: 'Music', emoji: '🎵', subcategories: ['Bollywood', 'Hip Hop', 'Pop', 'Rock', 'Classical', 'EDM', 'Devotional'] },
        { name: 'News', emoji: '📰', subcategories: ['Breaking News', 'Politics', 'Sports News', 'Tech News', 'Business'] },
        { name: 'Instagram Reels', emoji: '🎬', subcategories: ['Comedy', 'Dance', 'Food', 'Travel', 'Fashion', 'Fitness'] },
        { name: 'Education', emoji: '📚', subcategories: ['Programming', 'Science', 'Tutorial'] },
        { name: 'YouTube Videos', emoji: '🎥', subcategories: [] },
        { name: 'YouTube Shorts', emoji: '⚡', subcategories: [] },
        { name: 'Podcasts', emoji: '🎙️', subcategories: [] },
        { name: 'Gaming', emoji: '🎮', subcategories: [] },
        { name: 'Cooking', emoji: '🍳', subcategories: [] },
        { name: 'Fitness', emoji: '💪', subcategories: [] },
        { name: 'Tech & DIY', emoji: '🔧', subcategories: [] }
    ]
}
