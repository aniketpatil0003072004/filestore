/**
 * Simple Rule-Based Categorization Helper
 */

export function analyzeContentWithMetadata(url, metadata, urlAnalysis) {
    const title = (metadata?.title || '').toLowerCase();
    const description = (metadata?.description || '').toLowerCase();
    const channelName = (metadata?.channelName || '').toLowerCase();
    const combinedText = `${title} ${description} ${channelName}`;
    // Parse duration if it's a string like "12:30" or extracted as raw minutes
    let duration = 0;
    if (typeof metadata?.duration === 'number') {
        duration = metadata.duration;
    } else if (typeof metadata?.duration === 'string') {
        // Basic parsing if needed, but usually metadataFetcher handles this
        duration = parseFloat(metadata.duration) || 0;
    }

    // 1. DURATION RULE: Movies (> 60 minutes)
    // Only for YouTube, as Instagram doesn't typically have long movies
    if ((metadata?.platform === 'youtube' || url.includes('youtube')) && duration > 60) {
        return { fullCategory: 'Movies', emoji: '🎬', subcategory: 'Film' };
    }

    // 2. SHORTS / REELS (High Priority)
    if (url.includes('/shorts/')) return { fullCategory: 'YouTube Shorts', emoji: '⚡', subcategory: 'Shorts' };
    if (url.includes('/reel/')) return { fullCategory: 'Instagram Reels', emoji: '📸', subcategory: 'Reels' };

    // 3. MUSIC RULE: Check keywords
    const musicKeywords = [
        'official video', 'lyrical video', 'music video', 'full song', 'audio song',
        't-series', 'sony music', 'zee music', 'speed records', 'lahari music', 'anand audio',
        'vevo', 'records', 'beats', 'mv'
    ];
    if (musicKeywords.some(k => combinedText.includes(k))) {
        return { fullCategory: 'Music', emoji: '🎵', subcategory: 'Song' };
    }

    // 4. Default Fallbacks based on keywords
    if (combinedText.includes('podcast') || combinedText.includes('episode')) return { fullCategory: 'Podcasts', emoji: '🎙️' };
    if (combinedText.includes('funny') || combinedText.includes('comedy') || combinedText.includes('standup') || combinedText.includes('prank')) return { fullCategory: 'Funny', emoji: '😂' };
    if (combinedText.includes('news') || combinedText.includes('report') || combinedText.includes('live')) return { fullCategory: 'News', emoji: '📰' };
    if (combinedText.includes('tech') || combinedText.includes('review') || combinedText.includes('unboxing') || combinedText.includes('gadget')) return { fullCategory: 'Tech', emoji: '💻' };
    if (combinedText.includes('recipe') || combinedText.includes('cook') || combinedText.includes('kitchen') || combinedText.includes('food')) return { fullCategory: 'Cooking', emoji: '🍳' };
    if (combinedText.includes('gym') || combinedText.includes('workout') || combinedText.includes('fitness') || combinedText.includes('exercise')) return { fullCategory: 'Fitness', emoji: '💪' };
    if (combinedText.includes('cricket') || combinedText.includes('football') || combinedText.includes('match') || combinedText.includes('highlight')) return { fullCategory: 'Sports', emoji: '🏆' };

    // 5. Fallback if nothing matches
    return { fullCategory: 'Videos', emoji: '📹', subcategory: 'General' };
}
