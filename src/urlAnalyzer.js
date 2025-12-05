/**
 * Smart URL Analyzer for Video Vault
 * Detects platform, content type, and suggests categories
 */

// Known educational YouTube channels (expandable)
const EDUCATIONAL_CHANNELS = [
    'khanacademy',
    'crashcourse',
    'veritasium',
    'vsauce',
    'tedx',
    'ted-ed',
    'academicearth',
    'coursera',
    'udemy',
    'edx',
    'freecodecamp',
    'traversymedia',
    'academind',
    'fireship',
    'codingtrain'
]

// Educational keywords
const EDUCATIONAL_KEYWORDS = [
    'tutorial',
    'lesson',
    'course',
    'learn',
    'education',
    'lecture',
    'class',
    'teaching',
    'howto',
    'guide',
    'explained',
    'programming',
    'coding',
    'math',
    'science',
    'physics',
    'chemistry',
    'biology',
    'history',
    'study',
    'academy',
    'university',
    'college',
    'training',
    'workshop'
]

// Music keywords
const MUSIC_KEYWORDS = [
    'music',
    'song',
    'album',
    'artist',
    'official',
    'audio',
    'lyrics',
    'vevo',
    'soundtrack',
    'remix',
    'cover',
    'acoustic',
    'live',
    'concert',
    'mv',
    'musicvideo',
    'band',
    'singer',
    'playlist',
    'feat',
    'ft'
]

// Podcast keywords
const PODCAST_KEYWORDS = [
    'podcast',
    'episode',
    'interview',
    'talk',
    'discussion',
    'conversation'
]

// Cooking keywords
const COOKING_KEYWORDS = [
    'recipe',
    'cooking',
    'food',
    'chef',
    'kitchen',
    'baking',
    'meal',
    'dish',
    'cuisine',
    'cook',
    'tasty',
    'delicious',
    'restaurant',
    'foodie',
    'homemade'
]

// Fitness keywords
const FITNESS_KEYWORDS = [
    'workout',
    'fitness',
    'exercise',
    'gym',
    'training',
    'yoga',
    'cardio',
    'strength',
    'muscle',
    'health',
    'diet',
    'bodybuilding',
    'crossfit',
    'running',
    'weight'
]

// Tech keywords
const TECH_KEYWORDS = [
    'tech',
    'technology',
    'coding',
    'programming',
    'software',
    'hardware',
    'review',
    'unboxing',
    'diy',
    'build',
    'setup',
    'computer',
    'laptop',
    'phone',
    'gadget',
    'device'
]

// News keywords
const NEWS_KEYWORDS = [
    'news',
    'breaking',
    'headline',
    'report',
    'journalist',
    'press',
    'media',
    'current',
    'events',
    'update',
    'live',
    'coverage',
    'briefing'
]

// News channels
const NEWS_CHANNELS = [
    'cnn',
    'bbc',
    'nbc',
    'fox news',
    'foxnews',
    'msnbc',
    'reuters',
    'associated press',
    'ap news',
    'apnews',
    'bloomberg',
    'cnbc',
    'sky news',
    'skynews',
    'al jazeera',
    'aljazeera',
    'the guardian',
    'guardian',
    'nyt',
    'new york times',
    'newyorktimes',
    'washington post',
    'washingtonpost',
    'wsj',
    'wall street journal',
    'wallstreetjournal',
    'abc news',
    'abcnews',
    'cbs news',
    'cbsnews'
]

/**
 * Analyzes a URL and returns platform, content type, and suggested category
 * @param {string} url - The URL to analyze
 * @returns {Object} Analysis result with platform, contentType, suggestedCategory, confidence, and emoji
 */
