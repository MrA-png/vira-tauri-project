use log::{info, error};
use deepgram::Deepgram;
use tokio::sync::mpsc;
use tauri::Emitter;

async fn translate_text(text: &str) -> String {
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair=en|id",
        urlencoding::encode(text)
    );

    match reqwest::get(&url).await {
        Ok(res) => {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(translated) = json["responseData"]["translatedText"].as_str() {
                    return translated.to_string();
                }
            }
            "Translation failed".to_string()
        }
        Err(_) => "Connection error".to_string(),
    }
}

pub struct SttManager {
    #[allow(dead_code)]
    deepgram: Deepgram,
}

impl SttManager {
    pub fn new(api_key: String) -> Self {
        Self {
            deepgram: Deepgram::new(api_key).expect("Failed to create Deepgram client"),
        }
    }

    pub async fn start_stream(&self, mut receiver: mpsc::Receiver<Vec<f32>>, window: tauri::Window) -> Result<(), Box<dyn std::error::Error>> {
        use deepgram::common::options::{Options, Model, Encoding};
        use deepgram::common::stream_response::StreamResponse;
        
        info!("STT Stream starting...");

        let options = Options::builder()
            .model(Model::Nova2)
            .smart_format(true)
            .build();

        let mut handle = self.deepgram
            .transcription()
            .stream_request_with_options(options)
            .encoding(Encoding::Linear16)
            .sample_rate(48000)
            .channels(1)
            .interim_results(true)
            .handle()
            .await?;

        info!("Deepgram handle created");

        loop {
            tokio::select! {
                result = handle.receive() => {
                    match result {
                        Some(Ok(StreamResponse::TranscriptResponse { channel, is_final, .. })) => {
                            if let Some(alt) = channel.alternatives.first() {
                                if !alt.transcript.is_empty() {
                                    let text = alt.transcript.clone();
                                    let window_clone = window.clone();
                                    
                                    if is_final {
                                        // Translate only when final to save API calls
                                        tokio::spawn(async move {
                                            let translation = translate_text(&text).await;
                                            info!("Translation received: {}", translation);
                                            window_clone.emit("transcript-update", serde_json::json!({
                                                "text": text,
                                                "translation": translation,
                                                "is_final": true
                                            })).ok();
                                        });
                                    } else {
                                        // For interim, send without translation
                                        window.emit("transcript-update", serde_json::json!({
                                            "text": text,
                                            "translation": "",
                                            "is_final": false
                                        })).ok();
                                    }
                                }
                            }
                        }
                        Some(Ok(_)) => {} // Other responses
                        Some(Err(e)) => {
                            error!("Deepgram error: {:?}", e);
                            break;
                        }
                        None => {
                            info!("Deepgram stream closed");
                            break;
                        }
                    }
                }
                Some(pcm_f32) = receiver.recv() => {
                    // Convert f32 to i16 (Linear16)
                    let pcm_i16: Vec<u8> = pcm_f32.into_iter()
                        .map(|s| (s.clamp(-1.0, 1.0) * 32767.0) as i16)
                        .flat_map(|s| s.to_le_bytes())
                        .collect();
                    
                    if let Err(e) = handle.send_data(pcm_i16).await {
                        error!("Error sending data to Deepgram: {:?}", e);
                        break;
                    }
                }
                else => break,
            }
        }
        
        handle.finalize().await.ok();
        Ok(())
    }
}
