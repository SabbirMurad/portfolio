use serde::{Deserialize, Serialize};

/// The two résumé templates. Neither owns an address: the dashboard swaps
/// them between /resume and /resume_hidden (see ResumeSetting).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ResumeVariant {
    A,
    B,
}

impl ResumeVariant {
    pub fn template(&self) -> &'static str {
        match self {
            ResumeVariant::A => "resume_a.html",
            ResumeVariant::B => "resume_b.html",
        }
    }
}

// The dashboard's swap — a singleton doc found by `key`, same pattern as
// Youtube::FeaturedVideos. Not swapped (and no doc at all): A at /resume, B
// at /resume_hidden. Swapped: the other way round.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResumeSetting {
    pub key: String,
    pub swapped: bool,
    pub updated_at: i64,
}

/// Which template each address renders for a given swap state.
pub fn at_resume(swapped: bool) -> ResumeVariant {
    if swapped { ResumeVariant::B } else { ResumeVariant::A }
}

pub fn at_resume_hidden(swapped: bool) -> ResumeVariant {
    if swapped { ResumeVariant::A } else { ResumeVariant::B }
}
