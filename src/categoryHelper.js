/**
 * Strict Platform-Based Categorization Helper
 */

export function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const isInstagram = url.includes('instagram.com');

    // 1. YouTube Shorts
    if (url.includes('/shorts/')) {
        return { fullCategory: 'YouTube Shorts', emoji: '⚡', subcategory: 'Shorts' };
    }

    // 2. Instagram Reels
    if (url.includes('/reel/')) {
        return { fullCategory: 'Instagram Reels', emoji: '📸', subcategory: 'Reels' };
    }

    // 3. Instagram Posts
    if (url.includes('/p/')) {
        return { fullCategory: 'Instagram Posts', emoji: '🖼️', subcategory: 'Posts' };
    }

    // 4. YouTube Videos (Long Form)
    // We check for Movies > 60 mins distinctively if desired, 
    // BUT user requested strict "YouTube Videos" folder. 
    // We will stick to "YouTube Videos" generally.
    if (isYoutube) {
        // Optional: Keep Movies if very long? 
        // User said: "if th video is from youtuve it should go to the youtube videos"
        // so we default to that.
        if (metadata?.duration > 3600) { // > 60 mins
            return { fullCategory: 'Movies', emoji: '🎬', subcategory: 'Film' };
        }
        return { fullCategory: 'YouTube Videos', emoji: '📹', subcategory: 'Video' };
    }

    // 5. Fallback
    return { fullCategory: 'Other Links', emoji: '🔗', subcategory: 'General' };
}
