import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import "./App.css";

const appWindow = getCurrentWindow();

interface TranscriptPayload {
  text: string;
  translation: string;
  is_final: boolean;
}

interface HistoryItem {
  original: string;
  translation: string;
}

type CaptureState = "idle" | "capturing" | "paused";

function App() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [interim, setInterim] = useState<string>("");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [isTransparent, setIsTransparent] = useState(false);
  const [isTranslating, setIsTranslating] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isCapturing = captureState === "capturing";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistenTranscript = listen<TranscriptPayload>("transcript-update", (event) => {
      const { text, translation, is_final } = event.payload;
      
      if (is_final) {
        setHistory(prev => {
          const newHistory = [...prev, { original: text, translation }];
          // Auto-save on every final segment if we have a session
          if (sessionId) {
            saveCurrentSession(sessionId, newHistory);
          }
          return newHistory;
        });
        setInterim("");
      } else {
        setInterim(text);
      }
    });

    // Listen for setting changes from standalone window
    const unlistenSettingsChange = listen<{ isTransparent: boolean; isTranslating: boolean }>("settings-change", (event) => {
      setIsTransparent(event.payload.isTransparent);
      setIsTranslating(event.payload.isTranslating);
    });

    // Handle requests for initial state from secondary windows
    const unlistenRequestSync = listen("request-settings-sync", () => {
      emit("settings-sync", { isTransparent, isTranslating });
    });

    return () => {
      unlistenTranscript.then((fn) => fn());
      unlistenSettingsChange.then((fn) => fn());
      unlistenRequestSync.then((fn) => fn());
    };
  }, [isTransparent, isTranslating, sessionId]);

  const saveCurrentSession = async (id: string, currentHistory: HistoryItem[]) => {
    try {
      const session = {
        id,
        title: `Session ${new Date(parseInt(id)).toLocaleString()}`,
        created_at: new Date(parseInt(id)).toISOString(),
        transcriptions: currentHistory.map(h => ({
          original: h.original,
          translation: h.translation,
          timestamp: new Date().toISOString()
        }))
      };
      await invoke("save_session", { session });
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, interim]);

  const handleStart = async () => {
    try {
      const newId = Date.now().toString();
      setSessionId(newId);
      setHistory([]);
      setInterim("");
      setCaptureState("capturing");
      await invoke("start_interview");
    } catch (error) {
      console.error("Failed to start capture:", error);
      setCaptureState("idle");
    }
  };

  const handlePause = async () => {
    try {
      await invoke("stop_interview");
      setInterim("");
      setCaptureState("paused");
    } catch (error) {
      console.error("Failed to pause capture:", error);
    }
  };

  const handleResume = async () => {
    try {
      setInterim("");
      setCaptureState("capturing");
      await invoke("start_interview");
    } catch (error) {
      console.error("Failed to resume capture:", error);
      setCaptureState("paused");
    }
  };

  const handleStop = async () => {
    try {
      if (captureState === "capturing") {
        await invoke("stop_interview");
      }
      
      // Final save
      if (sessionId && history.length > 0) {
        await saveCurrentSession(sessionId, history);
      }

      setHistory([]);
      setInterim("");
      setSessionId(null);
      setCaptureState("idle");
    } catch (error) {
      console.error("Failed to stop capture:", error);
    }
  };

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleClose = async () => {
    console.log("Closing window...");
    await appWindow.close();
  };


  const openSettings = async () => {
    try {
      await invoke("open_settings_window");
    } catch (error) {
      console.error("Failed to open settings window:", error);
    }
  };

  const openHistory = async () => {
    try {
      await invoke("open_history_window");
    } catch (error) {
      console.error("Failed to open history window:", error);
    }
  };

  return (
    <main 
      className="fixed inset-0 cursor-default select-none overflow-hidden bg-transparent flex items-center justify-center p-2"
    >
      <div 
        className={`w-full h-full rounded-2xl flex flex-col overflow-hidden relative transition-all duration-500 ${
          isTransparent 
            ? 'bg-slate-900/10 border border-white/10' 
            : 'bg-slate-900/65 border border-white/5'
        }`}
      >
        {/* Navbar */}
        <nav
          className={`h-10 shrink-0 border-b relative flex items-center justify-between z-30 transition-colors duration-500 ${
            isTransparent ? 'bg-white/10 border-white/5' : 'bg-white/5 border-white/5'
          }`}
        >
          {/* Full-width drag area behind everything */}
          <div
            data-tauri-drag-region
            onMouseDown={() => appWindow.startDragging()}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          />

          {/* Logo — non-interactive, sits on top of drag area */}
          <div className="relative z-10 flex items-center space-x-2 px-4 pointer-events-none">
            <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-colors duration-500 ${
              isTransparent ? 'bg-sky-400/50' : 'bg-sky-500'
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${
              isTransparent ? 'text-sky-100/40' : 'text-sky-200/90'
            }`}>
              VIRA Assistant
            </span>
          </div>

          {/* Buttons — sit on top of drag area and block drag events */}
          <div className="relative z-10 flex items-center space-x-1 px-2">
            {/* Controls — idle */}
            {captureState === "idle" && (
              <button
                onClick={handleStart}
                className="p-1.5 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-all pointer-events-auto flex items-center space-x-1.5 px-2.5"
                title="Mulai sesi"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Start</span>
              </button>
            )}

            {/* Controls — capturing */}
            {captureState === "capturing" && (
              <>
                <button
                  onClick={handlePause}
                  className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all pointer-events-auto flex items-center space-x-1.5 px-2.5 border border-amber-500/20"
                  title="Jeda sementara"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="5" y="4" width="4" height="16" rx="1" />
                    <rect x="15" y="4" width="4" height="16" rx="1" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pause</span>
                </button>
                <button
                  onClick={handleStop}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all pointer-events-auto flex items-center space-x-1.5 px-2.5 border border-red-500/20"
                  title="Hentikan & reset"
                >
                  <div className="h-1.5 w-1.5 rounded-sm bg-red-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
                </button>
              </>
            )}

            {/* Controls — paused */}
            {captureState === "paused" && (
              <>
                <button
                  onClick={handleResume}
                  className="p-1.5 hover:bg-green-500/20 text-green-400 rounded-lg transition-all pointer-events-auto flex items-center space-x-1.5 px-2.5 border border-green-500/20"
                  title="Lanjutkan sesi"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Resume</span>
                </button>
                <button
                  onClick={handleStop}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all pointer-events-auto flex items-center space-x-1.5 px-2.5 border border-red-500/20"
                  title="Hentikan & reset"
                >
                  <div className="h-1.5 w-1.5 rounded-sm bg-red-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
                </button>
              </>
            )}

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button
              id="btn-history"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={openHistory}
              className={`p-1.5 rounded-lg transition-all duration-300 group pointer-events-auto flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-sky-400`}
              title="Open History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              id="btn-settings"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={openSettings}
              className={`p-1.5 rounded-lg transition-all duration-300 group pointer-events-auto flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-sky-400`}
              title="Open Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Minimize */}
            <button
              id="btn-minimize"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMinimize}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all group pointer-events-auto"
              title="Minimize"
              aria-label="Minimize"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <button
              id="btn-close"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="p-1.5 hover:bg-red-500/40 rounded-lg transition-all group pointer-events-auto"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col px-4 py-2 space-y-2 overflow-hidden">
          {/* Header Status - Only show when capturing and there's vertical space */}
          <header className={`flex items-center justify-between shrink-0 transition-all duration-300 ${captureState !== "idle" && window.innerHeight > 200 ? 'opacity-100 flex' : 'opacity-0 h-0 overflow-hidden hidden'}`}>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Session Status</span>
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] text-sky-300/60 font-medium animate-pulse uppercase">Live Capture</span>
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            </div>
          </header>

          {/* Transcript Area */}
          <section 
            ref={scrollRef}
            className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar cursor-text min-h-0 border border-white/5 rounded-xl"
          >
            <div className="flex flex-col space-y-4">
              {history.map((item, idx) => (
                <div key={idx} className="flex flex-col space-y-1 group">
                  <p className="text-slate-200 text-[13px] font-light leading-snug whitespace-pre-wrap">
                    {item.original}
                  </p>
                  {isTranslating && (
                    <p className="text-sky-300/40 text-[10px] font-medium italic border-l border-white/10 pl-2 py-0.5">
                      {item.translation}
                    </p>
                  )}
                </div>
              ))}
              {interim && (
                <p className="text-slate-400/60 text-[13px] font-light italic leading-snug animate-pulse">
                  {interim}...
                </p>
              )}
              {history.length === 0 && !interim && !isCapturing && (
                <div className="flex items-center justify-center space-x-3 py-2 h-full">
                  <div className="h-2.5 w-2.5 rounded-full bg-sky-500/40 relative">
                    <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
                  </div>
                  <span className={`italic text-[11px] font-medium tracking-tight transition-colors duration-500 ${
                    isTransparent ? 'text-white/90' : 'text-slate-500'
                  }`}>
                    Sistem siap. Klik "Start" di navbar untuk memulai.
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Subtle Watermark */}
        <div className="absolute bottom-2 right-4 pointer-events-none select-none">
          <span className="text-[8px] text-white/5 font-medium tracking-widest uppercase mb-1 mr-2 leading-none">
            by MrA-png
          </span>
        </div>

      </div>

    </main>
  );
}

export default App;
