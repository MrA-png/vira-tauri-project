import React, { useState, useEffect } from 'react';
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

const SettingsWindow: React.FC = () => {
    const [isGlassy, setIsGlassy] = useState(true);
    const [isTranslating, setIsTranslating] = useState(true);
    const window = getCurrentWindow();

    useEffect(() => {
        // Request initial state from main window
        emit("request-settings-sync");

        const unlisten = listen<{ isGlassy: boolean; isTranslating: boolean }>("settings-sync", (event) => {
            setIsGlassy(event.payload.isGlassy);
            setIsTranslating(event.payload.isTranslating);
        });

        // Handle window closure or manual close
        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const toggleGlassy = () => {
        const newVal = !isGlassy;
        setIsGlassy(newVal);
        emit("settings-change", { isGlassy: newVal, isTranslating });
    };

    const toggleTranslating = () => {
        const newVal = !isTranslating;
        setIsTranslating(newVal);
        emit("settings-change", { isGlassy, isTranslating: newVal });
    };

    const closeWindow = async () => {
        await window.close();
    };

    return (
        <main className="fixed inset-0 select-none overflow-hidden bg-transparent flex items-center justify-center p-2">
            <div 
                className={`w-full h-full rounded-2xl flex flex-col overflow-hidden relative border border-white/20 shadow-2xl transition-all duration-500 ${
                    isGlassy ? 'glass-card' : 'bg-slate-900/40 backdrop-blur-md'
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            </svg>
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[13px] font-semibold text-slate-100 uppercase tracking-wider">Glass Mode</span>
                            <span className="text-[10px] text-slate-500">Toggle premium glass effect</span>
                        </div>
                        <button 
                            onClick={toggleGlassy}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-500 group relative overflow-hidden ${
                                isGlassy 
                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                                    : 'bg-white/5 border-white/10 text-slate-500'
                            }`}
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isGlassy ? 'text-sky-400' : 'text-slate-600'}`}>
                                {isGlassy ? 'ON' : 'OFF'}
                            </span>
                            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
                                isGlassy ? 'bg-sky-500 shadow-sky-500/50 shadow-md' : 'bg-slate-700'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[13px] font-semibold text-slate-100 uppercase tracking-wider">Translation</span>
                            <span className="text-[10px] text-slate-500">English to Indonesia</span>
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
