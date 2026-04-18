import React, { useState, useEffect } from 'react';
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { ArrowBackIcon, HistoryIcon, CloseIcon, TrashIcon } from "./components/Icons";

interface RecordedTranscript {
    original: string;
    translation: string;
    timestamp: string;
}

interface Session {
    id: string;
    title: string;
    created_at: string;
    transcriptions: RecordedTranscript[];
}

const HistoryWindow: React.FC = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isTransparent, setIsTransparent] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const appWindow = getCurrentWindow();

    useEffect(() => {
        loadSessions();
        emit("request-settings-sync");

        const unlistenSettings = listen<{ isTransparent: boolean }>("settings-sync", (event) => {
            setIsTransparent(event.payload.isTransparent);
        });

        const unlistenChange = listen<{ isTransparent: boolean }>("settings-change", (event) => {
            setIsTransparent(event.payload.isTransparent);
        });

        return () => {
            unlistenSettings.then(fn => fn());
            unlistenChange.then(fn => fn());
        };
    }, []);

    const loadSessions = async () => {
        try {
            const data = await invoke<Session[]>("get_all_sessions");
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessionToDelete(id);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        try {
            await invoke("delete_session", { id: sessionToDelete });
            if (selectedSession?.id === sessionToDelete) setSelectedSession(null);
            setSessionToDelete(null);
            loadSessions();
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    const closeWindow = async () => {
        await appWindow.close();
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
                {/* Header */}
                <div 
                    className="h-12 shrink-0 bg-white/5 border-b border-white/10 relative flex items-center justify-between z-30 select-none"
                >
                    {/* Drag Handle — avoids the button area on the right */}
                    <div 
                        data-tauri-drag-region
                        className="absolute inset-0 right-16 cursor-grab active:cursor-grabbing z-0"
                    />

                    <div className="relative z-10 flex items-center space-x-2.5 px-4 pointer-events-none">
                        {selectedSession ? (
                            <button 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => setSelectedSession(null)}
                                className="pointer-events-auto p-1 hover:bg-white/10 rounded-md transition-all mr-1"
                                style={{ WebkitAppRegion: 'no-drag' } as any}
                            >
                                <ArrowBackIcon size={16} className="text-slate-400" />
                            </button>
                        ) : null}
                        <div className="p-1.5 bg-sky-500/10 rounded-lg">
                            <HistoryIcon size={16} className="text-sky-400" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-100">
                            {selectedSession ? "Session Detail" : "Transcription History"}
                        </span>
                    </div>

                    <button 
                        onMouseDown={(e) => e.stopPropagation()} 
                        onClick={closeWindow} 
                        className="relative z-10 mr-3 p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer shadow-lg"
                        style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as any}
                    >
                        <CloseIcon size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {!selectedSession ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {sessions.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-500 italic text-xs">
                                    Belum ada riwayat tersimpan.
                                </div>
                            ) : (
                                sessions.map(session => (
                                    <div 
                                        key={session.id}
                                        onClick={() => setSelectedSession(session)}
                                        className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group flex items-center justify-between"
                                    >
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-[12px] font-medium text-slate-200">{session.title}</span>
                                            <span className="text-[10px] text-slate-500">{new Date(session.created_at).toLocaleString()} • {session.transcriptions.length} line(s)</span>
                                        </div>
                                        <button 
                                            onClick={(e) => deleteSession(session.id, e)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/20">
                                {selectedSession.transcriptions.map((t, i) => (
                                    <div key={i} className="flex flex-col space-y-1">
                                        <p className="text-slate-200 text-[13px] font-light leading-snug">{t.original}</p>
                                        <p className="text-sky-300/40 text-[10px] font-medium italic border-l border-white/10 pl-2">{t.translation}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="h-10 bg-white/5 border-t border-white/10 flex items-center px-4 justify-between">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest">{selectedSession.id}.json</span>
                                <button 
                                    onClick={() => setSelectedSession(null)}
                                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider"
                                >
                                    Back to List
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {sessionToDelete && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-[280px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-5 flex flex-col items-center text-center space-y-3">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <TrashIcon size={24} className="text-red-500" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Delete History?</h3>
                                    <p className="text-[11px] text-slate-400">This data will be permanently removed from the JSON file.</p>
                                </div>
                            </div>
                            <div className="flex border-t border-white/5">
                                <button 
                                    onClick={() => setSessionToDelete(null)}
                                    className="flex-1 px-4 py-3 text-[11px] font-bold text-slate-400 hover:bg-white/5 transition-all uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 text-[11px] font-bold text-red-500 hover:bg-red-500/10 transition-all border-l border-white/5 uppercase tracking-widest"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default HistoryWindow;
