import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { AiModel } from "./services/ai";
import "./App.css";
import { 
  PauseIcon, 
  PlayIcon, 
  SettingsIcon, 
  HistoryIcon, 
  MinimizeIcon, 
  CloseIcon,
  StopIcon,
  ResetIcon,
  SparklesIcon
} from "./components/Icons";

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
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [langPair, setLangPair] = useState("en|id");
  const [aiModel, setAiModel] = useState<AiModel>("gemini-flash-latest");
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
    const unlistenSettingsChange = listen<{ isTransparent: boolean; isTranslating: boolean; langPair: string; isSplitMode: boolean; aiModel: string }>("settings-change", (event) => {
      setIsTransparent(event.payload.isTransparent);
      setIsTranslating(event.payload.isTranslating);
      if (event.payload.langPair) {
        setLangPair(event.payload.langPair);
      }
      if (event.payload.aiModel) {
        setAiModel(event.payload.aiModel as AiModel);
      }
      setIsSplitMode(!!event.payload.isSplitMode);
    });

    // Handle requests for initial state from secondary windows
    const unlistenRequestSync = listen("request-settings-sync", () => {
      emit("settings-sync", { isTransparent, isTranslating, langPair, isSplitMode, aiModel });
    });

    return () => {
      unlistenTranscript.then((fn) => fn());
      unlistenSettingsChange.then((fn) => fn());
      unlistenRequestSync.then((fn) => fn());
    };
  }, [isTransparent, isTranslating, langPair, isSplitMode, aiModel, sessionId]);


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
      await invoke("start_interview", { langPair });
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
      await invoke("start_interview", { langPair });
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

  const handleReset = async () => {
    // Save current session before clearing
    if (sessionId && history.length > 0) {
      await saveCurrentSession(sessionId, history);
    }
    // Start a fresh session ID but keep recording
    const newId = Date.now().toString();
    setSessionId(newId);
    setHistory([]);
    setInterim("");
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

  const openAiHelp = async () => {
    try {
      await invoke("open_ai_window");

      if (history.length > 0 || interim) {
        const fullTranscript = history.map(h => h.original).join(" ") + (interim ? " " + interim : "");
        setTimeout(() => {
          emit("ai-query", { text: fullTranscript });
        }, 500);
      }
    } catch (error) {
      console.error("Failed to open AI window:", error);
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
          {/* Drag Handle — avoids the button area on the right */}
          <div 
            data-tauri-drag-region
            className="absolute inset-0 right-[280px] cursor-grab active:cursor-grabbing z-0"
          />

          {/* Logo — non-interactive */}
          <div className="flex items-center space-x-2 px-4 pointer-events-none">
            <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-colors duration-500 ${
              isTransparent ? 'bg-sky-400/50' : 'bg-sky-500'
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${
              isTransparent ? 'text-sky-100/40' : 'text-sky-200/90'
            }`}>
              VIRA Assistant
            </span>
          </div>

          {/* Buttons — physically separated from the drag region */}
          <div 
            className="relative z-10 flex items-center space-x-1 px-2 pointer-events-auto"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {/* Controls — idle */}
            {captureState === "idle" && (
              <button
                onClick={handleStart}
                className="p-1.5 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-all flex items-center space-x-1.5 px-2.5"
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
                  className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all flex items-center space-x-1.5 px-2.5 border border-amber-500/20"
                  title="Jeda sementara"
                >
                  <PauseIcon className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pause</span>
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-all flex items-center space-x-1.5 px-2.5 border border-violet-500/20"
                  title="Clear transcript & mulai sesi baru"
                >
                  <ResetIcon size={10} className="text-violet-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
                </button>
                <button
                  onClick={handleStop}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all flex items-center space-x-1.5 px-2.5 border border-red-500/20"
                  title="Hentikan & reset"
                >
                  <StopIcon className="text-red-500" size={6} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
                </button>
              </>
            )}

            {/* Controls — paused */}
            {captureState === "paused" && (
              <>
                <button
                  onClick={handleResume}
                  className="p-1.5 hover:bg-green-500/20 text-green-400 rounded-lg transition-all flex items-center space-x-1.5 px-2.5 border border-green-500/20"
                  title="Lanjutkan sesi"
                >
                  <PlayIcon className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Resume</span>
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-all flex items-center space-x-1.5 px-2.5 border border-violet-500/20"
                  title="Clear transcript & mulai sesi baru"
                >
                  <ResetIcon size={10} className="text-violet-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
                </button>
                <button
                  onClick={handleStop}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all flex items-center space-x-1.5 px-2.5 border border-red-500/20"
                  title="Hentikan & reset"
                >
                  <StopIcon className="text-red-500" size={6} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
                </button>
              </>
            )}

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button
              id="btn-history"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={openHistory}
              className={`p-1.5 rounded-lg transition-all duration-300 group flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-sky-400`}
              title="Open History"
            >
              <HistoryIcon size={16} />
            </button>


            <button
              id="btn-settings"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={openSettings}
              className={`p-1.5 rounded-lg transition-all duration-300 group flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-sky-400`}
              title="Open Settings"
            >
              <SettingsIcon size={16} />
            </button>

            {/* Minimize */}
            <button
              id="btn-minimize"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMinimize}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all group"
              title="Minimize"
              aria-label="Minimize"
            >
              <MinimizeIcon size={16} className="text-slate-400 group-hover:text-white" />
            </button>

            <button
              id="btn-close"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="p-1.5 hover:bg-red-500/40 rounded-lg transition-all group"
              aria-label="Close"
            >
              <CloseIcon size={16} className="text-slate-300 group-hover:text-white" />
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

            {/* AI Help Floating Action */}
            <button
              onClick={openAiHelp}
              className="flex items-center space-x-2 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-full transition-all group scale-90"
              title="Buka VIRA AI"
            >
              <SparklesIcon size={12} className="text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold text-sky-300 uppercase tracking-widest">Ask VIRA</span>
            </button>

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
            {/* === SPLIT MODE: single combined paragraph on each side === */}
            {isSplitMode ? (
              <div className="flex flex-row h-full min-h-0 gap-4">
                {/* Left — Original paragraph */}
                <div className="flex-1 min-w-0">
                  {history.length > 0 || interim ? (
                    <p className="text-slate-200 text-[13px] font-light leading-relaxed whitespace-pre-wrap">
                      {history.map(h => h.original).join(" ")}
                      {interim && (
                        <span className="text-slate-400/60 italic animate-pulse">
                          {history.length > 0 ? " " : ""}{interim}...
                        </span>
                      )}
                    </p>
                  ) : (
                    <div className="flex items-center justify-center h-full space-x-3 py-2">
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

                {/* Divider */}
                {isTranslating && <div className="w-px shrink-0 bg-white/5 self-stretch" />}

                {/* Right — Translation paragraph */}
                {isTranslating && (
                  <div className="flex-1 min-w-0">
                    {history.length > 0 ? (
                      <p className="text-sky-300/50 text-[13px] font-light leading-relaxed whitespace-pre-wrap">
                        {history.map(h => h.translation).join(" ")}
                      </p>
                    ) : (
                      <p className="text-slate-600 text-[11px] italic">
                        Translation will appear here...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* === NORMAL MODE: sentence-by-sentence layout === */
              <>
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
              </>
            )}

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
