use std::env;
use actix_web::{ HttpResponse, Error };
use chrono::Utc;
use mongodb::bson::doc;
use mongodb::options::ReplaceOptions;
use reqwest::Client;
use serde_json::Value;
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Youtube;
use crate::utils::response::Response;

const CACHE_KEY: &str = "feed";
const CACHE_TTL: i64  = 3600 * 1000;

fn format_count(n: u64) -> String {
    if n >= 1_000_000 {
        let v = n as f64 / 1_000_000.0;
        if v.fract() == 0.0 { format!("{}M", v as u64) } else { format!("{:.1}M", v) }
    } else if n >= 1_000 {
        let v = n as f64 / 1_000.0;
        if v.fract() == 0.0 { format!("{}K", v as u64) } else { format!("{:.1}K", v) }
    } else {
        n.to_string()
    }
}

fn parse_duration(iso: &str) -> String {
    let s = iso.trim_start_matches("PT");
    let (mut h, mut m, mut sec) = (0u32, 0u32, 0u32);
    let mut buf = String::new();
    for ch in s.chars() {
        match ch {
            'H' => { h   = buf.parse().unwrap_or(0); buf.clear(); }
            'M' => { m   = buf.parse().unwrap_or(0); buf.clear(); }
            'S' => { sec = buf.parse().unwrap_or(0); buf.clear(); }
            _   => buf.push(ch),
        }
    }
    if h > 0 { format!("{}:{:02}:{:02}", h, m, sec) }
    else      { format!("{}:{:02}", m, sec) }
}

fn relative_time(published_at: &str) -> String {
    let now = Utc::now().timestamp();
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(published_at) {
        let days = (now - dt.timestamp()) / 86400;
        return match days {
            0        => "today".into(),
            1        => "1 day ago".into(),
            2..=6    => format!("{} days ago", days),
            7..=13   => "1 week ago".into(),
            14..=29  => format!("{} weeks ago", days / 7),
            30..=59  => "1 month ago".into(),
            60..=364 => format!("{} months ago", days / 30),
            365..=729 => "1 year ago".into(),
            _        => format!("{} years ago", days / 365),
        };
    }
    "recently".into()
}

