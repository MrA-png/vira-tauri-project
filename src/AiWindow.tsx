import { useRef, useEffect, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
import { CloseIcon, MinimizeIcon, SparklesIcon } from "./components/Icons";
import { useAiChat } from "./hooks/useAiChat";
import { AiModel } from "./services/ai";
import { ChatMessage, ChatLoading } from "./components/ai/ChatMessages";
import { ChatInput } from "./components/ai/ChatInput";

export default function AiWindow() {
  // Stable ref so the window object doesn't change across renders
  const appWindowRef = useRef(getCurrentWindow());
  const [aiLanguage, setAiLanguage] = useState("en");
  const [aiModel, setAiModel] = useState<AiModel>("gemini-flash-latest");
  const [isTransparent, setIsTransparent] = useState(false);
  const { messages, isLoading, sendMessage } = useAiChat(aiLanguage, aiModel);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [liveContext, setLiveContext] = useState("");
  const [interimContext, setInterimContext] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentContextRef = useRef("");
  const lastSentTimeRef = useRef(0);

  useEffect(() => {
    const unlisten = listen<{ isTransparent: boolean; aiLanguage?: string; aiModel?: string }>("settings-change", (e) => {
      setIsTransparent(e.payload.isTransparent);
      if (e.payload.aiLanguage) setAiLanguage(e.payload.aiLanguage);
      if (e.payload.aiModel) setAiModel(e.payload.aiModel as AiModel);
    });
    const unlistenSync = listen<{ isTransparent: boolean; aiLanguage?: string; aiModel?: string }>("settings-sync", (e) => {
      setIsTransparent(e.payload.isTransparent);
      if (e.payload.aiLanguage) setAiLanguage(e.payload.aiLanguage);
      if (e.payload.aiModel) setAiModel(e.payload.aiModel as AiModel);
    });
    
    // Listen to live transcripts from main window
    const unlistenTranscript = listen<{ text: string; is_final: boolean }>("transcript-update", (e) => {
      if (e.payload.is_final) {
        setLiveContext(prev => {
          const updated = (prev + " " + e.payload.text).trim();
          // Keep only last 500 chars to avoid prompt bloat
          return updated.length > 500 ? updated.slice(-500) : updated;
        });
        setInterimContext("");
      } else {
        setInterimContext(e.payload.text);
      }
    });

    const unlistenAiQuery = listen<{ text: string }>("ai-query", (e) => {
      if (e.payload.text) {
        sendMessage(e.payload.text);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenSync.then((fn) => fn());
      unlistenTranscript.then((fn) => fn());
      unlistenAiQuery.then((fn) => fn());
    };
  }, [sendMessage]);

  const handleSuggestAnswer = useCallback(() => {
    let context = (liveContext + " " + interimContext).trim();
    if (context) {
      const now = Date.now();
      const timeSinceLast = now - lastSentTimeRef.current;

      // "Kirimkan ulang dengan kontext sebelumnya juga" 
      // If we sent something recently (< 10s ago), and it wasn't a full stop, 
      // prepend it to help AI understand the continuation.
      if (timeSinceLast < 10000 && lastSentContextRef.current) {
        // Prevent double prepending if the context already has it
        if (!context.toLowerCase().includes(lastSentContextRef.current.toLowerCase())) {
          context = `${lastSentContextRef.current} ${context}`;
        }
      }

      sendMessage(context);
      
      // Update refs
      lastSentContextRef.current = context;
      lastSentTimeRef.current = now;
      
      setLiveContext(""); 
      setInterimContext("");
      
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    }
  }, [liveContext, interimContext, sendMessage]);

  // Auto-send logic
  useEffect(() => {
    if (!isAutoMode || isLoading) {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      return;
    }

    const context = (liveContext + " " + interimContext).trim();
    if (!context) {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      return;
    }

    // Reset timer whenever context updates
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    
    // Duration depends on state:
    // 1. If we have only interim (still speaking), wait longer (3s silence).
    // 2. If we have liveContext (finalized speech chunks), wait less (1.5s silence).
    const waitTime = interimContext ? 3000 : 1500; 

    autoSendTimerRef.current = setTimeout(() => {
      handleSuggestAnswer();
    }, waitTime);

    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    };
  }, [liveContext, interimContext, isAutoMode, isLoading, handleSuggestAnswer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, interimContext]);

  // Drag via Tauri's JS API — bypasses all CSS region issues on macOS
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // left mouse button only
    e.preventDefault();
    appWindowRef.current.startDragging().catch(console.error);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    appWindowRef.current.minimize().catch((err) =>
      console.error("Minimize error:", err)
    );
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    appWindowRef.current.close().catch((err) =>
      console.error("Close error:", err)
    );
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-transparent flex items-center justify-center p-2">
      <div
        className={`w-full h-full rounded-2xl flex flex-col overflow-hidden relative transition-all duration-500 ${
          isTransparent
            ? "bg-slate-900/10 border border-white/10"
            : "bg-slate-900/65 border border-white/5"
        }`}
      >
        {/* ── Header ── */}
        <div className="h-12 shrink-0 bg-white/5 border-b border-white/10 flex items-center select-none">

          {/* Drag zone — onMouseDown triggers Tauri's native drag */}
          <div
            onMouseDown={handleDragStart}
            className="flex-1 flex items-center space-x-2.5 px-4 h-full cursor-grab active:cursor-grabbing"
          >
            <div className="p-1.5 bg-sky-500/10 rounded-lg pointer-events-none">
              <SparklesIcon size={16} className="text-sky-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100 italic leading-none">
                VIRA AI
              </span>
              <span className="text-[8px] text-sky-400/60 font-medium uppercase tracking-wider mt-0.5">
                Live Assistant Mode
              </span>
            </div>
          </div>

          {/* Control buttons — completely outside the drag zone */}
          <div className="flex items-center space-x-1 px-3 shrink-0">
            <button
              onClick={() => setIsAutoMode(!isAutoMode)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-all border shadow-sm ${
                isAutoMode 
                  ? "bg-sky-500/20 border-sky-400/40 text-sky-400 shadow-sky-500/10" 
                  : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
              }`}
              title={isAutoMode ? "Auto-Mode: ON (Hands-free)" : "Auto-Mode: OFF"}
            >
              <div className={`relative flex items-center justify-center`}>
                <div className={`w-2 h-2 rounded-full ${isAutoMode ? "bg-sky-400" : "bg-slate-600"}`} />
                {isAutoMode && (liveContext || interimContext) && (
                  <div className="absolute w-4 h-4 rounded-full border border-sky-400/50 animate-ping" />
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Auto Mode</span>
            </button>

            <button
              onClick={() => {
                const nextModel = aiModel === "gemini-flash-latest" ? "openai/gpt-oss-120b:free" : "gemini-flash-latest";
                setAiModel(nextModel);
                emit("settings-change", { isTransparent, aiLanguage, aiModel: nextModel });
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-all border ${
                aiModel === "openai/gpt-oss-120b:free" 
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-400" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
              title={`Switch to ${aiModel === "gemini-flash-latest" ? "GPT OSS 120B (Reasoning)" : "Gemini 1.5 (Fast)"}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {aiModel === "gemini-flash-latest" ? "GEMINI" : "GPT-OSS"}
              </span>
            </button>

            <button
              onClick={() => {
                const newVal = aiLanguage === "en" ? "id" : "en";
                setAiLanguage(newVal);
                emit("settings-change", { isTransparent, aiLanguage: newVal, aiModel });
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all font-bold"
              title={`Switch to ${aiLanguage === "en" ? "Indonesian" : "English"}`}
            >
              <span className="text-[10px] uppercase tracking-wider">
                {aiLanguage === "en" ? "EN" : "ID"}
              </span>
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            <button
              onClick={handleMinimize}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              aria-label="Minimize"
              title="Minimize"
              type="button"
            >
              <MinimizeIcon size={16} />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
              aria-label="Close"
              title="Close"
              type="button"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        {/* ── Chat Messages ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {isLoading && <ChatLoading />}
          {/* Real-time transcription preview when not thinking */}
          {!isLoading && interimContext && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-[12px] bg-white/5 text-slate-400 italic animate-pulse">
                Hearing: {interimContext}...
              </div>
            </div>
          )}
        </div>

        {/* ── Live Action Panel ── */}
        {(liveContext || interimContext) && !isLoading && (
          <div className="px-4 pb-2">
            <button
              onClick={handleSuggestAnswer}
              disabled={isAutoMode}
              className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-2 animate-in slide-in-from-bottom-2 ${
                isAutoMode 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5" 
                  : "bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 shadow-lg"
              }`}
            >
              <SparklesIcon size={14} className={isAutoMode ? "text-slate-600" : "text-white"} />
              <span>
                {isAutoMode ? "Waiting for pause to answer..." : "Generate Response from Current Context"}
              </span>
            </button>
          </div>
        )}

        {/* ── Input ── */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </main>
  );
}
