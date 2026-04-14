use crate::errors::AppError;
use log::error;
use urlencoding;

pub async fn translate(text: &str, lang_pair: &str) -> Result<String, AppError> {
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair={}",
        urlencoding::encode(text),
        lang_pair
    );

    let response = reqwest::get(&url)
        .await
        .map_err(|e| AppError::Translation(e.to_string()))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Translation(e.to_string()))?;

    json["responseData"]["translatedText"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Translation("Unexpected response structure from MyMemory".into()))
}

pub async fn translate_lossy(text: &str, lang_pair: &str) -> String {
    match translate(text, lang_pair).await {
        Ok(t) => t,
        Err(e) => {
            error!("{}", e);
            "Translation failed".to_string()
        }
    }
}

