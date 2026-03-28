use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Audio(String),
    Stt(String),
    Translation(String),
    Config(String),
    Window(String),
    Other(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Audio(msg) => write!(f, "Audio error: {}", msg),
            AppError::Stt(msg) => write!(f, "STT error: {}", msg),
            AppError::Translation(msg) => write!(f, "Translation error: {}", msg),
            AppError::Config(msg) => write!(f, "Config error: {}", msg),
            AppError::Window(msg) => write!(f, "Window error: {}", msg),
            AppError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<Box<dyn std::error::Error>> for AppError {
    fn from(e: Box<dyn std::error::Error>) -> Self {
        AppError::Other(e.to_string())
    }
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}
