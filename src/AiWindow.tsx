import { useRef, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { CloseIcon, MinimizeIcon, SparklesIcon } from "./components/Icons";
import { useAiChat } from "./hooks/useAiChat";
import { ChatMessage, ChatLoading } from "./components/ai/ChatMessages";
import { ChatInput } from "./components/ai/ChatInput";

export default function AiWindow() {
  const window = getCurrentWindow();
  const { messages, isLoading, sendMessage } = useAiChat();
  const [isTransparent, setIsTransparent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for setting changes to sync transparency
    const unlisten = listen<{ isTransparent: boolean }>("settings-change", (event) => {
      setIsTransparent(event.payload.isTransparent);
    });

    // Also listen for settings sync
    const unlistenSync = listen<{ isTransparent: boolean }>("settings-sync", (event) => {
      setIsTransparent(event.payload.isTransparent);
    });

    return () => {
      unlisten.then(fn => fn());
      unlistenSync.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const minimizeWindow = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (error) {
      console.error("Error minimizing AI window:", error);
    }
  };

  const closeWindow = async () => {
    try {
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Error closing AI window:", error);
    }
  };

  return (
    <main className="fixed inset-0 select-none overflow-hidden bg-transparent flex items-center justify-center p-2">
      <div 
        className={`w-full h-full rounded-2xl flex flex-col overflow-hidden relative transition-all duration-500 ${
          isTransparent 
            ? 'bg-slate-900/10 border border-white/10' 
            : 'bg-slate-900/65 border border-white/5'
        }`}
      >
        {/* Modal Header */}
        <div className="h-12 shrink-0 bg-white/5 border-b border-white/10 relative flex items-center justify-between select-none z-30">
          {/* Full-width drag area */}
          <div
            data-tauri-drag-region
            onMouseDown={() => window.startDragging()}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          />

          {/* Logo — non-interactive */}
          <div className="relative z-10 flex items-center space-x-2.5 px-4 pointer-events-none">
            <div className="p-1.5 bg-sky-500/10 rounded-lg">
              <SparklesIcon size={16} className="text-sky-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-100">VIRA AI Assistant</span>
          </div>

          {/* Controls — sit above drag area */}
          <div 
            className="relative z-10 mr-3 flex items-center space-x-1"
            style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as any}
          >
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={minimizeWindow}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
              style={{ WebkitAppRegion: 'no-drag', cursor: 'pointer' } as any}
              aria-label="Minimize"
              title="Minimize"
              type="button"
            >
              <MinimizeIcon size={16} />
            </button>
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={closeWindow}
              className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
              style={{ WebkitAppRegion: 'no-drag', cursor: 'pointer' } as any}
              aria-label="Close"
              title="Close"
              type="button"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>


        {/* Chat Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {isLoading && <ChatLoading />}
        </div>

        {/* Chat Input Area */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </main>
  );
}
