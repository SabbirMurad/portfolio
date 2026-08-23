use std::env;
use actix_web::{ HttpResponse, Error };
use chrono::Utc;
use reqwest::Client;
use serde::{ Serialize, Deserialize };
use crate::BuiltIns::redis::RedisCache;

// Queries LeetCode's own (unofficial but public) GraphQL API directly rather
// than a third-party wrapper like alfa-leetcode-api — that wrapper is itself
// just a thin proxy in front of this same endpoint, plus its own rate limit
// on top, which is what got sabbir0087's IP blocked (HTTP 429). Browsers
// can't call leetcode.com/graphql cross-origin, but this is a server-to-
// server request, so there's no CORS wall and one fewer point of failure.
//
// Still cached and throttled the same way regardless: one key, refreshed at
// most once a day, every visit in between served straight from Redis.
// `last_attempt_at` is a second, shorter throttle — while the upstream is
// down or rate-limiting us, every request would otherwise retry it, which
// just keeps the ban alive — RETRY_BACKOFF caps that to one real attempt per
// window, serving the last known-good numbers in between.
const CACHE_KEY: &str = "leetcode:stats:sabbir0087";
const CACHE_TTL: i64      = 24 * 3600 * 1000;
const RETRY_BACKOFF: i64  = 15 * 60 * 1000;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Stats {
    easy_solved: Option<i64>,
    medium_solved: Option<i64>,
    hard_solved: Option<i64>,
    // Set only on a successful fetch — drives the 24h CACHE_TTL check.
    cached_at: i64,
    // Set on every fetch attempt, success or failure — drives RETRY_BACKOFF.
    #[serde(default)]
    last_attempt_at: i64,
}

const GRAPHQL_QUERY: &str = "\
    query userProblemsSolved($username: String!) { \
        matchedUser(username: $username) { \
            submitStatsGlobal { acSubmissionNum { difficulty count } } \
        } \
    }";

async fn fetch_from_leetcode(
    user: &str,
) -> Result<(Option<i64>, Option<i64>, Option<i64>), String> {
    let client = Client::new();

    let response = client.post("https://leetcode.com/graphql")
        .header("Content-Type", "application/json")
        .header("Referer", "https://leetcode.com")
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
             (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        )
        .json(&serde_json::json!({
            "query": GRAPHQL_QUERY,
            "variables": { "username": user },
        }))
        .send().await.map_err(|e| e.to_string())?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("upstream returned {}", status));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let counts = json["data"]["matchedUser"]["submitStatsGlobal"]["acSubmissionNum"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    let count_for = |difficulty: &str| -> Option<i64> {
        counts.iter()
            .find(|entry| entry["difficulty"].as_str() == Some(difficulty))
            .and_then(|entry| entry["count"].as_i64())
    };

    Ok((count_for("Easy"), count_for("Medium"), count_for("Hard")))
}

pub async fn task() -> Result<HttpResponse, Error> {
    let user = env::var("LEETCODE_USER").unwrap_or_else(|_| "sabbir0087".to_string());
    let now  = Utc::now().timestamp_millis();

    let cached: Option<Stats> = RedisCache.get(CACHE_KEY).await
        .and_then(|raw| serde_json::from_str(&raw).ok());

    if let Some(stats) = &cached {
        let fresh_enough = now - stats.cached_at < CACHE_TTL;
        let attempted_recently = now - stats.last_attempt_at < RETRY_BACKOFF;
        if fresh_enough || attempted_recently {
            return Ok(HttpResponse::Ok().json(stats));
        }
    }

    let stats = match fetch_from_leetcode(&user).await {
        Ok((easy, medium, hard)) => Stats {
            easy_solved: easy,
            medium_solved: medium,
            hard_solved: hard,
            cached_at: now,
            last_attempt_at: now,
        },
        // Upstream is down or blocking us — keep the last known-good numbers
        // (nulls if there's never been a successful fetch, which the
        // frontend already renders as em dashes, see
        // assets/jsx/sections/competitive.jsx) and only bump the attempt
        // timestamp, so the next RETRY_BACKOFF window skips calling out again.
        Err(e) => {
            log::error!("LeetCode API error: {}", e);
            Stats {
                easy_solved: cached.as_ref().and_then(|c| c.easy_solved),
                medium_solved: cached.as_ref().and_then(|c| c.medium_solved),
                hard_solved: cached.as_ref().and_then(|c| c.hard_solved),
                cached_at: cached.as_ref().map(|c| c.cached_at).unwrap_or(0),
                last_attempt_at: now,
            }
        }
    };

    if let Ok(raw) = serde_json::to_string(&stats) {
        if let Err(e) = RedisCache.set(CACHE_KEY, &raw).await {
            log::error!("LeetCode cache write failed: {}", e);
        }
    }

    Ok(HttpResponse::Ok().json(stats))
}
