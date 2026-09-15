/*
 * URL segments for project detail pages: /projects/<slug>.
 *
 * Titles are written for people — "Bento — custom Chrome theme" — and have to
 * survive being put in a URL, a canonical tag and a sitemap without escaping.
 * Anything that is not an ASCII letter or digit becomes a hyphen, runs
 * collapse, and the ends are trimmed.
 *
 * Rows written before slugs existed have none stored, so readers slugify the
 * title instead and get the same answer this would have given at the time —
 * which is why this has to stay stable. Changing the rules changes the URL of
 * every legacy project at once.
 */

pub fn slugify(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut last_was_dash = true; // leading dashes are trimmed by this too

    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            last_was_dash = false;
        } else if !last_was_dash {
            out.push('-');
            last_was_dash = true;
        }
    }

    while out.ends_with('-') {
        out.pop();
    }

    out
}

/// The slug a project answers to: the stored one, or what its title would have
/// produced. Kept in one place so the feed, the page lookup and the upsert
/// cannot drift apart on the question.
pub fn project_slug(stored: &Option<String>, title: &str) -> String {
    stored
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| slugify(title))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn titles_become_url_safe_segments() {
        assert_eq!(slugify("Fireball"), "fireball");
        assert_eq!(slugify("Bento — custom Chrome theme"), "bento-custom-chrome-theme");
        assert_eq!(slugify("Hasp / dating app"), "hasp-dating-app");
        assert_eq!(slugify("C++ & Rust"), "c-rust");
    }

    #[test]
    fn separators_collapse_and_never_hang_off_the_ends() {
        assert_eq!(slugify("  spaced   out  "), "spaced-out");
        assert_eq!(slugify("--leading and trailing--"), "leading-and-trailing");
        assert_eq!(slugify("!!!"), "");
    }

    #[test]
    fn non_ascii_titles_do_not_leak_into_the_url() {
        // Nothing here is ascii-alphanumeric, so nothing survives — the caller
        // is expected to reject the empty result rather than route to /projects/.
        assert_eq!(slugify("রেজিউমি"), "");
        assert_eq!(slugify("Résumé"), "r-sum");
    }

    #[test]
    fn a_stored_slug_wins_and_a_blank_one_does_not() {
        assert_eq!(project_slug(&Some("hyper".into()), "Hyper Drive"), "hyper");
        assert_eq!(project_slug(&Some("   ".into()), "Hyper Drive"), "hyper-drive");
        assert_eq!(project_slug(&None, "Hyper Drive"), "hyper-drive");
    }
}
