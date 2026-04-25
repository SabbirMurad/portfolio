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
