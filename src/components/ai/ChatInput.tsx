import React, { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="p-4 bg-white/5 border-t border-white/5">
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Tanyakan sesuatu pada VIRA AI..."
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-[13px] focus:outline-none focus:border-sky-500/50 transition-colors placeholder:text-slate-500"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="absolute right-2 p-2 text-sky-500 hover:text-sky-400 disabled:text-slate-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      <p className="text-[9px] text-slate-500 mt-2 text-center uppercase tracking-widest font-medium opacity-50">
        Powered by Gemini Flash · AI can make mistakes
      </p>
    </div>
  );
};
