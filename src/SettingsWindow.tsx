import React, { useState, useEffect } from 'react';
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SettingsIcon, CloseIcon } from "./components/Icons";

const SettingsWindow: React.FC = () => {
    const [isTransparent, setIsTransparent] = useState(false);
    const [isTranslating, setIsTranslating] = useState(true);
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [langPair, setLangPair] = useState("en|id");
    const window = getCurrentWindow();

    useEffect(() => {
        // Request initial state from main window
        emit("request-settings-sync");

        const unlisten = listen<{ isTransparent: boolean; isTranslating: boolean; langPair: string; isSplitMode: boolean }>("settings-sync", (event) => {
            setIsTransparent(event.payload.isTransparent);
            setIsTranslating(event.payload.isTranslating);
            if (event.payload.langPair) {
                setLangPair(event.payload.langPair);
            }
            if (event.payload.isSplitMode !== undefined) {
                setIsSplitMode(event.payload.isSplitMode);
            }
        });

        // Handle window closure or manual close
        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const toggleTransparent = () => {
        const newVal = !isTransparent;
        setIsTransparent(newVal);
        emit("settings-change", { isTransparent: newVal, isTranslating, langPair, isSplitMode });
    };

    const toggleTranslating = () => {
        const newVal = !isTranslating;
        setIsTranslating(newVal);
        emit("settings-change", { isTransparent, isTranslating: newVal, langPair, isSplitMode });
    };

    const toggleSplitMode = () => {
        const newVal = !isSplitMode;
        setIsSplitMode(newVal);
        emit("settings-change", { isTransparent, isTranslating, langPair, isSplitMode: newVal });
    };

    const toggleLangPair = () => {
        const newVal = langPair === "en|id" ? "id|en" : "en|id";
        setLangPair(newVal);
        emit("settings-change", { isTransparent, isTranslating, langPair: newVal, isSplitMode });
    };


    const closeWindow = async () => {
        await window.close();
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
                <div
                    className="h-12 shrink-0 bg-white/5 border-b border-white/10 relative flex items-center justify-between select-none"
                >
                    {/* Full-width drag area */}
                    <div
                        data-tauri-drag-region
                        onMouseDown={() => window.startDragging()}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    />

                    {/* Logo — non-interactive */}
                    <div className="relative z-10 flex items-center space-x-2.5 px-4 pointer-events-none">
                        <div className="p-1.5 bg-sky-500/10 rounded-lg">
                            <SettingsIcon size={16} className="text-sky-400" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-100">Settings</span>
                    </div>

                    {/* Close button — sits above drag area */}
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={closeWindow}
                        className="relative z-10 mr-3 p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                        aria-label="Close Settings"
                    >
                        <CloseIcon size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[13px] font-semibold text-slate-100 uppercase tracking-wider">Transparent Mode</span>
                            <span className={`text-[10px] transition-colors duration-500 ${
                                isTransparent ? 'text-white/60' : 'text-slate-500'
                            }`}>
                                Toggle premium transparent effect
                            </span>
                        </div>
                        <button 
                            onClick={toggleTransparent}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-500 group relative overflow-hidden ${
                                isTransparent 
                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                                    : 'bg-white/5 border-white/10 text-slate-500'
                            }`}
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isTransparent ? 'text-sky-400' : 'text-slate-600'}`}>
                                {isTransparent ? 'ON' : 'OFF'}
                            </span>
                            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
                                isTransparent ? 'bg-sky-500 shadow-sky-500/50 shadow-md' : 'bg-slate-700'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[13px] font-semibold text-slate-100 uppercase tracking-wider">Translation</span>
                            <span className={`text-[10px] transition-colors duration-500 ${
                                isTransparent ? 'text-white/60' : 'text-slate-500'
                            }`}>
                                Toggle translation on/off
                            </span>
                        </div>
                        <button 
                            onClick={toggleTranslating}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-500 group relative overflow-hidden ${
                                isTranslating 
                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                                    : 'bg-white/5 border-white/10 text-slate-500'
                            }`}
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isTranslating ? 'text-sky-400' : 'text-slate-600'}`}>
                                {isTranslating ? 'ON' : 'OFF'}
                            </span>
                            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
                                isTranslating ? 'bg-sky-500 shadow-sky-500/50 shadow-md' : 'bg-slate-700'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[13px] font-semibold text-slate-100 uppercase tracking-wider">Split View</span>
                            <span className={`text-[10px] transition-colors duration-500 ${
                                isTransparent ? 'text-white/60' : 'text-slate-500'
                            }`}>
                                Side-by-side translation layout
                            </span>
                        </div>
                        <button 
                            onClick={toggleSplitMode}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-500 group relative overflow-hidden ${
                                isSplitMode 
                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                                    : 'bg-white/5 border-white/10 text-slate-500'
                            }`}
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isSplitMode ? 'text-sky-400' : 'text-slate-600'}`}>
                                {isSplitMode ? 'ON' : 'OFF'}
                            </span>
                            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
                                isSplitMode ? 'bg-sky-500 shadow-sky-500/50 shadow-md' : 'bg-slate-700'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[13px] font-semibold text-slate-100 uppercase tracking-wider">Language</span>
                            <span className={`text-[10px] transition-colors duration-500 ${
                                isTransparent ? 'text-white/60' : 'text-slate-500'
                            }`}>
                                Choose translation direction
                            </span>
                        </div>
                        <button 
                            onClick={toggleLangPair}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-500 bg-white/5 border-white/10 text-slate-300 hover:border-sky-500/30 hover:bg-sky-500/5 min-w-[140px]`}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                                {langPair === "en|id" ? "EN ➔ ID" : "ID ➔ EN"}
                            </span>
                            <div className="flex space-x-1">
                                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${langPair === "en|id" ? "bg-sky-500" : "bg-slate-700"}`} />
                                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${langPair === "id|en" ? "bg-sky-500" : "bg-slate-700"}`} />
                            </div>
                        </button>
                    </div>

                </div>

                {/* Footer */}
                <div className="h-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
                    <span className="text-[8px] text-slate-600 uppercase tracking-widest font-medium">Vira Configuration</span>
                </div>
            </div>
        </main>
    );
};

export default SettingsWindow;
