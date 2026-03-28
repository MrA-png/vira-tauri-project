#[cfg(target_os = "macos")]
pub fn apply_window_overrides(window: &tauri::WebviewWindow, level: isize) {
    use log::{info, warn};
    use objc2::msg_send;
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

    if let Ok(ns_window) = window.ns_window() {
        let ns_window = ns_window as *mut NSWindow;
        let ns_window = unsafe { &*ns_window };

        unsafe {
            let _: () = msg_send![ns_window, setLevel: level];

            let mut behavior = ns_window.collectionBehavior();
            behavior |= NSWindowCollectionBehavior::CanJoinAllSpaces;
            behavior |= NSWindowCollectionBehavior::FullScreenAuxiliary;
            ns_window.setCollectionBehavior(behavior);
        }

        info!("macOS window level {} applied to '{}'", level, window.label());
    } else {
        warn!(
            "Could not obtain NSWindow for '{}'; skipping overrides",
            window.label()
        );
    }
}

pub const MAIN_WINDOW_LEVEL: isize = 25;
pub const OVERLAY_WINDOW_LEVEL: isize = 26;
