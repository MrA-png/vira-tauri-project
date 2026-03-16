import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

function App() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [interim, setInterim] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGlassy, setIsGlassy] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten = listen<TranscriptPayload>("transcript-update", (event) => {
      const { text, translation, is_final } = event.payload;
      
      if (is_final) {
        setHistory(prev => [...prev, { original: text, translation }]);
        setInterim("");
      } else {
        setInterim(text);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, interim]);

  const handleStart = async () => {
    try {
      setIsCapturing(true);
      setHistory([]); // Clear history for new session
      setInterim("");
      await invoke("start_interview");
    } catch (error) {
      console.error("Failed to start capture:", error);
      setIsCapturing(false);
    }
  };

  const handleStop = async () => {
    try {
      await invoke("stop_interview");
      setIsCapturing(false);
      // Keep history visible
      setInterim("");
    } catch (error) {
      console.error("Failed to stop capture:", error);
    }
  };

  const handleClose = async () => {
    console.log("Closing window...");
    await appWindow.close();
  };

  const toggleTransparency = () => {
    setIsGlassy(!isGlassy);
  };

  return (
    <main 
      className="flex flex-col items-center justify-start h-screen w-screen cursor-default select-none overflow-hidden bg-transparent"
    >
      <div 
        className={`w-full h-full rounded-2xl flex flex-col overflow-hidden relative transition-all duration-500 ${
          isGlassy ? 'glass-card shadow' : 'bg-slate-900/20 backdrop-blur-sm border border-white/10 shadow'
        }`}
      >
        {/* Navbar - Main Drag Handle */}
        <nav 
          data-tauri-drag-region
          onMouseDown={(e) => {
            if (e.buttons === 1) appWindow.startDragging();
          }}
          className={`h-10 shrink-0 border-b flex items-center justify-between px-4 cursor-grab active:cursor-grabbing z-30 pointer-events-auto transition-colors duration-500 ${
            isGlassy ? 'bg-white/10 border-white/10' : 'bg-transparent border-white/5'
          }`}
        >
          <div className="flex items-center space-x-2 pointer-events-none">
            <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-colors duration-500 ${
              isGlassy ? 'bg-sky-500' : 'bg-sky-400/50'
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${
              isGlassy ? 'text-sky-200/90' : 'text-sky-100/40'
            }`}>
              VIRA Assistant
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Start/Stop Controls */}
            {!isCapturing ? (
              <button 
                onClick={handleStart}
                className="p-1.5 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-all group pointer-events-auto flex items-center space-x-1.5 px-2.5"
                title="Start Capture"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Start</span>
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all group pointer-events-auto flex items-center space-x-1.5 px-2.5 border border-red-500/20"
                title="Stop Assistant"
              >
                <div className="h-1.5 w-1.5 rounded-sm bg-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
              </button>
            )}

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button 
              onClick={toggleTransparency}
              className={`p-1.5 rounded-lg transition-all duration-300 group pointer-events-auto flex items-center justify-center ${
                !isGlassy 
                  ? 'bg-sky-500/20 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)] border border-sky-500/30' 
                  : 'hover:bg-white/10 text-slate-400 hover:text-sky-400'
              }`}
              title={isGlassy ? "Switch to High Transparency" : "Switch to Glass Mode"}
            >
              {isGlassy ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              )}
            </button>

            <button 
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

        <div className="flex-1 flex flex-col p-5 space-y-4 overflow-hidden pt-3">
          {/* Header Status - Only show when capturing */}
          <header className={`flex items-center justify-between shrink-0 transition-all duration-300 ${isCapturing ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Session Status</span>
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-sky-300/60 font-medium animate-pulse">LIVE CAPTURE & TRANSLATE</span>
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            </div>
          </header>

          {/* Transcript Area */}
          <section 
            ref={scrollRef}
            className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 overflow-y-auto custom-scrollbar cursor-text"
          >
            <div className="flex flex-col space-y-4">
              {history.map((item, idx) => (
                <div key={idx} className="flex flex-col space-y-1 group">
                  <p className="text-slate-200 text-base font-light leading-relaxed whitespace-pre-wrap">
                    {item.original}
                  </p>
                  <p className="text-sky-300/40 text-[11px] font-medium italic border-l border-white/10 pl-3 py-0.5">
                    {item.translation}
                  </p>
                </div>
              ))}
              {interim && (
                <p className="text-slate-400/60 text-base font-light italic leading-relaxed animate-pulse">
                  {interim}...
                </p>
              )}
              {history.length === 0 && !interim && !isCapturing && (
                <div className="flex flex-col items-center justify-center h-full space-y-3 pt-10">
                  <div className="h-12 w-12 rounded-full bg-sky-500/5 flex items-center justify-center border border-white/5">
                    <div className="h-3 w-3 rounded-full bg-sky-500/20 animate-ping" />
                  </div>
                  <span className="text-slate-500 italic text-sm text-center px-10">
                    Sistem siap. Klik "Start" di navbar untuk memulai transkripsi.
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Subtle Watermark */}
        <div className="absolute bottom-2 right-4 pointer-events-none select-none">
          <span className="text-[9px] text-white/5 font-medium tracking-widest uppercase">
            by MrA-png
          </span>
        </div>
      </div>
    </main>
  );
}

export default App;
