import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const appWindow = getCurrentWindow();

interface TranscriptPayload {
  text: string;
  is_final: boolean;
}

function App() {
  const [history, setHistory] = useState<string>("");
  const [interim, setInterim] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGlassy, setIsGlassy] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten = listen<TranscriptPayload>("transcript-update", (event) => {
      const { text, is_final } = event.payload;
      
      if (is_final) {
        setHistory(prev => prev + (prev ? " " : "") + text);
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
      setHistory(""); // Clear history for new session
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
      // Keep history visible but mark it stopped
      setInterim(" [Stopped]");
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

        <div className="flex-1 flex flex-col p-5 space-y-4 overflow-hidden">
          {/* Header Status */}
          <header className="flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Session Status</span>
              <div className={`h-1.5 w-1.5 rounded-full ${isCapturing ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
            {isCapturing && (
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-sky-300/60 font-medium animate-pulse">LIVE CAPTURE</span>
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              </div>
            )}
          </header>

          {/* Transcript Area */}
          <section 
            ref={scrollRef}
            className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 overflow-y-auto custom-scrollbar cursor-text"
          >
            <div className="text-slate-200 text-base font-light leading-relaxed whitespace-pre-wrap">
              {history}
              {interim && (
                <span className="text-sky-300/60 ml-1 italic">{interim}</span>
              )}
              {!history && !interim && !isCapturing && (
                <span className="text-slate-500 italic">Ready to assist with your interview...</span>
              )}
            </div>
          </section>

          {/* Footer/Controls */}
          <footer className="shrink-0 pt-2">
            {!isCapturing ? (
              <button
                onClick={handleStart}
                className="w-full py-3.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/50 text-sky-100 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 backdrop-blur-md shadow-lg group pointer-events-auto"
              >
                <span>Start Capture</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ) : (
              <div className="flex flex-col space-y-3">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-1 h-3 bg-sky-400/50 rounded-full animate-bounce" 
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-tighter">
                    Processing audio signals
                  </p>
                </div>
                <button
                  onClick={handleStop}
                  className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-100 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-2 backdrop-blur-sm"
                >
                  <div className="h-2 w-2 bg-red-500 rounded-sm mr-1" />
                  <span>Stop Assistant</span>
                </button>
              </div>
            )}
          </footer>
        </div>

        {/* Subtle Watermark */}
        <div className="absolute bottom-2 right-4 pointer-events-none select-none">
          <span className="text-[9px] text-white/10 font-medium tracking-widest uppercase">
            by MrA-png
          </span>
        </div>
      </div>
    </main>
  );
}

export default App;
