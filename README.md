## 🗂 Backend Architecture

The Rust backend follows a clean, layered architecture:

```
src-tauri/src/
├── main.rs               # Entry point (Windows subsystem flag)
├── lib.rs                # Module root & Tauri bootstrap
├── state.rs              # Shared AppState (audio stream handle)
│
├── config/               # Environment & runtime configuration
│   └── mod.rs
│
├── errors/               # Centralised error types (AppError)
│   └── mod.rs
│
├── models/               # Domain structs (TranscriptUpdate)
│   └── mod.rs
│
├── services/             # Business logic
│   ├── audio.rs          # ScreenCaptureKit audio capture
│   ├── stt.rs            # Deepgram streaming transcription
│   └── translation.rs    # MyMemory translation
│
├── commands/             # Tauri command handlers (thin layer)
│   ├── interview.rs      # start_interview, stop_interview
│   └── window.rs         # open_settings_window
│
└── utils/                # Reusable helpers
    └── window.rs         # macOS NSWindow overrides & level constants
```

## 🚀 Getting Started

### Prerequisites

- macOS 13.0+
- Rust (latest stable)

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

**Created with ❤️ by MrA-png**
