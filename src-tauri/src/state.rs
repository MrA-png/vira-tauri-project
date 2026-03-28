use screencapturekit::stream::SCStream;
use std::sync::Mutex;

pub struct AppState {
    pub stream: Mutex<Option<SCStream>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            stream: Mutex::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