async fn fetch_from_youtube(
    api_key: &str,
) -> Result<(Youtube::ChannelInfo, Vec<Youtube::VideoInfo>), String> {
    let client = Client::new();

    // ── 1. Channel info ──────────────────────────────────────────────────────
    let ch_url = format!(
        "https://www.googleapis.com/youtube/v3/channels\
         ?part=snippet,statistics&forHandle=itscompiletime&key={}",
        api_key
    );
    let ch_json: Value = serde_json::from_str(
        &client.get(&ch_url).send().await.map_err(|e| e.to_string())?
            .text().await.map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    let item    = &ch_json["items"][0];
    let snippet = &item["snippet"];
    let stats   = &item["statistics"];
    let ch_id   = item["id"].as_str()
        .ok_or_else(|| "missing channel id".to_string())?.to_string();

    let subs:  u64 = stats["subscriberCount"].as_str().unwrap_or("0").parse().unwrap_or(0);
    let vids:  u64 = stats["videoCount"].as_str().unwrap_or("0").parse().unwrap_or(0);
    let views: u64 = stats["viewCount"].as_str().unwrap_or("0").parse().unwrap_or(0);
    let since  = snippet["publishedAt"].as_str().unwrap_or("").get(..4).unwrap_or("—").to_string();
    let avatar = snippet["thumbnails"]["high"]["url"]
        .as_str().or_else(|| snippet["thumbnails"]["default"]["url"].as_str())
        .unwrap_or("").to_string();
    let desc_full = snippet["description"].as_str().unwrap_or("").to_string();
    let description = if desc_full.len() > 200 {
        format!("{}…", &desc_full[..200])
    } else {
        desc_full
    };

    let channel = Youtube::ChannelInfo {
        name: snippet["title"].as_str().unwrap_or("Sabbir Hassan").to_string(),
        handle: "@itscompiletime".to_string(),
        description,
        subscribers: if stats["hiddenSubscriberCount"].as_bool().unwrap_or(false) {
            "—".into()
        } else {
            format_count(subs)
        },
        video_count: format_count(vids),
        total_views: format_count(views),
        since,
        avatar_url: avatar,
    };

    // ── 2. Recent videos (search) ─────────────────────────────────────────────
    let search_url = format!(
        "https://www.googleapis.com/youtube/v3/search\
         ?part=snippet&channelId={}&order=date&maxResults=4&type=video&key={}",
        ch_id, api_key
    );
    let search_json: Value = serde_json::from_str(
        &client.get(&search_url).send().await.map_err(|e| e.to_string())?
            .text().await.map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    let ids: Vec<String> = search_json["items"]
        .as_array()
        .map(|arr| arr.iter()
            .filter_map(|i| i["id"]["videoId"].as_str().map(|s| s.to_string()))
            .collect())
        .unwrap_or_default();

    if ids.is_empty() {
        return Ok((channel, vec![]));
    }

    // ── 3. Video details (duration + views) ───────────────────────────────────
    let details_url = format!(
        "https://www.googleapis.com/youtube/v3/videos\
         ?part=snippet,contentDetails,statistics&id={}&key={}",
        ids.join(","), api_key
    );
    let details_json: Value = serde_json::from_str(
        &client.get(&details_url).send().await.map_err(|e| e.to_string())?
            .text().await.map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    let videos: Vec<Youtube::VideoInfo> = details_json["items"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|v| {
            let snip    = &v["snippet"];
            let content = &v["contentDetails"];
            let vstats  = &v["statistics"];
            let views: u64 = vstats["viewCount"].as_str()
                .unwrap_or("0").parse().unwrap_or(0);
            let thumbnail = snip["thumbnails"]["maxres"]["url"].as_str()
                .or_else(|| snip["thumbnails"]["high"]["url"].as_str())
                .unwrap_or("").to_string();

            Youtube::VideoInfo {
                video_id:     v["id"].as_str().unwrap_or("").to_string(),
                title:        snip["title"].as_str().unwrap_or("").to_string(),
                thumbnail,
                views:        format_count(views),
                duration:     parse_duration(content["duration"].as_str().unwrap_or("PT0S")),
                published_at: relative_time(snip["publishedAt"].as_str().unwrap_or("")),
            }
        })
        .collect();

    Ok((channel, videos))
}

pub async fn task() -> Result<HttpResponse, Error> {
    let api_key = env::var("YOUTUBE_API_KEY")
        .map_err(|_| actix_web::error::ErrorInternalServerError("YOUTUBE_API_KEY not set"))?;

    let db         = MongoDB.connect();
    let collection = db.collection::<Youtube::YoutubeCache>("youtube_cache");
    let now        = Utc::now().timestamp_millis();

    // ── Check cache ───────────────────────────────────────────────────────────
    if let Ok(Some(cached)) = collection.find_one(doc! { "key": CACHE_KEY }).await {
        if now - cached.cached_at < CACHE_TTL {
            return Ok(HttpResponse::Ok().json(serde_json::json!({
                "channel": cached.channel,
                "videos":  cached.videos,
            })));
        }
    }

    // ── Fetch fresh from YouTube ──────────────────────────────────────────────
    let (channel, videos) = fetch_from_youtube(&api_key).await.map_err(|e| {
        log::error!("YouTube API error: {}", e);
        actix_web::error::ErrorInternalServerError(e)
    })?;

    // ── Upsert cache (replace_one with upsert option) ─────────────────────────
    let cache_doc = Youtube::YoutubeCache {
        key:       CACHE_KEY.to_string(),
        channel:   channel.clone(),
        videos:    videos.clone(),
        cached_at: now,
    };

    let opts = ReplaceOptions::builder().upsert(true).build();
    let result = collection
        .replace_one(doc! { "key": CACHE_KEY }, &cache_doc)
        .with_options(opts)
        .await;

    if let Err(e) = result {
        log::error!("YouTube cache upsert failed: {}", e);
        return Ok(Response::internal_server_error(&e.to_string()));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "channel": channel,
        "videos":  videos,
    })))
}
