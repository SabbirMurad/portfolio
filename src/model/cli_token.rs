use serde::{Deserialize, Serialize};

use crate::Model::Account::AccountRole;

/// A credential minted by `POST /api/cli/login` and stored on the caller's
/// machine by the terminal client.
///
/// Deliberately not a JWT, and deliberately not the dashboard's session cookie:
///
///   • it is opaque and looked up server-side, so it can be revoked the moment
///     a laptop goes missing — a signed token can't be;
///   • the shell execution routes accept *only* this, which is what keeps a
///     browser out. Page JavaScript can reach a cookie; it cannot reach a file
///     in ~/.config.
///
/// Only the hash is stored. The plaintext is returned once, at login, and if
/// the caller loses it they log in again — the database never holds anything
/// that could be replayed.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CliToken {
    pub uuid: String,
    pub user_id: String,
    /// Copied from the account at mint time so the auth path is a single
    /// lookup. A role change means existing tokens have to be revoked.
    pub role: AccountRole,
    /// Hex-encoded SHA-256 of the token the client holds.
    pub token_hash: String,
    /// Free text from the client — usually its hostname, so a list of tokens
    /// is readable.
    pub label: String,
    pub created_at: i64,
    pub expires_at: i64,
    pub last_used_at: Option<i64>,
    pub revoked_at: Option<i64>,
}
