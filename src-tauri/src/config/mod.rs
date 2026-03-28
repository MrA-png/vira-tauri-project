use crate::errors::AppError;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub deepgram_api_key: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, AppError> {
        let deepgram_api_key = std::env::var("DEEPGRAM_API_KEY")
            .map_err(|_| AppError::Config("DEEPGRAM_API_KEY not found in environment".into()))?;

        Ok(Self { deepgram_api_key })
    }
}
