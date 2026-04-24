use serde::{Deserialize, Serialize};

//contact_email
#[derive(Debug, Deserialize, Serialize)]
pub struct ContactEmail {
    pub uuid: String,
    pub name: String,
    pub email: String,
    pub subject: String,
    pub message: String,
    pub created_at: i64,
}