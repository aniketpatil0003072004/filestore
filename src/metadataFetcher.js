/**
 * FREE Metadata Fetcher for Video Vault
 * Uses 100% FREE APIs - No authentication required
 * - YouTube oEmbed API (FREE, no key needed)
 * - Instagram oEmbed API (FREE, no key needed)
 * - Web scraping as fallback (FREE)
 */

// Request queue to prevent rate limiting
const requestQueue = []
let isProcessing = false

/**
 * Extract video ID from URL
 */
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
            if (url.includes('embed/')) {
                return url.split('embed/')[1]?.split('?')[0]
            }
            if (url.includes('/shorts/')) {
                return url.split('/shorts/')[1]?.split('?')[0]
            }
        }

        // Instagram patterns
        if (url.includes('instagram.com')) {
            const match = url.match(/\/(reel|p|tv)\/([^\/\?]+)/)
            if (match) return match[2]
        }
    } catch (e) {
        console.error('Error extracting video ID', e)
    }
    return null
}

/**
 * Fetch YouTube metadata using FREE oEmbed API
 * No API key required!
 */
async function fetchYouTubeMetadata(url) {
    try {
        // Use YouTube's FREE oEmbed endpoint
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`

        const response = await fetch(oembedUrl)

        if (!response.ok) {
            throw new Error(`YouTube oEmbed failed: ${response.status}`)
        }

        const data = await response.json()

        // Extract metadata
        return {
            title: data.title || 'Untitled Video',
            channelName: data.author_name || 'Unknown Channel',
            creatorProfile: data.author_url || '',
            thumbnail: data.thumbnail_url || '',
            description: '', // oEmbed doesn't provide description, will scrape if needed
            platform: 'youtube',
            success: true
        }
    } catch (error) {
        console.error('YouTube metadata fetch error:', error)

        // Fallback: Try web scraping
        return await scrapeYouTubeMetadata(url)
    }
}

/**
 * Fetch Instagram metadata using FREE oEmbed API
 * No authentication required!
 */
async function fetchInstagramMetadata(url) {
    try {
        // Use Instagram's FREE oEmbed endpoint
        const oembedUrl = `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=`

        // Try without access token first (sometimes works)
        const response = await fetch(oembedUrl)

        if (!response.ok) {
            throw new Error(`Instagram oEmbed failed: ${response.status}`)
        }

        const data = await response.json()

        // Extract metadata
        return {
            title: data.title || 'Instagram Post',
            channelName: data.author_name || 'Unknown User',
            creatorProfile: data.author_url || '',
            thumbnail: data.thumbnail_url || '',
            description: '', // oEmbed doesn't provide description
            platform: 'instagram',
            success: true
        }
    } catch (error) {
        console.error('Instagram metadata fetch error:', error)

        // Fallback: Try web scraping
        return await scrapeInstagramMetadata(url)
    }
}

/**
 * Scrape YouTube metadata from page HTML (Fallback)
 */
async function scrapeYouTubeMetadata(url) {
    try {
        // Use a CORS proxy for scraping (free service)
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`

        const response = await fetch(proxyUrl)
        const html = await response.text()

        // Extract Open Graph meta tags
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        const channelMatch = html.match(/<link itemprop="name" content="([^"]+)"/)

        // Extract Duration (ISO 8601 format: PT1H30M)
        const durationMatch = html.match(/<meta itemprop="duration" content="([^"]+)"/)
        const durationInMinutes = durationMatch ? parseDuration(durationMatch[1]) : 0

        return {
            title: titleMatch?.[1] || 'YouTube Video',
            channelName: channelMatch?.[1] || 'Unknown Channel',
            creatorProfile: '',
            thumbnail: thumbMatch?.[1] || '',
            description: descMatch?.[1] || '',
            duration: durationInMinutes, // Added duration
            platform: 'youtube',
            success: true
        }
    } catch (error) {
        console.error('YouTube scraping error:', error)

        // Final fallback: Return basic info
        return {
            title: 'YouTube Video',
            channelName: 'Unknown Channel',
            creatorProfile: '',
            thumbnail: '',
            description: '',
            duration: 0,
            platform: 'youtube',
            success: false
        }
    }
}

