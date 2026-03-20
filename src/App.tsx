import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import SettingsModal from "./SettingsModal";
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(true);
  
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
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 rounded-lg transition-all duration-300 group pointer-events-auto flex items-center justify-center ${
                isSettingsOpen 
                  ? 'bg-sky-500/20 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)] border border-sky-500/30' 
                  : 'hover:bg-white/10 text-slate-400 hover:text-sky-400'
              }`}
              title="Open Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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

        <div className="flex-1 flex flex-col px-4 py-2 space-y-2 overflow-hidden">
          {/* Header Status - Only show when capturing and there's vertical space */}
          <header className={`flex items-center justify-between shrink-0 transition-all duration-300 ${isCapturing && window.innerHeight > 200 ? 'opacity-100 flex' : 'opacity-0 h-0 overflow-hidden hidden'}`}>
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
            className="flex-1 bg-white/5 rounded-xl border border-white/5 px-4 py-2 overflow-y-auto custom-scrollbar cursor-text min-h-0"
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
                  <span className="text-slate-500 italic text-[11px] font-medium tracking-tight">
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

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isGlassy={isGlassy}
        onToggleGlassy={toggleTransparency}
        isTranslating={isTranslating}
        onToggleTranslating={() => setIsTranslating(!isTranslating)}
      />
    </main>
  );
}

export default App;
