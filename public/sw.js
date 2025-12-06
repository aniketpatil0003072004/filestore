// Video Vault Service Worker with Background Save
// Handles PWA caching, Share Target API, and silent background saves

const CACHE_NAME = 'video-vault-v2'
const DB_NAME = 'video-vault-db'
const DB_VERSION = 1

// Supabase config - will be set by main app via postMessage
let SUPABASE_URL = ''
let SUPABASE_KEY = ''

const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
]

// ========== INSTALL ==========
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    )
    self.skipWaiting()
})

// ========== ACTIVATE ==========
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
    self.clients.claim()
})

// ========== FETCH - Handle Share Target ==========
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)

    // Handle Share Target POST requests
    if (url.pathname === '/' && event.request.method === 'POST') {
        event.respondWith(handleShareTarget(event.request))
        return
    }

    // Normal fetch handling: Network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseToCache = response.clone()
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache)
                    })
                return response
            })
            .catch(() => {
                return caches.match(event.request)
            })
    )
})

// ========== SHARE TARGET HANDLER ==========
// ========== SHARE TARGET HANDLER ==========
// ========== SHARE TARGET HANDLER ==========
async function handleShareTarget(request) {
    try {
        const formData = await request.formData()
        const sharedUrl = formData.get('url') || formData.get('text') || formData.get('title')

        if (!sharedUrl) {
            return Response.redirect('/', 303)
        }

        // Get user token from IndexedDB
        const token = await getTokenFromDB()

        if (!token) {
            // No token - redirect to app for login
            return Response.redirect(`/?url=${encodeURIComponent(sharedUrl)}`, 303)
        }

        // Analyze URL
        const analysis = analyzeUrl(sharedUrl)

        // Save in background
        try {
            // Fetch metadata
            const metadata = await enrichMetadata(sharedUrl)

            // Analyze content (Simplified 4-bucket logic)
            const contentAnalysis = analyzeContentWithMetadata(sharedUrl, metadata, analysis)

            await saveToDatabase(sharedUrl, analysis, token, metadata, contentAnalysis)

            // Show success notification
            const categoryName = contentAnalysis?.fullCategory || analysis.suggestedCategory
            const title = metadata?.title || 'Saved Link'
            const channel = metadata?.channelName ? `By: ${metadata.channelName}` : ''

            self.registration.showNotification('Video Vault', {
                body: `${analysis.emoji} Saved to ${categoryName}!\n${title}\n${channel}`,
                icon: metadata?.thumbnail || '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'video-vault-save',
                requireInteraction: false
            })

            // Redirect to saved.html which auto-closes
            return Response.redirect('/saved.html', 303)

        } catch (error) {
            console.error('Background save error:', error)

            // Show error notification
            self.registration.showNotification('Video Vault', {
                body: '❌ Failed to save. Opening app...',
                icon: '/icon-192.png',
                tag: 'video-vault-error'
            })

            // Fallback: redirect to app
            return Response.redirect(`/?url=${encodeURIComponent(sharedUrl)}`, 303)
        }

    } catch (error) {
        console.error('Share target error:', error)
        return Response.redirect('/', 303)
    }
}


// ========== INDEXEDDB - Get Token ==========
function getTokenFromDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => resolve(null)

        request.onsuccess = (event) => {
            const db = event.target.result

            if (!db.objectStoreNames.contains('auth')) {
                resolve(null)
                return
            }

            const transaction = db.transaction(['auth'], 'readonly')
            const store = transaction.objectStore('auth')
            const getRequest = store.get('user_token')

            getRequest.onsuccess = () => resolve(getRequest.result || null)
            getRequest.onerror = () => resolve(null)
        }

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains('auth')) {
                db.createObjectStore('auth')
            }
        }
    })
}

