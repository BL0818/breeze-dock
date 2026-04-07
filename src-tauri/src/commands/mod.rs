pub mod notes;
pub mod settings;
pub mod groups;
pub mod window;
pub mod backup;
pub mod tags;
pub mod shortcuts;
pub mod clipboard;
pub mod security;

use serde::{Deserialize, Serialize};

pub type CommandResult<T> = Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: Option<String>,
}

impl SuccessResponse {
    pub fn ok() -> Self {
        Self { success: true, message: None }
    }
    pub fn with_message(msg: &str) -> Self {
        Self { success: true, message: Some(msg.to_string()) }
    }
}