export function analyzeUrl(url) {
    if (!url) {
        return {
            platform: 'unknown',
            contentType: 'unknown',
            suggestedCategory: '',
            confidence: 'low',
            emoji: '🔗',
            description: 'Unknown content'
        }
    }

    const lowerUrl = url.toLowerCase()

    // ========== YOUTUBE DETECTION ==========
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {

        // YouTube Music
        if (lowerUrl.includes('music.youtube.com')) {
            return {
                platform: 'youtube',
                contentType: 'music',
                suggestedCategory: 'Music',
                confidence: 'high',
                emoji: '🎵',
                description: 'YouTube Music'
            }
        }

        // YouTube Shorts
        if (lowerUrl.includes('/shorts/')) {
            return {
                platform: 'youtube',
                contentType: 'short',
                suggestedCategory: 'YouTube Shorts',
                confidence: 'high',
                emoji: '⚡',
                description: 'YouTube Short'
            }
        }

        // Check for cooking content
        const hasCookingKeyword = COOKING_KEYWORDS.some(keyword => lowerUrl.includes(keyword))
        if (hasCookingKeyword) {
            return {
                platform: 'youtube',
                contentType: 'cooking',
                suggestedCategory: 'Cooking',
                confidence: 'high',
                emoji: '🍳',
                description: 'Cooking video'
            }
        }

        // Check for fitness content
        const hasFitnessKeyword = FITNESS_KEYWORDS.some(keyword => lowerUrl.includes(keyword))
        if (hasFitnessKeyword) {
            return {
                platform: 'youtube',
                contentType: 'fitness',
                suggestedCategory: 'Fitness',
                confidence: 'high',
                emoji: '💪',
                description: 'Fitness video'
            }
        }

        // Check for tech content
        const hasTechKeyword = TECH_KEYWORDS.some(keyword => lowerUrl.includes(keyword))
        if (hasTechKeyword) {
            return {
                platform: 'youtube',
                contentType: 'tech',
                suggestedCategory: 'Tech & DIY',
                confidence: 'high',
                emoji: '🔧',
                description: 'Tech video'
            }
        }

        // Check for news content
        const hasNewsChannel = NEWS_CHANNELS.some(channel => lowerUrl.includes(channel))
        const hasNewsKeyword = NEWS_KEYWORDS.some(keyword => lowerUrl.includes(keyword))

        if (hasNewsChannel) {
            return {
                platform: 'youtube',
                contentType: 'news',
                suggestedCategory: 'News',
                confidence: 'high',
                emoji: '📰',
                description: 'News video'
            }
        }

        if (hasNewsKeyword) {
            return {
                platform: 'youtube',
                contentType: 'news',
                suggestedCategory: 'News',
                confidence: 'medium',
                emoji: '📰',
                description: 'News content'
            }
        }

        // Check for music-related content
        const hasMusicKeyword = MUSIC_KEYWORDS.some(keyword => lowerUrl.includes(keyword))
        if (hasMusicKeyword) {
            return {
                platform: 'youtube',
                contentType: 'music',
                suggestedCategory: 'Music',
                confidence: 'high',
                emoji: '🎵',
                description: 'Music video'
            }
        }

        // Check for educational content
        const hasEducationalChannel = EDUCATIONAL_CHANNELS.some(channel => lowerUrl.includes(channel))
        const hasEducationalKeyword = EDUCATIONAL_KEYWORDS.some(keyword => lowerUrl.includes(keyword))

        if (hasEducationalChannel) {
            return {
                platform: 'youtube',
                contentType: 'education',
                suggestedCategory: 'Education',
                confidence: 'high',
                emoji: '📚',
                description: 'Educational content'
            }
        }

        if (hasEducationalKeyword) {
            return {
                platform: 'youtube',
                contentType: 'education',
                suggestedCategory: 'Education',
                confidence: 'medium',
                emoji: '📚',
                description: 'Educational content'
            }
        }

        // Check for podcast content
        const hasPodcastKeyword = PODCAST_KEYWORDS.some(keyword => lowerUrl.includes(keyword))
        if (hasPodcastKeyword) {
            return {
                platform: 'youtube',
                contentType: 'podcast',
                suggestedCategory: 'Podcasts',
                confidence: 'medium',
                emoji: '🎙️',
                description: 'Podcast'
            }
        }

        // Default YouTube video
        return {
            platform: 'youtube',
            contentType: 'video',
            suggestedCategory: 'YouTube Videos',
            confidence: 'medium',
            emoji: '🎥',
            description: 'YouTube video'
        }
    }

    // ========== INSTAGRAM DETECTION ==========
    if (lowerUrl.includes('instagram.com')) {

        // Instagram Reels
        if (lowerUrl.includes('/reel/')) {
            return {
                platform: 'instagram',
                contentType: 'reel',
                suggestedCategory: 'Instagram Reels',
                confidence: 'high',
                emoji: '🎬',
                description: 'Instagram Reel'
            }
        }

        // Instagram IGTV
        if (lowerUrl.includes('/tv/')) {
            return {
                platform: 'instagram',
                contentType: 'igtv',
                suggestedCategory: 'Instagram IGTV',
                confidence: 'high',
                emoji: '📺',
                description: 'Instagram IGTV'
            }
        }

        // Instagram Post
        if (lowerUrl.includes('/p/')) {
            return {
                platform: 'instagram',
                contentType: 'post',
                suggestedCategory: 'Instagram Posts',
                confidence: 'high',
                emoji: '📸',
                description: 'Instagram Post'
            }
        }

        // Default Instagram
        return {
            platform: 'instagram',
            contentType: 'post',
            suggestedCategory: 'Instagram',
            confidence: 'medium',
            emoji: '📸',
            description: 'Instagram content'
        }
    }

    // ========== TIKTOK DETECTION ==========
    if (lowerUrl.includes('tiktok.com')) {
        return {
            platform: 'tiktok',
            contentType: 'video',
            suggestedCategory: 'TikTok',
            confidence: 'high',
            emoji: '🎵',
            description: 'TikTok video'
        }
    }

    // ========== TWITTER/X DETECTION ==========
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
        return {
            platform: 'twitter',
            contentType: 'post',
            suggestedCategory: 'Twitter',
            confidence: 'high',
            emoji: '🐦',
            description: 'Twitter/X post'
        }
    }

    // ========== VIMEO DETECTION ==========
    if (lowerUrl.includes('vimeo.com')) {
        return {
            platform: 'vimeo',
            contentType: 'video',
            suggestedCategory: 'Vimeo',
            confidence: 'high',
            emoji: '🎥',
            description: 'Vimeo video'
        }
    }

    // ========== TWITCH DETECTION ==========
    if (lowerUrl.includes('twitch.tv')) {
        return {
            platform: 'twitch',
            contentType: 'stream',
            suggestedCategory: 'Gaming',
            confidence: 'high',
            emoji: '🎮',
            description: 'Twitch stream'
        }
    }

    // ========== SPOTIFY DETECTION ==========
    if (lowerUrl.includes('spotify.com')) {
        return {
            platform: 'spotify',
            contentType: 'music',
            suggestedCategory: 'Music',
            confidence: 'high',
            emoji: '🎵',
            description: 'Spotify content'
        }
    }

    // ========== LINKEDIN LEARNING DETECTION ==========
    if (lowerUrl.includes('linkedin.com/learning')) {
        return {
            platform: 'linkedin',
            contentType: 'education',
            suggestedCategory: 'Education',
            confidence: 'high',
            emoji: '📚',
            description: 'LinkedIn Learning'
        }
    }

    // Default fallback
    return {
        platform: 'other',
        contentType: 'video',
        suggestedCategory: 'Videos',
        confidence: 'low',
        emoji: '🔗',
        description: 'Video link'
    }
}

