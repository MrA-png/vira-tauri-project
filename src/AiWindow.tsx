import { useRef, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { CloseIcon, MinimizeIcon, SparklesIcon } from "./components/Icons";
import { useAiChat } from "./hooks/useAiChat";
import { ChatMessage, ChatLoading } from "./components/ai/ChatMessages";
import { ChatInput } from "./components/ai/ChatInput";

export default function AiWindow() {
  // Stable ref so the window object doesn't change across renders
  const appWindowRef = useRef(getCurrentWindow());
  const { messages, isLoading, sendMessage } = useAiChat();
  const [isTransparent, setIsTransparent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten = listen<{ isTransparent: boolean }>("settings-change", (e) => {
      setIsTransparent(e.payload.isTransparent);
    });
    const unlistenSync = listen<{ isTransparent: boolean }>("settings-sync", (e) => {
      setIsTransparent(e.payload.isTransparent);
    });
    return () => {
      unlisten.then((fn) => fn());
      unlistenSync.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-100 italic pointer-events-none">
              VIRA AI
            </span>
          </div>

          {/* Control buttons — completely outside the drag zone */}
          <div className="flex items-center space-x-1 px-3 shrink-0">
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
        </div>

        {/* ── Input ── */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </main>
  );
}
