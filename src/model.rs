use serde::{Deserialize, Serialize};

pub mod account;
pub use account as Account;

pub mod documentation;
pub use documentation as Documentation;

pub mod contact;
pub use contact as Contact;

pub mod youtube;
pub use youtube as Youtube;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AllowedImageType { Gif, Png, Jpeg, Webp }

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ImageStruct {
  pub uuid: String,
  pub height: usize,
  pub width: usize,
  pub r#type: AllowedImageType
}