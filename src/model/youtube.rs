use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChannelInfo {
    pub name: String,
    pub handle: String,
    pub description: String,
    pub subscribers: String,
    pub video_count: String,
    pub total_views: String,
    pub since: String,
    pub avatar_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub video_id: String,
    pub title: String,
    pub thumbnail: String,
    pub views: String,
    pub duration: String,
    pub published_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YoutubeCache {
    pub key: String,
    pub channel: ChannelInfo,
    pub videos: Vec<VideoInfo>,
    pub cached_at: i64,
}

// Admin's manual pick for the home page's YouTube section — a single
// singleton doc (found by `key`), same pattern as YoutubeCache. When
// `primary_video_id` is set, src/handler/youtube/feed.rs fetches exactly
// these videos instead of the channel's most-recent-4; when it's None, feed
// falls back to that automatic behavior.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeaturedVideos {
    pub key: String,
    pub primary_video_id: Option<String>,
    pub secondary_video_ids: Vec<String>,
    pub updated_at: i64,
}
