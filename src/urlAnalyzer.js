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

        // Default YouTube video
        return {
            platform: 'youtube',
            contentType: 'video',
            suggestedCategory: 'YouTube Videos',
            confidence: 'high',
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

        // Instagram Post (Default for any other Insta link)
        return {
            platform: 'instagram',
            contentType: 'post',
            suggestedCategory: 'Instagram Posts',
            confidence: 'high',
            emoji: '📸',
            description: 'Instagram Post'
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
        { name: 'YouTube Videos', emoji: '🎥' },
        { name: 'YouTube Shorts', emoji: '⚡' },
        { name: 'Instagram Reels', emoji: '🎬' },
        { name: 'Instagram Posts', emoji: '📸' },
        // Expanded Smart Categories
        { name: 'Hindi Movies', emoji: '🎬' },
        { name: 'English Movies', emoji: '🎬' },
        { name: 'Podcasts', emoji: '🎙️' },
        { name: 'Funny', emoji: '😂' },
        { name: 'Sports', emoji: '🏆' },
        { name: 'Music', emoji: '🎵' },
        { name: 'Education', emoji: '📚' },
        { name: 'Tech', emoji: '💻' }
    ]
}

/**
 * Get emoji for a category name
 * Smart matching for dynamic categories
 * @param {string} categoryName - Category name
 * @returns {string} Emoji or default
 */
export function getCategoryEmoji(categoryName) {
    if (!categoryName) return '📁'

    // 1. Exact Match
    const categories = getPredefinedCategories()
    const found = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())
    if (found) return found.emoji

    // 2. Keyword Match (Smart Fallback)
    const lowerName = categoryName.toLowerCase()

    if (lowerName.includes('movie')) return '🎬'
    if (lowerName.includes('podcast')) return '🎙️'
    if (lowerName.includes('funny') || lowerName.includes('comedy')) return '😂'
    if (lowerName.includes('sport') || lowerName.includes('cricket') || lowerName.includes('football')) return '🏆'
    if (lowerName.includes('music') || lowerName.includes('song')) return '🎵'
    if (lowerName.includes('tech') || lowerName.includes('code')) return '💻'
    if (lowerName.includes('news')) return '📰'
    if (lowerName.includes('short')) return '⚡'
    if (lowerName.includes('reel')) return '🎬'
    if (lowerName.includes('hindi')) return '🇮🇳' // Fallback for pure language categories

    return '📁'
}
