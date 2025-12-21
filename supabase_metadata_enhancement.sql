-- Vaultify - Metadata Enhancement Schema
-- Add columns for rich metadata storage
-- Run this in your Supabase SQL Editor

-- Add new columns to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS channel_name TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS creator_profile TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS content_description TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS platform_category TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_channel_name ON items(channel_name);
CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items(subcategory);
CREATE INDEX IF NOT EXISTS idx_items_platform_category ON items(platform_category);

-- Add comment to table
COMMENT ON COLUMN items.channel_name IS 'YouTube channel name or Instagram username';
COMMENT ON COLUMN items.creator_profile IS 'Link to creator profile';
COMMENT ON COLUMN items.subcategory IS 'Subcategory like IPL, Bollywood, Comedy, etc.';
COMMENT ON COLUMN items.content_description IS 'Video description from metadata';
COMMENT ON COLUMN items.thumbnail_url IS 'High-quality thumbnail URL from API';
COMMENT ON COLUMN items.platform_category IS 'Platform-specific category (Sports, Music, etc.)';
COMMENT ON COLUMN items.metadata IS 'Additional metadata in JSON format (views, likes, duration, etc.)';

-- Example of data structure after migration:
-- {
--   "id": 123,
--   "url": "https://youtube.com/watch?v=abc123",
--   "title": "IND vs PAK - Epic Last Over | World Cup 2024",
--   "category": "Cricket - World Cup",
--   "subcategory": "World Cup",
--   "channel_name": "ICC Cricket",
--   "creator_profile": "https://youtube.com/@ICC",
--   "content_description": "Watch the thrilling last over finish...",
--   "thumbnail_url": "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
--   "platform_category": "Sports",
--   "metadata": {
--     "platform": "youtube",
--     "videoId": "abc123",
--     "fetchedAt": "2024-12-05T15:22:00Z"
--   }
-- }