// ========== SUPABASE - Save to Database ==========
async function saveToDatabase(url, analysis, token, metadata, contentAnalysis) {
    // Auto-generate title
    let title = metadata?.title
    if (!title) {
        const videoId = extractVideoId(url)
        title = videoId ? `Video ${videoId.substring(0, 8)}` : `Link ${Date.now()}`
    }

    const newItem = {
        user_token: token,
        type: 'video',
        url: url,
        title: title,
        category: contentAnalysis?.fullCategory || analysis.suggestedCategory || 'Videos',
        notes: '',
        image_url: metadata?.thumbnail || null,
        channel_name: metadata?.channelName || null,
        creator_profile: metadata?.creatorProfile || null,
        content_description: metadata?.description || null,
        thumbnail_url: metadata?.thumbnail || null,
        metadata: metadata || null,
        created_at: new Date().toISOString()
    }

    // Get Supabase credentials from cache or use defaults
    const supabaseUrl = await getSupabaseUrl()
    const supabaseKey = await getSupabaseKey()

    const response = await fetch(`${supabaseUrl}/rest/v1/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(newItem)
    })

    if (!response.ok) {
        throw new Error(`Supabase error: ${response.status}`)
    }

    return await response.json()
}

// ========== URL ANALYZER (Simplified for SW) ==========
function analyzeUrl(url) {
    if (!url) {
        return {
            platform: 'unknown',
            contentType: 'unknown',
            suggestedCategory: 'Videos',
            confidence: 'low',
            emoji: '🔗',
            description: 'Video link'
        }
    }

    const lowerUrl = url.toLowerCase()

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

    // News detection
    const newsChannels = ['cnn', 'bbc', 'nbc', 'foxnews', 'msnbc', 'reuters', 'bloomberg', 'cnbc']
    const newsKeywords = ['news', 'breaking', 'headline', 'report']

    if (newsChannels.some(ch => lowerUrl.includes(ch)) || newsKeywords.some(kw => lowerUrl.includes(kw))) {
        return {
            platform: 'youtube',
            contentType: 'news',
            suggestedCategory: 'News',
            confidence: 'high',
            emoji: '📰',
            description: 'News video'
        }
    }

    // Cooking detection
    const cookingKeywords = ['recipe', 'cooking', 'food', 'chef', 'baking']
    if (cookingKeywords.some(kw => lowerUrl.includes(kw))) {
        return {
            platform: 'youtube',
            contentType: 'cooking',
            suggestedCategory: 'Cooking',
            confidence: 'high',
            emoji: '🍳',
            description: 'Cooking video'
        }
    }

    // Fitness detection
    const fitnessKeywords = ['workout', 'fitness', 'exercise', 'gym', 'yoga']
    if (fitnessKeywords.some(kw => lowerUrl.includes(kw))) {
        return {
            platform: 'youtube',
            contentType: 'fitness',
            suggestedCategory: 'Fitness',
            confidence: 'high',
            emoji: '💪',
            description: 'Fitness video'
        }
    }

    // Tech detection
    const techKeywords = ['tech', 'review', 'unboxing', 'coding', 'programming']
    if (techKeywords.some(kw => lowerUrl.includes(kw))) {
        return {
            platform: 'youtube',
            contentType: 'tech',
            suggestedCategory: 'Tech & DIY',
            confidence: 'high',
            emoji: '🔧',
            description: 'Tech video'
        }
    }

    // Music detection
    const musicKeywords = ['music', 'song', 'vevo', 'official', 'audio', 'lyrics']
    if (musicKeywords.some(kw => lowerUrl.includes(kw))) {
        return {
            platform: 'youtube',
            contentType: 'music',
            suggestedCategory: 'Music',
            confidence: 'high',
            emoji: '🎵',
            description: 'Music video'
        }
    }

    // Education detection
    const eduChannels = ['khanacademy', 'crashcourse', 'tedx', 'coursera', 'udemy']
    const eduKeywords = ['tutorial', 'lesson', 'course', 'learn', 'education']

    if (eduChannels.some(ch => lowerUrl.includes(ch)) || eduKeywords.some(kw => lowerUrl.includes(kw))) {
        return {
            platform: 'youtube',
            contentType: 'education',
            suggestedCategory: 'Education',
            confidence: 'high',
            emoji: '📚',
            description: 'Educational content'
        }
    }

    // Instagram Reels
    if (lowerUrl.includes('instagram.com/reel/')) {
        return {
            platform: 'instagram',
            contentType: 'reel',
            suggestedCategory: 'Instagram Reels',
            confidence: 'high',
            emoji: '🎬',
            description: 'Instagram Reel'
        }
    }

    // Instagram Posts
    if (lowerUrl.includes('instagram.com/p/')) {
        return {
            platform: 'instagram',
            contentType: 'post',
            suggestedCategory: 'Instagram Posts',
            confidence: 'high',
            emoji: '📸',
            description: 'Instagram Post'
        }
    }

    // TikTok
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

    // Default
    return {
        platform: 'youtube',
        contentType: 'video',
        suggestedCategory: 'YouTube Videos',
        confidence: 'medium',
        emoji: '🎥',
        description: 'YouTube video'
    }
}

// ========== EXTRACT VIDEO ID ==========
function extractVideoId(url) {
    try {
        if (!url) return null

        // YouTube patterns
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            if (url.includes('v=')) {
                return url.split('v=')[1]?.split('&')[0]
            }
            if (url.includes('youtu.be/')) {
                return url.split('youtu.be/')[1]?.split('?')[0]
            }
        }

        // Instagram patterns
        if (url.includes('instagram.com')) {
            const match = url.match(/\/(reel|p)\/([^\/\?]+)/)
            if (match) return match[2]
        }
    } catch (e) {
        console.error('Error extracting video ID', e)
    }
    return null
}

// ========== GET SUPABASE CONFIG ==========
async function getSupabaseUrl() {
    return SUPABASE_URL
}

async function getSupabaseKey() {
    return SUPABASE_KEY
}

// ========== MESSAGE HANDLER ==========
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SUPABASE_CONFIG') {
        // Store Supabase config when sent from main app
        SUPABASE_URL = event.data.url
        SUPABASE_KEY = event.data.key
        console.log('Supabase config received in Service Worker')
    }
})

// ========== METADATA FETCHER (Inlined for SW) ==========
async function enrichMetadata(url) {
    try {
        if (!url) return null
        const lowerUrl = url.toLowerCase()

        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            return await fetchYouTubeMetadata(url)
        } else if (lowerUrl.includes('instagram.com')) {
            return await fetchInstagramMetadata(url)
        }
        return null
    } catch (e) {
        console.error('Metadata fetch error:', e)
        return null
    }
}

async function fetchYouTubeMetadata(url) {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        const response = await fetch(oembedUrl)
        if (!response.ok) throw new Error('oEmbed failed')
        const data = await response.json()
        return {
            title: data.title,
            channelName: data.author_name,
            creatorProfile: data.author_url,
            thumbnail: data.thumbnail_url,
            platform: 'youtube',
            success: true
        }
    } catch (e) {
        // Fallback scraping
        return await scrapeYouTubeMetadata(url)
    }
}

async function fetchInstagramMetadata(url) {
    try {
        const oembedUrl = `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=`
        const response = await fetch(oembedUrl)
        if (!response.ok) throw new Error('oEmbed failed')
        const data = await response.json()
        return {
            title: data.title,
            channelName: data.author_name,
            creatorProfile: data.author_url,
            thumbnail: data.thumbnail_url,
            platform: 'instagram',
            success: true
        }
    } catch (e) {
        return await scrapeInstagramMetadata(url)
    }
}

async function scrapeYouTubeMetadata(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        const response = await fetch(proxyUrl)
        const html = await response.text()
        const title = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]
        const channel = html.match(/<link itemprop="name" content="([^"]+)"/)?.[1]
        const thumb = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]
        return {
            title: title || 'YouTube Video',
            channelName: channel || 'Unknown Channel',
            thumbnail: thumb || '',
            platform: 'youtube',
            success: true
        }
    } catch (e) {
        return { success: false }
    }
}

async function scrapeInstagramMetadata(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        const response = await fetch(proxyUrl)
        const html = await response.text()

        // Extract Open Graph meta tags
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/)

        // Parse Author and Caption
        let channelName = 'Unknown User'
        let title = 'Instagram Post'
        const rawTitle = titleMatch?.[1] || ''
        const rawDesc = descMatch?.[1] || ''

        // Format 1: "Name (@username) on Instagram: 'Caption'"
        const authorMatch = rawTitle.match(/^(.+?) \(@(.+?)\) on Instagram/)
        if (authorMatch) {
            channelName = authorMatch[1] // Real Name
            // If caption exists in title
            if (rawTitle.includes(': "')) {
                title = rawTitle.split(': "')[1].replace(/"$/, '')
            } else if (rawTitle.includes(": '")) {
                title = rawTitle.split(": '")[1].replace(/'$/, '')
            }
        }

        // Fallback: Try getting author from description if title failed
        if (channelName === 'Unknown User' && rawDesc) {
            const parts = rawDesc.split(' on Instagram: ')
            if (parts.length > 1) {
                // "100 likes, 5 comments - username on Instagram: ..."
                const userPart = parts[0].split('-').pop().trim()
                if (userPart) channelName = userPart
            }
        }

        // Use extracted title as the "Note" or Title if it's not generic
        if (title === 'Instagram Post' && rawDesc) {
            // Clean description (remove stats like "10K Likes, 50 Comments - ...")
            const pureDescParts = rawDesc.split('Instagram: "')
            if (pureDescParts.length > 1) {
                title = pureDescParts[1].replace(/"$/, '')
            }
        }

        // Limit title length
        if (title.length > 60) title = title.substring(0, 57) + '...'

        return {
            title: title,
            channelName: channelName,
            creatorProfile: url,
            thumbnail: thumbMatch?.[1] || '',
            description: rawDesc, // Keep full description just in case
            platform: 'instagram',
            success: true
        }
    } catch (e) {
        return { success: false }
    }
}

// ========== CONTENT ANALYZER (Inlined for SW) ==========
// ========== CONTENT ANALYZER (Inlined for SW) ==========
function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const title = metadata?.title || ''
    const description = metadata?.description || ''
    const channelName = metadata?.channelName || ''

    // Platform detection
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
