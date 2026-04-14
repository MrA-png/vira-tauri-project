use crate::errors::AppError;
use crate::models::TranscriptUpdate;
use crate::services::translation::translate_lossy;
use deepgram::Deepgram;
use deepgram::common::options::{Encoding, Model, Options, Language};
use deepgram::common::stream_response::StreamResponse;
use log::{error, info};
use tauri::Emitter;
use tokio::sync::mpsc;

pub const TRANSCRIPT_EVENT: &str = "transcript-update";

pub struct SttService {
    deepgram: Deepgram,
}

impl SttService {
    pub fn new(api_key: impl Into<String>) -> Result<Self, AppError> {
        let deepgram = Deepgram::new(api_key.into())
            .map_err(|e| AppError::Stt(e.to_string()))?;
        Ok(Self { deepgram })
    }

    pub async fn run_stream(
        &self,
        mut receiver: mpsc::Receiver<Vec<f32>>,
        window: tauri::Window,
        lang_pair: String,
    ) -> Result<(), AppError> {
        info!("STT stream starting with lang_pair: {}...", lang_pair);

        let options = Options::builder()
            .model(Model::Nova2)
            .smart_format(true)
            .language(if lang_pair.starts_with("id") { Language::id } else { Language::en })
            .build();

        let mut handle = self
            .deepgram
            .transcription()
            .stream_request_with_options(options)
            .encoding(Encoding::Linear16)
            .sample_rate(48000)
            .channels(1)
            .interim_results(true)
            .handle()
            .await
            .map_err(|e| AppError::Stt(e.to_string()))?;

        info!("Deepgram handle created");

        loop {
            tokio::select! {
                result = handle.receive() => {
                    match result {
                        Some(Ok(StreamResponse::TranscriptResponse { channel, is_final, .. })) => {
                            if let Some(alt) = channel.alternatives.first() {
                                if !alt.transcript.is_empty() {
                                    Self::handle_transcript(
                                        &window,
                                        alt.transcript.clone(),
                                        is_final,
                                        lang_pair.clone(),
                                    );
                                }
                            }
                        }
                        Some(Ok(_)) => {}
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
                    let pcm_i16 = Self::f32_to_linear16(pcm_f32);
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

    fn handle_transcript(window: &tauri::Window, text: String, is_final: bool, lang_pair: String) {
        let window_clone = window.clone();

        if is_final {
            tokio::spawn(async move {
                let translation = translate_lossy(&text, &lang_pair).await;
                info!("Translation received: {}", translation);
                let update = TranscriptUpdate { text, translation, is_final: true };
                window_clone.emit(TRANSCRIPT_EVENT, update).ok();
            });
        } else {
            let update = TranscriptUpdate {
                text,
                translation: String::new(),
                is_final: false,
            };
            window.emit(TRANSCRIPT_EVENT, update).ok();
        }
    }


    fn f32_to_linear16(samples: Vec<f32>) -> Vec<u8> {
        samples
            .into_iter()
            .map(|s| (s.clamp(-1.0, 1.0) * 32_767.0) as i16)
            .flat_map(|s| s.to_le_bytes())
            .collect()
    }
}
