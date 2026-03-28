use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptUpdate {
    pub text: String,
    pub translation: String,
    pub is_final: bool,
}
