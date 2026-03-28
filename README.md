# VIRA Assistant

VIRA is a modern interview companion designed to help you stay focused and confident during your interview process.

## 💡 What is VIRA?

VIRA (Virtual Interview Assistant) acts as a smart overlay on your computer screen. It captures live system audio and converts it into real-time text transcripts, allowing you to follow the conversation visually.

With VIRA, you no longer have to worry about missing key questions or losing your train of thought. It empowers you to focus on building a strong connection with your interviewer and delivering your best answers to advance your career.

## ✨ Key Highlights

- **Glassmorphism Aesthetics**: An elegant, frosted-glass interface designed to blend seamlessly with your workspace without being a distraction.
- **Dynamic Transparency**: Flexibility at your fingertips. Toggle between a rich glass look and a high-transparency mode to keep your background content visible while monitoring the conversation.
- **Privacy & Directness**: Built as a dedicated personal tool that efficiently captures system audio frequencies and presents them as instant, readable text.
- **Conversation Continuity**: Maintains a persistent history within each session, enabling you to easily scroll back and review previous points discussed during the interview.

## 🛠 Powered By

VIRA is built using a combination of modern technologies to ensure performance and reliability:

- **Tauri** & **Rust** — High-performance native backend
- **React** & **TypeScript** — Interactive frontend
- **Tailwind CSS** — Premium styling
- **Deepgram** — Real-time speech-to-text transcription
- **ScreenCaptureKit** — Native macOS system audio capture
- **MyMemory API** — English → Indonesian live translation

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

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| `commands/` | Validate input, call services, return `Result<T, String>` |
| `services/` | All business logic — audio, STT, translation |
| `models/` | Typed, serialisable domain structs |
| `errors/` | Single `AppError` enum propagated via `?` |
| `config/` | Load env vars into typed `AppConfig` |
| `utils/` | macOS-specific window management helpers |

## 🚀 Getting Started

### Prerequisites

- macOS 13.0+
- Rust (latest stable)
- Node.js 18+
- A [Deepgram](https://deepgram.com) API key

### Setup

```bash
# Clone the repository
git clone https://github.com/MrA-png/vira.git
cd vira

# Create .env file
echo "DEEPGRAM_API_KEY=your_api_key_here" > src-tauri/.env

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

**Created with ❤️ by MrA-png**