/**
 * Get predefined category list with emojis
 * @returns {Array} List of category objects
 */
export function getPredefinedCategories() {
    return [
        { name: 'Music', emoji: '🎵' },
        { name: 'Education', emoji: '📚' },
        { name: 'Instagram Reels', emoji: '🎬' },
        { name: 'Instagram Posts', emoji: '📸' },
        { name: 'YouTube Videos', emoji: '🎥' },
        { name: 'YouTube Shorts', emoji: '⚡' },
        { name: 'Podcasts', emoji: '🎙️' },
        { name: 'Gaming', emoji: '🎮' },
        { name: 'Cooking', emoji: '🍳' },
        { name: 'Fitness', emoji: '💪' },
        { name: 'Tech & DIY', emoji: '🔧' },
        { name: 'News', emoji: '📰' },
        { name: 'Entertainment', emoji: '🎭' },
        { name: 'Travel', emoji: '✈️' },
        { name: 'Fashion', emoji: '👗' },
        { name: 'Art & Creative', emoji: '🎨' }
    ]
}

/**
 * Get emoji for a category name
 * @param {string} categoryName - Category name
 * @returns {string} Emoji or default
 */
export function getCategoryEmoji(categoryName) {
    const categories = getPredefinedCategories()
    const found = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())
    return found ? found.emoji : '📁'
}
