use serde::{Deserialize, Serialize};

pub mod account;
pub use account as Account;

pub mod documentation;
pub use documentation as Documentation;

pub mod contact;
pub use contact as Contact;

pub mod youtube;
pub use youtube as Youtube;

pub mod project;
pub use project as Project;

pub mod shell;
pub use shell as Shell;

pub mod cli_token;
pub use cli_token as CliToken;

// Ported from velora_backend's src/model.rs — image metadata now lives here
// in Mongo (ImageStruct below) instead of in sqlite columns, which is what
// let builtins/image.rs go away: sqlite only holds the original/webp blobs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AllowedImageType { Gif, Png, Jpeg, Webp }

impl std::fmt::Display for AllowedImageType {
    fn fmt(&self, fmt: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(fmt, "{}", self.to_str())
    }
}

impl AllowedImageType {
    pub fn to_str(&self) -> &str {
        match self {
            AllowedImageType::Gif => "image/gif",
            AllowedImageType::Png => "image/png",
            AllowedImageType::Jpeg => "image/jpeg",
            AllowedImageType::Webp => "image/webp",
        }
    }

    #[allow(dead_code)]
    pub fn from_str(s: &str) -> AllowedImageType {
        match s {
            "image/gif" => AllowedImageType::Gif,
            "image/png" => AllowedImageType::Png,
            "image/jpeg" => AllowedImageType::Jpeg,
            "image/webp" => AllowedImageType::Webp,
            _ => AllowedImageType::Jpeg,
        }
    }
}

// What an uploaded image is for — velora_backend's variants are for a social
// app (ProfilePic/CoverPic/Post/Comment/Chat/VideoThumbnail); ProjectThumbnail
// is this project's own addition for the dashboard's project cards.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AssetUsedAt {
    ProfilePic,
    CoverPic,
    Post,
    Comment,
    Chat,
    VideoThumbnail,
    ProjectThumbnail,
}

impl std::fmt::Display for AssetUsedAt {
    fn fmt(&self, fmt: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(fmt, "{:?}", self)
    }
}

impl AssetUsedAt {
    #[allow(dead_code)]
    pub fn from_str(s: &str) -> AssetUsedAt {
        match s {
            "ProfilePic" => AssetUsedAt::ProfilePic,
            "CoverPic" => AssetUsedAt::CoverPic,
            "Post" => AssetUsedAt::Post,
            "Comment" => AssetUsedAt::Comment,
            "Chat" => AssetUsedAt::Chat,
            "VideoThumbnail" => AssetUsedAt::VideoThumbnail,
            "ProjectThumbnail" => AssetUsedAt::ProjectThumbnail,
            _ => AssetUsedAt::ProfilePic,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ImageStruct {
    pub uuid: String,
    pub height: usize,
    pub width: usize,
    pub original_size: usize,
    pub webp_size: usize,
    // Encoded client-side and sent with the upload (assets/js/image-uploader.js);
    // decoded client-side too, by assets/js/blurhash.js, which paints it while
    // the file downloads. Empty for anything uploaded before that existed —
    // callers must treat it as optional.
    pub blur_hash: String,
    pub used_at: AssetUsedAt,
    pub original_type: String,
    pub temporary: bool,
    pub deleted: bool,
    pub created_at: i64,
}