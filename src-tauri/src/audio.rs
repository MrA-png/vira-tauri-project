use log::{info, error};
use screencapturekit::prelude::*;
use tokio::sync::mpsc;


pub struct AudioHandler {
    #[allow(dead_code)]
    sender: mpsc::Sender<Vec<f32>>,
}

impl AudioHandler {
    pub fn new(sender: mpsc::Sender<Vec<f32>>) -> Self {
        Self { sender }
    }
}

impl SCStreamOutputTrait for AudioHandler {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, of_type: SCStreamOutputType) {
        if let SCStreamOutputType::Audio = of_type {
            if let Some(list) = sample.audio_buffer_list() {
                for buffer in list.iter() {
                    let data = buffer.data();
                    if !data.is_empty() {
                        // SCREENCAPTUREKIT typically provides f32 LPCM audio.
                        // We need to convert the byte slice to a f32 slice.
                        // SAFETY: We must ensure data is a multiple of 4.
                        let f32_data: Vec<f32> = data
                            .chunks_exact(4)
                            .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                            .collect();
                        
                        if !f32_data.is_empty() {
                            if let Err(_) = self.sender.try_send(f32_data) {
                                // Channel full or closed, skip this buffer
                            }
                        }
                    }
                }
            }
        }
    }
}

pub struct AudioErrorHandler;
impl SCStreamDelegateTrait for AudioErrorHandler {
    fn did_stop_with_error(&self, error: SCError) {
        error!("Stream stopped with error: {:?}", error);
    }
}

pub fn start_audio_capture(sender: mpsc::Sender<Vec<f32>>) -> Result<SCStream, Box<dyn std::error::Error>> {
    let content = SCShareableContent::get()?;
    let display = content.displays().into_iter().next().ok_or("No display found")?;
    
    let filter = SCContentFilter::create()
        .with_display(&display)
        .build();
    
    let config = SCStreamConfiguration::new()
        .with_captures_audio(true)
        .with_sample_rate(48000)
        .with_channel_count(1);
    
    let handler = AudioHandler::new(sender);
    let mut stream = SCStream::new_with_delegate(&filter, &config, AudioErrorHandler);
    
    // In screencapturekit-rs, we add output handlers
    stream.add_output_handler(handler, SCStreamOutputType::Audio);
    
    info!("Calling SCStream start_capture...");
    stream.start_capture()?;
    info!("SCStream start_capture returned Ok");
    
    Ok(stream)
}
