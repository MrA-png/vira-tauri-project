use crate::errors::AppError;
use log::error;
use screencapturekit::prelude::*;
use tokio::sync::mpsc;

pub struct AudioHandler {
    #[allow(dead_code)]
    sender: mpsc::Sender<Vec<f32>>,
}

impl AudioHandler {
    fn new(sender: mpsc::Sender<Vec<f32>>) -> Self {
        Self { sender }
    }
}

impl SCStreamOutputTrait for AudioHandler {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, of_type: SCStreamOutputType) {
        if let SCStreamOutputType::Audio = of_type {
            if let Some(list) = sample.audio_buffer_list() {
                for buffer in list.iter() {
                    let data = buffer.data();
                    if data.is_empty() {
                        continue;
                    }
                    let f32_data: Vec<f32> = data
                        .chunks_exact(4)
                        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                        .collect();

                    if !f32_data.is_empty() {
                        let _ = self.sender.try_send(f32_data);
                    }
                }
            }
        }
    }
}

pub struct AudioErrorHandler;

impl SCStreamDelegateTrait for AudioErrorHandler {
    fn did_stop_with_error(&self, error: SCError) {
        error!("Audio stream stopped with error: {:?}", error);
    }
}

pub fn start_audio_capture(sender: mpsc::Sender<Vec<f32>>) -> Result<SCStream, AppError> {
    let content = SCShareableContent::get()
        .map_err(|e| AppError::Audio(e.to_string()))?;

    let display = content
        .displays()
        .into_iter()
        .next()
        .ok_or_else(|| AppError::Audio("No display found for audio capture".into()))?;

    let filter = SCContentFilter::create()
        .with_display(&display)
        .build();

    let config = SCStreamConfiguration::new()
        .with_captures_audio(true)
        .with_sample_rate(48000)
        .with_channel_count(1);

    let handler = AudioHandler::new(sender);
    let mut stream = SCStream::new_with_delegate(&filter, &config, AudioErrorHandler);
    stream.add_output_handler(handler, SCStreamOutputType::Audio);

    stream
        .start_capture()
        .map_err(|e| AppError::Audio(e.to_string()))?;

    Ok(stream)
}
