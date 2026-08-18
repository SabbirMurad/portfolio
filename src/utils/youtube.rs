/*
 * Accepts whatever an admin might paste into the "featured video" fields on
 * the dashboard — a bare video id or any of YouTube's URL shapes — and
 * normalizes it down to the 11-character id the Data API actually wants.
 */

fn is_video_id(s: &str) -> bool {
    s.len() == 11 && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

pub fn extract_video_id(input: &str) -> Option<String> {
    let input = input.trim();
    if input.is_empty() {
        return None;
    }

    if is_video_id(input) {
        return Some(input.to_string());
    }

    // youtu.be/{id}
    if let Some(rest) = input.split("youtu.be/").nth(1) {
        let id = rest.split(['?', '&', '#']).next().unwrap_or("");
        if is_video_id(id) {
            return Some(id.to_string());
        }
    }

    // youtube.com/watch?v={id}  (v= may not be the first query param)
    if let Some(query) = input.split('?').nth(1) {
        for pair in query.split('&') {
            if let Some(id) = pair.strip_prefix("v=") {
                let id = id.split(['&', '#']).next().unwrap_or("");
                if is_video_id(id) {
                    return Some(id.to_string());
                }
            }
        }
    }

    // youtube.com/embed/{id} or youtube.com/shorts/{id}
    for marker in ["/embed/", "/shorts/"] {
        if let Some(rest) = input.split(marker).nth(1) {
            let id = rest.split(['?', '&', '#']).next().unwrap_or("");
            if is_video_id(id) {
                return Some(id.to_string());
            }
        }
    }

    None
}