/**
 * Helper: Parse ISO 8601 duration (PT1H30M) to minutes
 */
function parseDuration(duration) {
    try {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
        if (!match) return 0

        const hours = (parseInt(match[1]) || 0)
        const minutes = (parseInt(match[2]) || 0)
        // We ignore seconds for the "Movie" check (usually > 60 mins)

        return (hours * 60) + minutes
    } catch (e) {
        return 0
    }
}

/**
 * Scrape Instagram metadata from page HTML (Fallback)
 */
async function scrapeInstagramMetadata(url) {
    try {
        // Use a CORS proxy for scraping
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`

        const response = await fetch(proxyUrl)
        const html = await response.text()

        // Extract Open Graph meta tags
        let titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
        const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/)

        // FALLBACK: If og:title missing, try <title> tag
        let rawTitle = titleMatch?.[1] || ''
        if (!rawTitle) {
            const pageTitleMatch = html.match(/<title>([^<]+)<\/title>/)
            if (pageTitleMatch) rawTitle = pageTitleMatch[1] // e.g. "Name (@user) • Instagram photos and videos"
        }

        // Parse Author and Caption
        let channelName = 'Unknown User'
        let title = 'Instagram Post'
        const rawDesc = descMatch?.[1] || ''

        // Format 1: "Name (@username) on Instagram: 'Caption'" (OG Title)
        // Format 2: "Name (@username) • Instagram photos and videos" (Page Title)

        // Try matching standard "Name (@handle)" pattern
        const authorMatch = rawTitle.match(/^(.+?) \(@(.+?)\)/)

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
            } else {
                // Try looking for just "username on Instagram"
                const userMatch = rawDesc.match(/([A-Za-z0-9_.]+) on Instagram/);
                if (userMatch) channelName = userMatch[1];
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
            description: rawDesc,
            platform: 'instagram',
            success: true
        }
    } catch (error) {
        console.error('Instagram scraping error:', error)

        // Final fallback
        return {
            title: 'Instagram Post',
            channelName: 'Unknown User',
            creatorProfile: url,
            thumbnail: '',
            description: '',
            platform: 'instagram',
            success: false
        }
    }
}

/**
 * Smart request queue to prevent rate limiting
 */
async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return

    isProcessing = true
    const { url, platform, resolve } = requestQueue.shift()

    try {
        let metadata
        if (platform === 'youtube') {
            metadata = await fetchYouTubeMetadata(url)
        } else if (platform === 'instagram') {
            metadata = await fetchInstagramMetadata(url)
        } else {
            metadata = { success: false }
        }
        resolve(metadata)
    } catch (error) {
        resolve({ success: false })
    }

    // Small delay to avoid rate limits (100ms)
    await new Promise(resolve => setTimeout(resolve, 100))

    isProcessing = false
    processQueue() // Process next in queue
}

/**
 * Add request to queue
 */
function queueMetadataRequest(url, platform) {
    return new Promise((resolve) => {
        requestQueue.push({ url, platform, resolve })
        processQueue()
    })
}

/**
 * Main function: Enrich metadata for any URL
 * Uses FREE APIs with smart caching and fallbacks
 */
export async function enrichMetadata(url) {
    try {
        if (!url) {
            return {
                title: '',
                channelName: '',
                creatorProfile: '',
                thumbnail: '',
                description: '',
                platform: 'unknown',
                success: false
            }
        }

        const lowerUrl = url.toLowerCase()

        // Detect platform
        let platform = 'unknown'
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            platform = 'youtube'
        } else if (lowerUrl.includes('instagram.com')) {
            platform = 'instagram'
        }

        // Fetch metadata using queue (prevents rate limiting)
        const metadata = await queueMetadataRequest(url, platform)

        return metadata
    } catch (error) {
        console.error('Metadata enrichment error:', error)
        return {
            title: '',
            channelName: '',
            creatorProfile: '',
            thumbnail: '',
            description: '',
            platform: 'unknown',
            success: false
        }
    }
}

/**
 * Check if metadata is already cached in database
 */
export function shouldFetchMetadata(existingItem) {
    // If we already have title and channel name, don't fetch again
    if (existingItem?.title && existingItem?.channel_name) {
        return false
    }
    return true
}

export { extractVideoId }
